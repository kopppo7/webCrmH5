<!-- src/pages/customer-list/index.vue -->
<template>
  <div class="container-wrapper">
    <van-nav-bar
      :title="isAdmin ? t('customer.allCustomers', '全部客户') : t('customer.myCustomers', '我的客户')"
      left-arrow
      @click-left="router.back()"
      fixed
      placeholder
    />

    <div class="container">
      <!-- 1. 顶部 Tab 切换 -->
      <van-tabs v-model:active="activeTab" @change="onFilterChange" sticky offset-top="46" color="#10b981">
        <van-tab :title="t('customer.all', '全部客户')" name="all_customers"></van-tab>
        <van-tab :title="t('customer.key', '重点客户')" name="key_customers"></van-tab>
      </van-tabs>

      <!-- 2. 搜索框 -->
      <div class="search-bar">
        <van-search
          v-model.trim="searchKeyword"
          :placeholder="t('customer.searchPlaceholder', '搜索姓名、电话、城市...')"
          shape="round"
          @search="onFilterChange"
          @clear="onFilterChange"
        />
      </div>

      <!-- 3. 高级筛选下拉菜单 -->
      <van-dropdown-menu active-color="#10b981">
        <!-- 日期筛选 (自定义插槽) -->
        <van-dropdown-item :title="selectedDate || t('customer.allTime', '全部时间')" ref="dateDropdown">
          <div style="padding: 15px;">
            <van-cell :title="t('customer.selectDate', '选择特定日期')" is-link @click="showCalendar = true" />
            <van-button v-if="selectedDate" type="danger" block plain style="margin-top: 15px" @click="clearDate">
              {{ t('common.clear', '清除日期') }}
            </van-button>
          </div>
        </van-dropdown-item>
        
        <!-- 销售人员筛选 (仅管理员可见) -->
        <van-dropdown-item 
          v-if="isAdmin" 
          v-model="selectedSalesId" 
          :options="salesOptions" 
          @change="onFilterChange" 
        />
        
        <!-- 状态筛选 -->
        <van-dropdown-item 
          v-model="selectedStatus" 
          :options="statusOptions" 
          @change="onFilterChange" 
        />
      </van-dropdown-menu>

      <!-- 日历弹窗 -->
      <van-calendar v-model:show="showCalendar" @confirm="onDateConfirm" :show-confirm="false" />

      <!-- 4. 列表滚动区 -->
      <div class="list-container">
        <van-empty 
          v-if="customerList.length === 0 && !isLoading" 
          :description="searchKeyword ? t('common.notFound', '未找到相关客户') : t('common.empty', '暂无客户数据')" 
        />

        <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
          <van-list
            v-model:loading="isLoading"
            :finished="!hasMore"
            :finished-text="customerList.length > 0 ? t('common.noMore', '— 到底啦 —') : ''"
            @load="loadMore"
          >
            <!-- 客户卡片 (完美复刻小程序 UI) -->
            <div class="customer-card" v-for="item in customerList" :key="item._id">
              <div 
                class="card-content" 
                @click="goToDetail(item._id)" 
                :style="item.is_key_customer ? 'border-right: 5px solid #f59e0b; background: linear-gradient(to right, #ffffff 60%, #fffbeb 100%);' : ''"
              >
                
                <div class="header">
                  <div class="name-box">
                    <span v-if="item.is_key_customer" class="key-star">⭐</span>
                    <span class="name">{{ item.name }}</span>
                  </div>
                  
                  <div class="tags-container">
                    <span v-if="item.isOverdue && !['deal_completed', 'clear_reject', 'invalid_lead'].includes(item.status)" class="tag tag-overdue">
                      {{ t('status.overdue', '已逾期') }}
                    </span>
                    <span v-if="item.status === 'pending' || !item.status" class="tag tag-pending">
                      {{ localizedStatusMap['pending'] || t('status.pending', '待处理') }}
                    </span>
                    <span v-else-if="item.status === 'missed_call'" class="tag tag-warning">
                      {{ localizedStatusMap['missed_call'] || t('status.noAnswer', '未接电话') }}
                    </span>
                    <span v-else-if="!['deal_completed', 'clear_reject', 'invalid_lead'].includes(item.status) && item.status" class="tag tag-following">
                      {{ localizedStatusMap[item.status] || item.status }}
                    </span>
                    <span v-else-if="['deal_completed', 'clear_reject', 'invalid_lead'].includes(item.status)" class="tag tag-closed">
                      {{ localizedStatusMap[item.status] || item.status }}
                    </span>
                  </div>
                </div>

                <div class="phone-row">
                  <a class="phone-link" @click.stop="makePhoneCall(item.phone)">📞 {{ item.phone }}</a>
                </div>

                <div class="info text-gray">
                  {{ t('customer.payload', '需求机型') }}: {{ item.payload && item.payload !== 'none' ? item.payload : '--' }} |
                  {{ t('customer.city', '城市') }}: {{ item.city && item.city !== 'none' ? item.city : '--' }}
                  <template v-if="item.remark && item.remark !== 'none' && item.remark !== 'undefined'">
                    | {{ t('customer.remark', '备注') }}: {{ item.remark }}
                  </template>
                </div>
                
                <!-- 极简元数据栏 -->
                <div class="card-bottom-bar">
                  <div class="bottom-item" v-if="isAdmin">
                    <span class="bottom-icon">👤</span> 
                    <span>{{ item.sales_name || item.assigned_sales_name || t('customer.unassigned', '未分配') }}</span>
                  </div>

                  <div class="bottom-item">
                    <span class="bottom-icon">⏰</span> 
                    <span :class="{ 'text-highlight': item.next_follow_up }">
                      {{ item.next_follow_up || item.formattedCreateTime }}
                    </span>
                  </div>

                  <div class="bottom-item" v-if="item.formattedUpdateTime">
                    <span class="bottom-icon">📝</span> 
                    <span>{{ item.formattedUpdateTime }}</span>
                  </div>
                </div>

              </div>
            </div>
          </van-list>
        </van-pull-refresh>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import request from '../../utils/request';

