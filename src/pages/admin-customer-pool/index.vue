<!-- src/pages/admin-customer-pool/index.vue -->
<template>
  <div class="customer-pool-container">
    <van-nav-bar
      :title="t('title.customerPool', '客户池')"
      :left-text="t('common.back', '返回')"
      left-arrow
      fixed
      placeholder
      @click-left="handleBack"
    >
      <template #right>
        <div class="nav-download-btn" @click.stop="openExportPopup">
          <van-icon name="down" />
          <span>下载客户</span>
        </div>
      </template>
    </van-nav-bar>

    <!-- ================================================== -->
    <!-- 顶部固定筛选区 -->
    <!-- ================================================== -->
    <div class="sticky-header">
      <!-- 1. 综合搜索框 -->
      <van-search
        v-model="keyword"
        placeholder="搜索姓名 / 手机号 / 城市 / 需求"
        shape="round"
        clearable
        @search="onSearch"
        @clear="onSearch"
        class="custom-search"
      />

      <!-- 2. 多维度下拉筛选 -->
      <van-dropdown-menu active-color="#1989fa" class="custom-dropdown">
        <van-dropdown-item v-model="filterParams.timeRange" :options="timeOptions" @change="onFilterChange" />
        <van-dropdown-item v-model="filterParams.salesId" :options="salesOptions" @change="onFilterChange" />
        <van-dropdown-item v-model="filterParams.status" :options="statusOptions" @change="onFilterChange" />
      </van-dropdown-menu>
    </div>

    <!-- ================================================== -->
    <!-- 客户列表区 (支持下拉刷新与上拉加载) -->
    <!-- ================================================== -->
    <div
      v-if="routeExtraFilters.filter === 'reprocessed'"
      class="quick-filter-notice"
    >
      <van-icon name="replay" />
      <span>
        当前筛选：{{ routeExtraFilters.reprocessDate || '当天' }} 打回重新处理客户
      </span>
    </div>

    <div class="list-wrap">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多客户了"
          @load="onLoad"
        >
          <div v-for="item in customerList" :key="item._id" class="customer-card" @click="goToDetail(item._id)">
            
            <!-- 卡片头部：姓名与状态 -->
            <div class="card-header">
              <div class="name-wrap">
                <span class="customer-name">{{ item.name }}</span>
                <!-- 🌟 统一使用动态字典与颜色池 -->
                <span :class="['status-tag', `bg-status-${item.status || 'default'}`]">
                  {{ localizedStatusMap[item.status] || item.status }}
                </span>
              </div>
              <span class="date-text">{{ formatDateTime(item.created_at) }}</span>
            </div>

            <!-- 卡片主体：核心信息 -->
            <div class="card-body">
              <div class="info-row">
                <van-icon name="phone-o" class="info-icon" />
                <span class="info-text phone-text">{{ item.phone || '未留存电话' }}</span>
              </div>
              <div class="info-row" v-if="item.city">
                <van-icon name="location-o" class="info-icon" />
                <span class="info-text">{{ item.city || '未知城市' }}</span>
              </div>
              <div class="info-row requirement-row">
                <van-icon name="notes-o" class="info-icon" />
                <span class="info-text requirement-text">{{ item.payload || '暂无需求记录' }}</span>
              </div>
            </div>

            <!-- 卡片底部：分配信息 -->
            <div class="card-footer">
              <div class="sales-info">
                <van-icon name="manager-o" />
                <span class="sales-name">{{ item.sales_name || '未分配' }}</span>
              </div>
              <div class="source-info">
                <span class="source-tag">{{ item.customer_source === 'operate_allocate' ? '运营分配' : (t(`dictSource.${item.customer_source}`) || item.customer_source) }}</span>
              </div>
            </div>

            <div class="card-actions">
              <!-- 使用 @click.stop 防止触发卡片的外层点击事件跳转到详情页 -->
              <van-button size="small" type="primary" plain @click.stop="onEdit(item)">编辑</van-button>
              <van-button size="small" type="danger" plain @click.stop="onDelete(item)">删除</van-button>
            </div>

          </div>
        </van-list>
      </van-pull-refresh>

      <van-empty 
        v-if="customerList.length === 0 && !loading" 
        description="暂无符合条件的客户数据" 
        image="search" 
      />
    </div>

    <!-- ================================================== -->
    <!-- 下载客户数据 -->
    <!-- ================================================== -->
    <van-popup
      v-model:show="showExportPopup"
      position="bottom"
      round
      teleport="body"
      class="export-popup"
    >
      <div class="export-panel">
        <div class="export-header">
          <div>
            <div class="export-title">下载客户数据</div>
            <div class="export-subtitle">按时间、销售人员和客户状态筛选导出</div>
          </div>
          <van-icon name="cross" class="export-close" @click="showExportPopup = false" />
        </div>

        <div class="export-section">
          <div class="export-section-label">时间范围</div>

          <div class="time-mode-tabs">
            <button
              type="button"
              :class="['time-mode-btn', { active: exportTimeMode === 'preset' }]"
              @click="exportTimeMode = 'preset'"
            >
              固定时间
            </button>
            <button
              type="button"
              :class="['time-mode-btn', { active: exportTimeMode === 'custom' }]"
              @click="openCustomDateRange"
            >
              自定义范围
            </button>
          </div>

          <div v-if="exportTimeMode === 'preset'" class="time-option-grid">
            <button
              v-for="item in exportTimeOptions"
              :key="item.value"
              type="button"
              :class="['time-option-btn', { active: exportFilters.timeRange === item.value }]"
              @click="selectPresetTime(item.value)"
            >
              {{ item.text }}
            </button>
          </div>

          <div v-else class="custom-range-box" @click="openCustomDateRange">
            <div>
              <div class="custom-range-label">自定义日期范围</div>
              <div class="custom-range-value">
                {{ exportFilters.startDate && exportFilters.endDate
                  ? `${exportFilters.startDate} 至 ${exportFilters.endDate}`
                  : '点击选择开始日期和结束日期' }}
              </div>
            </div>
            <van-icon name="calendar-o" class="custom-range-icon" />
          </div>
        </div>

        <div class="export-section">
          <div class="export-section-label">销售人员</div>
          <van-field
            v-model="exportSalesLabel"
            readonly
            is-link
            class="export-field"
            @click="showExportSalesPicker = true"
          />
        </div>

        <div class="export-section">
          <div class="export-section-label">客户状态</div>
          <van-field
            v-model="exportStatusLabel"
            readonly
            is-link
            class="export-field"
            @click="showExportStatusPicker = true"
          />
        </div>

        <div class="export-summary">
          将导出：{{ selectedExportTimeText }} · {{ exportSalesLabel }} · {{ exportStatusLabel }}
        </div>

        <div class="export-actions">
          <van-button block plain @click="resetExportFilters">重置</van-button>
          <van-button
            block
            type="primary"
            :loading="exporting"
            @click="downloadCustomerData"
          >
            下载 CSV
          </van-button>
        </div>
      </div>
    </van-popup>

    <van-calendar
      v-model:show="showExportDateCalendar"
      type="range"
      title="选择导出时间范围"
      :min-date="exportMinDate"
      :max-date="exportMaxDate"
      :default-date="exportCalendarDefaultDate"
      :max-range="366"
      teleport="body"
      color="#1989fa"
      @confirm="onExportDateRangeConfirm"
    />

    <van-popup
      v-model:show="showExportSalesPicker"
      position="bottom"
      round
      teleport="body"
    >
      <van-picker
        title="选择销售人员"
        :columns="salesOptions"
        @confirm="onExportSalesConfirm"
        @cancel="showExportSalesPicker = false"
      />
    </van-popup>

    <van-popup
      v-model:show="showExportStatusPicker"
      position="bottom"
      round
      teleport="body"
    >
      <van-picker
        title="选择客户状态"
        :columns="statusOptions"
        @confirm="onExportStatusConfirm"
        @cancel="showExportStatusPicker = false"
      />
    </van-popup>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { showToast, showConfirmDialog } from 'vant';
