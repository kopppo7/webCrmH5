<!-- src/pages/customer-detail/index.vue -->
<template>
  
  <van-nav-bar
  :title="t('title.customerDetail')"
  :left-text="t('common.back')"
  left-arrow
  @click-left="router.back()"
/>
  <div class="container">
    
    <!-- ================= 1. 基础信息卡片 ================= -->
    <div class="customer-info-card" v-if="customer._id">
      <div class="info-header">
        <div>
          <span class="name">{{ customer.name }}</span>
          <!-- 🌟 修复 1: 顶部标签使用统一的 bg-status 颜色池 -->
          <span :class="['status-tag', `bg-status-${customer.status || 'default'}`]">
            {{ localizedStatusMap[customer.status] || customer.status }}
          </span>
        </div>
        <div class="boss-actions" v-if="isAdmin">
          <div class="action-btn copy-btn" @click="copyAllContext">📄 {{ t('customerDetail.copyAll', '复制档案') }}</div>
          <div class="action-btn trans-btn" @click="openGlobalTransModal">🇨🇳 {{ t('customerDetail.cnInfo', '中文建档') }}</div>
        </div>
      </div>
      
      <div class="info-list">
        <div class="info-item" @click="makePhoneCall(customer.phone)">
          <span class="label">{{ t('customerDetail.phone', '电话') }}:</span>
          <span class="value highlight">{{ customer.phone }} 📞</span>
        </div>

        <div class="info-item">
          <span class="label">{{ t('customerDetail.salesOwner', '所属销售') }}:</span>
          <span class="value">{{ customer.sales_name || customer.assigned_sales_name || t('customerDetail.unassigned', '未分配') }}</span>
        </div>

        <div class="info-item" v-if="customer.customer_source">
          <span class="label">{{ t('customerDetail.source', '来源') }}:</span>
          <span class="value">{{ t(`dictSource.${customer.customer_source}`) || customer.customer_source }}</span>
        </div>

        <div class="info-item">
          <span class="label">{{ t('customerDetail.city', '城市') }}:</span>
          <span class="value">{{ customer.city }}</span>
        </div>

        <div class="info-item" v-if="customer.product_category">
          <span class="label">{{ t('customerDetail.category', '品类') }}:</span>
          <span class="value">{{ t(`dictProduct.${customer.product_category}`) || customer.product_category }}</span>
        </div>

        <div class="info-item" v-if="customer.payload">
          <span class="label">{{ t('customerDetail.payload', '机型') }}:</span>
          <span class="value">{{ customer.payload }}</span>
        </div>

        <div class="info-item" v-if="customer.remark">
          <span class="label">{{ t('customerDetail.remark', '备注') }}:</span>
          <span class="value">{{ customer.remark }}</span>
        </div>

        <div class="info-item" v-if="customer.next_follow_up">
          <span class="label">{{ t('customerDetail.nextFollowUp', '下次跟进') }}:</span>
          <span class="value" style="color: #ff9800; font-weight: bold;">{{ customer.next_follow_up }}</span>
        </div>

        <div class="info-item" v-if="customer.is_key_customer">
          <span class="label" style="color: red;">{{ t('customerDetail.keyCustomer', '重点客户') }}:</span>
          <span class="value" style="color: #f59e0b; font-weight: bold;">
            {{ customer.key_customer_reason || t('customerDetail.yes', '是') }}
          </span>
        </div>
      </div>
    </div>

    <!-- ================= 2. 客户画像模块 ================= -->
    <div class="profile-card" v-if="customer._id">
      <div :class="['profile-header', { collapsed: !isProfileExpanded }]" @click="toggleProfile">
        <div class="title-box">
          <span class="title">{{ t('customerDetail.profileTitle', '客户画像') }}</span>
          <span class="desc" v-if="isProfileExpanded">{{ t('customerDetail.profileDesc', '详细特征') }}</span>
          <span class="desc highlight-text" v-else>{{ t('customerDetail.profileClickToExpand', '点击展开查看') }}</span>
        </div>
        <div class="header-action">
          <div class="edit-btn" @click.stop="openProfileModal" v-if="isProfileExpanded">{{ t('customerDetail.edit', '编辑') }}</div>
          <div class="toggle-text">{{ isProfileExpanded ? t('customerDetail.collapse', '收起') : t('customerDetail.expand', '展开') }}</div>
        </div>
      </div>

      <div class="profile-list" v-show="isProfileExpanded">
        <div class="profile-item" v-for="key in ['demand', 'motivation', 'userType', 'scenario', 'timeframe']" :key="key">
          <div class="label">{{ t(`customerDetail.profile_${key}`) }}</div>
          <span :class="['value', { unknown: !customer.profile?.[key] }]">
            {{ customer.profile?.[key] || t('customerDetail.unknown', '未知') }}
          </span>
        </div>
      </div>
    </div>

    <!-- ================= 3. 时间轴区域 ================= -->
    <div class="timeline-section" v-if="customer._id">
      <div class="section-title">{{ t('customerDetail.timelineTitle', '跟进时间轴') }}</div>
      <div v-if="logs.length === 0" class="empty-logs">{{ t('customerDetail.emptyTimeline', '暂无记录') }}</div>

      <div class="timeline-item" v-for="item in logs" :key="item._id">
        <div class="line-box">
          <div class="dot"></div>
          <div class="line"></div>
        </div>
        
        <div class="log-content">
          <div class="log-header">
            <span class="log-date">{{ item.displayTime || item.createTimeStr }}</span>
            <!-- 🌟 修复 2: 时间轴标签同样使用统一的 bg-status 颜色池 -->
            <span :class="['log-type', `bg-status-${item.result_tag || 'default'}`]">
              <span v-if="item.result_tag === 'clear_reject'">❌ </span>
              <span v-else-if="item.result_tag === 'deal_completed'">🎉 </span>
              {{ localizedStatusMap[item.result_tag] || item.result_tag }}
            </span>
          </div>
          
          <p class="log-note">{{ item.content || item.note }}</p>
          
          <div class="log-reason" v-if="item.lost_reason">
            {{ t('customerDetail.lostReason', '流失原因') }}：<span>{{ item.lost_reason }}</span>
          </div>
          
          <div class="log-reason" v-if="item.transaction_amount">
            <span style="color: #10b981; font-weight: bold;">
              💰 {{ t('customerDetail.transactionAmount', '成交金额') }}：{{ item.transaction_amount }}
            </span>
          </div>

          <div class="log-images" v-if="item.images && item.images.length > 0">
            <div v-for="img in item.images" :key="img">

    <img 
      :src="img" 
      class="log-img"
      @click="previewImage(img, item.images)" 
    />
  </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= 4. 底部固定按钮组 ================= -->
    <!-- 🌟 修复：仅当是管理员 或 从待办列表进入时，才显示底部栏容器 -->
    <div class="footer-action" v-if="customer._id && (isAdmin || isFromTodo)">
      <div class="btn-group">
        <van-button 
          v-if="isAdmin" 
          class="reassign-btn" 
          @click="openReassignPicker"
        >
          {{ t('customerDetail.reassign', '重新分配') }}
        </van-button>
        
        <!-- 🌟 修复：新增 v-if 判断，只允许待办列表来源显示此按钮 -->
        <van-button 
          v-if="isFromTodo"
          class="follow-btn" 
          @click="goToFollowUp"
        >
          {{ t('customerDetail.btnFollowUp', '写跟进') }}
        </van-button>
      </div>
    </div>

    <!-- ================= 5. 弹窗系列 ================= -->
    
    <!-- 重新处理 / 重新分配 -->
    <van-popup
      v-model:show="showReassignPicker"
      position="bottom"
      round
      class="reprocess-popup"
    >
      <div class="reprocess-panel">
        <div class="reprocess-header">
          <div>
            <div class="reprocess-title">重新处理客户</div>
            <div class="reprocess-subtitle">重新处理后客户状态将重置为待处理</div>
          </div>
          <van-icon name="cross" size="20" @click="showReassignPicker = false" />
        </div>

        <div class="reprocess-form-item" @click="showReassignSalesPicker = true">
          <span class="reprocess-label">处理销售</span>
          <div class="reprocess-value">
            {{ reassignSalesName || '请选择销售' }}
            <van-icon name="arrow" color="#969799" />
          </div>
        </div>

        <div class="reprocess-form-item" @click="showReassignDatePicker = true">
          <span class="reprocess-label">下次跟进</span>
          <div :class="['reprocess-value', { 'reprocess-placeholder': !reassignNextFollowUp }]">
            {{ reassignNextFollowUp || '请选择下次跟进日期' }}
            <van-icon name="arrow" color="#969799" />
          </div>
        </div>

        <div class="reprocess-note-box">
          <div class="reprocess-note-label">重新处理意见（选填）</div>
          <textarea
            v-model.trim="reassignOpinion"
            class="reprocess-note-input"
            placeholder="例如：客户需求尚未确认，请重新联系并重点确认采购时间"
          ></textarea>
          <div class="reprocess-note-tip">
            未填写时，时间轴将自动记录系统重新处理信息。
          </div>
        </div>

        <div class="reprocess-footer">
          <van-button block @click="showReassignPicker = false">取消</van-button>
          <van-button
            block
            type="primary"
            :loading="reassignSubmitting"
            @click="submitReprocess"
          >
            确认重新处理
          </van-button>
        </div>
      </div>
    </van-popup>

    <van-popup v-model:show="showReassignSalesPicker" position="bottom" round>
      <van-picker
        title="选择处理销售"
        :columns="salesOptions"
        @confirm="onReassignSalesConfirm"
        @cancel="showReassignSalesPicker = false"
      />
    </van-popup>

    <van-calendar
      v-model:show="showReassignDatePicker"
      @confirm="onReassignDateConfirm"
    />

    <van-popup v-model:show="showProfileModal" position="bottom" round class="custom-popup">
      <div class="modal-header">{{ t('customerDetail.editProfileTitle', '编辑画像') }}</div>
      <div class="modal-scroll">
        <div class="form-group" v-for="key in ['demand', 'motivation', 'userType', 'scenario', 'timeframe']" :key="key">
          <span class="form-label">{{ t(`customerDetail.profile_${key}`) }}</span>
          <!-- 🌟 修复 3: 全面禁用原生下拉历史提示 -->
          <input class="form-input" v-model="editProfileForm[key]" autocomplete="off" />
        </div>
      </div>
      <div class="modal-footer">
        <div class="btn-cancel" @click="showProfileModal = false">{{ t('customerDetail.cancel', '取消') }}</div>
        <div class="btn-save" @click="saveProfile">{{ t('customerDetail.saveProfile', '保存') }}</div>
      </div>
    </van-popup>

    <van-popup v-model:show="showGlobalTransModal" position="bottom" round class="custom-popup">
      <div class="modal-header">{{ t('customerDetail.cnArchiveTitle', '中文建档') }}</div>
      <div class="modal-scroll">
        <textarea 
          class="trans-textarea" 
          :placeholder="t('customerDetail.cnArchivePlaceholder', '请输入中文档案...')" 
          v-model="globalTransText"
          autocomplete="off"
        ></textarea>
      </div>
      <div class="modal-footer">
        <div class="btn-cancel" @click="showGlobalTransModal = false">{{ t('customerDetail.cancel', '取消') }}</div>
        <div class="btn-save" @click="saveGlobalTranslation">{{ t('customerDetail.saveProfile', '保存') }}</div>
      </div>
    </van-popup>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { showToast, closeToast, showImagePreview, showConfirmDialog } from 'vant';
