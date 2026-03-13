import { AppDataSource } from "../config/data-source";
import { seedDatabase } from "../utils/seed";

const run = async (): Promise<void> => {
  await AppDataSource.initialize();
  await AppDataSource.runMigrations();

  const result = await seedDatabase(AppDataSource);
  // eslint-disable-next-line no-console
  console.log(`Seed complete: users=${result.insertedUsers}, categories=${result.insertedCategories}, notes=${result.insertedNotes}`);

  await AppDataSource.destroy();
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