import request from '../../utils/request';

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();

// ================== 筛选器选项配置 ==================
const timeOptions = [
  { text: '全部分配时间', value: '' },
  { text: '今日分配', value: 'today' },
  { text: '本周分配', value: 'week' },
  { text: '本月分配', value: 'month' }
];

const statusOptions = ref([{ text: '全部状态', value: '' }]);
const salesOptions = ref([{ text: '全部销售', value: '' }]);
const localizedStatusMap = ref({});

// ================== 状态管理 ==================
const keyword = ref('');

const filterParams = ref({
  timeRange: '',
  salesId: '',
  status: ''
});

const showExportPopup = ref(false);
const showExportSalesPicker = ref(false);
const showExportStatusPicker = ref(false);
const exporting = ref(false);

const exportTimeMode = ref('preset');

const exportTimeOptions = [
  { text: '过去一个月', value: 'last30days' },
  { text: '过去七天', value: 'last7days' },
  { text: '今天和昨天', value: 'todayYesterday' }
];

const exportFilters = ref({
  timeRange: 'last7days',
  salesId: '',
  status: '',
  startDate: '',
  endDate: ''
});

const exportSalesLabel = ref('全部销售');
const exportStatusLabel = ref('全部状态');
const selectedExportTimeText = ref('过去七天');