const router = useRouter();
const { t, locale } = useI18n();

const isAdmin = ref(false); // 需通过全局状态或接口获取
const activeTab = ref('all_customers');

// 搜索与筛选状态
const searchKeyword = ref('');
const selectedDate = ref('');
const showCalendar = ref(false);
const dateDropdown = ref(null);

const selectedSalesId = ref('all');
const salesOptions = ref([{ text: t('customer.allSales', '全部销售'), value: 'all' }]);

const selectedStatus = ref('all');
const statusOptions = ref([
  { text: t('customer.allStatus', '全部状态'), value: 'all' },
  { text: t('customer.overdue', '已逾期 (需立即处理)'), value: 'overdue' }
]);
const localizedStatusMap = ref({});

// 列表数据状态
const customerList = ref([]);
const page = ref(1); // 🌟 H5 通用分页习惯从 1 开始
const pageSize = ref(20);
const hasMore = ref(true);
const isLoading = ref(false);
const refreshing = ref(false);

onMounted(async () => {
  await fetchUserInfo();
  await fetchStatusDict();
  if (isAdmin.value) await fetchSalesList();
  fetchData(true);
});

// 获取用户身份 (替代 wx.getStorageSync('myOpenId'))
const fetchUserInfo = async () => {
  try {
    const res = await request.get('/api/users/current');
    isAdmin.value = res.data.role === 'admin';
  } catch (e) {
    console.error('获取用户信息失败', e);
  }
};

// 获取状态字典并映射给 Vant Dropdown
const fetchStatusDict = async () => {
  try {
    const res = await request.get('/api/system/dict', { params: { type: 'customer_status' } });
    const dictMap = {};
    res.data.forEach(item => {
      const label = item[`label_${locale.value}`] || item.label_zh || item.label;
      dictMap[item.value] = label;
      statusOptions.value.push({ text: label, value: item.value });
    });
    localizedStatusMap.value = dictMap;
  } catch (e) {
    console.error('获取字典失败', e);
  }
};

// 管理员获取销售列表
const fetchSalesList = async () => {
  try {
    const res = await request.get('/api/users/sales-list');
    const list = res.data.map(user => ({ text: user.name, value: user._id }));
    salesOptions.value = [...salesOptions.value, ...list];
  } catch (e) {
    console.error('获取销售失败', e);
  }
};

// 触发重新加载
const onFilterChange = () => {
  fetchData(true);
};

// 日期确认
const onDateConfirm = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  selectedDate.value = `${y}-${m}-${d}`;
  showCalendar.value = false;
  dateDropdown.value?.toggle();
  fetchData(true);
};

// 清除日期
const clearDate = () => {
  selectedDate.value = '';
  dateDropdown.value?.toggle();
  fetchData(true);
};

const onRefresh = () => {
  fetchData(true);
};

const loadMore = () => {
  if (hasMore.value && !isLoading.value) {
    page.value += 1;
    fetchData(false);
  }
};

