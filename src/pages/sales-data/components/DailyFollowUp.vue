<!-- src/pages/sales-data/components/DailyFollowUp.vue -->
<template>
  <div class="daily-follow-container">
    
    <!-- ================= 1. 彻底重构的防污染筛选头 ================= -->
    <div class="custom-filter-header">
      <!-- 左侧：保留 Vant 下拉菜单用于选择销售人员 -->
      <div class="filter-left">
        <van-dropdown-menu active-color="#1989fa">
          <van-dropdown-item v-model="filterParams.salesId" :options="salesOptions" @change="onFilterChange" />
        </van-dropdown-menu>
      </div>
      
      <!-- 右侧：纯 HTML 按钮，彻底摆脱 dropdown 嵌套 -->
      <div class="filter-right" @click="showCalendar = true">
        <span class="date-text">{{ displayDate }}</span>
        <van-icon name="arrow-down" class="date-icon" />
      </div>
    </div>

    <!-- 🌟 防弹日历弹窗：使用 teleport="body" 强制脱离 #app 的 Flex 污染 -->
    <van-calendar 
      v-model:show="showCalendar" 
      :min-date="minDate"
      :max-date="maxDate"
      @confirm="onDateConfirm" 
      :default-date="selectedDateObj"
      teleport="body"
      color="#1989fa"
      class="safe-calendar"
    />

    <!-- ================= 2. 跟进数据统计 ================= -->
    <div class="stats-section card-box">
      <div class="stats-header">
        <div>
          <div class="section-title">跟进数据统计</div>
          <div class="stats-subtitle">{{ displayDate }} · {{ currentSalesLabel }}</div>
        </div>
      </div>

      <div class="follow-type-tabs">
        <button
          v-for="item in followTypeOptions"
          :key="item.value"
          type="button"
          :class="['follow-type-tab', { active: filterParams.followUpType === item.value }]"
          @click="changeFollowType(item.value)"
        >
          <span>{{ item.text }}</span>
          <strong class="tab-count">{{ followUpSummary[item.value] || 0 }}</strong>
        </button>
      </div>

      <div class="reprocess-summary-card" @click="goToReprocessedCustomers">
        <div class="reprocess-summary-left">
          <div class="reprocess-summary-title">当日打回重新处理</div>
          <div class="reprocess-summary-desc">按当天重新处理日志统计，点击查看对应客户</div>
        </div>
        <div class="reprocess-summary-right">
          <strong>{{ reprocessCount }}</strong>
          <span>个客户</span>
          <van-icon name="arrow" />
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card primary">
          <div class="summary-label">{{ currentFollowTypeText }}</div>
          <div class="summary-value">{{ totalFollowUps }}</div>
          <div class="summary-unit">次跟进</div>
        </div>

        <div class="summary-card">
          <div class="summary-label">结果类型</div>
          <div class="summary-value">{{ resultTypeCount }}</div>
          <div class="summary-unit">种结果</div>
        </div>

        <div class="summary-card">
          <div class="summary-label">占比最高</div>
          <div class="summary-value summary-value-text">{{ topResultName }}</div>
          <div class="summary-unit">{{ topResultPercent }}%</div>
        </div>
      </div>

      <div v-if="statRows.length > 0" class="result-list">
        <div v-for="(item, index) in statRows" :key="item.status" class="result-row">
          <div class="result-row-top">
            <div class="result-name-wrap">
              <span class="rank-num">{{ index + 1 }}</span>
              <span class="result-name">{{ item.name }}</span>
            </div>
            <div class="result-number-wrap">
              <span class="result-number">{{ item.value }}</span>
              <span class="result-percent">{{ item.percent }}%</span>
            </div>
          </div>
          <div class="progress-track">
            <div class="progress-value" :style="{ width: `${item.percent}%` }"></div>
          </div>
        </div>
      </div>

      <van-empty v-else description="当前筛选条件下暂无跟进数据" image="search" />
    </div>

    <!-- ================= 3. 销售跟进操作日志 ================= -->
    <div class="list-section">
      <div class="list-header">
        <div>
          <span class="section-title">{{ t('salesData.daily.logTitle') }}</span>
          <div class="list-subtitle">{{ currentFollowTypeText }} · {{ listTotal }} 条记录</div>
        </div>
        <span class="link-btn" @click="goToKeyCustomers">{{ t('salesData.daily.viewKeyCustomers') }} <van-icon name="arrow" /></span>
      </div>

      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          :finished-text="t('salesData.daily.noMoreLogs')"
          @load="onLoad"
        >
          <div 
            v-for="item in listData" 
            :key="item._id" 
            :class="['log-card', { 'highlight-card': item.is_key_customer }]"
          >
            <div class="log-header">
              <div class="header-left">
                <span class="sales-name">{{ item.operator_name }}</span>
                <van-tag type="danger" v-if="item.is_key_customer" class="key-tag">{{ t('salesData.daily.keyTag') }}</van-tag>
                <span :class="['status-tag', `bg-status-${item.result_tag || 'default'}`]">
                  {{ statusMap[item.result_tag] || item.result_tag }}
                </span>
              </div>
              <span class="log-time">{{ formatTime(item.created_at) }}</span>
            </div>

            <div class="log-body">
              <div class="log-content">{{ item.content || item.note || t('salesData.daily.noDetails') }}</div>
            </div>

            <div class="log-footer">
              <van-button size="small" round plain type="primary" @click="goToDetail(item.customer_id)">
                {{ t('salesData.daily.viewProfile') }}
              </van-button>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n'; // 🌟 引入 i18n
