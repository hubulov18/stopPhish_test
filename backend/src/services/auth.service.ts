import { Context, Errors, ServiceSchema } from "moleculer";
import { BrokerMeta } from "../types/auth";
import { comparePassword, hashPassword, signAccessToken, verifyAccessToken } from "../utils/auth";

const { MoleculerClientError } = Errors;

type RegisterParams = {
  email: string;
  name: string;
  password: string;
};

type LoginParams = {
  email: string;
  password: string;
};

type VerifyTokenParams = {
  token: string;
};

type PublicUser = {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type UserWithPassword = PublicUser & {
  passwordHash: string;
};

const AuthService: ServiceSchema = {
  name: "auth",

  actions: {
    register: {
      params: {
        email: { type: "email", max: 190, convert: true },
        name: { type: "string", min: 2, max: 120, trim: true },
        password: { type: "string", min: 8, max: 120 }
      },
      async handler(ctx: Context<RegisterParams>) {
        const passwordHash = await hashPassword(ctx.params.password);

        const user = (await ctx.call("users.create", {
          email: ctx.params.email,
          name: ctx.params.name,
          passwordHash
        })) as PublicUser;

        const accessToken = signAccessToken({
          id: user.id,
          email: user.email,
          name: user.name
        });

        return {
          accessToken,
          user
        };
      }
    },

    login: {
      params: {
        email: { type: "email", max: 190, convert: true },
        password: { type: "string", min: 8, max: 120 }
      },
      async handler(ctx: Context<LoginParams>) {
        const user = (await ctx.call("users.findByEmail", {
          email: ctx.params.email
        })) as UserWithPassword | null;

        if (!user) {
          throw new MoleculerClientError("Invalid email or password", 401, "INVALID_CREDENTIALS");
        }

        const valid = await comparePassword(ctx.params.password, user.passwordHash);
        if (!valid) {
          throw new MoleculerClientError("Invalid email or password", 401, "INVALID_CREDENTIALS");
        }

        const { passwordHash: _passwordHash, ...publicUser } = user;
        const accessToken = signAccessToken({
          id: user.id,
          email: user.email,
          name: user.name
        });

        return {
          accessToken,
          user: publicUser
        };
      }
    },

    verifyToken: {
      params: {
        token: { type: "string", min: 20 }
      },
      async handler(ctx: Context<VerifyTokenParams>) {
        try {
          const user = verifyAccessToken(ctx.params.token);
          const actual = (await ctx.call("users.findById", {
            id: user.id
          })) as PublicUser | null;
          if (!actual) {
            throw new MoleculerClientError("User from token no longer exists", 401, "TOKEN_USER_MISSING");
          }

          return {
            id: actual.id,
            email: actual.email,
            name: actual.name
          };
        } catch (error) {
          if (error instanceof MoleculerClientError) {
            throw error;
          }

          throw new MoleculerClientError("Invalid or expired token", 401, "INVALID_TOKEN");
        }
      }
    },

    me: {
      async handler(ctx: Context<undefined, BrokerMeta>) {
        if (!ctx.meta.user) {
          throw new MoleculerClientError("Unauthorized", 401, "UNAUTHORIZED");
        }

        const user = (await ctx.call("users.findById", {
          id: ctx.meta.user.id
        })) as PublicUser | null;

        if (!user) {
          throw new MoleculerClientError("User not found", 404, "USER_NOT_FOUND");
        }

        return user;
      }
    }
  }
};

export default AuthService;
