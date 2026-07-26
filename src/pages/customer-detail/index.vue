<!-- src/pages/customer-detail/index.vue -->
<template>
    <van-nav-bar
      title="客户详情"
      left-text="返回"
      left-arrow
      @click-left="router.back()"
    />
  <div class="container">
    
    <!-- ================= 1. 基础信息卡片 ================= -->
    <div class="customer-info-card" v-if="customer._id">
      <div class="info-header">
        <div>
          <span class="name">{{ customer.name }}</span>
          <span :class="['status-tag', `status-${customer.status}`]">
            {{ localizedStatusMap[customer.status] || customer.status }}
          </span>
        </div>
        <div class="boss-actions" v-if="isAdmin">
          <div class="action-btn copy-btn" @click="copyAllContext">📄 {{ t('customerDetail.copyAll') }}</div>
          <div class="action-btn trans-btn" @click="openGlobalTransModal">🇨🇳 {{ t('customerDetail.cnInfo') }}</div>
        </div>
      </div>
      
      <div class="info-list">
        <div class="info-item" @click="makePhoneCall(customer.phone)">
          <span class="label">{{ t('customerDetail.phone') }}:</span>
          <span class="value highlight">{{ customer.phone }} 📞</span>
        </div>

        <div class="info-item">
          <span class="label">{{ t('customerDetail.salesOwner') }}:</span>
          <span class="value">{{ customer.sales_name || customer.assigned_sales_name || t('customerDetail.unassigned') }}</span>
        </div>

        <div class="info-item" v-if="customer.customer_source">
          <span class="label">{{ t('customerDetail.source') }}:</span>
          <span class="value">{{ t(`dictSource.${customer.customer_source}`) || customer.customer_source }}</span>
        </div>

        <div class="info-item">
          <span class="label">{{ t('customerDetail.city') }}:</span>
          <span class="value">{{ customer.city }}</span>
        </div>

        <div class="info-item" v-if="customer.product_category">
          <span class="label">{{ t('customerDetail.category') }}:</span>
          <span class="value">{{ t(`dictProduct.${customer.product_category}`) || customer.product_category }}</span>
        </div>

        <div class="info-item" v-if="customer.payload">
          <span class="label">{{ t('customerDetail.payload') }}:</span>
          <span class="value">{{ customer.payload }}</span>
        </div>

        <div class="info-item" v-if="customer.timeline">
          <span class="label">{{ t('customerDetail.timeline') }}:</span>
          <span class="value">{{ customer.timeline }}</span>
        </div>

        <div class="info-item" v-if="customer.remark">
          <span class="label">{{ t('customerDetail.remark') }}:</span>
          <span class="value">{{ customer.remark }}</span>
        </div>

        <div class="info-item" v-if="customer.next_follow_up">
          <span class="label">{{ t('customerDetail.nextFollowUp') }}:</span>
          <span class="value" style="color: #ff9800; font-weight: bold;">{{ customer.next_follow_up }}</span>
        </div>

        <div class="info-item" v-if="customer.is_key_customer">
          <span class="label" style="color: red;">{{ t('customerDetail.keyCustomer') }}:</span>
          <span class="value" style="color: #f59e0b; font-weight: bold;">
            {{ customer.key_customer_reason || t('customerDetail.yes') }}
          </span>
        </div>
      </div>
    </div>

    <!-- ================= 2. 客户画像模块 ================= -->
    <div class="profile-card" v-if="customer._id">
      <div :class="['profile-header', { collapsed: !isProfileExpanded }]" @click="toggleProfile">
        <div class="title-box">
          <span class="title">{{ t('customerDetail.profileTitle') }}</span>
          <span class="desc" v-if="isProfileExpanded">{{ t('customerDetail.profileDesc') }}</span>
          <span class="desc highlight-text" v-else>{{ t('customerDetail.profileClickToExpand') }}</span>
        </div>
        <div class="header-action">
          <div class="edit-btn" @click.stop="openProfileModal" v-if="isProfileExpanded">{{ t('customerDetail.edit') }}</div>
          <div class="toggle-text">{{ isProfileExpanded ? t('customerDetail.collapse') : t('customerDetail.expand') }}</div>
        </div>
      </div>

      <div class="profile-list" v-show="isProfileExpanded">
        <div class="profile-item" v-for="key in ['demand', 'motivation', 'userType', 'scenario', 'timeframe']" :key="key">
          <div class="label">{{ t(`customerDetail.profile_${key}`) }}</div>
          <span :class="['value', { unknown: !customer.profile?.[key] }]">
            {{ customer.profile?.[key] || t('customerDetail.unknown') }}
          </span>
        </div>
      </div>
    </div>

    <!-- ================= 3. 时间轴区域 ================= -->
    <div class="timeline-section" v-if="customer._id">
      <div class="section-title">{{ t('customerDetail.timelineTitle') }}</div>
      <div v-if="logs.length === 0" class="empty-logs">{{ t('customerDetail.emptyTimeline') }}</div>

      <div class="timeline-item" v-for="item in logs" :key="item._id">
        <div class="line-box">
          <div class="dot"></div>
          <div class="line"></div>
        </div>
        
        <div class="log-content">
          <div class="log-header">
            <span class="log-date">{{ item.displayTime || item.createTimeStr }}</span>
            <span class="log-type">{{ item.follow_type }}</span>
          </div>
          <div class="log-tag">{{ localizedStatusMap[item.result_tag] || item.result_tag }}</div>
          
          <p class="log-note">{{ item.note }}</p>
          
          <div class="log-reason" v-if="item.lost_reason">
            {{ t('customerDetail.lostReason') }}：<span>{{ item.lost_reason }}</span>
          </div>
          
          <div class="log-reason" v-if="item.transaction_amount">
            <span style="color: #10b981; font-weight: bold;">
              💰 {{ t('customerDetail.transactionAmount') }}：{{ item.transaction_amount }}
            </span>
          </div>

          <div class="log-images" v-if="item.screenshot_files && item.screenshot_files.length > 0">
            <img 
              v-for="img in item.screenshot_files" 
              :key="img" 
              :src="img" 
              class="log-img" 
              @click="previewImage(img, item.screenshot_files)" 
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ================= 4. 底部固定按钮组 ================= -->
    <div class="footer-action" v-if="customer._id">
      <div class="btn-group">
        <!-- Vant 的动作面板代替小程序 Picker -->
        <van-button 
          v-if="isAdmin" 
          class="reassign-btn" 
          @click="showReassignPicker = true"
        >
          {{ t('customerDetail.reassign') }}
        </van-button>
        
        <van-button 
          class="follow-btn" 
          @click="goToFollowUp"
        >
          {{ t('customerDetail.btnFollowUp') }}
        </van-button>
      </div>
    </div>

    <!-- ================= 5. 弹窗系列 (使用 Vant Popup) ================= -->
    
    <!-- 重新分配 Picker 弹窗 -->
    <van-popup v-model:show="showReassignPicker" position="bottom" round>
      <van-picker
        :title="t('customerDetail.reassignTitle')"
        :columns="salesOptions"
        @confirm="onReassignConfirm"
        @cancel="showReassignPicker = false"
      />
    </van-popup>

    <!-- 编辑画像弹窗 -->
    <van-popup v-model:show="showProfileModal" position="bottom" round class="custom-popup">
      <div class="modal-header">{{ t('customerDetail.editProfileTitle') }}</div>
      <div class="modal-scroll">
        <div class="form-group" v-for="key in ['demand', 'motivation', 'userType', 'scenario', 'timeframe']" :key="key">
          <span class="form-label">{{ t(`customerDetail.profile_${key}`) }}</span>
          <input class="form-input" v-model="editProfileForm[key]" />
        </div>
      </div>
      <div class="modal-footer">
        <div class="btn-cancel" @click="showProfileModal = false">{{ t('customerDetail.cancel') }}</div>
        <div class="btn-save" @click="saveProfile">{{ t('customerDetail.saveProfile') }}</div>
      </div>
    </van-popup>

    <!-- 全局中文档案弹窗 -->
    <van-popup v-model:show="showGlobalTransModal" position="bottom" round class="custom-popup">
      <div class="modal-header">{{ t('customerDetail.cnArchiveTitle') }}</div>
      <div class="modal-scroll">
        <textarea 
          class="trans-textarea" 
          :placeholder="t('customerDetail.cnArchivePlaceholder')" 
          v-model="globalTransText"
        ></textarea>
      </div>
      <div class="modal-footer">
        <div class="btn-cancel" @click="showGlobalTransModal = false">{{ t('customerDetail.cancel') }}</div>
        <div class="btn-save" @click="saveGlobalTranslation">{{ t('customerDetail.saveProfile') }}</div>
      </div>
    </van-popup>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
