<!-- src/pages/home/index.vue -->
<template>
  <div class="container">
    <!-- 顶部渐变背景板 -->
    <div class="header-section">
      <!-- 语言切换按钮 -->
      <div class="lang-switch-bar">
        <div class="lang-btn" @click="switchLang">
          <span class="icon">🌐</span>
          <span>{{ t("home.switchLangBtn") }}</span>
        </div>
      </div>

      <div class="welcome-text">
        <span class="title">{{ t("home.title") }}</span>
        <span class="subtitle">{{ t("home.subtitle") }}</span>
      </div>
    </div>

    <!-- 操作卡片列表区 -->
    <div class="menu-list">
      <!-- 待办任务 -->
      <div
        :class="['menu-card', { 'disabled-card': isDisabled }]"
        @click="goToTodo"
      >
        <div class="card-left">
          <div class="icon-box todo-bg" style="position: relative">
            <span>📅</span>
            <div class="badge" v-if="todoCount > 0">{{ todoCount }}</div>
          </div>
          <div class="card-text">
            <span class="menu-name">{{ t("home.todo") }}</span>
            <span class="menu-desc">{{ t("home.todoDesc") }}</span>
          </div>
        </div>
        <div class="card-arrow">&gt;</div>
      </div>

      <!-- 全部线索 -->
      <div
        :class="['menu-card', { 'disabled-card': isDisabled }]"
        @click="goToAll"
      >
        <div class="card-left">
          <div class="icon-box all-bg">👥</div>
          <div class="card-text">
            <span class="menu-name">{{ t("home.all") }}</span>
            <span class="menu-desc">{{ t("home.allDesc") }}</span>
          </div>
        </div>
        <div class="card-arrow">&gt;</div>
      </div>

      <!-- 手动添加客户 -->
      <div
        :class="['menu-card', { 'disabled-card': isDisabled }]"
        @click="goToAddCustomer"
        v-if="!isVisitor"
      >
        <div class="card-left">
          <div
            class="icon-box"
            style="background-color: #d1fae5; color: #10b981"
          >
            ➕
          </div>
          <div class="card-text">
            <span class="menu-name">{{ t("home.addCustomer") }}</span>
            <span class="menu-desc">{{ t("home.addCustomerDesc") }}</span>
          </div>
        </div>
        <div class="card-arrow">&gt;</div>
      </div>

      <!-- 工作汇报 -->
      <div
        :class="['menu-card', { 'disabled-card': isDisabled }]"
        @click="goToWorkReport"
        v-if="!isVisitor"
      >
        <div class="card-left">
          <div class="icon-box report-bg">📊</div>
          <div class="card-text">
            <span class="menu-name">{{ t("home.workReport") }}</span>
            <span class="menu-desc">{{ t("home.workReportDesc") }}</span>
          </div>
        </div>
        <div class="card-arrow">&gt;</div>
      </div>

      <div class="form-section">
        <div class="section-title">
          <span class="icon">⚙️</span>
          <span>{{ t("common.settings", "设置") }}</span>
        </div>

        <van-cell-group inset>
          <van-cell
            :title="t('common.logout', '退出登录')"
            icon="revoke"
            is-link
            @click="handleLogout"
            title-style="color: #ef4444; font-weight: bold;"
          />
        </van-cell-group>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { showDialog } from "vant"; // 替代 wx.showModal
import request from "../../utils/request";
import { storage } from "../../utils/storage";
import { showConfirmDialog, showToast } from 'vant'; // 确保引入了弹窗组件

const router = useRouter();
const { t, locale } = useI18n();

// 响应式状态
const isVisitor = ref(true);
const isDisabled = ref(false);
const todoCount = ref(0);

// 生命周期替代：在页面挂载和每次从其他页面返回时触发 (对应 onShow)
onMounted(() => {
  initPage();
});
onActivated(() => {
  initPage();
});

const initPage = () => {
  checkUserRole();
  if (!isVisitor.value) {
    fetchTodoCount();
  }
};

// 语言切换逻辑（支持中、泰、越循环切换）
const switchLang = () => {
  const langCycle = { zh: "th", th: "vi", vi: "zh" };
  const nextLang = langCycle[locale.value] || "zh";

  locale.value = nextLang;
  storage.setStorageSync("UserLang", nextLang);
  document.title = t("home.title"); // 替代 wx.setNavigationBarTitle
};

