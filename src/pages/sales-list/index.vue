<template>
  <div class="container">
    <van-nav-bar
      title="今日代办"
      left-text="返回"
      left-arrow
      @click-left="router.back()"
      fixed
      placeholder
      :border="false"
      class="custom-nav"
    />

    <!-- 搜索栏 -->
    <div class="search-bar">
      <div class="search-box">
        <van-icon name="search" size="14" color="#999" />
        <input 
          class="search-input" 
          :placeholder="t('salesList.searchPlaceholder', '搜索姓名/电话/城市')" 
          v-model.trim="searchKeyword" 
          @keyup.enter="onSearch" 
        />
        <van-icon 
          v-if="searchKeyword" 
          name="clear" 
          size="16" 
          color="#ccc" 
          @click="clearSearch" 
          style="padding: 10px;" 
        />
      </div>
    </div>

    <!-- 列表区域 -->
    <div class="list-container">
      <van-empty 
        v-if="customerList.length === 0 && !isLoading" 
        :description="searchKeyword ? t('salesList.notFound') : t('salesList.emptyTodo', '暂无待办事项')" 
      />

      <van-list
        v-model:loading="isLoading"
        :finished="!hasMore"
        :finished-text="customerList.length > 0 ? t('salesList.noMore', '没有更多了') : ''"
        @load="loadMore"
      >
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
                <!-- 1. 独立判断：逾期标签 (保持不变) -->
                <span v-if="item.isOverdue && !['deal_completed', 'clear_reject', 'invalid_lead'].includes(item.status)" class="tag tag-overdue">
                  {{ t('status.overdue', '已逾期') }}
                </span>
                
                <!-- 🌟 2. 核心修复：补充“待处理”状态标签 -->
                <span v-if="item.status === 'pending' || !item.status" class="tag tag-pending">
                  {{ localizedStatusMap['pending'] || t('status.pending', '待处理') }}
                </span>
                
                <!-- 3. 互斥判断：未接电话 -->
                <span v-else-if="item.status === 'missed_call'" class="tag tag-warning">
                  {{ localizedStatusMap[item.status] || t('status.noAnswer', '未接电话') }}
                </span>
                
                <!-- 4. 互斥判断：其他常规跟进状态 -->
                <span v-else-if="!['deal_completed', 'clear_reject', 'invalid_lead'].includes(item.status) && item.status" class="tag tag-following">
                  {{ localizedStatusMap[item.status] || item.status }}
                </span>
              </div>
            </div>

            <div class="phone-row">
              <a class="phone-link" @click.stop="makePhoneCall(item.phone)">📞 {{ item.phone }}</a>
            </div>

            <!-- 🌟 统一列表模式下：未接电话精准时间高亮提示 -->
            <div class="missed-call-notice" v-if="item.lastMissedCallText">
              <span class="notice-icon">⚠️</span>
              <span>{{ item.lastMissedCallText }} 拨打电话未接通</span>
            </div>

            <div class="info text-gray">
              需求机型: {{ item.payload && item.payload !== 'none' ? item.payload : '--' }} |
              城市: {{ item.city && item.city !== 'none' ? item.city : '--' }}
              <template v-if="item.remark && item.remark !== 'none' && item.remark !== 'undefined'">
                | 备注: {{ item.remark }}
              </template>
            </div>

            <div class="card-bottom-bar">
              <div class="bottom-item">
                <span class="bottom-icon">⏰</span> 
                <span :class="{ 'text-highlight': item.next_follow_up }">
                  {{ item.next_follow_up || item.formattedCreateTime }}
                </span>
              </div>
            </div>

          </div>
        </div>
      </van-list>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import request from '../../utils/request';

const router = useRouter();
const { t, locale } = useI18n();

const customerList = ref([]);
const searchKeyword = ref('');
const page = ref(0);
const pageSize = ref(20);
const hasMore = ref(true);
const isLoading = ref(false);
const localizedStatusMap = ref({});

onMounted(() => { initPage(); });
onActivated(() => { initPage(); });

const initPage = () => {
  fetchStatusDict();
  fetchData(true);
};

