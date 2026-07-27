<!-- src/pages/work-report/history.vue -->
<template>
  
  <van-nav-bar
  :title="t('title.reportHistory')"
  :left-text="t('common.back')"
  left-arrow
  @click-left="router.back()"
/>
  <div class="container">
    <!-- 顶部分类 Tabs (使用 Vant 组件库) -->
    <van-tabs v-model:active="currentTab" @change="switchTab" color="#3b82f6" sticky>
      <van-tab :title="t('workReport.reportHistory.tabDaily')" name="daily"></van-tab>
      <van-tab :title="t('workReport.reportHistory.tabWeekly')" name="weekly"></van-tab>
    </van-tabs>

    <!-- 列表容器 -->
    <div class="list-container">
      <van-empty 
        v-if="listData.length === 0 && !isLoading" 
        :description="t('workReport.reportHistory.emptyState')" 
      />

      <div class="list-card" v-for="item in listData" :key="item._id" @click="goToDetail(item._id)">
        <div class="card-left">
          <span class="icon">{{ currentTab === 'daily' ? '📅' : '📆' }}</span>
          <span class="date-text">
            {{ currentTab === 'daily' ? item.report_date : `${t('workReport.reportHistory.weekLabel')}: ${item.week_range || item.week_start}` }}
          </span>
        </div>
        
        <!-- 右侧状态标签与箭头 -->
        <div class="card-right">
          <span :class="['status-tag', `tag-${item.approval_status || 'pending'}`]">
            {{ getStatusText(item.approval_status) }}
          </span>
          <span class="card-arrow">&gt;</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
// 🌟 修复 1：正确引入 closeToast
import { showToast, closeToast } from 'vant';
import request from '../../utils/request';

const router = useRouter();
const { t } = useI18n();

const currentTab = ref('daily');
const listData = ref([]);
const isLoading = ref(false);

onMounted(() => {
  document.title = t('workReport.menu.history');
  fetchData();
});

const switchTab = () => {
  listData.value = [];
  fetchData();
};

const fetchData = async () => {
  isLoading.value = true;
  showToast({ type: 'loading', message: t('common.loading', '加载中...'), duration: 0 });

  try {
    // 调用后端历史记录接口
    const res = await request.get('/api/report/history', {
      params: { type: currentTab.value }
    });
    listData.value = res.data || [];
  } catch (err) {
    console.error('获取历史记录失败', err);
    showToast(t('common.error', '加载失败'));
  } finally {
    isLoading.value = false;
    // 🌟 修复 2：使用正确的 API 关闭加载动画
    closeToast();
  }
};

const getStatusText = (status) => {
  if (status === 'approved') return t('workReport.reportHistory.statusApproved');
  if (status === 'rejected') return t('workReport.reportHistory.statusRejected');
  return t('workReport.reportHistory.statusPending');
};

const goToDetail = (id) => {
  router.push({ 
    path: '/work-report/history-detail', 
    query: { id, type: currentTab.value } 
  });
};
</script>
<style scoped>
/* 全局降级 rpx 为 px */
.container {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  background: #f4f6f9;
  padding: 0;
}

/* 覆盖 Vant Tabs 的一些样式以贴合原设计 */
:deep(.van-tabs__nav) {
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}

:deep(.van-tab) {
  color: #64748b;
  font-size: 14px;
}

:deep(.van-tab--active) {
  color: #3b82f6;
  font-weight: bold;
}

/* 列表容器 */
.list-container {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 15px;
  overflow-y: auto;
}

/* 列表卡片 */
.list-card {
  background: #fff;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
  cursor: pointer;
  transition: all 0.2s;
}

.list-card:active {
  background: #f8fafc;
}

.card-left {
  display: flex;
  align-items: center;
}

.icon {
  font-size: 18px;
  margin-right: 10px;
}

.date-text {
  font-size: 15px;
  color: #333;
  font-weight: bold;
}

/* 右侧布局 */
.card-right {
  display: flex;
  align-items: center;
}

.card-arrow {
  color: #cbd5e1;
  font-weight: bold;
  font-family: monospace;
  font-size: 16px;
}

/* 状态标签样式 */
.status-tag {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 4px;
  margin-right: 8px;
  font-weight: bold;
}

/* 三种状态对应的颜色 */
.tag-pending { 
  background: #fef3c7; 
  color: #d97706; 
}
.tag-approved { 
  background: #d1fae5; 
  color: #059669; 
}
.tag-rejected { 
  background: #fee2e2; 
  color: #dc2626; 
}
</style>