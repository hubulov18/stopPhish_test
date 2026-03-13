<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useNotesWorkspace } from "../composables/useNotesWorkspace";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();

const takeToken = () => {
  if (!auth.accessToken) {
    throw new Error("No access token");
  }
  return auth.accessToken;
};

const {
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
} = useNotesWorkspace(takeToken);

const stamp = (isoDate: string | null) => {
  if (!isoDate) {
    return "—";
  }
  return new Date(isoDate).toLocaleString("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const userEmail = computed(() => auth.currentUser?.email ?? "");

const logout = async () => {
  auth.clearSession();
  await router.push({ name: "auth" });
};

onMounted(async () => {
  await auth.bootstrap();

  if (!auth.isAuthenticated) {
    await router.push({ name: "auth" });
    return;
  }

  beginDraft();
  await Promise.all([loadCategories(), loadNotes()]);
});
</script>

<template>
  <div class="desk-shell">
    <header class="masthead">
      <div class="masthead-headrow">
        <h1 class="title-mark">Рабочий стол заметок</h1>
        <div class="masthead-profile">
          <span>{{ userEmail }}</span>
          <button class="desk-button desk-button--ghost" type="button" @click="logout">Выйти</button>
        </div>
      </div>
    </header>

    <main class="layout-grid">
      <aside class="rail-panel rail-panel--wide">
        <div class="panel-head">
          <h2 class="panel-title">Каталог</h2>
          <button class="desk-button" type="button" @click="beginDraft">+ Новая</button>
        </div>

        <label class="field">
          <span class="field__label">Поиск</span>
          <input v-model="searchTerm" type="text" placeholder="Полнотекстовый поиск" class="desk-input" />
        </label>

        <label class="field">
          <span class="field__label">Фильтр категории</span>
          <select v-model="filterCategoryId" class="desk-input">
            <option :value="null">Все категории</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </label>

        <section class="control-block">
          <p class="control-title">Новая категория</p>
          <div class="control-row">
            <input v-model="categoryDraft.name" type="text" placeholder="Название" class="desk-input" />
            <input v-model="categoryDraft.color" type="color" class="color-dot" />
          </div>
          <button class="desk-button" type="button" :disabled="creatingCategory" @click="createNewCategory">
            {{ creatingCategory ? '...' : 'Добавить' }}
          </button>
        </section>

        <div class="scroll-area">
          <div v-for="group in groupedNotes" :key="group.label" class="group-block">
            <p class="group-label">Категория: {{ group.label }} · {{ group.items.length }}</p>
            <button
              v-for="note in group.items"
              :key="note.id"
              class="note-tile"
              :class="{ 'note-tile--active': note.id === activeNoteId && !isDraft }"
              type="button"
              @click="pickNote(note.id)"
            >
              <div class="note-tile__meta">
                <span v-if="note.category" class="note-chip" :style="{ borderColor: note.category.color, color: note.category.color }">
                  {{ note.category.name }}
                </span>
                <span>{{ stamp(note.updatedAt) }}</span>
              </div>
              <p class="note-tile__title">{{ note.title }}</p>
              <p class="note-excerpt">{{ note.content }}</p>
            </button>
          </div>

          <div v-if="!loading && notes.length === 0" class="empty-rail">
            По текущему фильтру заметок нет.
          </div>
        </div>
      </aside>

      <section class="paper-card paper-card--editor">
        <div class="panel-head">
          <div>
            <p class="field__label">Редактор</p>
            <h2 class="panel-title panel-title--editor">{{ formTitle }}</h2>
          </div>
          <div class="tag-row">
            <span class="tag">Создана: {{ stamp(activeNote?.createdAt ?? null) }}</span>
            <span class="tag">Обновлена: {{ stamp(activeNote?.updatedAt ?? null) }}</span>
          </div>
        </div>

        <form class="editor-form" @submit.prevent="saveCurrent">
          <label class="field">
            <span class="field__label">Категория</span>
            <select v-model="editor.categoryId" class="desk-input">
              <option :value="null">Без категории</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>

          <label class="field">
            <span class="field__label">Заголовок</span>
            <input
              v-model="editor.title"
              type="text"
              maxlength="160"
              placeholder="Например: Список задач на спринт"
              class="desk-input"
            />
          </label>

          <label class="field">
            <span class="field__label">Содержание</span>
            <textarea
              v-model="editor.content"
              placeholder="Опишите идею, задачу или заметку"
              rows="12"
              class="desk-input desk-textarea"
            />
          </label>

          <div class="editor-actions">
            <button class="desk-button" type="submit" :disabled="saving || loading">
              {{ saving ? 'Сохраняю...' : 'Сохранить' }}
            </button>
            <button class="desk-button desk-button--ghost" type="button" :disabled="activeNoteId === null || deleting" @click="removeCurrent">
              {{ deleting ? 'Удаляю...' : 'Удалить' }}
            </button>
            <button class="desk-button desk-button--light" type="button" :disabled="loading" @click="loadNotes(searchTerm)">
              Обновить
            </button>
          </div>
        </form>
      </section>
    </main>

    <transition name="toast">
      <div v-if="errorMessage" class="error-toast" @click="errorMessage = ''">
        {{ errorMessage }}
      </div>
    </transition>
  </div>
</template>
