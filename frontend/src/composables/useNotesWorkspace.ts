import { computed, reactive, ref, watch } from "vue";
import { createCategory, fetchCategories } from "../api/categories";
import { ApiError } from "../api/http";
import { createNote, deleteNote, fetchNote, fetchNotes, updateNote } from "../api/notes";
import type { Category, Note } from "../types/note";

type TokenGetter = () => string;

const withFallbackError = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Произошла ошибка. Подробности в консоли.";
};

export const useNotesWorkspace = (takeToken: TokenGetter) => {
  const categories = ref<Category[]>([]);
  const notes = ref<Note[]>([]);

  const loading = ref(false);
  const saving = ref(false);
  const deleting = ref(false);
  const creatingCategory = ref(false);

  const searchTerm = ref("");
  const filterCategoryId = ref<number | null>(null);
  const errorMessage = ref("");

  const activeNoteId = ref<number | null>(null);
  const isDraft = ref(true);

  const editor = reactive({
    title: "",
    content: "",
    categoryId: null as number | null
  });

  const categoryDraft = reactive({
    name: "",
    color: "#9a4f24"
  });

  let searchTimer: number | undefined;

  const activeNote = computed(() =>
    activeNoteId.value === null
      ? null
      : notes.value.find((note) => note.id === activeNoteId.value) ?? null
  );

  const formTitle = computed(() => (isDraft.value ? "Новая заметка" : "Редактирование"));

  const groupedNotes = computed(() => {
    const bucket = new Map<string, { label: string; items: Note[] }>();

    notes.value.forEach((note) => {
      const key = note.category ? `cat-${note.category.id}` : "uncategorized";
      const label = note.category ? note.category.name : "Без категории";

      if (!bucket.has(key)) {
        bucket.set(key, { label, items: [] });
      }

      bucket.get(key)?.items.push(note);
    });

    return Array.from(bucket.values()).sort((a, b) => a.label.localeCompare(b.label, "ru-RU"));
  });

  const beginDraft = () => {
    activeNoteId.value = null;
    isDraft.value = true;
    editor.title = "";
    editor.content = "";
    editor.categoryId = filterCategoryId.value;
  };

  const loadCategories = async () => {
    try {
      const items = await fetchCategories(takeToken());
      categories.value = items;

      if (
        filterCategoryId.value !== null &&
        !items.some((item) => item.id === filterCategoryId.value)
      ) {
        filterCategoryId.value = null;
      }
    } catch (error) {
      console.error(error);
      errorMessage.value = withFallbackError(error);
    }
  };

  const loadNotes = async (query?: string) => {
    try {
      loading.value = true;
      const items = await fetchNotes(takeToken(), query, filterCategoryId.value);
      notes.value = items;

      if (activeNoteId.value !== null && !items.some((note) => note.id === activeNoteId.value)) {
        beginDraft();
      }
    } catch (error) {
      console.error(error);
      errorMessage.value = withFallbackError(error);
    } finally {
      loading.value = false;
    }
  };

  const pickNote = async (noteId: number) => {
    try {
      loading.value = true;
      const note = await fetchNote(takeToken(), noteId);
      activeNoteId.value = note.id;
      isDraft.value = false;
      editor.title = note.title;
      editor.content = note.content;
      editor.categoryId = note.category?.id ?? null;
    } catch (error) {
      console.error(error);
      errorMessage.value = withFallbackError(error);
    } finally {
      loading.value = false;
    }
  };

  const validateEditor = (): string | null => {
    if (!editor.title.trim()) {
      return "Укажите заголовок заметки";
    }

    if (!editor.content.trim()) {
      return "Заполните текст заметки";
    }

    return null;
  };

  const saveCurrent = async () => {
    const validationError = validateEditor();
    if (validationError) {
      errorMessage.value = validationError;
      return;
    }

    try {
      saving.value = true;
      errorMessage.value = "";

      if (isDraft.value || activeNoteId.value === null) {
        const created = await createNote(takeToken(), {
          title: editor.title.trim(),
          content: editor.content.trim(),
          categoryId: editor.categoryId
        });

        await loadNotes(searchTerm.value);
        await pickNote(created.id);
        return;
      }

      const updated = await updateNote(takeToken(), activeNoteId.value, {
        title: editor.title.trim(),
        content: editor.content.trim(),
        categoryId: editor.categoryId
      });

      await loadNotes(searchTerm.value);
      await pickNote(updated.id);
    } catch (error) {
      console.error(error);
      errorMessage.value = withFallbackError(error);
    } finally {
      saving.value = false;
    }
  };

  const removeCurrent = async () => {
    if (activeNoteId.value === null) {
      return;
    }

    const allow = window.confirm("Удалить заметку без возможности восстановления?");
    if (!allow) {
      return;
    }

    try {
      deleting.value = true;
      await deleteNote(takeToken(), activeNoteId.value);
      await loadNotes(searchTerm.value);
      beginDraft();
    } catch (error) {
      console.error(error);
      errorMessage.value = withFallbackError(error);
    } finally {
      deleting.value = false;
    }
  };

  const createNewCategory = async () => {
    if (!categoryDraft.name.trim()) {
      errorMessage.value = "Введите название категории";
      return;
    }

    try {
      creatingCategory.value = true;
      const created = await createCategory(takeToken(), {
        name: categoryDraft.name.trim(),
        color: categoryDraft.color
      });

      categories.value = [...categories.value, created].sort((a, b) =>
        a.name.localeCompare(b.name, "ru-RU")
      );

      categoryDraft.name = "";
    } catch (error) {
      console.error(error);
      errorMessage.value = withFallbackError(error);
    } finally {
      creatingCategory.value = false;
    }
  };

  watch(
    searchTerm,
    (value) => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        void loadNotes(value);
      }, 250);
    },
    { flush: "post" }
  );

  watch(filterCategoryId, () => {
    beginDraft();
    void loadNotes(searchTerm.value);
  });

  return {
    categories,
    notes,
    loading,
    saving,
    deleting,
    creatingCategory,
    searchTerm,
    filterCategoryId,
    errorMessage,
    activeNote,
    activeNoteId,
    isDraft,
    editor,
    categoryDraft,
    formTitle,
    groupedNotes,
    beginDraft,
    loadCategories,
    loadNotes,
    pickNote,
    saveCurrent,
    removeCurrent,
    createNewCategory
  };
};