import { showToast } from 'vant';
import request from '../../../utils/request';

const router = useRouter();
const { t } = useI18n(); // 🌟 解构 t 函数

const today = new Date();
const selectedDateObj = ref(today);
const showCalendar = ref(false); 
// 限制日历的最小与最大可选日期
const minDate = new Date(2000, 0, 1); // 允许选过去很久的日期 (例如 2000 年起)
const maxDate = new Date();           // 限制最大只能选到今天

const filterParams = ref({
  salesId: '',
  date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
  followUpType: 'all'
});

const displayDate = computed(() => {
  const d = selectedDateObj.value;
  return `${d.getMonth() + 1}月${d.getDate()}日`;
});

// 🌟 替换默认文本
const salesOptions = ref([{ text: t('salesData.daily.allSales'), value: '' }]);
const statusMap = ref({});

const followTypeOptions = [
  { text: '全部', value: 'all' },
  { text: '首次跟进', value: 'first' },
  { text: '后续跟进', value: 'later' }
];

const statsData = ref([]);
const listTotal = ref(0);
const reprocessCount = ref(0);
const followUpSummary = ref({
  all: 0,
  first: 0,
  later: 0
});

const listData = ref([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);
const pageSize = ref(15);

onMounted(async () => {
  await fetchStatusDict();
  await fetchSalesList();
});

const fetchStatusDict = async () => {
  try {
    const res = await request.get('/api/system/dict', { params: { type: 'customer_status' } });
    const dict = {};
    res.data.forEach(item => {
      // 这里的字典数据通常后端也会配置多语言，或者直接使用 label_zh / label_en 等
      dict[item.value] = item.label_zh || item.label;
    });
    statusMap.value = dict;
  } catch (e) {}
};

const fetchSalesList = async () => {
  try {
    const res = await request.get('/api/users/sales-list');
    if (res.data) {
      const sales = res.data.map(user => ({
        text: user.real_name || user.name || user.username,
        value: String(user._id || user._openid || user.userId || '')
      })).filter(item => item.value);
      // 🌟 替换默认文本
      salesOptions.value = [{ text: t('salesData.daily.allSales'), value: '' }, ...sales];
    }
  } catch (err) {}
};

const currentFollowTypeText = computed(() => {
  return followTypeOptions.find(item => item.value === filterParams.value.followUpType)?.text || '全部';
});

const currentSalesLabel = computed(() => {
  return salesOptions.value.find(item => item.value === filterParams.value.salesId)?.text
    || t('salesData.daily.allSales');
});

const totalFollowUps = computed(() => {
  return statsData.value.reduce((sum, item) => sum + Number(item.value || 0), 0);
});

const resultTypeCount = computed(() => {
  return statsData.value.filter(item => Number(item.value || 0) > 0).length;
});

const statRows = computed(() => {
  const total = totalFollowUps.value;
  return [...statsData.value]
    .map(item => {
      const value = Number(item.value || 0);
      return {
        status: item.status,
        name: statusMap.value[item.status] || item.status || '未知状态',
        value,
        percent: total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
});

const topResultName = computed(() => statRows.value[0]?.name || '-');
const topResultPercent = computed(() => statRows.value[0]?.percent || 0);

const getList = async () => {
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      date: filterParams.value.date,
      salesId: filterParams.value.salesId,
      followUpType: filterParams.value.followUpType
    };

    const res = await request.get('/api/sales-data/daily-logs', { params });
    
    if (page.value === 1) {
      statsData.value = res.data?.pieData || [];
      listTotal.value = res.data?.list?.total || 0;
      followUpSummary.value = res.data?.followUpSummary || {
        all: 0,
        first: 0,
        later: 0
      };
      reprocessCount.value = Number(res.data?.reprocessSummary?.count || 0);
    }

    const rows = res.data?.list?.rows || [];
    const total = res.data?.list?.total || 0;
    listTotal.value = total;

    if (refreshing.value) {
      listData.value = rows;
      refreshing.value = false;
    } else {
      listData.value.push(...rows);
    }

    loading.value = false;

    if (listData.value.length >= total || rows.length === 0) {
      finished.value = true;
    } else {
      page.value++;
    }
  } catch (err) {
    showToast(t('salesData.daily.fetchDataFailed')); // 🌟 错误提示国际化
    loading.value = false;
    refreshing.value = false;
    finished.value = true;
  }
};


const changeFollowType = (type) => {
  if (filterParams.value.followUpType === type) return;
  filterParams.value.followUpType = type;
  onRefresh();
};

const onFilterChange = () => {
  onRefresh();
};

const onDateConfirm = (date) => {
  showCalendar.value = false; 
  selectedDateObj.value = date;
  filterParams.value.date = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  onRefresh();
};

const onLoad = () => { getList(); };
const onRefresh = () => {
  refreshing.value = true; 
  finished.value = false;
  loading.value = true;
  page.value = 1;
  listData.value = [];
  getList();
};

const goToDetail = (customerId) => {
  router.push({ path: '/customer-detail', query: { id: customerId } });
};

const goToReprocessedCustomers = () => {
  const query = {
    filter: 'reprocessed',
    reprocess_date: filterParams.value.date
  };

  // 如果当前选择了某个销售，则只查看当天“重新交给该销售处理”的客户。
  if (filterParams.value.salesId) {
    query.salesId = filterParams.value.salesId;
  }

  router.push({
    path: '/admin-customer-pool',
    query
  });
};

const goToKeyCustomers = () => {
  router.push({
    path: '/admin-customer-pool',
    query: { is_key: 1, date: filterParams.value.date }
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
</script>

<style scoped>
.daily-follow-container {
  padding-bottom: 20px;
}

/* ================== 防污染伪装筛选头样式 ================== */
.custom-filter-header {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-bottom: 1px solid #f5f5f5;
  height: 48px; 
}

.filter-left {
  flex: 1;
  width: 50%;
}
:deep(.van-dropdown-menu__bar) {
  box-shadow: none !important;
  height: 48px !important;
  background: transparent !important;
}

.filter-right {
  flex: 1;
  width: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 15px;
  color: #333;
  position: relative;
  cursor: pointer;
}
.filter-right::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 20px;
  width: 1px;
  background-color: #ebedf0;
}
.filter-right:active {
  background-color: #f9f9f9;
}
.date-text {
  margin-right: 4px;
}
.date-icon {
  font-size: 14px;
  color: #dcdee0;
}

:deep(.safe-calendar) {
  line-height: normal !important;
  text-align: left !important;
}

/* ================== 其他布局样式 ================== */
.card-box {
  background: #fff;
  margin: 15px;
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  border-left: 4px solid #1989fa;
  padding-left: 8px;
}

.stats-subtitle,
.list-subtitle {
  margin-top: 6px;
  font-size: 12px;
  color: #969799;
}

.follow-type-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 4px;
  margin-top: 16px;
  background: #f5f7fa;
  border-radius: 10px;
}

.follow-type-tab {
  border: none;
  border-radius: 8px;
  height: 36px;
  background: transparent;
  color: #646566;
  font-size: 14px;
  cursor: pointer;
}

.follow-type-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.tab-count {
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  box-sizing: border-box;
  border-radius: 10px;
  background: #e9edf2;
  color: #646566;
  font-size: 11px;
  line-height: 20px;
  text-align: center;
}

.follow-type-tab.active {
  background: #fff;
  color: #1989fa;
  font-weight: 700;
  box-shadow: 0 1px 5px rgba(0,0,0,0.08);
}

.follow-type-tab.active .tab-count {
  background: #e8f3ff;
  color: #1989fa;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.summary-card {
  min-width: 0;
  padding: 13px 10px;
  background: #f7f8fa;
  border-radius: 10px;
  text-align: center;
}

.summary-card.primary {
  background: #edf6ff;
}

.summary-label {
  font-size: 12px;
  color: #969799;
}

.summary-value {
  margin-top: 5px;
  font-size: 25px;
  line-height: 1.1;
  color: #323233;
  font-weight: 800;
}

.summary-card.primary .summary-value {
  color: #1989fa;
}

.summary-value-text {
  font-size: 15px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-unit {
  margin-top: 4px;
  font-size: 11px;
  color: #969799;
}

.result-list {
  margin-top: 18px;
  border-top: 1px solid #f2f3f5;
  padding-top: 4px;
}

.result-row {
  padding: 11px 0;
}

.result-row-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 7px;
}

.result-name-wrap,
.result-number-wrap {
  display: flex;
  align-items: center;
}

.result-name-wrap {
  min-width: 0;
  gap: 8px;
}

.rank-num {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  border-radius: 50%;
  background: #f2f3f5;
  color: #969799;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.result-name {
  font-size: 14px;
  color: #323233;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-number-wrap {
  flex: 0 0 auto;
  gap: 7px;
}

.result-number {
  min-width: 30px;
  text-align: right;
  font-size: 17px;
  font-weight: 800;
  color: #323233;
}

.result-percent {
  width: 45px;
  text-align: right;
  font-size: 12px;
  color: #969799;
}

.progress-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #f2f3f5;
}

.progress-value {
  height: 100%;
  min-width: 2px;
  border-radius: 999px;
  background: #1989fa;
}

.list-section {
  margin: 0 15px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  margin-top: 20px;
}

.link-btn {
  font-size: 13px;
  color: #1989fa;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.log-card {
  background: #fff;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  transition: all 0.2s;
}

.highlight-card {
  background-color: #fffbe6 !important;
  border: 1px solid #ffe58f;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sales-name {
  font-size: 15px;
  font-weight: bold;
  color: #333;
}

.key-tag {
  border-radius: 4px;
}

.log-time {
  font-size: 13px;
  color: #999;
}

.log-body {
  margin-bottom: 12px;
}

.log-content {
  font-size: 14px;
  color: #555;
  line-height: 1.5;
  background: rgba(0,0,0,0.02);
  padding: 10px;
  border-radius: 6px;
  white-space: pre-wrap;
}

.highlight-card .log-content {
  background: rgba(250, 173, 20, 0.1); 
}

.log-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px dashed #f0f0f0;
  padding-top: 10px;
}
.highlight-card .log-footer {
  border-top-color: #ffe58f;
}

.status-tag {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: bold;
}
.bg-status-deal_completed { background: #d1fae5; color: #10b981; }
.bg-status-clear_reject { background: #fee2e2; color: #ef4444; }
.bg-status-pending { background: #e0f2fe; color: #0284c7; }
.bg-status-following, .bg-status-appointment_machine_v { background: #ede9fe; color: #8b5cf6; }
.bg-status-missed_call, .bg-status-cannot_answer_call { background: #fef3c7; color: #d97706; }
.bg-status-invalid_lead { background: #f3f4f6; color: #9ca3af; }
.bg-status-default { background: #f3f4f6; color: #4b5563; }
@media (max-width: 380px) {
  .summary-card { padding: 11px 6px; }
  .summary-value { font-size: 22px; }
  .summary-value-text { font-size: 13px; }
}

@media (min-width: 768px) {
  .daily-follow-container {
    max-width: 1100px;
    margin: 0 auto;
  }

  .result-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 28px;
  }
}

.reprocess-summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 12px 0 14px;
  padding: 13px 14px;
  border: 1px solid #e6efff;
  border-radius: 10px;
  background: #f7faff;
  cursor: pointer;
}
.reprocess-summary-card:active {
  background: #eef5ff;
}
.reprocess-summary-left {
  flex: 1;
  min-width: 0;
}
.reprocess-summary-title {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
}
.reprocess-summary-desc {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.4;
  color: #969799;
}
.reprocess-summary-right {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex-shrink: 0;
  color: #1989fa;
}
.reprocess-summary-right strong {
  font-size: 24px;
}
.reprocess-summary-right span {
  font-size: 11px;
}

</style>