<template>
  <div class="admin-setting-container">
    
  
  <van-nav-bar
  :title="t('title.setting')"
  :left-text="t('common.back')"
  left-arrow
  @click-left="router.back()"
/>
      <van-cell-group inset style="margin-top: 20px">
        <van-cell
          title="销售团队管理"
          is-link
          icon="manager-o"
          to="/admin-user-list"
        />
        <van-cell
          title="全局字典配置"
          is-link
          icon="apps-o"
          to="/admin-dict-manage"
        />
      </van-cell-group>
      

    <!-- 退出登录 -->
    <div style="padding: 30px 16px">
      <van-button block type="danger" plain @click="handleLogout">
        退出登录
      </van-button>
    </div>
    </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { showConfirmDialog, showToast } from "vant";
import { storage } from "../../utils/storage";

const router = useRouter();
const { t } = useI18n();

// 退出登录逻辑
const handleLogout = () => {
  showConfirmDialog({
    title: t("common.logoutConfirmTitle", "提示"),
    message: t("common.logoutConfirmMsg", "确定要退出当前账号并返回登录页吗？"),
    confirmButtonColor: "#ef4444",
  })
    .then(() => {
      storage.removeStorageSync("Token");
      storage.removeStorageSync("UserInfo");
      showToast({
        type: "success",
        message: t("common.logoutSuccess", "已退出登录"),
      });
      router.replace("/login");
    })
    .catch(() => {
      // 取消
    });
};
</script>

<style scoped>
.admin-setting-container {
  min-height: 100vh;
  background-color: #f7f8fa;
}
.section-container {
  margin: 16px 16px 0;
}
</style>
