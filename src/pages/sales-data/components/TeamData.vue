<!-- src/pages/sales-data/components/TeamData.vue -->
<template>
  <div class="team-data-container">
    
    <!-- ================= 1. 彻底重构的防污染筛选头 ================= -->
    <div class="custom-filter-header">
      <!-- 左侧：保留 Vant 下拉菜单用于选择销售人员 -->
      <div class="filter-left">
        <van-dropdown-menu active-color="#1989fa">
          <van-dropdown-item v-model="filterParams.salesId" :options="salesOptions" @change="onFilterChange" />
        </van-dropdown-menu>
      </div>
      
      <!-- 右侧：纯 HTML 按钮，点击唤起原生 ActionSheet -->
      <div class="filter-right" @click="showActionSheet = true">
        <span class="date-text">{{ dateTitle }}</span>
        <van-icon name="arrow-down" class="date-icon" />
      </div>
    </div>

    <!-- 🌟 防弹菜单：使用 teleport="body" 强制脱离污染 -->
    <van-action-sheet
      v-model:show="showActionSheet"
      :actions="dateActions"
      :cancel-text="t('common.cancel', '取消')"
      close-on-click-action
      @select="onActionSelect"
      teleport="body"
    />

    <!-- 🌟 防弹日历：独立区间弹窗 -->
    <van-calendar
      v-model:show="showCalendar"
      :min-date="minDate"
      :max-date="maxDate"
      type="range"
      :title="t('salesData.team.customTimeRange', '自定义时间区间')"
      color="#1989fa"
      :default-date="dateRange"
      @confirm="onDateRangeConfirm"
      teleport="body"
    />

    <!-- ================= 2. 饼图区：各状态占比 ================= -->
    <div class="chart-section card-box">
      <div class="section-title">{{ t('salesData.team.statusDistribution', '客户状态分布占比') }}</div>
      <div v-show="chartData.length > 0" ref="chartRef" class="chart-container"></div>
      <van-empty v-show="chartData.length === 0" :description="t('salesData.team.noData', '该条件下暂无客户数据')" image="search" />
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useI18n } from 'vue-i18n'; // 🌟 引入 i18n
import { showToast, closeToast } from 'vant';
import * as echarts from 'echarts';
import request from '../../../utils/request';

const { t } = useI18n(); // 🌟 解构 t 函数

const today = new Date();
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(today.getDate() - 6);

// ================== 弹窗控制状态 ==================
const showActionSheet = ref(false); 
const showCalendar = ref(false); 
const dateMode = ref('7days'); 
const dateRange = ref([sevenDaysAgo, today]);
// 限制日历的最小与最大可选日期
const minDate = new Date(2000, 0, 1); 
const maxDate = new Date();           

// 🌟 将 actions 改为 computed，确保语言切换时实时生效
const dateActions = computed(() => [
  { name: t('salesData.team.allTime', '全部时间'), value: 'all' },
  { name: t('salesData.team.last7Days', '近七天'), value: '7days' },
  { name: t('salesData.team.customRange', '自定义区间...'), value: 'custom' }
]);

const filterParams = ref({
  salesId: '',
  startDate: formatDate(sevenDaysAgo),
  endDate: formatDate(today)
});

const dateTitle = computed(() => {
  if (dateMode.value === 'all') return t('salesData.team.allTime', '全部时间');
  if (dateMode.value === '7days') return t('salesData.team.last7Days', '近七天');
  if (dateRange.value.length === 2) {
    const start = dateRange.value[0];
    const end = dateRange.value[1];
    return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
  }
  return t('salesData.team.timeFilter', '时间筛选');
});

const salesOptions = ref([{ text: t('salesData.team.allSales', '全部销售人员'), value: '' }]);
const statusMap = ref({});

const chartRef = ref(null);
let chartInstance = null;
const chartData = ref([]);

onMounted(async () => {
  await fetchStatusDict();
  await fetchSalesList();
  fetchChartData(); 
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});

const fetchStatusDict = async () => {
  try {
    const res = await request.get('/api/system/dict', { params: { type: 'customer_status' } });
    const dict = {};
    res.data.forEach(item => {
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
        text: user.name || user.username,
        value: user._openid || user.userId
      }));
      salesOptions.value = [{ text: t('salesData.team.allSales', '全部销售人员'), value: '' }, ...sales];
    }
  } catch (err) {}
};

const fetchChartData = async () => {
  showToast({ type: 'loading', message: t('common.loading', '加载中...'), duration: 0 });
  try {
    const params = {
      salesId: filterParams.value.salesId,
      startDate: dateMode.value === 'all' ? '' : filterParams.value.startDate,
      endDate: dateMode.value === 'all' ? '' : filterParams.value.endDate
    };

    const res = await request.get('/api/sales-data/status-stats', { params });
    
    if (res.code === 200) {
      chartData.value = res.data || [];
    } else {
      showToast(res.message || t('salesData.team.fetchDataFailed', '获取数据失败'));
    }
    closeToast(); 
    if (chartData.value.length > 0) {
      nextTick(() => { renderChart(); });
    }
  } catch (err) {
    closeToast(); 
    showToast(t('salesData.team.serverError', '服务器异常，请稍后再试'));
  }
};

const renderChart = () => {
  if (!chartRef.value) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const echartData = chartData.value.map(item => ({
    name: statusMap.value[item.name] || item.name,
    value: item.value
  }));

  const option = {
    tooltip: { trigger: 'item', formatter: '{b} : {c}人 ({d}%)' },
    legend: {
      type: 'scroll',
      bottom: '0',
      left: 'center',
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 12, color: '#666' }
    },
    series: [
      {
        type: 'pie',
        radius: '55%', 
        center: ['50%', '45%'],
        data: echartData,
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' }
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%', 
          color: '#555'
        },
        labelLine: { smooth: 0.2, length: 10, length2: 15 }
      }
    ]
  };
  chartInstance.setOption(option);
};

const handleResize = () => { if (chartInstance) chartInstance.resize(); };
const onFilterChange = () => { fetchChartData(); };

// ================== 日期选择处理逻辑 ==================
const onActionSelect = (action) => {
  if (action.value === 'all') {
    dateMode.value = 'all';
    fetchChartData();
  } else if (action.value === '7days') {
    dateMode.value = '7days';
    dateRange.value = [sevenDaysAgo, today];
    filterParams.value.startDate = formatDate(sevenDaysAgo);
    filterParams.value.endDate = formatDate(today);
    fetchChartData();
  } else if (action.value === 'custom') {
    setTimeout(() => {
      showCalendar.value = true;
    }, 200);
  }
};

const onDateRangeConfirm = (dates) => {
  showCalendar.value = false;
  const [start, end] = dates;
  dateMode.value = 'custom';
  dateRange.value = dates;
  filterParams.value.startDate = formatDate(start);
  filterParams.value.endDate = formatDate(end);
  fetchChartData();
};

function formatDate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
</script>

<style scoped>
.team-data-container {
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

/* 通用卡片容器 */
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

.chart-container {
  width: 100%;
  height: 350px; 
  margin-top: 15px;
}
</style>