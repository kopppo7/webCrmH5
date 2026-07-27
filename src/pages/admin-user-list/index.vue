<template>
  <div class="user-list-container">
    
  
  <van-nav-bar
  :title="t('title.adminUserList')"
  :left-text="t('common.back')"
  left-arrow
  @click-left="router.back()"
/>

    <!-- 员工列表 -->
    <div class="list-wrap">
      <div class="user-card" v-for="user in userList" :key="user._id">
        <!-- 基础信息 -->
        <div class="info-header">
          <div class="name-box">
            <span class="name">{{ user.real_name }}</span>
            <van-tag
              :type="user.status === 1 ? 'primary' : 'danger'"
              class="status-tag"
            >
              {{ user.positionLabel || "销售" }}
            </van-tag>
            <van-tag v-if="user.status !== 1" type="default">已离职</van-tag>
          </div>
        </div>

        <!-- 操作栏 -->
        <div class="action-bar">
          <van-button
            size="small"
            icon="eye-o"
            @click="goDetail(user._id, 'view')"
            >查看</van-button
          >
          <van-button
            size="small"
            type="primary"
            plain
            icon="edit"
            @click="goDetail(user._id, 'edit')"
            >编辑</van-button
          >
          <van-button
            size="small"
            type="warning"
            plain
            icon="revoke"
            :disabled="user.status !== 1"
            @click="openResignDialog(user)"
          >
            离职
          </van-button>
          <van-button
            size="small"
            type="danger"
            plain
            icon="delete-o"
            @click="handleDelete(user._id)"
            >删除</van-button
          >
        </div>
      </div>

      <van-empty v-if="userList.length === 0" description="暂无员工数据" />
    </div>

    <!-- 离职类型选择弹窗 -->
    <van-dialog
      v-model:show="showResignDialog"
      title="办理离职"
      show-cancel-button
      @confirm="confirmResign"
    >
      <div style="padding: 20px">
        <van-radio-group v-model="resignForm.type">
          <van-cell-group inset>
            <van-cell
              title="主动离职"
              clickable
              @click="resignForm.type = '主动离职'"
            >
              <template #right-icon>
                <van-radio name="主动离职" />
              </template>
            </van-cell>
            <van-cell title="辞退" clickable @click="resignForm.type = '辞退'">
              <template #right-icon>
                <van-radio name="辞退" />
              </template>
            </van-cell>
          </van-cell-group>
        </van-radio-group>
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { showToast, showConfirmDialog } from "vant";
import request from "../../utils/request";

const router = useRouter();
const userList = ref([]);

// 离职弹窗控制
const showResignDialog = ref(false);
const resignForm = ref({ userId: "", type: "主动离职" });

// 初始化加载列表
const fetchList = async () => {
  try {
    const res = await request.get("/api/users/list");
    userList.value = res.data || [];
  } catch (error) {
    showToast("列表获取失败");
  }
};

onMounted(() => {
  fetchList();
});

// 跳转详情/编辑 (复用 admin-add-user 页面，通过 query 传参)
const goDetail = (id, mode) => {
  router.push({
    path: "/admin-add-user",
    query: { id, mode }, // mode: 'view' 或 'edit'
  });
};

// 触发离职弹窗
const openResignDialog = (user) => {
  resignForm.value.userId = user._id;
  resignForm.value.type = "主动离职"; // 默认值
  showResignDialog.value = true;
};

// 确认离职
const confirmResign = async () => {
  try {
    await request.post("/api/users/status", {
      id: resignForm.value.userId,
      status: 2, // 2代表离职
      resign_type: resignForm.value.type,
    });
    showToast("状态已更新");
    fetchList(); // 刷新列表
  } catch (error) {
    showToast("操作失败");
  }
};

// 删除员工
const handleDelete = (id) => {
  showConfirmDialog({
    title: "危险操作",
    message: "确认彻底删除该员工及相关登录权限吗？",
    confirmButtonColor: "#ee0a24",
  })
    .then(async () => {
      try {
        await request.post("/api/users/delete", { id });
        showToast("删除成功");
        fetchList();
      } catch (error) {
        showToast("删除失败");
      }
    })
    .catch(() => {});
};
</script>

<style scoped>
.user-list-container {
  min-height: 100vh;
  background-color: #f7f8fa;
}
.list-wrap {
  padding: 12px;
}
.user-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.info-header {
  margin-bottom: 16px;
  border-bottom: 1px solid #f5f6f7;
  padding-bottom: 12px;
}
.name-box {
  display: flex;
  align-items: center;
}
.name {
  font-size: 18px;
  font-weight: bold;
  color: #323233;
  margin-right: 8px;
}
.status-tag {
  margin-right: 6px;
}
.action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 8px; /* 按钮间距 */
}
</style>
