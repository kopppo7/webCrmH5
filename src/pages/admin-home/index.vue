<!-- src/pages/admin-home/index.vue -->
<template>
  <div class="admin-container">
    <!-- 顶部数据概览 (已联动动态数据) -->
    <div class="admin-header">
      <h2 class="title">{{ t('admin.title', '管理控制台') }}</h2>
      <p class="subtitle">{{ t('admin.subtitle', '全面掌控机械设备的销售与线索流转') }}</p>
      
      <div class="data-board">
        <div class="data-item">
          <span class="num">{{ overviewData.newLeadsThisMonth || 0 }}</span>
          <span class="label">本月新增线索</span>
        </div>
        <div class="data-item">
          <span class="num">{{ overviewData.followUpsThisMonth || 0 }}</span>
          <span class="label">本月跟进次数</span>
        </div>
        <div class="data-item">
          <span class="num">{{ overviewData.dealsThisMonth || 0 }}</span>
          <span class="label">本月成交</span>
        </div>
        <div class="data-item">
          <span class="num">{{ overviewData.keyCustomers || 0 }}</span>
          <span class="label">重点客户数量</span>
        </div>
      </div>
    </div>

    <!-- 核心功能宫格 -->
    <div class="section-container">
      <h3 class="section-title">业务管理</h3>
      <van-grid :column-num="3" :border="false" class="custom-grid">
        <van-grid-item icon="cluster-o" text="分配客户" @click="navigateTo('/admin-customer-assign')" />
        <van-grid-item icon="friends-o" text="查看客户池" @click="navigateTo('/admin-customer-pool')" />
        <van-grid-item
          icon="chart-trending-o"
          text="销售数据分析"
          :class="{ 'nav-item-loading': navigatingPath === '/sales-data' }"
          @click="navigateTo('/sales-data')"
        />
        <van-grid-item icon="notes-o" text="工作报告" @click="navigateTo('/admin-report')" />
        <van-grid-item icon="orders-o" text="设备订单" @click="showToast('设备订单功能暂未开放')" />
        <van-grid-item icon="setting-o" text="系统设置" @click="navigateTo('/admin-setting')" />
      </van-grid>
    </div>

    <!-- 员工数据模块 -->
    <div class="section-container employee-section">
      <div class="section-header">
        <h3 class="section-title">员工数据</h3>
      </div>

      <div class="employee-list">
        <!-- 当没有数据时显示的占位 -->
        <van-empty v-if="employeeList.length === 0" description="暂无员工数据" />
        
        <!-- 员工卡片：只要接口有数据，直接在这里平铺显示 -->
        <div class="employee-card" v-for="emp in employeeList" :key="getEmployeeId(emp)">
          <div class="emp-header">
            <div class="emp-info">
              <van-icon name="manager" class="emp-avatar-icon" />
              <span class="emp-name">{{ emp.name || emp.username }}</span>
            </div>
          </div>
          
          <!-- 员工业务数据展示 (支持独立点击穿透跳转筛选) -->
          <div class="emp-stats-grid">
            <div class="stat-item" @click="goToEmployeePool(getEmployeeId(emp), 'all')">
              <span class="stat-num text-blue">{{ emp.totalLeads || 0 }}</span>
              <span class="stat-label">总线索池</span>
            </div>
            <div class="stat-item" @click="goToEmployeePool(getEmployeeId(emp), 'today_todo')">
              <span class="stat-num text-purple">{{ emp.todayTodos || 0 }}</span>
              <span class="stat-label">今日代办</span>
            </div>
            <div class="stat-item" @click="goToEmployeePool(getEmployeeId(emp), '7days')">
              <span class="stat-num text-cyan">{{ emp.processedIn7Days || 0 }}</span>
              <span class="stat-label">近七天跟进</span>
            </div>
            <div class="stat-item" @click="goToEmployeePool(getEmployeeId(emp), 'completed')">
              <span class="stat-num text-green">{{ emp.deals || 0 }}</span>
              <span class="stat-label">成功签单</span>
            </div>
            <div class="stat-item" @click="goToEmployeePool(getEmployeeId(emp), 'key_customer')">
              <span class="stat-num text-orange">{{ emp.keyCustomers || 0 }}</span>
              <span class="stat-label">重点客户</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { showToast } from 'vant';
import request from '../../utils/request';

const { t } = useI18n();
const router = useRouter();
const navigatingPath = ref('');
let navigationTimer = null;

// ================= 状态数据 =================
// 顶部概览数据
const overviewData = ref({
  newLeadsThisMonth: 0,
  followUpsThisMonth: 0,
  dealsThisMonth: 0,
  keyCustomers: 0
});

// 员工列表与对应的各项数据
const employeeList = ref([]);

// ================= 生命周期 =================
const refreshHomeData = () => {
  fetchDashboardData();
  fetchEmployeeStats();
};

onMounted(() => {
  refreshHomeData();
});

// 如果主页被 keep-alive 缓存，返回主页时 onMounted 不会再次执行。
// 用 onActivated 保证重新进入主页时刷新数据。
onActivated(() => {
  refreshHomeData();
});

// ================= 数据拉取 =================
// 1. 获取顶部管理控制台数据
const fetchDashboardData = async () => {
  try {
    const res = await request.get('/api/admin/dashboard-overview');
    if (res.code === 200 && res.data) {
      overviewData.value = res.data;
    }
  } catch (error) {
    console.error('获取控制台数据失败', error);
    showToast('控制台数据加载失败');
  }
};

