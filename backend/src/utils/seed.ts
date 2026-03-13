import { DataSource, IsNull } from "typeorm";
import { Category } from "../entities/Category";
import { Note } from "../entities/Note";
import { User } from "../entities/User";
import { hashPassword } from "./auth";

const demoUser = {
  email: "test@mail.ru",
  name: "Test user",
  password: "test12345"
};

const demoCategories = [
  { name: "Работа", color: "#8c4a2f" },
  { name: "Учеба", color: "#4f7a54" },
  { name: "Не срочные дела", color: "#4f6d9a" }
];

const demoNotes = [
  {
    title: "Напоминание о встрече",
    content:
      "В 10 часов утра нужно позвонить Ивану для уточнения деталей по сделке",
    categoryName: "Не срочные дела"
  },
  {
    title: "Постричь газон",
    content:
      "Постричь газон в форме черепашки)))",
    categoryName: "Работа"
  },
  {
    title: "Закрыть задачу по сбору данных по категориям Ozon",
    content:
      "Починить парсер для сбор данных по основным категориям",
    categoryName: "Работа"
  }
];

export const seedDatabase = async (dataSource: DataSource): Promise<{ insertedUsers: number; insertedCategories: number; insertedNotes: number }> => {
  const userRepository = dataSource.getRepository(User);
  const categoryRepository = dataSource.getRepository(Category);
  const noteRepository = dataSource.getRepository(Note);

  let insertedUsers = 0;
  let insertedCategories = 0;
  let insertedNotes = 0;

  let user = await userRepository.findOne({ where: { email: demoUser.email } });
  if (!user) {
    user = userRepository.create({
      email: demoUser.email,
      name: demoUser.name,
      passwordHash: await hashPassword(demoUser.password)
    });
    user = await userRepository.save(user);
    insertedUsers = 1;
  }

  const legacyUnownedNotes = await noteRepository.count({ where: { userId: IsNull() } });
  if (legacyUnownedNotes > 0) {
    await noteRepository
      .createQueryBuilder()
      .update(Note)
      .set({ userId: user.id })
      .where('"userId" IS NULL')
      .execute();
  }

  const existingCategories = await categoryRepository.find({ where: { userId: user.id } });
  if (existingCategories.length === 0) {
    const payload = demoCategories.map((item) =>
      categoryRepository.create({
        ...item,
        userId: user.id
      })
    );
    await categoryRepository.save(payload);
    insertedCategories = payload.length;
  }

  const categoryByName = new Map<string, Category>();
  const categories = await categoryRepository.find({ where: { userId: user.id } });
  categories.forEach((category) => categoryByName.set(category.name, category));

  const existingUserNotesCount = await noteRepository.count({ where: { userId: user.id } });
  if (existingUserNotesCount === 0) {
    const payload = demoNotes.map((item) =>
      noteRepository.create({
        title: item.title,
        content: item.content,
        userId: user.id,
        categoryId: categoryByName.get(item.categoryName)?.id ?? null
      })
    );

    await noteRepository.save(payload);
    insertedNotes = payload.length;
  } else {
    const uncategorized = await noteRepository.find({
      where: {
        userId: user.id,
        categoryId: IsNull()
      },
      order: { id: "ASC" }
    });

    if (uncategorized.length > 0 && categories.length > 0) {
      const workId = categoryByName.get("Работа")?.id ?? categories[0].id;
      const ideaId = categoryByName.get("Учеба")?.id ?? categories[0].id;
      const homeId = categoryByName.get("Не срочные дела")?.id ?? categories[0].id;
      const fallback = [workId, ideaId, homeId];

      let pointer = 0;
      uncategorized.forEach((note) => {
        const title = note.title.toLowerCase();

        if (title.includes("Уче")) {
          note.categoryId = ideaId;
          return;
        }

        if (title.includes("сро") || title.includes("де")) {
          note.categoryId = workId;
          return;
        }

        note.categoryId = fallback[pointer % fallback.length];
        pointer += 1;
      });

      await noteRepository.save(uncategorized);
    }
  }

  return {
    insertedUsers,
    insertedCategories,
    insertedNotes
  };
};
