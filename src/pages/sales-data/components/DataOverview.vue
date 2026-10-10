<!-- src/pages/sales-data/components/DataOverview.vue -->
<template>
  <div class="data-overview-container">
    <div class="overview-grid">
      <div class="data-card card-blue" @click="goToPool('all')">
        <div class="card-icon">🗂️</div>
        <div class="card-content">
          <div class="card-title">{{ t('salesData.overview.totalLeads') }}</div>
          <div class="card-value">{{ overviewData.totalLeads }}</div>
        </div>
      </div>

      <div class="data-card card-purple" @click="goToPool('today_todo')">
        <div class="card-icon">⏰</div>
        <div class="card-content">
          <div class="card-title">{{ t('salesData.overview.todayTodos') }}</div>
          <div class="card-value">{{ overviewData.todayTodos }}</div>
        </div>
      </div>

      <div class="data-card card-orange" @click="goToPool('key_customer')">
        <div class="card-icon">⭐</div>
        <div class="card-content">
          <div class="card-title">{{ t('salesData.overview.keyCustomers') }}</div>
          <div class="card-value">{{ overviewData.keyCustomers }}</div>
        </div>
      </div>

      <div class="data-card card-cyan" @click="goToPool('7days')">
        <div class="card-icon">🔄</div>
        <div class="card-content">
          <div class="card-title">{{ t('salesData.overview.processedIn7Days') }}</div>
          <div class="card-value">{{ overviewData.processedIn7Days }}</div>
        </div>
      </div>

      <div class="data-card card-green" @click="goToPool('completed')">
        <div class="card-icon">🏆</div>
        <div class="card-content">
          <div class="card-title">{{ t('salesData.overview.cumulativeDeals') }}</div>
          <div class="card-value">{{ overviewData.cumulativeDeals }}</div>
        </div>
      </div>

      <div class="data-card card-red" @click="goToPool('overdue')">
        <div class="card-icon">🚨</div>
        <div class="card-content">
          <div class="card-title">{{ t('salesData.overview.overdueCustomers') }}</div>
          <div class="card-value">{{ overviewData.overdueCustomers }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n'; // 🌟 引入 i18n
import { showToast, closeToast } from 'vant';
import request from '../../../utils/request';

const router = useRouter();
const { t } = useI18n(); // 🌟 解构 t 函数

const overviewData = ref({
  totalLeads: 0,
  todayTodos: 0,
  keyCustomers: 0,
  processedIn7Days: 0,
  cumulativeDeals: 0,
  overdueCustomers: 0
});

onMounted(() => {
  fetchOverviewData();
});

const fetchOverviewData = async () => {
  showToast({ type: 'loading', message: t('common.loading', '加载中...'), duration: 0 }); // 🌟 国际化加载提示
  try {
    const res = await request.get('/api/sales-data/overview');
    if (res.code === 200) {
      overviewData.value = {
        totalLeads: res.data.totalLeads || 0,
        todayTodos: res.data.todayTodos || 0,
        keyCustomers: res.data.keyCustomers || 0,
        processedIn7Days: res.data.processedIn7Days || 0,
        cumulativeDeals: res.data.cumulativeDeals || 0,
        overdueCustomers: res.data.overdueCustomers || 0
      };
    }
    closeToast();
  } catch (error) {
    closeToast();
    showToast(t('salesData.overview.fetchDataFailed', '获取数据失败')); // 🌟 国际化错误提示
  }
};

const goToPool = (type) => {
  let queryParams = {};
  switch (type) {
    case 'all': queryParams = {}; break;
    case 'today_todo': queryParams = { filter: 'today_todo' }; break;
    case 'key_customer': queryParams = { is_key: 1 }; break;
    case '7days': queryParams = { filter: '7days_processed' }; break;
    case 'completed': queryParams = { status: 'deal_completed' }; break;
    case 'overdue': queryParams = { filter: 'overdue' }; break;
  }
  router.push({ path: '/admin-customer-pool', query: queryParams });
};
</script>

<style scoped>
.data-overview-container {
  padding: 15px;
  min-height: calc(100vh - 100px);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

.data-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  border-radius: 12px;
  background-color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.1s ease;
  min-height: 90px;
}

.data-card:active {
  transform: scale(0.96);
}

.card-icon {
  position: absolute;
  right: -5px;
  bottom: -10px;
  font-size: 60px;
  opacity: 0.15;
  pointer-events: none;
}

.card-content {
  position: relative;
  z-index: 1;
}

.card-title {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.card-value {
  font-size: 26px;
  font-weight: bold;
  color: #333;
}

.card-blue { border-top: 4px solid #3b82f6; background: linear-gradient(to bottom, #eff6ff, #ffffff); }
.card-blue .card-value { color: #1d4ed8; }

.card-purple { border-top: 4px solid #8b5cf6; background: linear-gradient(to bottom, #f5f3ff, #ffffff); }
.card-purple .card-value { color: #6d28d9; }

.card-orange { border-top: 4px solid #f59e0b; background: linear-gradient(to bottom, #fffbeb, #ffffff); }
.card-orange .card-value { color: #b45309; }

.card-cyan { border-top: 4px solid #06b6d4; background: linear-gradient(to bottom, #ecfeff, #ffffff); }
.card-cyan .card-value { color: #0e7490; }

.card-green { border-top: 4px solid #10b981; background: linear-gradient(to bottom, #ecfdf5, #ffffff); }
.card-green .card-value { color: #047857; }

.card-red { border-top: 4px solid #ef4444; background: linear-gradient(to bottom, #fef2f2, #ffffff); }
.card-red .card-value { color: #b91c1c; }
</style>