// 🌟 修复 1：引入 closeToast
import { showToast, closeToast, showImagePreview, showConfirmDialog } from 'vant';
import request from '../../utils/request';
import { storage } from '../../utils/storage';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();

const customerId = ref(route.query.id || '');
const customer = ref({});
const logs = ref([]);
const isAdmin = ref(false);
const localizedStatusMap = ref({});
const salesList = ref([]);

// UI 状态
const isProfileExpanded = ref(false);
const showProfileModal = ref(false);
const editProfileForm = ref({});
const showGlobalTransModal = ref(false);
const globalTransText = ref('');
const showReassignPicker = ref(false);

const salesOptions = computed(() => {
  return salesList.value.map(sales => ({ text: sales.name, value: sales._openid }));
});

onMounted(() => {
  if (!customerId.value) {
    showToast('参数错误，缺少客户ID');
    return;
  }
  checkAdminRole();
  fetchStatusDict();
  initData();
});

const checkAdminRole = () => {
  const userInfo = storage.getStorageSync('UserInfo');
  if (userInfo && userInfo.role === 'admin') {
    isAdmin.value = true;
    fetchSalesList();
  }
};

const fetchStatusDict = async () => {
  try {
    const res = await request.get('/api/system/dict', { params: { type: 'customer_status' } });
    const dictMap = {};
    res.data.forEach(item => {
      const dynamicKey = `label_${locale.value}`;
      dictMap[item.value] = item[dynamicKey] || item.label_zh || item.label;
    });
    localizedStatusMap.value = dictMap;
  } catch (e) {
    console.error('获取动态状态字典失败', e);
  }
};

