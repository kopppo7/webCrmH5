// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { storage } from "../utils/storage";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../pages/login/index.vue"),
    meta: { requiresAuth: false },
  },
  {
    path: "/",
    name: "Home",
    component: () => import("../pages/home/index.vue"),
    meta: { requiresAuth: true },
  },

  // ==========================================
  // 管理员页面
  // ==========================================
  {
    path: "/admin-home",
    name: "AdminHome",
    component: () => import("../pages/admin-home/index.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/admin-add-user",
    name: "AdminAddUser",
    component: () => import("../pages/admin-add-user/index.vue"), 
    meta: { requiresAuth: true },
  },
  { 
    path: '/admin-user-list', 
    name: 'AdminUserList', 
    component: () => import('../pages/admin-user-list/index.vue'),
    meta: { requiresAuth: true } 
  },
  { 
    path: '/admin-dict-manage', 
    name: 'AdminDictMange', 
    component: () => import('../pages/admin-dict-manage/index.vue'),
    meta: { requiresAuth: true } 
  },
  { 
    path: '/admin-customer-assign', 
    name: 'AdminCustomerAssign', 
    component: () => import('../pages/admin-customer-assign/index.vue'),
    meta: { requiresAuth: true } 
  },
  { 
    path: '/admin-setting', 
    name: 'AdminSetting', 
    component: () => import('../pages/admin-setting/index.vue'),
    meta: { requiresAuth: true } 
  },
  { 
    path: '/admin-customer-pool', 
    name: 'adminCustomerPool', 
    component: () => import('../pages/admin-customer-pool/index.vue'),
    meta: { requiresAuth: true } 
  },

  // ==========================================
  // 销售业务页面
  // ==========================================
  { 
    path: '/customer-list', 
    name: 'customerList', 
    component: () => import('../pages/customer-list/index.vue'),
    meta: { requiresAuth: true } 
  },
  {
    path: "/sale-add-customer",
    name: "SaleAddCustomer",
    component: () => import("../pages/sale-add-customer/index.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/sales-list",
    name: "SalesList",
    component: () => import("../pages/sales-list/index.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/customer-detail",
    name: "CustomerDetail",
    component: () => import("../pages/customer-detail/index.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/follow-up",
    name: "FollowUp",
    component: () => import("../pages/follow-up/index.vue"),
    meta: { requiresAuth: true },
  },

  // ==========================================
  // 工作汇报页面 (完全对齐当前目录结构)
  // ==========================================
  {
    path: "/work-report",
    name: "WorkReport",
    component: () => import("../pages/work-report/index.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/work-report/daily",
    name: "ReportDaily",
    component: () => import("../pages/work-report/daily.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/work-report/weekly",
    name: "ReportWeekly",
    component: () => import("../pages/work-report/weekly.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/work-report/history",
    name: "ReportHistory",
    component: () => import("../pages/work-report/history.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/work-report/history-detail",
    name: "ReportHistoryDetail",
    component: () => import("../pages/work-report/history-detail.vue"),
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 全局鉴权拦截
router.beforeEach((to, from, next) => {
  const hasToken = storage.getStorageSync("Token");
  if (to.meta.requiresAuth !== false && !hasToken) {
    next({ path: "/login", query: { redirect: to.fullPath } });
  } else if (to.path === "/login" && hasToken) {
    next({ path: "/" });
  } else {
    next();
  }
});

export default router;