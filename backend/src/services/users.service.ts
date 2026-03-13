import { Context, Errors, ServiceSchema } from "moleculer";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";
import { BrokerMeta } from "../types/auth";

const { MoleculerClientError, MoleculerServerError } = Errors;

type UserProjection = {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type CreateParams = {
  email: string;
  name: string;
  passwordHash: string;
};

type FindByIdParams = {
  id: number;
};

type FindByEmailParams = {
  email: string;
};

const usersRepository = () => {
  if (!AppDataSource.isInitialized) {
    throw new MoleculerServerError("Database connection is not ready", 500, "DB_NOT_READY");
  }

  return AppDataSource.getRepository(User);
};

const formatUser = (user: User): UserProjection => ({
  id: user.id,
  email: user.email,
  name: user.name,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString()
});

const UsersService: ServiceSchema = {
  name: "users",

  actions: {
    create: {
      params: {
        email: { type: "email", max: 190, convert: true },
        name: { type: "string", min: 2, max: 120, trim: true },
        passwordHash: { type: "string", min: 20 }
      },
      async handler(ctx: Context<CreateParams>) {
        const repository = usersRepository();
        const email = ctx.params.email.toLowerCase();

        const exists = await repository.exist({ where: { email } });
        if (exists) {
          throw new MoleculerClientError("User with this email already exists", 409, "EMAIL_TAKEN");
        }

        const user = repository.create({
          email,
          name: ctx.params.name,
          passwordHash: ctx.params.passwordHash
        });

        const saved = await repository.save(user);
        return formatUser(saved);
      }
    },

    findById: {
      params: {
        id: { type: "number", integer: true, positive: true, convert: true }
      },
      async handler(ctx: Context<FindByIdParams>) {
        const repository = usersRepository();
        const user = await repository.findOne({
          where: { id: ctx.params.id },
          select: { id: true, email: true, name: true, createdAt: true, updatedAt: true }
        });

        return user ? formatUser(user) : null;
      }
    },

    findByEmail: {
      params: {
        email: { type: "email", max: 190, convert: true }
      },
      async handler(ctx: Context<FindByEmailParams>) {
        const repository = usersRepository();
        const user = await repository.findOne({
          where: { email: ctx.params.email.toLowerCase() },
          select: { id: true, email: true, name: true, passwordHash: true, createdAt: true, updatedAt: true }
        });

        if (!user) {
          return null;
        }

        return {
          ...formatUser(user),
          passwordHash: user.passwordHash
        };
      }
    },

    me: {
      async handler(ctx: Context<undefined, BrokerMeta>) {
        if (!ctx.meta.user) {
          throw new MoleculerClientError("Unauthorized", 401, "UNAUTHORIZED");
        }

        const user = (await ctx.call("users.findById", {
          id: ctx.meta.user.id
        })) as UserProjection | null;

        if (!user) {
          throw new MoleculerClientError("User not found", 404, "USER_NOT_FOUND");
        }

        return user;
      }
    }
  }
};

export default UsersService;