const fetchSalesList = async () => {
  try {
    const res = await request.get('/api/users/sales-list');
    salesList.value = res.data || [];
  } catch (err) {
    console.error('获取销售列表失败', err);
  }
};

const initData = async () => {
  showToast({ type: 'loading', message: '加载中...', duration: 0 });
  try {
    const detailRes = await request.get(`/api/customers/detail`, { params: { id: customerId.value } });
    customer.value = detailRes.data || {};

    const logsRes = await request.get(`/api/customers/logs`, { params: { id: customerId.value } });
    
    // 🌟 核心修改：手动将时间戳格式化为前端认识的 displayTime
    logs.value = (logsRes.data || []).map(log => {
      const d = new Date(log.timestamp || log.created_at);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      
      return {
        ...log,
        displayTime: `${year}-${month}-${day} ${hours}:${minutes}`
      };
    });

  } catch (err) {
    console.error('加载详情失败', err);
  } finally {
    closeToast();
  }
};

const toggleProfile = () => {
  isProfileExpanded.value = !isProfileExpanded.value;
};

const openProfileModal = () => {
  editProfileForm.value = JSON.parse(JSON.stringify(customer.value.profile || {}));
  showProfileModal.value = true;
};

const saveProfile = async () => {
  showToast({ type: 'loading', message: '保存中...', duration: 0 });
  try {
    await request.put(`/api/customers/profile`, { 
      id: customerId.value, 
      profile: editProfileForm.value 
    });
    customer.value.profile = { ...editProfileForm.value };
    showProfileModal.value = false;
    showToast({ type: 'success', message: '保存成功' });
  } catch (err) {
    console.error(err);
    // 🌟 修复 3：捕获异常时关闭 loading 兜底
    closeToast();
  }
};

const openGlobalTransModal = () => {
  globalTransText.value = customer.value.translated_context || '';
  showGlobalTransModal.value = true;
};

const saveGlobalTranslation = async () => {
  showToast({ type: 'loading', message: '保存中...', duration: 0 });
  try {
    await request.put(`/api/customers/translation`, { 
      id: customerId.value, 
      translated_context: globalTransText.value 
    });
    customer.value.translated_context = globalTransText.value;
    showGlobalTransModal.value = false;
    showToast({ type: 'success', message: '保存成功' });
  } catch (err) {
    console.error(err);
    // 🌟 修复 4：捕获异常时关闭 loading 兜底
    closeToast();
  }
};

const onReassignConfirm = ({ selectedOptions }) => {
  const newSales = selectedOptions[0];
  const oldSalesName = customer.value.sales_name || customer.value.assigned_sales_name || '未分配';
  
  if (newSales.value === customer.value.assigned_sales_id) {
    showToast('该客户已属于此人');
    return;
  }

  showConfirmDialog({
    title: t('customerDetail.reassignConfirmTitle'),
    message: `${t('customerDetail.reassignConfirmMsg1')} [${oldSalesName}] ${t('customerDetail.reassignConfirmMsg2')} [${newSales.text}] ?`,
  }).then(async () => {
    showToast({ type: 'loading', message: '分配中...', duration: 0 });
    try {
      await request.post('/api/customers/reassign', {
        id: customerId.value,
        assigned_sales_id: newSales.value,
        sales_name: newSales.text,
        old_sales_name: oldSalesName
      });
      showReassignPicker.value = false;
      showToast({ type: 'success', message: '分配成功' });
      initData();
    } catch (error) {
      console.error(error);
      // 🌟 修复 5：捕获异常时关闭 loading 兜底
      closeToast();
    }
  }).catch(() => {});
};

