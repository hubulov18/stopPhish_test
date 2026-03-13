import { Context, Errors, ServiceSchema } from "moleculer";
import { AppDataSource } from "../config/data-source";
import { Category } from "../entities/Category";
import { Note } from "../entities/Note";
import { BrokerMeta } from "../types/auth";
import { settings } from "../utils/env";
import { seedDatabase } from "../utils/seed";

const { MoleculerClientError, MoleculerServerError } = Errors;

type CategoryView = {
  id: number;
  name: string;
  color: string;
};

type NoteView = {
  id: number;
  title: string;
  content: string;
  category: CategoryView | null;
  createdAt: string;
  updatedAt: string;
};

type ListParams = {
  q?: string;
  categoryId?: number;
};

type IdParams = {
  id: number;
};

type CreateParams = {
  title: string;
  content: string;
  categoryId?: number | null;
};

type UpdateParams = {
  id: number;
  title?: string;
  content?: string;
  categoryId?: number | null;
};

const notesRepository = () => {
  if (!AppDataSource.isInitialized) {
    throw new MoleculerServerError("Database connection is not ready", 500, "DB_NOT_READY");
  }

  return AppDataSource.getRepository(Note);
};

const categoryRepository = () => {
  if (!AppDataSource.isInitialized) {
    throw new MoleculerServerError("Database connection is not ready", 500, "DB_NOT_READY");
  }

  return AppDataSource.getRepository(Category);
};

const requireUserId = (ctx: Context<unknown, BrokerMeta>): number => {
  if (!ctx.meta.user?.id) {
    throw new MoleculerClientError("Unauthorized", 401, "UNAUTHORIZED");
  }

  return ctx.meta.user.id;
};

const formatNote = (note: Note): NoteView => ({
  id: note.id,
  title: note.title,
  content: note.content,
  category: note.category
    ? {
        id: note.category.id,
        name: note.category.name,
        color: note.category.color
      }
    : null,
  createdAt: note.createdAt.toISOString(),
  updatedAt: note.updatedAt.toISOString()
});

const verifyCategoryOwnership = async (
  userId: number,
  categoryId: number | null | undefined
): Promise<number | null | undefined> => {
  if (categoryId === undefined) {
    return undefined;
  }

  if (categoryId === null) {
    return null;
  }

  const repository = categoryRepository();
  const category = await repository.findOne({ where: { id: categoryId, userId } });
  if (!category) {
    throw new MoleculerClientError("Category not found", 404, "CATEGORY_NOT_FOUND");
  }

  return category.id;
};

