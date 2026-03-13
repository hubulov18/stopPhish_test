<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ApiError } from "../api/http";
import { useAuthStore } from "../stores/auth";

const router = useRouter();
const auth = useAuthStore();

const mode = ref<"login" | "register">("login");
const loading = ref(false);
const errorMessage = ref("");

const form = reactive({
  email: "",
  password: "",
  name: ""
});

const normalizeError = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Произошла ошибка. Подробности в консоли.";
};

const submit = async () => {
  if (!form.email.trim() || !form.password.trim()) {
    errorMessage.value = "Заполните email и пароль";
    return;
  }

  if (mode.value === "register" && !form.name.trim()) {
    errorMessage.value = "Укажите имя для регистрации";
    return;
  }

  try {
    loading.value = true;
    errorMessage.value = "";

    if (mode.value === "register") {
      await auth.register({
        email: form.email.trim(),
        name: form.name.trim(),
        password: form.password
      });
    } else {
      await auth.login({
        email: form.email.trim(),
        password: form.password
      });
    }

    await router.push({ name: "notes" });
  } catch (error) {
    console.error(error);
    errorMessage.value = normalizeError(error);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="desk-shell">
    <header class="masthead masthead--auth">
      <div class="masthead-headrow">
        <h1 class="title-mark">Заметки</h1>
      </div>
    </header>

    <section class="auth-stage auth-stage--single">
      <section class="auth-panel">
        <div class="auth-switch">
          <button
            class="desk-button"
            :class="{ 'desk-button--light': mode !== 'login' }"
            type="button"
            @click="mode = 'login'"
          >
            Вход
          </button>
          <button
            class="desk-button"
            :class="{ 'desk-button--light': mode !== 'register' }"
            type="button"
            @click="mode = 'register'"
          >
            Регистрация
          </button>
        </div>

        <form class="auth-form" @submit.prevent="submit">
          <label class="field">
            <span class="field__label">Email</span>
            <input v-model="form.email" class="desk-input" type="email" placeholder="you@example.com" />
          </label>

          <label v-if="mode === 'register'" class="field">
            <span class="field__label">Имя</span>
            <input v-model="form.name" class="desk-input" type="text" placeholder="Ваше имя" />
          </label>

          <label class="field">
            <span class="field__label">Пароль</span>
            <input
              v-model="form.password"
              class="desk-input"
              type="password"
              placeholder="Минимум 8 символов"
            />
          </label>

          <button class="desk-button" type="submit" :disabled="loading">
            {{ loading ? 'Подождите...' : mode === 'login' ? 'Войти' : 'Создать аккаунт' }}
          </button>
        </form>

        <p class="auth-hint">Для seed-пользователя: test@mail.ru / test12345</p>
      </section>
    </section>

    <transition name="toast">
      <div v-if="errorMessage" class="error-toast" @click="errorMessage = ''">
        {{ errorMessage }}
      </div>
    </transition>
  </div>
</template>
