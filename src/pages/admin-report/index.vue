<!-- src/pages/admin-report/index.vue -->
<template>
  <div class="admin-report-container">
    <van-nav-bar
      :title="t('title.adminReport')"
      :left-text="t('common.back')"
      left-arrow
      @click-left="handleBack"
      fixed
      placeholder
    />

    <div class="content-wrap">
      <!-- ================= 1. 待办审批模块 ================= -->
      <div class="section-title">
        <span class="icon">🛎️</span>
        <span>{{ t('adminReport.pendingSection') }}</span>
      </div>

      <div class="dashboard-grid">
        <!-- 当天日报卡片 -->
        <div class="dashboard-card daily-card" @click="goToPending('daily')">
          <div class="card-bg-icon">📅</div>
          <div class="card-content">
            <div class="card-title">{{ t('adminReport.todayDaily') }}</div>
            <div class="card-desc">{{ t('adminReport.dailyDesc') }}</div>
          </div>
          <div class="card-action">
            <van-badge :content="pendingCounts.dailyPending" max="99" v-if="pendingCounts.dailyPending > 0">
              <div class="action-btn pending-btn">{{ t('adminReport.goApprove') }}</div>
            </van-badge>
            <div class="action-btn done-btn" v-else>✅ {{ t('adminReport.allDone') }}</div>
          </div>
        </div>

        <!-- 本月周计划卡片 -->
        <div class="dashboard-card weekly-card" @click="goToPending('weekly')">
          <div class="card-bg-icon">📆</div>
          <div class="card-content">
            <div class="card-title">{{ t('adminReport.monthWeekly') }}</div>
            <div class="card-desc">{{ t('adminReport.weeklyDesc') }}</div>
          </div>
          <div class="card-action">
            <van-badge :content="pendingCounts.weeklyPending" max="99" v-if="pendingCounts.weeklyPending > 0">
              <div class="action-btn pending-btn">{{ t('adminReport.goApprove') }}</div>
            </van-badge>
            <div class="action-btn done-btn" v-else>✅ {{ t('adminReport.allDone') }}</div>
          </div>
        </div>
      </div>

      <!-- ================= 2. 历史查询模块 ================= -->
      <div class="section-title mt-20">
        <span class="icon">🗂️</span>
        <span>{{ t('adminReport.dataSection') }}</span>
      </div>

      <van-cell-group inset class="custom-cell-group">
        <van-cell 
          :title="t('adminReport.historyReport')" 
          is-link 
          size="large"
          @click="goToHistory"
        >
          <template #icon>
            <span class="cell-icon">🕒</span>
          </template>
          <template #label>
            <span>{{ t('adminReport.historyDesc') }}</span>
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import request from '../../utils/request';
import { showToast } from 'vant';

const router = useRouter();
const { t } = useI18n();

const pendingCounts = ref({
  dailyPending: 0,
  weeklyPending: 0
});

const handleBack = () => {
  router.push('/');
};

// 获取待审批数量角标
const fetchPendingCounts = async () => {
  try {
    const res = await request.get('/api/admin/reports/pending-count');
    if (res.code === 200) {
      pendingCounts.value = {
        dailyPending: res.data.dailyPending || 0,
        weeklyPending: res.data.weeklyPending || 0
      };
    }
  } catch (err) {
    console.error('获取待审批数量失败', err);
  }
};

// 页面挂载时拉取数据
onMounted(() => {
  fetchPendingCounts();
});

// 如果使用了 keep-alive，确保每次回到主页都能刷新角标
onActivated(() => {
  fetchPendingCounts();
});

// 跳转到待审批列表页，携带 type 参数
const goToPending = (type) => {
  router.push({
    path: '/admin-report/pending',
    query: { type }
  });
};

// 跳转到历史记录页
const goToHistory = () => {
  router.push('/admin-report/history');
};
</script>

<style scoped>
.admin-report-container {
  min-height: 100vh;
  background-color: #f4f6f9;
}

.content-wrap {
  padding: 15px;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
}

.section-title .icon {
  margin-right: 6px;
  font-size: 18px;
}

.mt-20 {
  margin-top: 25px;
}

/* 仪表盘卡片网格 */
.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.dashboard-card {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.1s;
}

.dashboard-card:active {
  transform: scale(0.98);
}

/* 卡片背景大图标修饰 */
.card-bg-icon {
  position: absolute;
  right: -10px;
  bottom: -15px;
  font-size: 80px;
  opacity: 0.05;
  z-index: 0;
  pointer-events: none;
}

.daily-card {
  border-left: 5px solid #3b82f6;
}

.weekly-card {
  border-left: 5px solid #f59e0b;
}

.card-content {
  position: relative;
  z-index: 1;
}

.card-title {
  font-size: 17px;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 6px;
}

.card-desc {
  font-size: 12px;
  color: #6b7280;
}

.card-action {
  position: relative;
  z-index: 1;
}

/* 操作按钮样式 */
.action-btn {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: bold;
}

.pending-btn {
  background-color: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.done-btn {
  background-color: #f3f4f6;
  color: #10b981;
}

/* 覆盖 Vant Badge 位置以适应自定义按钮 */
:deep(.van-badge) {
  transform: translate(30%, -40%);
}

/* 历史记录 Cell 样式定制 */
.custom-cell-group {
  margin: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.cell-icon {
  font-size: 22px;
  margin-right: 12px;
  display: flex;
  align-items: center;
}
</style>