import request from '../../utils/request';
import { storage } from '../../utils/storage';

const isFromTodo = computed(() => route.query.from === 'todo');
const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();

const customerId = ref(route.query.id || '');
const customer = ref({});
const logs = ref([]);
const isAdmin = ref(false);
const localizedStatusMap = ref({});
const salesList = ref([]);

const isProfileExpanded = ref(false);
const showProfileModal = ref(false);
const editProfileForm = ref({});
const showGlobalTransModal = ref(false);
const globalTransText = ref('');
const showReassignPicker = ref(false);
const showReassignSalesPicker = ref(false);
const showReassignDatePicker = ref(false);
const reassignSalesId = ref("");
const reassignSalesName = ref("");
const reassignOpinion = ref("");
const reassignNextFollowUp = ref("");
const reassignSubmitting = ref(false);

const salesOptions = computed(() => {
  return salesList.value
    .map(sales => ({
      // /api/users/sales-list 当前主要返回 MongoDB 用户结构：
      // 姓名字段通常是 real_name，ID 字段通常是 _id。
      // 同时保留旧字段兼容，避免不同环境下再次出现空列表/空白项。
      text: sales.real_name || sales.name || sales.username || '未命名销售',
      value: String(sales._id || sales._openid || sales.userId || '')
    }))
    .filter(item => item.value);
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
    salesList.value = Array.isArray(res.data) ? res.data : [];

    if (salesList.value.length === 0) {
      showToast('暂无可分配的销售人员');
    }
  } catch (err) {
    console.error('获取销售列表失败', err);
    salesList.value = [];
    showToast('销售人员列表加载失败');
  }
};

