import { createRouter, createWebHistory } from "vue-router";
import AuthPage from "./pages/AuthPage.vue";
import NotesPage from "./pages/NotesPage.vue";
import { AUTH_TOKEN_KEY } from "./stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/notes"
    },
    {
      path: "/auth",
      name: "auth",
      component: AuthPage,
      meta: { requiresGuest: true }
    },
    {
      path: "/notes",
      name: "notes",
      component: NotesPage,
      meta: { requiresAuth: true }
    }
  ]
});

router.beforeEach((to) => {
  const hasToken = Boolean(localStorage.getItem(AUTH_TOKEN_KEY));

  if (to.meta.requiresAuth && !hasToken) {
    return { name: "auth" };
  }

  if (to.meta.requiresGuest && hasToken) {
    return { name: "notes" };
  }

  return true;
});

export default router;