const showExportDateCalendar = ref(false);
const exportCalendarDefaultDate = ref([]);
const exportMinDate = new Date(2020, 0, 1);
const exportMaxDate = new Date();


// 从其他页面跳转过来的“隐藏筛选条件”。
// 这些条件目前没有对应的下拉框，但会原样带给客户池接口。
const routeExtraFilters = ref({
  filter: '',
  isKey: '',
  productCategory: '',
  customerSource: '',
  reprocessDate: ''
});

// 列表分页与刷新状态
const customerList = ref([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);
const pageSize = ref(15);

// 用于丢弃筛选变化前已经发出的旧请求，避免旧请求后返回覆盖新筛选结果
let requestVersion = 0;

const handleBack = () => {
  router.push('/');
};

// ================== 路由筛选初始化 ==================
// query 可能被 Vue Router 解析成 string | string[]，统一取第一个值
const queryValue = (value) => {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
};

const pickQuery = (...keys) => {
  for (const key of keys) {
    const value = queryValue(route.query[key]);
    if (value !== '' && value !== undefined && value !== null) {
      return String(value);
    }
  }
  return '';
};

// 核心：所有页面跳转到客户池时，都统一在这里读取筛选参数。
// 同时兼容项目里可能出现的不同命名方式。
const applyRouteFilters = () => {
  keyword.value = pickQuery('keyword', 'search');

  filterParams.value.timeRange = pickQuery(
    'timeRange',
    'time_range'
  );

  filterParams.value.salesId = pickQuery(
    'salesId',
    'sales_id',
    'assigned_sales_id'
  );

  filterParams.value.status = pickQuery('status');

  routeExtraFilters.value.filter = pickQuery('filter');

  routeExtraFilters.value.isKey = pickQuery(
    'is_key',
    'isKey'
  );

  routeExtraFilters.value.productCategory = pickQuery(
    'product_category',
    'productCategory',
    'category'
  );

  routeExtraFilters.value.customerSource = pickQuery(
    'customer_source',
    'customerSource',
    'source'
  );

  routeExtraFilters.value.reprocessDate = pickQuery(
    'reprocess_date',
    'reprocessDate'
  );
};

// 必须在 van-list 第一次自动触发 onLoad 之前执行。
// 这样首次请求本身就是带筛选的，不会先加载“全部客户”。
applyRouteFilters();

// ================== 初始化 ==================
onMounted(() => {
  fetchStatusDict();
  fetchSalesList();
  // van-list 会自动触发 onLoad，不再手动请求，避免首次重复请求
});

// 同一个客户池组件被复用时，onMounted 不会再次执行。
// 监听完整路由，确保从其他页面再次带新筛选跳转时立即生效。
watch(
  () => route.fullPath,
  (newPath, oldPath) => {
    if (newPath === oldPath) return;

    applyRouteFilters();
    onRefresh();
  }
);

// 获取真实的动态状态字典
const fetchStatusDict = async () => {
  try {
    const res = await request.get('/api/system/dict', {
      params: { type: 'customer_status' }
    });

    const dictMap = {};
    const options = [{ text: '全部状态', value: '' }];

    (res.data || []).forEach(item => {
      const dynamicKey = `label_${locale.value}`;
      const labelText = item[dynamicKey] || item.label_zh || item.label;

      dictMap[item.value] = labelText;
      options.push({
        text: labelText,
        value: item.value
      });
    });

    localizedStatusMap.value = dictMap;
    statusOptions.value = options;
  } catch (e) {
    console.error('获取动态状态字典失败', e);
  }
};

const onEdit = (item) => {
  showToast('编辑功能开发中');
};

// 删除客户
const onDelete = (item) => {
  showConfirmDialog({
    title: '确认删除',
    message: `确定要彻底删除客户 [${item.name}] 吗？相关的跟进记录也将一同删除，此操作不可恢复。`,
  })
    .then(async () => {
      try {
        showToast({
          type: 'loading',
          message: '删除中...',
          duration: 0
        });

        const res = await request.post('/api/customers/delete', {
          id: item._id
        });

        if (res.code === 200) {
          showToast({
            type: 'success',
            message: '删除成功'
          });
          onRefresh();
        } else {
          showToast(res.message || '删除失败');
        }
      } catch (err) {
        showToast('服务器异常，删除失败');
      }
    })
    .catch(() => {
      // 用户取消
    });
};

// 获取销售列表
const fetchSalesList = async () => {
  try {
    const res = await request.get('/api/users/sales-list');

    if (res.data) {
      const sales = res.data.map(user => ({
        // users 接口实际返回的是 MongoDB _id / real_name
        text: user.real_name || user.name || user.username,
        value: String(user._id || user._openid || user.userId || '')
      })).filter(item => item.value);

      salesOptions.value = [
        { text: '全部销售', value: '' },
        ...sales
      ];
    }
  } catch (err) {
    console.error('获取销售列表失败', err);
  }
};


// ================== 下载客户数据 ==================
const openExportPopup = () => {
  showExportPopup.value = true;
};

const formatExportDate = (date) => {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const syncExportTimeText = () => {
  if (exportTimeMode.value === 'custom') {
    if (exportFilters.value.startDate && exportFilters.value.endDate) {
      selectedExportTimeText.value =
        `${exportFilters.value.startDate} 至 ${exportFilters.value.endDate}`;
    } else {
      selectedExportTimeText.value = '自定义时间范围';
    }
    return;
  }

  selectedExportTimeText.value =
    exportTimeOptions.find(item => item.value === exportFilters.value.timeRange)?.text || '过去七天';
};

const selectPresetTime = (value) => {
  exportTimeMode.value = 'preset';
  exportFilters.value.timeRange = value;
  exportFilters.value.startDate = '';
  exportFilters.value.endDate = '';
  syncExportTimeText();
};

const openCustomDateRange = () => {
  exportTimeMode.value = 'custom';

  if (exportFilters.value.startDate && exportFilters.value.endDate) {
    exportCalendarDefaultDate.value = [
      new Date(`${exportFilters.value.startDate}T00:00:00`),
      new Date(`${exportFilters.value.endDate}T00:00:00`)
    ];
  } else {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    exportCalendarDefaultDate.value = [start, end];
  }

  showExportDateCalendar.value = true;
};

const onExportDateRangeConfirm = (dates) => {
  const [start, end] = dates || [];
  if (!start || !end) return;

  exportFilters.value.startDate = formatExportDate(start);
  exportFilters.value.endDate = formatExportDate(end);
  exportFilters.value.timeRange = 'custom';
  exportTimeMode.value = 'custom';

  syncExportTimeText();
  showExportDateCalendar.value = false;
};

const resetExportFilters = () => {
  exportTimeMode.value = 'preset';

  exportFilters.value = {
    timeRange: 'last7days',
    salesId: '',
    status: '',
    startDate: '',
    endDate: ''
  };

  exportSalesLabel.value = '全部销售';
  exportStatusLabel.value = '全部状态';
  syncExportTimeText();
};

const onExportSalesConfirm = ({ selectedOptions }) => {
  const option = selectedOptions?.[0];
  if (!option) return;

  exportFilters.value.salesId = String(option.value || '');
  exportSalesLabel.value = option.text || '全部销售';
  showExportSalesPicker.value = false;
};

const onExportStatusConfirm = ({ selectedOptions }) => {
  const option = selectedOptions?.[0];
  if (!option) return;

  exportFilters.value.status = option.value || '';
  exportStatusLabel.value = option.text || '全部状态';
  showExportStatusPicker.value = false;
};

const downloadCustomerData = async () => {
  if (exporting.value) return;

  syncExportTimeText();

  if (
    exportTimeMode.value === 'custom' &&
    (!exportFilters.value.startDate || !exportFilters.value.endDate)
  ) {
    return showToast('请先选择自定义时间范围');
  }

  exporting.value = true;

  try {
    // 注意：这里不要使用 responseType: 'blob'
    // 项目的 request.js 拦截器是按 JSON { code, data } 结构处理响应的。
    const res = await request.get('/api/customers/export', {
      params: {
        timeRange: exportTimeMode.value === 'custom'
          ? 'custom'
          : exportFilters.value.timeRange,
        startDate: exportTimeMode.value === 'custom'
          ? exportFilters.value.startDate
          : '',
        endDate: exportTimeMode.value === 'custom'
          ? exportFilters.value.endDate
          : '',
        salesId: exportFilters.value.salesId,
        status: exportFilters.value.status
      }
    });

    if (res.code !== 200 || !res.data?.csv) {
      return showToast(res.message || '下载失败，请稍后重试');
    }

    const csvText = res.data.csv;
    const fileName = res.data.filename || '客户数据.csv';

    const blob = new Blob(
      [csvText],
      { type: 'text/csv;charset=utf-8' }
    );

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);

    showToast(`已导出 ${res.data.count || 0} 条客户数据`);
    showExportPopup.value = false;
  } catch (err) {
    console.error('下载客户数据失败', err);
    showToast('下载失败，请稍后重试');
  } finally {
    exporting.value = false;
  }
};

watch(
  () => [
    exportTimeMode.value,
    exportFilters.value.timeRange,
    exportFilters.value.startDate,
    exportFilters.value.endDate
  ],
  () => syncExportTimeText()
);


// ================== 核心加载逻辑 ==================
const getList = async () => {
  // 记录这次请求属于哪一轮筛选
  const currentVersion = requestVersion;
  const currentPage = page.value;

  try {
    const params = {
      page: currentPage,
      pageSize: pageSize.value,
      keyword: keyword.value,

      // 页面自身三个可见筛选项
      timeRange: filterParams.value.timeRange,
      salesId: filterParams.value.salesId,
      status: filterParams.value.status,

      // 其他页面跳转过来的快捷筛选项
      filter: routeExtraFilters.value.filter,
      is_key: routeExtraFilters.value.isKey,
      product_category: routeExtraFilters.value.productCategory,
      customer_source: routeExtraFilters.value.customerSource,
      reprocess_date: routeExtraFilters.value.reprocessDate
    };

    // “打回重新处理”使用独立接口，避免普通客户池接口漏掉历史动作筛选。
    const requestUrl =
      routeExtraFilters.value.filter === 'reprocessed'
        ? '/api/customers/reprocessed-list'
        : '/api/customers/pool-list';

    const res = await request.get(requestUrl, {
      params
    });

    // 如果请求期间筛选条件已经改变，旧请求结果直接丢弃
    if (currentVersion !== requestVersion) return;

    const rows = res.data?.rows || [];
    const total = res.data?.total || 0;

    if (refreshing.value || currentPage === 1) {
      customerList.value = rows;
      refreshing.value = false;
    } else {
      customerList.value.push(...rows);
    }

    loading.value = false;

    if (customerList.value.length >= total || rows.length === 0) {
      finished.value = true;
    } else {
      page.value = currentPage + 1;
    }
  } catch (err) {
    // 已经过期的旧请求即使失败，也不影响当前列表状态
    if (currentVersion !== requestVersion) return;

    console.error('获取客户列表失败', err);
    showToast('获取客户列表失败');
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
  // 新筛选/刷新开始，之前正在进行的请求全部视为过期
  requestVersion += 1;

  refreshing.value = true;
  finished.value = false;
  loading.value = true;
  page.value = 1;
  customerList.value = [];

  getList();
};

const onSearch = () => {
  onRefresh();
};

const onFilterChange = () => {
  onRefresh();
};

const goToDetail = (id) => {
  router.push(`/customer-detail?id=${id}`);
};

// ================== 工具函数 ==================
const formatDateTime = (dateStr) => {
  if (!dateStr) return '';

  const d = new Date(dateStr);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
</script>

<style scoped>
.customer-pool-container {
  min-height: 100vh;
  background-color: #f4f6f9;
}
.custom-nav {
  background: #fff;
}

/* 顶部吸顶搜索与筛选区 */
.sticky-header {
  position: sticky;
  top: 46px; 
  z-index: 99;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.custom-search {
  padding: 10px 16px 4px;
}
.custom-dropdown :deep(.van-dropdown-menu__bar) {
  box-shadow: none;
  height: 40px;
}

/* 列表容器 */
.list-wrap {
  padding: 12px 16px 24px;
}

/* 现代化客户卡片 */
.customer-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
  transition: transform 0.1s;
}
.customer-card:active {
  transform: scale(0.98);
  background-color: #fafbfc;
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #f0f0f0;
}
.name-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.customer-name {
  font-size: 16px;
  font-weight: 600;
  color: #1c1c1e;
}
.date-text {
  font-size: 12px;
  color: #c8c9cc;
}

/* 🌟 统一的颜色字典池 */
.status-tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: bold;
}
.bg-status-deal_completed { background: #d1fae5 !important; color: #10b981 !important; }
.bg-status-clear_reject { background: #fee2e2 !important; color: #ef4444 !important; }
.bg-status-pending { background: #e0f2fe !important; color: #0284c7 !important; }
.bg-status-following, .bg-status-appointment_machine_v { background: #ede9fe !important; color: #8b5cf6 !important; }
.bg-status-missed_call, .bg-status-cannot_answer_call { background: #fef3c7 !important; color: #d97706 !important; }
.bg-status-invalid_lead { background: #f3f4f6 !important; color: #9ca3af !important; }
.bg-status-default { background: #f3f4f6 !important; color: #4b5563 !important; }


/* 卡片主体 */
.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.info-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.info-icon {
  margin-top: 3px;
  font-size: 14px;
  color: #969799;
}
.info-text {
  font-size: 14px;
  color: #323233;
  line-height: 1.4;
}
.phone-text {
  font-family: SFMono-Regular, Consolas, monospace;
  font-weight: 500;
}
.requirement-row {
  background: #f8faff;
  padding: 8px 10px;
  border-radius: 6px;
}
.requirement-text {
  color: #646566;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* 卡片底部 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sales-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #1989fa;
  font-weight: 500;
}
.source-tag {
  font-size: 12px;
  padding: 3px 8px;
  background: #f0f7ff;
  color: #1989fa;
  border-radius: 4px;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #f0f0f0;
}

/* ================== 导航栏下载按钮 ================== */
.nav-download-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #1989fa;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.nav-download-btn :deep(.van-icon) {
  font-size: 16px;
}

/* ================== 下载弹窗 ================== */
.export-popup {
  max-height: 82vh;
}

.export-panel {
  padding: 18px 16px calc(20px + env(safe-area-inset-bottom));
}

.export-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 22px;
}

.export-title {
  font-size: 19px;
  font-weight: 700;
  color: #1f2329;
}

.export-subtitle {
  margin-top: 5px;
  font-size: 12px;
  color: #969799;
}

.export-close {
  font-size: 20px;
  color: #969799;
  padding: 2px;
  cursor: pointer;
}

.export-section {
  margin-bottom: 18px;
}

.export-section-label {
  margin-bottom: 9px;
  font-size: 14px;
  font-weight: 600;
  color: #323233;
}

.time-option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.time-mode-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  margin-bottom: 10px;
  border-radius: 10px;
  background: #f5f7fa;
}

.time-mode-btn {
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #646566;
  font-size: 14px;
  cursor: pointer;
}

.time-mode-btn.active {
  background: #fff;
  color: #1989fa;
  font-weight: 600;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.07);
}

.custom-range-box {
  min-height: 58px;
  padding: 10px 12px;
  border: 1px solid #dcecff;
  border-radius: 9px;
  background: #f5faff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-sizing: border-box;
  cursor: pointer;
}

.custom-range-label {
  font-size: 12px;
  color: #969799;
  margin-bottom: 5px;
}

.custom-range-value {
  font-size: 14px;
  color: #323233;
  line-height: 1.4;
}

.custom-range-icon {
  flex: 0 0 auto;
  font-size: 20px;
  color: #1989fa;
}

.time-option-btn {
  height: 42px;
  border: 1px solid #ebedf0;
  border-radius: 9px;
  background: #f7f8fa;
  color: #646566;
  font-size: 14px;
  cursor: pointer;
}

.time-option-btn.active {
  border-color: #1989fa;
  background: #eef7ff;
  color: #1989fa;
  font-weight: 600;
}

.export-field {
  padding: 11px 12px;
  border-radius: 9px;
  background: #f7f8fa;
}

.export-summary {
  margin: 4px 0 18px;
  padding: 11px 12px;
  border-radius: 8px;
  background: #f4f8ff;
  color: #646566;
  font-size: 12px;
  line-height: 1.5;
}

.export-actions {
  display: grid;
  grid-template-columns: 0.8fr 1.2fr;
  gap: 10px;
}

@media (min-width: 768px) {
  .export-popup {
    left: 50% !important;
    right: auto !important;
    bottom: 24px !important;
    width: 520px !important;
    max-width: calc(100vw - 40px);
    transform: translateX(-50%);
    border-radius: 16px !important;
  }

  .time-option-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}


.quick-filter-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 16px 0;
  padding: 9px 11px;
  border-radius: 8px;
  background: #eef5ff;
  color: #1989fa;
  font-size: 12px;
}

</style>