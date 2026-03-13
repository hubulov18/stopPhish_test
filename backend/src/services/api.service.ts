import { Context, Errors, ServiceSchema } from "moleculer";
import ApiGateway from "moleculer-web";
import { BrokerMeta } from "../types/auth";
import { settings } from "../utils/env";

const aliases = {
  "GET health": "system.health",

  "POST auth/register": "auth.register",
  "POST auth/login": "auth.login",
  "GET auth/me": "auth.me",
  "GET users/me": "users.me",

  "GET categories": "categories.list",
  "POST categories": "categories.create",
  "PATCH categories/:id": "categories.update",
  "DELETE categories/:id": "categories.remove",

  "GET notes": "notes.list",
  "GET notes/:id": "notes.get",
  "POST notes": "notes.create",
  "PATCH notes/:id": "notes.update",
  "DELETE notes/:id": "notes.remove"
};

const publicEndpoints = new Set([
  "GET:/health",
  "POST:/auth/register",
  "POST:/auth/login",
  "GET:/api/health",
  "POST:/api/auth/register",
  "POST:/api/auth/login"
]);

const routeFactory = (path: string) => ({
  path,
  aliases,
  mappingPolicy: "restrict",
  mergeParams: true,
  authorization: true,
  bodyParsers: {
    json: true,
    urlencoded: { extended: true }
  },
  onAfterCall(
    _ctx: unknown,
    _route: unknown,
    _req: unknown,
    res: { setHeader: (key: string, value: string) => void },
    data: unknown
  ) {
    res.setHeader("X-Notes-Flavor", "desk-edition");
    return data;
  }
});

const normalizePath = (value: string): string => {
  const clean = value.split("?")[0].replace(/\/+$/, "");
  return clean.length === 0 ? "/" : clean;
};

const ApiService: ServiceSchema = {
  name: "api",
  mixins: [ApiGateway as unknown as ServiceSchema],

  settings: {
    port: settings.port,
    ip: "0.0.0.0",

    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"]
    },

    routes: [routeFactory("/"), routeFactory("/api")],

    onError(
      _req: unknown,
      res: {
        writeHead: (code: number, headers: Record<string, string>) => void;
        end: (body: string) => void;
      },
      err: Error & { code?: number; type?: string; data?: unknown }
    ) {
      const statusCode = err.code && Number.isInteger(err.code) ? Number(err.code) : 500;

      if (statusCode >= 500) {
        // eslint-disable-next-line no-console
        console.error(err);
      }

      res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify({
          message: err.message || "Unexpected server error",
          type: err.type || "INTERNAL_ERROR",
          details: err.data ?? null
        })
      );
    }
  },

  methods: {
    async authorize(
      this: { broker: { call: (name: string, payload: unknown) => Promise<unknown> } },
      ctx: Context<unknown, BrokerMeta>,
      _route: unknown,
      req: { method: string; url: string; headers: Record<string, string | undefined> }
    ) {
      const method = req.method.toUpperCase();
      const endpointKey = `${method}:${normalizePath(req.url)}`;

      if (publicEndpoints.has(endpointKey)) {
        return null;
      }

      const rawHeader = req.headers.authorization;
      if (!rawHeader || !rawHeader.startsWith("Bearer ")) {
        throw new ApiGateway.Errors.UnAuthorizedError("NO_TOKEN", null);
      }

      const token = rawHeader.slice("Bearer ".length).trim();
      if (!token) {
        throw new ApiGateway.Errors.UnAuthorizedError("NO_TOKEN", null);
      }

      try {
        const user = (await this.broker.call("auth.verifyToken", { token })) as BrokerMeta["user"];
        if (!user) {
          throw new Errors.MoleculerClientError("Invalid token", 401, "INVALID_TOKEN");
        }

        ctx.meta.user = user;
        return user;
      } catch {
        throw new ApiGateway.Errors.UnAuthorizedError("INVALID_TOKEN", null);
      }
    }
  }
};

export default ApiService;
