<!-- src/pages/login/index.vue -->
<template>
  <div class="h5-login-container">
    <!-- 移动端经典的大标题区域 -->
    <div class="h5-header">
      <div class="logo-box">
        <van-icon name="setting-o" size="36" color="#ffffff" />
      </div>
      <h1 class="h5-title">{{ t('login.welcome') }}</h1>
      <p class="h5-subtitle">{{ t('login.sysName') }}</p>
    </div>

    <!-- 移动端表单，去掉边框和卡片感 -->
    <van-form @submit="onSubmit" class="h5-form">
      <van-cell-group inset class="h5-cell-group">
        <van-field
          v-model="username"
          name="username"
          size="large"
          clearable
          left-icon="user-o"
          :placeholder="t('login.accountPlaceholder')"
          :rules="[{ required: true, message: 'Cannot be empty' }]"
        />
        
        <van-field
          v-model="password"
          type="password"
          name="password"
          size="large"
          clearable
          left-icon="closed-eye"
          :placeholder="t('login.passwordPlaceholder')"
          :rules="[{ required: true, message: 'Cannot be empty' }]"
        />
      </van-cell-group>
      
      <!-- 触控友好的大按钮 -->
      <div class="h5-submit-wrap">
        <van-button 
          round 
          block 
          type="primary" 
          native-type="submit" 
          class="h5-btn"
          :loading="isLoading"
          loading-text="loading..."
        >
          {{ t('login.submit') }}
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { showToast } from 'vant';
import request from '../../utils/request';
import { storage } from '../../utils/storage';
import { useI18n } from 'vue-i18n';
const { t, locale } = useI18n();

const router = useRouter();
const route = useRoute();

const username = ref('');
const password = ref('');
const isLoading = ref(false);

const onSubmit = async (values) => {
  isLoading.value = true;
  try {
    const res = await request.post('/api/auth/login', {
      username: values.username,
      password: values.password
    });

    if (res.data && res.data.token) {
      storage.setStorageSync('Token', res.data.token);
      
      if (res.data.userInfo) {
        storage.setStorageSync('UserInfo', res.data.userInfo);
        
        // 核心语言切换逻辑：
        if (res.data.userInfo.lang) {
          storage.setStorageSync('UserLang', res.data.userInfo.lang); 
          locale.value = res.data.userInfo.lang; 
        }
      }
      
      showToast({ type: 'success', message: '登录成功' });

      // 🌟 核心修改点：角色路由智能分发逻辑
      const userRole = res.data.userInfo.role;
      let targetPath = '/'; // 默认情况：跳去销售主页
      
      if (userRole === 'admin') {
        targetPath = '/admin-home'; // 如果是管理员：跳去专属管理看板
      }

      // 如果 URL 带有 redirect 参数，优先跳回原请求页面；否则跳往分发后的主页
      const redirect = route.query.redirect || targetPath;
      router.replace(redirect);
    }
  } catch (error) {
    console.error('登录异常:', error);
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* 纯正的移动端全屏布局 */
.h5-login-container {
  min-height: 100vh;
  background-color: #ffffff; /* 移动端常见的纯白背景 */
  display: flex;
  flex-direction: column;
  padding: 0 24px;
  box-sizing: border-box;
}

/* 头部区域：下沉、左对齐，非常经典的 App 风格 */
.h5-header {
  margin-top: 12vh;
  margin-bottom: 40px;
}

.logo-box {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #1989fa, #005eb8);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  box-shadow: 0 8px 16px rgba(25, 137, 250, 0.2);
}

.h5-title {
  font-size: 28px;
  color: #323233;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.h5-subtitle {
  font-size: 15px;
  color: #969799;
  margin: 0;
}

/* 表单区域：扁平化，底部边线风格 */
.h5-form {
  margin-top: 20px;
}

.h5-cell-group {
  margin: 0; /* 移除 inset 默认的左右留白 */
  background: transparent;
}

/* 深度定制 Vant 输入框，移除默认背景，加大间距 */
.h5-form :deep(.van-cell) {
  padding: 16px 0;
  background-color: transparent;
}

.h5-form :deep(.van-cell::after) {
  left: 0;
  right: 0;
  border-bottom: 1px solid #ebedf0; /* 仅保留底部细线 */
}

.h5-form :deep(.van-field__left-icon) {
  font-size: 22px;
  margin-right: 12px;
  color: #c8c9cc;
}

/* 登录按钮：全宽、圆角、适当的高度以利于触控 */
.h5-submit-wrap {
  margin-top: 48px;
}

.h5-btn {
  height: 50px;
  font-size: 18px;
  border-radius: 25px; /* 完全圆角 */
  background: linear-gradient(to right, #1989fa, #005eb8);
  border: none;
  box-shadow: 0 6px 16px rgba(25, 137, 250, 0.3);
}

/* 底部区域：固定在屏幕下方安全区 */
.h5-footer {
  margin-top: auto;
  padding-bottom: 30px; /* 适配 iPhone 底部小黑条 */
  text-align: center;
}

.h5-footer p {
  font-size: 12px;
  color: #c8c9cc;
  margin: 0;
}
</style>