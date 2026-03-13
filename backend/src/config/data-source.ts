import "reflect-metadata";
import { DataSource } from "typeorm";
import { Category } from "../entities/Category";
import { Note } from "../entities/Note";
import { User } from "../entities/User";
import { CreateNotesTable1710000000000 } from "../migrations/1710000000000-CreateNotesTable";
import { UsersCategoriesFts1710000000001 } from "../migrations/1710000000001-UsersCategoriesFts";
import { settings } from "../utils/env";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: settings.dbHost,
  port: settings.dbPort,
  username: settings.dbUser,
  password: settings.dbPassword,
  database: settings.dbName,
  entities: [User, Category, Note],
  migrations: [CreateNotesTable1710000000000, UsersCategoriesFts1710000000001],
  synchronize: false,
  logging: settings.dbLogging
});
