import { Context, Errors, ServiceSchema } from "moleculer";
import { AppDataSource } from "../config/data-source";
import { Category } from "../entities/Category";
import { BrokerMeta } from "../types/auth";

const { MoleculerClientError, MoleculerServerError } = Errors;

type CategoryDto = {
  id: number;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

type CreateParams = {
  name: string;
  color?: string;
};

type UpdateParams = {
  id: number;
  name?: string;
  color?: string;
};

type IdParams = {
  id: number;
};

const categoryRepository = () => {
  if (!AppDataSource.isInitialized) {
    throw new MoleculerServerError("Database connection is not ready", 500, "DB_NOT_READY");
  }

  return AppDataSource.getRepository(Category);
};

const sanitizeColor = (color: string | undefined): string => {
  if (!color) {
    return "#9a4f24";
  }

  const normalized = color.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : "#9a4f24";
};

const formatCategory = (item: Category): CategoryDto => ({
  id: item.id,
  name: item.name,
  color: item.color,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString()
});

const requireUserId = (ctx: Context<unknown, BrokerMeta>): number => {
  if (!ctx.meta.user?.id) {
    throw new MoleculerClientError("Unauthorized", 401, "UNAUTHORIZED");
  }

  return ctx.meta.user.id;
};

const CategoriesService: ServiceSchema = {
  name: "categories",

  actions: {
    list: {
      async handler(ctx: Context<undefined, BrokerMeta>) {
        const userId = requireUserId(ctx);
        const repository = categoryRepository();

        const items = await repository.find({
          where: { userId },
          order: { name: "ASC" }
        });

        return items.map(formatCategory);
      }
    },

    create: {
      params: {
        name: { type: "string", min: 1, max: 120, trim: true },
        color: { type: "string", optional: true, max: 24 }
      },
      async handler(ctx: Context<CreateParams, BrokerMeta>) {
        const userId = requireUserId(ctx);
        const repository = categoryRepository();

        const name = ctx.params.name.trim();
        const existing = await repository.findOne({ where: { userId, name } });
        if (existing) {
          throw new MoleculerClientError("Category already exists", 409, "CATEGORY_EXISTS");
        }

        const created = repository.create({
          userId,
          name,
          color: sanitizeColor(ctx.params.color)
        });

        const saved = await repository.save(created);
        return formatCategory(saved);
      }
    },

    update: {
      params: {
        id: { type: "number", integer: true, positive: true, convert: true },
        name: { type: "string", min: 1, max: 120, trim: true, optional: true },
        color: { type: "string", optional: true, max: 24 }
      },
      async handler(ctx: Context<UpdateParams, BrokerMeta>) {
        const userId = requireUserId(ctx);
        const repository = categoryRepository();

        const category = await repository.findOne({ where: { id: ctx.params.id, userId } });
        if (!category) {
          throw new MoleculerClientError("Category not found", 404, "CATEGORY_NOT_FOUND");
        }

        if (!ctx.params.name && !ctx.params.color) {
          throw new MoleculerClientError("Nothing to update", 422, "EMPTY_PATCH");
        }

        if (ctx.params.name) {
          const conflict = await repository.findOne({
            where: { userId, name: ctx.params.name.trim() }
          });

          if (conflict && conflict.id !== category.id) {
            throw new MoleculerClientError("Category already exists", 409, "CATEGORY_EXISTS");
          }

          category.name = ctx.params.name.trim();
        }

        if (ctx.params.color) {
          category.color = sanitizeColor(ctx.params.color);
        }

        const saved = await repository.save(category);
        return formatCategory(saved);
      }
    },

    remove: {
      params: {
        id: { type: "number", integer: true, positive: true, convert: true }
      },
      async handler(ctx: Context<IdParams, BrokerMeta>) {
        const userId = requireUserId(ctx);
        const repository = categoryRepository();

        const category = await repository.findOne({ where: { id: ctx.params.id, userId } });
        if (!category) {
          throw new MoleculerClientError("Category not found", 404, "CATEGORY_NOT_FOUND");
        }

        await repository.remove(category);

        return {
          id: ctx.params.id,
          deleted: true
        };
      }
    }
  }
};

export default CategoriesService;
