import { MigrationInterface, QueryRunner } from "typeorm";

export class UsersCategoriesFts1710000000001 implements MigrationInterface {
  name = "UsersCategoriesFts1710000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(190) NOT NULL UNIQUE,
        name VARCHAR(120) NOT NULL,
        "passwordHash" VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        color VARCHAR(24) NOT NULL DEFAULT '#9a4f24',
        "userId" INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE ("userId", name)
      )
    `);

    await queryRunner.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS "userId" INT`);
    await queryRunner.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS "categoryId" INT`);
    await queryRunner.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS "searchVector" tsvector`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notes_user') THEN
          ALTER TABLE notes
          ADD CONSTRAINT fk_notes_user
          FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notes_category') THEN
          ALTER TABLE notes
          ADD CONSTRAINT fk_notes_category
          FOREIGN KEY ("categoryId") REFERENCES categories(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notes_category_id ON notes ("categoryId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_notes_search_vector ON notes USING GIN ("searchVector")`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_notes_search_vector()
      RETURNS trigger AS $$
      BEGIN
        NEW."searchVector" := to_tsvector('simple', coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_notes_search_vector ON notes`);
    await queryRunner.query(`
      CREATE TRIGGER trg_notes_search_vector
      BEFORE INSERT OR UPDATE OF title, content
      ON notes
      FOR EACH ROW
      EXECUTE FUNCTION update_notes_search_vector();
    `);

    await queryRunner.query(`
      UPDATE notes
      SET "searchVector" = to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
      WHERE "searchVector" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_notes_search_vector ON notes`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_notes_search_vector`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notes_search_vector`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_categories_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notes_category_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notes_user_id`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notes_category') THEN
          ALTER TABLE notes DROP CONSTRAINT fk_notes_category;
        END IF;

        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_notes_user') THEN
          ALTER TABLE notes DROP CONSTRAINT fk_notes_user;
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE notes DROP COLUMN IF EXISTS "searchVector"`);
    await queryRunner.query(`ALTER TABLE notes DROP COLUMN IF EXISTS "categoryId"`);
    await queryRunner.query(`ALTER TABLE notes DROP COLUMN IF EXISTS "userId"`);

    await queryRunner.query(`DROP TABLE IF EXISTS categories`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