const copyAllContext = async () => {
  const p = customer.value.profile || {};
  const c = customer.value;
  let text = '';
  
  if (c.is_key_customer) {
    text += `【⭐ 重点客户】\n原因: ${c.key_customer_reason || '未填'}\n\n`;
  }

  const salesName = c.sales_name || c.assigned_sales_name || '未分配';
  const sourceStr = t(`dictSource.${c.customer_source}`) || c.customer_source || '未填';
  const categoryStr = t(`dictProduct.${c.product_category}`) || c.product_category || '未填';

  text += `【基础档案】\n销售归属: ${salesName}\n客户来源: ${sourceStr}\n产品品类: ${categoryStr}\n需求机型: ${c.payload || '未填'}\n\n`;
  text += `【客户画像】\n需求: ${p.demand || '未填'}\n动机: ${p.motivation || '未填'}\n使用者: ${p.userType || '未填'}\n场景: ${p.scenario || '未填'}\n时间: ${p.timeframe || '未填'}\n\n【跟进记录】\n`;
  
  logs.value.forEach(log => {
    const statusStr = localizedStatusMap.value[log.result_tag] || log.result_tag;
    text += `[${log.createTimeStr || log.displayTime}] 状态:${statusStr}\n内容: ${log.note}\n`;
    if (log.lost_reason) text += `原因: ${log.lost_reason}\n`;
    if (log.transaction_amount) text += `成交金额: ${log.transaction_amount}\n`;
    text += `---\n`;
  });

  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制全局档案');
  } catch (err) {
    showToast('复制失败，浏览器不支持');
  }
};

const makePhoneCall = (phoneNum) => {
  if (!phoneNum || phoneNum === 'undefined') return;
  window.location.href = `tel:${phoneNum}`;
};

const goToFollowUp = () => {
  if (!customerId.value) return;
  router.push({ path: '/follow-up', query: { id: customerId.value } });
};

const previewImage = (currentImg, allImages) => {
  showImagePreview({
    images: allImages,
    startPosition: allImages.indexOf(currentImg),
    closeable: true,
  });
};
</script>

<style scoped>
/* ================= 样式直接按比例降级 (rpx / 2) ================= */
.container {
  padding: 15px 0;
  background-color: #f4f6f9;
  min-height: 100vh;
  padding-bottom: 100px; 
}

.customer-info-card, .profile-card, .timeline-section {
  width: 90%; /* 适配 H5 稍微加宽 */
  background-color: #ffffff;
  border-radius: 8px;
  padding: 15px;
  margin: 0 auto 15px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #eeeeee;
}

.name {
  font-size: 16px;
  font-weight: bold;
  color: #333333;
  margin-right: 8px;
}

.status-tag {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 15px;
  background: #e6f7ff;
  color: #1890ff;
  font-weight: bold;
  display: inline-block;
  vertical-align: middle;
}

.boss-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}
.copy-btn { background: #f0f9eb; color: #67c23a; }
.trans-btn { background: #ecf5ff; color: #409eff; }

.info-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  font-size: 14px;
  line-height: 1.5;
}

.info-item .label {
  color: #888888;
  margin-right: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}

.info-item .value {
  color: #333333;
  font-weight: 500;
  flex: 1;
  word-break: break-all;
}

.info-item .highlight {
  color: #07c160;
  font-weight: bold;
  cursor: pointer;
}

/* 画像卡片样式 */
.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
}
.profile-header.collapsed { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }

.title-box { display: flex; flex-direction: column; }
.title-box .title { font-size: 16px; font-weight: bold; color: #333; }
.title-box .desc { font-size: 11px; color: #888; margin-top: 3px; }
.highlight-text { color: #07c160 !important; }

.header-action { display: flex; align-items: center; gap: 10px; }
.edit-btn { background-color: #f0f9eb; color: #07c160; font-size: 12px; padding: 4px 12px; border-radius: 12px; border: 1px solid #c2e7b0; }
.toggle-text { font-size: 12px; color: #999; }

.profile-list { display: flex; flex-direction: column; gap: 10px; margin-top: 10px; }
.profile-item { display: flex; flex-direction: column; }
.profile-item .label { font-size: 13px; font-weight: bold; color: #555; margin-bottom: 3px; }
.profile-item .value { font-size: 14px; color: #333; line-height: 1.4; }
.profile-item .value.unknown { color: #ff4d4f; font-weight: bold; }

/* 时间轴区域 */
.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  border-left: 4px solid #07c160;
  padding-left: 8px;
}
.empty-logs { text-align: center; color: #999; font-size: 14px; padding: 20px 0; }

.timeline-item { display: flex; margin-bottom: 20px; }
.line-box { width: 20px; display: flex; flex-direction: column; align-items: center; margin-right: 10px; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #07c160; border: 3px solid #e1f5e8; z-index: 2; }
.line { flex: 1; width: 2px; background: #eee; margin-top: 4px; margin-bottom: -24px; }
.timeline-item:last-child .line { display: none; }

.log-content { flex: 1; background: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 8px; padding: 12px; }
.log-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.log-date { font-size: 12px; color: #999; }
.log-type { font-size: 12px; color: #fa8c16; background: #fff7e6; padding: 2px 6px; border-radius: 3px; }
.log-tag { font-size: 13px; font-weight: bold; color: #333; margin-bottom: 5px; }
.log-note { font-size: 14px; color: #555; line-height: 1.5; margin-bottom: 8px; white-space: pre-wrap; }
.log-reason { font-size: 12px; color: #ff4d4f; background: #fff1f0; padding: 6px; border-radius: 4px; margin-bottom: 8px; }

.log-images { display: flex; flex-wrap: wrap; gap: 8px; }
.log-img { width: 70px; height: 70px; border-radius: 6px; background: #eee; object-fit: cover; cursor: pointer; }

/* 底部操作区 */
.footer-action {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  padding: 10px 15px 20px;
  background: #ffffff;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.08);
  z-index: 100;
}
.btn-group { display: flex; gap: 12px; }
.reassign-btn { flex: 1; border-radius: 24px; font-weight: bold; }
.follow-btn { flex: 1.6; background: #07c160; color: white; border-radius: 24px; font-weight: bold; border: none; }

/* 弹窗专用样式 */
.custom-popup { display: flex; flex-direction: column; max-height: 80vh; }
.modal-header { font-size: 16px; font-weight: bold; text-align: center; padding: 15px 0; border-bottom: 1px solid #eee; }
.modal-scroll { padding: 15px; overflow-y: auto; }
.form-group { margin-bottom: 15px; }
.form-label { display: block; font-size: 13px; color: #333; margin-bottom: 6px; font-weight: 500; }
.form-input { width: 100%; box-sizing: border-box; background-color: #f7f7f7; height: 40px; border-radius: 6px; padding: 0 10px; border: none; }
.trans-textarea { width: 100%; min-height: 150px; background: #f7f7f7; border-radius: 6px; padding: 10px; border: none; box-sizing: border-box;}
.modal-footer { display: flex; padding: 10px 15px 20px; border-top: 1px solid #eee; gap: 10px; }
.btn-cancel, .btn-save { flex: 1; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 20px; font-size: 15px; cursor: pointer;}
.btn-cancel { background: #f5f5f5; color: #666; }
.btn-save { background: #07c160; color: #fff; flex: 2; }

/* 时间轴区域 */
.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  border-left: 4px solid #07c160;
  padding-left: 8px;
}
.empty-logs { text-align: center; color: #999; font-size: 14px; padding: 20px 0; }

.timeline-item { display: flex; margin-bottom: 20px; position: relative; }
.line-box { width: 20px; display: flex; flex-direction: column; align-items: center; margin-right: 10px; position: relative; }

/* 🌟 修改点 1：增加 flex-shrink: 0 防止圆点被挤压变形 */
.dot { width: 10px; height: 10px; border-radius: 50%; background: #07c160; border: 3px solid #e1f5e8; z-index: 2; flex-shrink: 0; }

/* 🌟 修改点 2：改用绝对定位强行撑开垂直线 */
.line { position: absolute; top: 16px; bottom: -24px; width: 2px; background: #eee; z-index: 1; }
.timeline-item:last-child .line { display: none; }

.log-content { flex: 1; background: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 8px; padding: 12px; }
.log-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
/* ... 下面的样式保持你原样即可 ... */
</style>