const initData = async () => {
  showToast({ type: 'loading', message: '加载中...', duration: 0 });
  try {
    const detailRes = await request.get(`/api/customers/detail`, { params: { id: customerId.value } });
    customer.value = detailRes.data || {};

    const logsRes = await request.get(`/api/customers/logs`, { params: { id: customerId.value } });
    
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
    closeToast();
  }
};

const formatDateForFollowUp = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const openReassignPicker = async () => {
  if (salesList.value.length === 0) {
    await fetchSalesList();
  }

  if (salesOptions.value.length === 0) {
    showToast('暂无可分配的销售人员');
    return;
  }

  // 默认当前销售，不再要求必须换人。
  // “重新处理”允许仍交给原销售，相当于管理员驳回后要求重新跟进。
  const currentSalesId = String(customer.value.assigned_sales_id || '');
  const currentSalesName =
    customer.value.sales_name ||
    customer.value.assigned_sales_name ||
    '';

  const currentOption = salesOptions.value.find(
    item => String(item.value) === currentSalesId
  );

  reassignSalesId.value = currentOption?.value || currentSalesId || salesOptions.value[0]?.value || '';
  reassignSalesName.value = currentOption?.text || currentSalesName || salesOptions.value[0]?.text || '';
  reassignOpinion.value = '';

  // 下次跟进时间沿用销售跟进页的 YYYY-MM-DD 逻辑。
  // 如果客户已有未来跟进日期，则默认带出；否则留空由管理员选择。
  reassignNextFollowUp.value =
    customer.value.next_follow_up && customer.value.next_follow_up !== 'none'
      ? String(customer.value.next_follow_up).slice(0, 10)
      : '';

  showReassignPicker.value = true;
};

