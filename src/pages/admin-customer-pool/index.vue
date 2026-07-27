<!-- src/pages/admin-customer-pool/index.vue -->
<template>
  <div class="customer-pool-container">
  <van-nav-bar
  :title="t('title.customerPool')"
  :left-text="t('common.back')"
  left-arrow
  @click-left="router.back()"
/>

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
                <van-tag plain :type="getStatusType(item.status)" size="small">
                  {{ getStatusText(item.status) }}
                </van-tag>
              </div>
              <span class="date-text">{{ formatDateTime(item.created_at) }}</span>
            </div>

            <!-- 卡片主体：核心信息 -->
            <div class="card-body">
              <div class="info-row">
                <van-icon name="phone-o" class="info-icon" />
                <span class="info-text phone-text">{{ item.phone || '未留存电话' }}</span>
              </div>
              <div class="info-row">
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
                <van-tag color="#f0f7ff" text-color="#1989fa">{{ item.customer_source === 'operate_allocate' ? '运营分配' : item.customer_source }}</van-tag>
              </div>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import request from '../../utils/request';

const router = useRouter();

// ================== 筛选器选项配置 ==================
const timeOptions = [
  { text: '全部分配时间', value: '' },
  { text: '今日分配', value: 'today' },
  { text: '本周分配', value: 'week' },
  { text: '本月分配', value: 'month' }
];

const statusOptions = [
  { text: '全部状态', value: '' },
  { text: '待处理', value: 'pending' },
  { text: '跟进中', value: 'following' },
  { text: '已成交', value: 'deal' },
  { text: '已流失', value: 'lost' }
];

const salesOptions = ref([{ text: '全部销售', value: '' }]);

// ================== 状态管理 ==================
const keyword = ref('');
const filterParams = ref({
  timeRange: '',
  salesId: '',
  status: ''
});

// 列表分页与刷新状态
const customerList = ref([]);
const loading = ref(false);
const finished = ref(false);
const refreshing = ref(false);
const page = ref(1);
const pageSize = ref(15);

// ================== 初始化 ==================
onMounted(() => {
  fetchSalesList();
  // 列表会在 van-list 初始化时自动调用 onLoad，因此这里不需要手动调 getList
});

// 获取销售列表（用于填充下拉框）
const fetchSalesList = async () => {
  try {
    const res = await request.get('/api/users/list');
    if (res.data) {
      const sales = res.data.map(user => ({
        text: user.real_name || user.username,
        value: user._id
      }));
      salesOptions.value = [{ text: '全部销售', value: '' }, ...sales];
    }
  } catch (err) {
    console.error('获取销售列表失败');
  }
};

// ================== 核心加载逻辑 ==================
const getList = async () => {
  try {
    // 组装查询参数
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value,
      timeRange: filterParams.value.timeRange,
      salesId: filterParams.value.salesId,
      status: filterParams.value.status
    };

    // 这里调用后续将在后端补充的统一带分页和多条件查询的 list 接口
    const res = await request.get('/api/customers/pool-list', { params });
    
    const rows = res.data?.rows || [];
    const total = res.data?.total || 0;

    if (refreshing.value) {
      customerList.value = rows;
      refreshing.value = false;
    } else {
      customerList.value.push(...rows);
    }

    loading.value = false;

    // 判断是否全部加载完毕
    if (customerList.value.length >= total || rows.length === 0) {
      finished.value = true;
    } else {
      page.value++;
    }
  } catch (err) {
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
  finished.value = false;
  loading.value = true;
  page.value = 1;
  getList();
};

const onSearch = () => {
  onRefresh();
};

const onFilterChange = () => {
  onRefresh();
};

const goToDetail = (id) => {
  // 预留跳转到客户详情时间轴页面的逻辑
  // router.push(`/customer-detail?id=${id}`);
};

// ================== 工具函数 ==================
const getStatusText = (status) => {
  const map = {
    pending: '待处理',
    following: '跟进中',
    deal: '已成交',
    lost: '已流失'
  };
  return map[status] || '未知状态';
};

const getStatusType = (status) => {
  const map = {
    pending: 'primary',
    following: 'warning',
    deal: 'success',
    lost: 'danger'
  };
  return map[status] || 'default';
};

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
  top: 46px; /* van-nav-bar 的默认高度 */
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
  /* 多行截断 */
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
</style>