// ==========================================
// 🌟 核心：拉取数据对接后端
// ==========================================
const fetchData = async (reset = false) => {
  if (reset) {
    page.value = 1;
    hasMore.value = true;
    customerList.value = [];
  }
  
  if (!reset && !hasMore.value) return;
  isLoading.value = true;

  try {
    // ⚠️ 注意：后端需提供支持以下全量参数的接口
    const res = await request.get('/api/customers/all-list', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: searchKeyword.value,
        isKeyCustomer: activeTab.value === 'key_customers' ? true : undefined,
        status: selectedStatus.value === 'all' ? undefined : selectedStatus.value,
        salesId: selectedSalesId.value === 'all' ? undefined : selectedSalesId.value,
        specificDate: selectedDate.value || undefined // 特定日期过滤
      }
    });

    const newData = res.data?.rows || res.data || [];
    
    // 前端计算逾期时间兜底 (建议尽量交由后端计算直接返回 isOverdue)
    const todayStr = new Date().toISOString().split('T')[0];
    newData.forEach(item => {
      let compareDate = item.next_follow_up || item.formattedCreateTime;
      item.isOverdue = (compareDate && compareDate < todayStr && !['deal_completed', 'clear_reject', 'invalid_lead'].includes(item.status));
    });

    customerList.value = reset ? newData : customerList.value.concat(newData);
    hasMore.value = newData.length === pageSize.value;
  } catch (err) {
    console.error('获取列表失败', err);
  } finally {
    isLoading.value = false;
    refreshing.value = false;
  }
};

// 拨打电话 (替代 wx.makePhoneCall[cite: 12])
const makePhoneCall = (phoneNum) => {
  if (!phoneNum || phoneNum.trim() === '') return showToast('暂无电话号码');
  if (confirm(`确认拨打 ${phoneNum}？`)) {
    window.location.href = `tel:${phoneNum}`;
  }
};

// 跳转详情页[cite: 12]
const goToDetail = (id) => {
  router.push({ path: '/customer-detail', query: { id } });
};
</script>

<style scoped>
/* =========================================
   全局与容器结构[cite: 10]
   ========================================= */
.container-wrapper { background-color: #f4f6f9; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.container { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

/* =========================================
   搜索区[cite: 10]
   ========================================= */
.search-bar { background: #fff; padding: 4px 0; border-bottom: 1px solid #f1f2f6; z-index: 10; }

/* =========================================
   列表区域[cite: 10]
   ========================================= */
.list-container { flex: 1; height: 0; padding: 12px 15px; box-sizing: border-box; overflow-y: auto; }

/* =========================================
   卡片主体[cite: 10]
   ========================================= */
.customer-card { background: #fff; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 5px rgba(0,0,0,0.02); display: flex; flex-direction: column; overflow: hidden; }
.card-content { padding: 12px; position: relative; cursor: pointer; }

/* 头部 */
.header { display: flex; align-items: flex-start; width: 100%; margin-bottom: 4px; }
.name-box { display: flex; align-items: center; flex: 1; padding-right: 70px; }
.key-star { margin-right: 4px; font-size: 13px; }
.name { font-size: 16px; font-weight: 800; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 电话行 */
.phone-row { margin-bottom: 6px; }
.phone-link { color: #10b981; font-size: 15px; font-weight: bold; text-decoration: underline; padding: 2px 0; display: inline-block; cursor: pointer; }

/* 辅助信息 */
.info.text-gray { color: #6b7280; font-size: 12px; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 底部极简元数据栏 */
.card-bottom-bar { display: flex; flex-wrap: wrap; background: #f8fafc; padding: 5px 8px; border-radius: 4px; column-gap: 12px; row-gap: 4px; }
.bottom-item { font-size: 11px; color: #64748b; display: flex; align-items: center; }
.bottom-icon { margin-right: 3px; font-size: 11px; }
.text-highlight { color: #f59e0b; font-weight: bold; }

/* 状态标签体系 */
.tags-container { position: absolute; top: 12px; right: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; z-index: 2; }
.tag { padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: bold; }
.tag-overdue { background-color: #fee2e2; color: #ef4444; }
.tag-pending { background-color: #e0f2fe; color: #0284c7; }
.tag-warning { background-color: #fef3c7; color: #d97706; }
.tag-following { background-color: #f3e8ff; color: #7e22ce; }
.tag-closed { background-color: #f1f5f9; color: #64748b; font-weight: normal; }

/* Vant UI 样式覆盖修正 */
:deep(.van-dropdown-menu__bar) { box-shadow: none; border-bottom: 1px solid #f1f2f6; height: 44px; }
:deep(.van-search) { padding: 4px 15px; }
</style>