const onReassignSalesConfirm = ({ selectedOptions }) => {
  const option = selectedOptions?.[0];
  if (!option) return;

  reassignSalesId.value = option.value;
  reassignSalesName.value = option.text;
  showReassignSalesPicker.value = false;
};

const onReassignDateConfirm = (date) => {
  reassignNextFollowUp.value = formatDateForFollowUp(date);
  showReassignDatePicker.value = false;
};

const submitReprocess = async () => {
  if (!reassignSalesId.value) {
    return showToast('请选择处理销售');
  }

  if (!reassignNextFollowUp.value) {
    return showToast('请选择下次跟进时间');
  }

  const oldSalesName =
    customer.value.sales_name ||
    customer.value.assigned_sales_name ||
    '未分配';

  reassignSubmitting.value = true;
  showToast({ type: 'loading', message: '提交重新处理中...', duration: 0 });

  try {
    await request.post('/api/customers/reassign', {
      id: customerId.value,
      assigned_sales_id: reassignSalesId.value,
      sales_name: reassignSalesName.value,
      old_sales_name: oldSalesName,
      opinion: reassignOpinion.value.trim(),
      next_follow_up: reassignNextFollowUp.value
    });

    closeToast();
    showReassignPicker.value = false;
    showToast({ type: 'success', message: '已提交重新处理' });
    await initData();
  } catch (error) {
    console.error('重新处理失败', error);
    closeToast();
    showToast(error?.message || '重新处理失败');
  } finally {
    reassignSubmitting.value = false;
  }
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
    text += `[${log.createTimeStr || log.displayTime}] 状态:${statusStr}\n内容: ${log.content || log.note}\n`;
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
.container {
  padding: 15px 0;
  background-color: #f4f6f9;
  min-height: 100vh;
  padding-bottom: 100px; 
}

.customer-info-card, .profile-card, .timeline-section {
  width: 90%; 
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

/* 🌟 统一定义的 status-tag 和 log-type 基础尺寸样式 */
.status-tag {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 15px; /* 顶部标签保持较圆的风格 */
  font-weight: bold;
  display: inline-block;
  vertical-align: middle;
}

.log-type {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 4px; /* 时间轴标签保持微方风格 */
  font-weight: bold;
}

/* 🌟 统一的颜色字典池 (强制覆盖原本样式) */
.bg-status-deal_completed { background: #d1fae5 !important; color: #10b981 !important; }
.bg-status-clear_reject { background: #fee2e2 !important; color: #ef4444 !important; }
.bg-status-pending { background: #e0f2fe !important; color: #0284c7 !important; }
.bg-status-following, .bg-status-appointment_machine_v { background: #ede9fe !important; color: #8b5cf6 !important; }
.bg-status-missed_call, .bg-status-cannot_answer_call { background: #fef3c7 !important; color: #d97706 !important; }
.bg-status-invalid_lead { background: #f3f4f6 !important; color: #9ca3af !important; }
.bg-status-default { background: #f3f4f6 !important; color: #4b5563 !important; }


.boss-actions { display: flex; gap: 6px; }

.action-btn {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}
.copy-btn { background: #f0f9eb; color: #67c23a; }
.trans-btn { background: #ecf5ff; color: #409eff; }

.info-list { display: flex; flex-direction: column; gap: 8px; }
.info-item { display: flex; align-items: flex-start; font-size: 14px; line-height: 1.5; }
.info-item .label { color: #888888; margin-right: 8px; white-space: nowrap; flex-shrink: 0; }
.info-item .value { color: #333333; font-weight: 500; flex: 1; word-break: break-all; }
.info-item .highlight { color: #07c160; font-weight: bold; cursor: pointer; }

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

.timeline-item { display: flex; margin-bottom: 20px; position: relative; }
.line-box { width: 20px; display: flex; flex-direction: column; align-items: center; margin-right: 10px; position: relative; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #07c160; border: 3px solid #e1f5e8; z-index: 2; flex-shrink: 0; }
.line { position: absolute; top: 16px; bottom: -24px; width: 2px; background: #eee; z-index: 1; }
.timeline-item:last-child .line { display: none; }

.log-content { flex: 1; background: #fcfcfc; border: 1px solid #f0f0f0; border-radius: 8px; padding: 12px; }
.log-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.log-date { font-size: 12px; color: #999; }


.log-note { font-size: 14px; color: #555; line-height: 1.5; margin-bottom: 8px; white-space: pre-wrap; }
.log-reason { font-size: 12px; color: #ff4d4f; background: #fff1f0; padding: 6px; border-radius: 4px; margin-bottom: 8px; }

.log-images { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
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

/* 重新处理弹窗 */
.reprocess-popup {
  max-height: 86vh;
}

.reprocess-panel {
  padding: 18px 16px 16px;
  box-sizing: border-box;
}

.reprocess-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}

.reprocess-title {
  font-size: 18px;
  font-weight: 700;
  color: #323233;
}

.reprocess-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #969799;
}

.reprocess-form-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 50px;
  border-bottom: 1px solid #f2f3f5;
  cursor: pointer;
}

.reprocess-label {
  font-size: 14px;
  color: #323233;
}

.reprocess-value {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 68%;
  font-size: 14px;
  color: #1989fa;
  text-align: right;
}

.reprocess-placeholder {
  color: #969799;
}

.reprocess-note-box {
  margin-top: 14px;
}

.reprocess-note-label {
  margin-bottom: 8px;
  font-size: 14px;
  color: #323233;
}

.reprocess-note-input {
  width: 100%;
  min-height: 92px;
  padding: 10px;
  border: 1px solid #ebedf0;
  border-radius: 8px;
  background: #f7f8fa;
  box-sizing: border-box;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  outline: none;
}

.reprocess-note-tip {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.4;
  color: #969799;
}

.reprocess-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}

</style>