<!-- src/pages/admin-report/pending.vue -->
<template>
  <div class="pending-container">
    <van-nav-bar
      :title="pageTitle"
      :left-text="t('common.back')"
      left-arrow
      @click-left="router.back()"
      fixed
      placeholder
    />

    <div class="list-wrap">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          :finished-text="listData.length > 0 ? t('adminReport.noMoreData') : ''"
          @load="onLoad"
        >
          <div 
            v-for="item in listData" 
            :key="item._id" 
            class="report-card" 
            @click="goToDetail(item._id)"
          >
            <!-- 卡片头部：状态与时间 -->
            <div class="card-header">
              <span class="status-tag pending-tag">
                <span class="dot"></span>
                {{ t('adminReport.statusPending') }}
              </span>
              <span class="time-text">{{ formatDateTime(item.created_at) }}</span>
            </div>

            <!-- 卡片主体：核心信息 -->
            <div class="card-body">
              <div class="info-row">
                <span class="label">{{ t('adminReport.submitter') }}:</span>
                <span class="value sales-name">{{ item.sales_name }}</span>
              </div>
              <div class="info-row">
                <span class="label">{{ t('adminReport.reportDate') }}:</span>
                <span class="value highlight-date">{{ item.report_date }}</span>
              </div>
            </div>

            <van-icon name="arrow" class="right-arrow" />
          </div>
        </van-list>
      </van-pull-refresh>

      <van-empty 
        v-if="listData.length === 0 && !loading" 
        :description="t('adminReport.emptyPending')" 
        image="search" 
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { showToast } from 'vant';
import request from '../../utils/request';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

// 根据路由参数动态判断当前是查看日报还是周计划
const reportType = ref(route.query.type || 'daily');

const pageTitle = computed(() => {
  return reportType.value === 'daily' 
    ? t('title.pendingDailyTitle') 
    : t('title.pendingWeeklyTitle');
});

// 列表与分页状态
const listData = ref([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);
const pageSize = ref(15);

// ================== 核心加载逻辑 ==================
const getList = async () => {
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      type: reportType.value,
      status: 'pending' // 强制只查待审批状态
      // 删除了 timeRange，不再限制必须是今天或本月
    };

    const res = await request.get('/api/admin/reports/list', { params });
    
    const rows = res.data?.rows || [];
    const total = res.data?.total || 0;

    if (refreshing.value) {
      listData.value = rows;
      refreshing.value = false;
    } else {
      listData.value.push(...rows);
    }

    loading.value = false;

    // 判断是否全部加载完毕
    if (listData.value.length >= total || rows.length === 0) {
      finished.value = true;
    } else {
      page.value++;
    }
  } catch (err) {
    showToast(t('common.error') || '获取列表失败');
    loading.value = false;
    refreshing.value = false;
    finished.value = true;
  }
};

// ================== 交互事件 ==================
const onLoad = () => {
  getList();
};

const onRefresh = () => {
  refreshing.value = true; 
  finished.value = false;
  loading.value = true;
  page.value = 1;
  getList();
};

const goToDetail = (id) => {
  router.push({
    path: '/admin-report/detail',
    query: { id }
  });
};

// ================== 工具函数 ==================
const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
</script>

<style scoped>
.pending-container {
  min-height: 100vh;
  background-color: #f4f6f9;
}

.list-wrap {
  padding: 15px;
  padding-bottom: 30px;
}

.report-card {
  position: relative;
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.1s ease;
  cursor: pointer;
}

.report-card:active {
  transform: scale(0.98);
  background-color: #fafbfc;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #f0f0f0;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: bold;
  padding: 4px 10px;
  border-radius: 20px;
}

.pending-tag {
  background-color: #fff7ed;
  color: #ea580c;
}

.pending-tag .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #ea580c;
  margin-right: 6px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
  100% { opacity: 1; transform: scale(1); }
}

.time-text {
  font-size: 12px;
  color: #999;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.info-row .label {
  color: #666;
  width: 70px;
  flex-shrink: 0;
}

.info-row .value {
  color: #333;
  font-weight: 500;
}

.sales-name {
  color: #1989fa !important;
  font-weight: bold !important;
}

.highlight-date {
  color: #333;
  background: #f4f6f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.right-arrow {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  color: #ccc;
  font-size: 18px;
}
</style>