const fetchStatusDict = async () => {
  try {
    const res = await request.get('/api/system/dict', {
      params: { type: 'customer_status' }
    });
    const dictMap = {};
    res.data.forEach(item => {
      const dynamicKey = `label_${locale.value}`;
      dictMap[item.value] = item[dynamicKey] || item.label_zh || item.label;
    });
    localizedStatusMap.value = dictMap;
  } catch (e) {
    console.error('获取字典失败', e);
  }
};

const onSearch = () => { fetchData(true); };
const clearSearch = () => { searchKeyword.value = ''; fetchData(true); };

const loadMore = () => {
  if (hasMore.value && !isLoading.value) {
    page.value += 1;
    fetchData(false);
  }
};

const fetchData = async (reset = false) => {
  if (reset) {
    page.value = 0;
    hasMore.value = true;
    customerList.value = [];
  }
  
  if (!reset && !hasMore.value) return;
  isLoading.value = true;

  try {
    const res = await request.get('/api/customers/todo-list', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        keyword: searchKeyword.value
      }
    });

    const newData = res.data || [];
    customerList.value = reset ? newData : customerList.value.concat(newData);
    hasMore.value = newData.length === pageSize.value;
  } catch (err) {
    console.error('获取列表失败', err);
  } finally {
    isLoading.value = false;
  }
};

const makePhoneCall = (phoneNum) => {
  if (!phoneNum || phoneNum.trim() === '') {
    alert(t('salesList.noPhoneAlert', '暂无电话号码')); 
    return;
  }
  if (confirm(`确认拨打 ${phoneNum}？`)) {
    window.location.href = `tel:${phoneNum}`;
  }
};

const goToDetail = (id) => {
  router.push({ path: '/customer-detail', query: { id } });
};
</script>

<style scoped>
.container { display: flex; flex-direction: column; height: 100vh; background-color: #f4f6f9; overflow: hidden; }
.search-bar { background: #fff; padding: 8px 15px; border-bottom: 1px solid #eee; position: sticky; top: 0; z-index: 10; }
.search-box { display: flex; align-items: center; background: #f0f2f5; border-radius: 20px; padding: 0 15px; height: 32px; width: 100%; box-sizing: border-box; border: none; }
.search-input { flex: 1; margin-left: 8px; font-size: 13px; color: #333; background: transparent; border: none; outline: none; }
.list-container { flex: 1; height: 0; padding: 12px 15px; box-sizing: border-box; overflow-y: auto; }
.customer-card { background: #fff; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 5px rgba(0,0,0,0.02); display: flex; flex-direction: column; overflow: hidden; }
.card-content { padding: 12px; position: relative; cursor: pointer; }
.header { display: flex; align-items: flex-start; width: 100%; margin-bottom: 4px; }
.name-box { display: flex; align-items: center; flex: 1; padding-right: 70px; }
.key-star { margin-right: 4px; font-size: 13px; }
.name { font-size: 16px; font-weight: 800; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.phone-row { margin-bottom: 6px; }
.phone-link { color: #10b981; font-size: 15px; font-weight: bold; text-decoration: underline; padding: 2px 0; display: inline-block; cursor: pointer; }
/* 未接电话专属醒目样式 */
.missed-call-notice { display: inline-flex; align-items: center; background-color: #fef3c7; color: #d97706; padding: 5px 8px; border-radius: 4px; font-size: 12px; margin-bottom: 8px; font-weight: bold; }
.notice-icon { margin-right: 4px; font-size: 13px; }
.info.text-gray { color: #6b7280; font-size: 12px; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-bottom-bar { display: flex; flex-wrap: wrap; background: #f8fafc; padding: 5px 8px; border-radius: 4px; column-gap: 12px; row-gap: 4px; }
.bottom-item { font-size: 11px; color: #64748b; display: flex; align-items: center; }
.bottom-icon { margin-right: 3px; font-size: 11px; }
.text-highlight { color: #f59e0b; font-weight: bold; }
.tags-container { position: absolute; top: 12px; right: 12px; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; z-index: 2; }
.tag { padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: bold; }
.tag-overdue { background-color: #fee2e2; color: #ef4444; }
.tag-following { background-color: #f3e8ff; color: #7e22ce; }
.tag-warning { background-color: #fef3c7; color: #d97706; }
.tag-pending { background-color: #e0f2fe; color: #0284c7; }
</style>