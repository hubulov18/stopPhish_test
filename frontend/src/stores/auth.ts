import { defineStore } from "pinia";
import { fetchMe, loginUser, registerUser } from "../api/auth";
import type { User } from "../types/note";

export const AUTH_TOKEN_KEY = "notes_desk_token";

type AuthState = {
  accessToken: string | null;
  currentUser: User | null;
  isBootstrapping: boolean;
};

export const useAuthStore = defineStore("auth", {
  state: (): AuthState => ({
    accessToken: localStorage.getItem(AUTH_TOKEN_KEY),
    currentUser: null,
    isBootstrapping: false
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken)
  },

  actions: {
    setSession(token: string, user: User) {
      this.accessToken = token;
      this.currentUser = user;
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    },

    clearSession() {
      this.accessToken = null;
      this.currentUser = null;
      localStorage.removeItem(AUTH_TOKEN_KEY);
    },

    async bootstrap() {
      if (!this.accessToken || this.isBootstrapping) {
        return;
      }

      this.isBootstrapping = true;
      try {
        this.currentUser = await fetchMe(this.accessToken);
      } catch {
        this.clearSession();
      } finally {
        this.isBootstrapping = false;
      }
    },

    async login(payload: { email: string; password: string }) {
      const response = await loginUser(payload);
      this.setSession(response.accessToken, response.user);
      return response;
    },

    async register(payload: { email: string; name: string; password: string }) {
      const response = await registerUser(payload);
      this.setSession(response.accessToken, response.user);
      return response;
    }
  }
});