// 身份权限校验与路由拦截
const checkUserRole = () => {
  const userInfo = storage.getStorageSync("UserInfo");
  if (!userInfo) {
    isVisitor.value = true;
    return;
  }

  // 🌟 核心修复：如果检测到是管理员，直接拦截并重定向到管理控制台
  if (userInfo.role === "admin") {
    // 使用 replace 而不是 push，防止用户按手机的“返回键”又退回到这个销售主页
    router.replace('/admin-home');
    return;
  }

  isDisabled.value = userInfo.status === "disabled";

  // 因为 admin 已经被拦截走了，这里只需要校验销售和经理即可
  const validRoles = ["sales", "manager"];
  isVisitor.value = !validRoles.includes(userInfo.role);
};

// 获取待办红点数字
const fetchTodoCount = async () => {
  try {
    const res = await request.get("/api/customers/todo/count");
    todoCount.value = res.count || 0;
  } catch (err) {
    console.error("获取待办失败:", err);
  }
};

const handleLogout = () => {
  showConfirmDialog({
    title: t('common.logoutConfirmTitle', '提示'),
    message: t('common.logoutConfirmMsg', '确定要退出当前账号并返回登录页吗？'),
    confirmButtonColor: '#ef4444'
  }).then(() => {
    // 1. 彻底清除本地身份缓存
    storage.removeStorageSync('Token');
    storage.removeStorageSync('UserInfo');
    
    // 2. 提示并跳转回登录页
    showToast({ type: 'success', message: t('common.logoutSuccess', '已退出登录') });
    router.replace('/login');
  }).catch(() => {
    // 点击取消，什么都不做
  });
};

// 极简拦截器：判断被禁用的弹窗提示
const checkDisabled = () => {
  if (isDisabled.value) {
    showDialog({
      title: t("common.alert"),
      message: t("home.disabledMsg"),
    });
    return true;
  }
  return false;
};

// 路由跳转替换 (wx.navigateTo -> router.push)
const goToTodo = () => {
  if (checkDisabled()) return;
  router.push({ path: "/sales-list", query: { type: "todo" } });
};

const goToAll = () => {
  if (checkDisabled()) return;
  router.push({ path: "/customer-list", query: { type: "all" } });
};

const goToAddCustomer = () => {
  if (checkDisabled()) return;
  router.push("/sale-add-customer"); // 注意这里去掉了原小程序的分包路径前缀
};

const goToWorkReport = () => {
  if (checkDisabled()) return;
  router.push("/work-report");
};
</script>

<style scoped>
/* 样式基本保留原味，但针对 H5 进行了单位降级 (rpx -> px) */
.container {
  background-color: #f4f6f9;
  min-height: 100vh;
}

.header-section {
  width: 100%;
  background: linear-gradient(135deg, #07c160 0%, #05a050 100%);
  padding: 20px 20px 50px 20px;
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
  box-shadow: 0 4px 15px rgba(7, 193, 96, 0.3);
  margin-bottom: -30px;
  z-index: 1;
  position: relative;
  box-sizing: border-box;
}

.lang-switch-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 25px;
}

.lang-btn {
  display: inline-flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: bold;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
  cursor: pointer;
}

.lang-btn .icon {
  margin-right: 6px;
  font-size: 14px;
}

.welcome-text {
  display: flex;
  flex-direction: column;
  color: #fff;
  padding-left: 10px;
}

.welcome-text .title {
  font-size: 26px;
  font-weight: bold;
  margin-bottom: 6px;
}

.welcome-text .subtitle {
  font-size: 14px;
  opacity: 0.9;
}

.menu-list {
  width: 90%;
  margin: 0 auto;
  position: relative;
  z-index: 10;
}

.menu-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}

.menu-card:active {
  background: #fafafa;
  transform: scale(0.98);
}

.card-left {
  display: flex;
  align-items: center;
}

.icon-box {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  margin-right: 15px;
}

.todo-bg {
  background: #fff0f6;
}
.all-bg {
  background: #e6f7ff;
}
.report-bg {
  background: #f9f0ff;
}

.card-text {
  display: flex;
  flex-direction: column;
}

.menu-name {
  font-size: 17px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.menu-desc {
  font-size: 12px;
  color: #888;
}

.card-arrow {
  font-size: 18px;
  color: #ccc;
  font-weight: bold;
  font-family: monospace;
}

.badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background-color: #ff4d4f;
  color: #ffffff;
  font-size: 11px;
  padding: 0 5px;
  height: 16px;
  line-height: 16px;
  border-radius: 8px;
  font-weight: bold;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(255, 77, 79, 0.3);
  z-index: 10;
  min-width: 8px;
  text-align: center;
}

.disabled-card {
  filter: grayscale(100%);
  opacity: 1;
}
</style>