const NotesService: ServiceSchema = {
  name: "notes",

  actions: {
    list: {
      params: {
        q: { type: "string", optional: true, empty: false, trim: true, max: 120 },
        categoryId: { type: "number", optional: true, integer: true, positive: true, convert: true }
      },
      async handler(ctx: Context<ListParams, BrokerMeta>) {
        const userId = requireUserId(ctx);
        const repository = notesRepository();

        const query = ctx.params.q?.trim();
        const qb = repository
          .createQueryBuilder("note")
          .leftJoinAndSelect("note.category", "category")
          .where('note."userId" = :userId', { userId });

        if (ctx.params.categoryId) {
          qb.andWhere('note."categoryId" = :categoryId', { categoryId: ctx.params.categoryId });
        }

        if (query) {
          qb.andWhere('note."searchVector" @@ plainto_tsquery(\'simple\', :query)', { query });
          qb.addSelect('ts_rank(note."searchVector", plainto_tsquery(\'simple\', :query))', "rank")
            .orderBy("rank", "DESC")
            .addOrderBy('note."updatedAt"', "DESC");
        } else {
          qb.orderBy('note."updatedAt"', "DESC");
        }

        const items = await qb.getMany();
        return items.map(formatNote);
      }
    },

    get: {
      params: {
        id: { type: "number", integer: true, positive: true, convert: true }
      },
      async handler(ctx: Context<IdParams, BrokerMeta>) {
        const userId = requireUserId(ctx);
        const repository = notesRepository();

        const note = await repository.findOne({
          where: { id: ctx.params.id, userId },
          relations: { category: true }
        });

        if (!note) {
          throw new MoleculerClientError("Note not found", 404, "NOTE_NOT_FOUND");
        }

        return formatNote(note);
      }
    },

    create: {
      params: {
        title: { type: "string", min: 1, max: 160, trim: true },
        content: { type: "string", min: 1, max: 20000, trim: true },
        categoryId: { type: "number", integer: true, positive: true, optional: true, nullable: true, convert: true }
      },
      async handler(ctx: Context<CreateParams, BrokerMeta>) {
        const userId = requireUserId(ctx);
        const repository = notesRepository();
        const checkedCategoryId = await verifyCategoryOwnership(userId, ctx.params.categoryId);

        const note = repository.create({
          title: ctx.params.title,
          content: ctx.params.content,
          userId,
          categoryId: checkedCategoryId === undefined ? null : checkedCategoryId
        });

        const saved = await repository.save(note);
        const withCategory = await repository.findOne({
          where: { id: saved.id, userId },
          relations: { category: true }
        });

        if (!withCategory) {
          throw new MoleculerServerError("Created note cannot be loaded", 500, "NOTE_RELOAD_FAILED");
        }

        return formatNote(withCategory);
      }
    },

    update: {
      params: {
        id: { type: "number", integer: true, positive: true, convert: true },
        title: { type: "string", min: 1, max: 160, trim: true, optional: true },
        content: { type: "string", min: 1, max: 20000, trim: true, optional: true },
        categoryId: { type: "number", integer: true, positive: true, optional: true, nullable: true, convert: true }
      },
      async handler(ctx: Context<UpdateParams, BrokerMeta>) {
        const userId = requireUserId(ctx);
        const repository = notesRepository();

        const note = await repository.findOne({
          where: { id: ctx.params.id, userId },
          relations: { category: true }
        });

        if (!note) {
          throw new MoleculerClientError("Note not found", 404, "NOTE_NOT_FOUND");
        }

        const payload: Partial<Pick<Note, "title" | "content" | "categoryId">> = {};

        if (typeof ctx.params.title === "string") {
          payload.title = ctx.params.title;
        }

        if (typeof ctx.params.content === "string") {
          payload.content = ctx.params.content;
        }

        if (ctx.params.categoryId !== undefined) {
          payload.categoryId = await verifyCategoryOwnership(userId, ctx.params.categoryId);
          if (payload.categoryId === null) {
            note.category = null;
          }
        }

        if (
          payload.title === undefined &&
          payload.content === undefined &&
          payload.categoryId === undefined
        ) {
          throw new MoleculerClientError("Nothing to update: pass title, content or categoryId", 422, "EMPTY_PATCH");
        }

        repository.merge(note, payload);
        const saved = await repository.save(note);

        const withCategory = await repository.findOne({
          where: { id: saved.id, userId },
          relations: { category: true }
        });

        if (!withCategory) {
          throw new MoleculerServerError("Updated note cannot be loaded", 500, "NOTE_RELOAD_FAILED");
        }

        return formatNote(withCategory);
      }
    },

    remove: {
      params: {
        id: { type: "number", integer: true, positive: true, convert: true }
      },
      async handler(ctx: Context<IdParams, BrokerMeta>) {
        const userId = requireUserId(ctx);
        const repository = notesRepository();
        const note = await repository.findOneBy({ id: ctx.params.id, userId });

        if (!note) {
          throw new MoleculerClientError("Note not found", 404, "NOTE_NOT_FOUND");
        }

        await repository.remove(note);

        return {
          id: ctx.params.id,
          deleted: true
        };
      }
    }
  },

  async started(this: { logger: { info: (msg: string) => void } }) {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      await AppDataSource.runMigrations();
      this.logger.info("Database is connected and migrations are applied");
    }

    if (settings.seedOnStart) {
      const result = await seedDatabase(AppDataSource);
      const total = result.insertedUsers + result.insertedCategories + result.insertedNotes;
      if (total > 0) {
        this.logger.info(
          `Seed completed: users=${result.insertedUsers}, categories=${result.insertedCategories}, notes=${result.insertedNotes}`
        );
      }
    }
  },

  async stopped() {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};

export default NotesService;