// 2. 获取员工各项统计数据
const fetchEmployeeStats = async () => {
  try {
    const res = await request.get('/api/admin/employee-stats');
    if (res.code === 200 && res.data) {
      employeeList.value = res.data;
    }
  } catch (error) {
    console.error('获取员工数据失败', error);
    showToast('员工数据加载失败');
  }
};

// ================= 交互事件 =================
// 统一页面跳转：不再依赖 van-grid-item 的 to 内部跳转。
// H5 某些情况下 touch/click 被组件状态吞掉时，显式 router.push 更稳定。
const navigateTo = async (path) => {
  if (!path) return;

  // 防止连续点击导致重复导航或导航状态互相覆盖
  if (navigatingPath.value) return;

  navigatingPath.value = path;

  if (navigationTimer) {
    clearTimeout(navigationTimer);
  }

  // 兜底：即使路由守卫/页面加载异常，也不要永久锁死按钮
  navigationTimer = setTimeout(() => {
    navigatingPath.value = '';
  }, 3000);

  try {
    const resolved = router.resolve(path);

    if (!resolved.matched || resolved.matched.length === 0) {
      console.error('未匹配到路由:', path);
      showToast('页面路由不存在');
      return;
    }

    await router.push(path);
  } catch (error) {
    // Vue Router 重复导航通常不需要当成真正错误提示
    const message = String(error?.message || error || '');

    if (!message.includes('Avoided redundant navigation')) {
      console.error('页面跳转失败:', path, error);
      showToast('页面打开失败，请重试');
    }
  } finally {
    if (navigationTimer) {
      clearTimeout(navigationTimer);
      navigationTimer = null;
    }
    navigatingPath.value = '';
  }
};

// 点击不同员工的不同数据项，携带筛选参数跳转客户池
const getEmployeeId = (emp) => {
  return String(emp?.userId || emp?._id || emp?.id || '');
};

const goToEmployeePool = (salesId, type) => {
  if (!salesId) {
    showToast('员工ID缺失，无法打开筛选结果');
    return;
  }

  let queryParams = { salesId: String(salesId) }; 

  switch (type) {
    case 'all':
      break; 
    case 'today_todo':
      queryParams.filter = 'today_todo';
      break;
    case '7days':
      queryParams.filter = '7days_processed';
      break;
    case 'completed':
      queryParams.status = 'deal_completed';
      break;
    case 'key_customer':
      queryParams.is_key = 1;
      break;
  }

  router.push({
    path: '/admin-customer-pool',
    query: queryParams
  }).catch((error) => {
    console.error('打开员工客户池失败', error);
    showToast('打开客户池失败，请重试');
  });
};
</script>

<style scoped>
.admin-container {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 20px;
}

/* ================= 顶部板块 ================= */
.admin-header {
  background: linear-gradient(135deg, #1989fa, #005eb8);
  padding: 40px 20px 30px;
  color: #fff;
}

.title {
  margin: 0 0 8px;
  font-size: 24px;
}

.subtitle {
  margin: 0 0 20px;
  font-size: 14px;
  opacity: 0.8;
}

.data-board {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 0;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px 0;
  backdrop-filter: blur(10px);
}

.data-item {
  text-align: center;
  position: relative;
}

.data-item:nth-child(odd)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 10%;
  height: 80%;
  width: 1px;
  background: rgba(255, 255, 255, 0.2);
}

.num {
  display: block;
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 4px;
}

.label {
  font-size: 12px;
  opacity: 0.9;
}

/* ================= 基础模块 ================= */
.section-container {
  margin: 16px 16px 0;
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 8px;
}

.section-title {
  font-size: 16px;
  color: #323233;
  margin: 0;
  font-weight: 600;
}

.custom-grid {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

/* ================= 员工卡片模块 ================= */
.employee-section {
  margin-top: 24px;
}

.employee-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);
}

.emp-header {
  display: flex;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px dashed #f0f0f0;
  margin-bottom: 12px;
}

.emp-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.emp-avatar-icon {
  font-size: 20px;
  color: #1989fa;
  background: #eff6ff;
  padding: 6px;
  border-radius: 50%;
}

.emp-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.emp-stats-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.stat-item {
  flex: 1 1 calc(33.333% - 12px);
  background: #f8f9fa;
  border-radius: 8px;
  padding: 10px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.stat-item:active {
  background: #f0f2f5;
}

.stat-num {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 11px;
  color: #666;
  white-space: nowrap;
}

/* 数字专属配色 */
.text-blue { color: #1989fa; }
.text-purple { color: #8b5cf6; }
.text-cyan { color: #06b6d4; }
.text-green { color: #10b981; }
.text-orange { color: #f59e0b; }

/* 宫格按钮点击稳定性与反馈 */
.custom-grid :deep(.van-grid-item__content) {
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.custom-grid :deep(.van-grid-item__content:active) {
  background: #f5f8fc;
}

.nav-item-loading :deep(.van-grid-item__content) {
  opacity: 0.6;
  pointer-events: none;
}

/* PC 端不要无限拉宽，保持信息密度 */
@media (min-width: 900px) {
  .admin-container {
    max-width: 1180px;
    margin: 0 auto;
  }

  .employee-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .employee-card {
    margin-bottom: 0;
  }
}

</style>