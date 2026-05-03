import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "login",
    component: () => import("@/features/auth/pages/LoginPage.vue"),
    meta: { public: true }
  },
  { path: "/", redirect: "/dashboard" },
  {
    path: "/dashboard",
    name: "dashboard",
    component: () => import("@/features/dashboard/pages/DashboardPage.vue"),
  },
  {
    path: "/cases",
    name: "cases",
    component: () => import("@/features/cases/pages/CasesPage.vue"),
  },
  {
    path: "/evidence",
    name: "evidence",
    component: () => import("@/features/evidence/pages/EvidencePage.vue"),
  },
  {
    path: "/evidence-list",
    name: "evidence-list",
    component: () => import("@/features/evidence/pages/EvidenceListPage.vue"),
  },
  {
    path: "/relations",
    name: "relations",
    redirect: "/relations/upstream",
    component: () => import("@/features/relations/pages/RelationsPage.vue"),
    children: [
      {
        path: "upstream",
        name: "relations-upstream",
        component: () => import("@/features/relations/pages/RelationsPage.vue"),
      },
      {
        path: "crosscase",
        name: "relations-crosscase",
        component: () => import("@/features/relations/pages/RelationsPage.vue"),
      },
    ],
  },
  {
    path: "/ledger",
    name: "ledger",
    redirect: "/ledger/person",
    component: () => import("@/features/ledger/pages/LedgerPage.vue"),
    children: [
      {
        path: "person",
        name: "ledger-person",
        component: { render: () => null },
      },
      {
        path: "fund",
        name: "ledger-fund",
        component: { render: () => null },
      },
      {
        path: "evidence",
        name: "ledger-evidence",
        component: () => import("@/features/ledger/pages/EvidenceListPage.vue"),
      },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ left: 0, top: 0 }),
});

// 全局路由守卫：以 authService 为唯一鉴权判断入口
import { isLoggedIn } from "@/services/auth/authService";

router.beforeEach((to, _from, next) => {
  const logged = isLoggedIn();

  // 1. 已登录用户访问公共页面（登录页）→ 跳转主页
  if (to.meta.public && logged) {
    next('/dashboard');
    return;
  }

  // 2. 未登录用户访问受保护页面 → 强制跳转登录页
  if (!to.meta.public && !logged) {
    next('/login');
    return;
  }

  next();
});

