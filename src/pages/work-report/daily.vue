<!-- src/pages/work-report/daily.vue -->
<template>
  <van-nav-bar
  :title="t('title.dailyReport')"
  :left-text="t('common.back')"
  left-arrow
  @click-left="router.back()"
/>
  <div class="container">
    <div class="form-header">
      <span class="page-title">{{ t('workReport.dailyReport.title') }}</span>
      <span class="page-hint">{{ t('workReport.dailyReport.hint') }}</span>
    </div>

    <div class="form-wrapper">
      <!-- 汇报日期展示 -->
      <div class="form-section date-section">
        <span class="icon">📅</span>
        <span class="date-text">
          {{ t('workReport.dailyReport.reportDateLabel') }} 
          <span class="highlight-date">{{ reportDate }}</span>
        </span>
      </div>

      <!-- 1. 超过2分钟通话的客户 -->
      <div class="form-section">
        <div class="section-title">
          <span class="icon">📞</span>
          <span>{{ t('workReport.dailyReport.secCalls') }}</span>
        </div>
        <div class="client-list">
          <div class="client-item" v-for="(item, index) in listCallsArr" :key="index">
            <div class="item-info">
              <div class="item-title"><span class="c-phone">{{ t('workReport.dailyReport.phone') }}: {{ item.phone }}</span></div>
              <div class="item-desc">{{ t('workReport.dailyReport.intent') }}: {{ item.intent }}</div>
            </div>
            <div class="item-actions">
              <span class="btn-edit" @click="editItem('call', index)">{{ t('common.edit') }}</span>
              <span class="btn-del" @click="deleteItem('call', index)">{{ t('common.delete') }}</span>
            </div>
          </div>
        </div>
        <div class="add-btn" @click="openModal('call')">+ {{ t('workReport.dailyReport.addCustomer') }}</div>
      </div>

      <!-- 2. 邀约到店看车 -->
      <div class="form-section">
        <div class="section-title">
          <span class="icon">🏪</span>
          <span>{{ t('workReport.dailyReport.secVisits') }}</span>
        </div>
        <div class="client-list">
          <div class="client-item" v-for="(item, index) in listVisitArr" :key="index">
            <div class="item-info">
              <div class="item-title"><span class="c-phone">{{ t('workReport.dailyReport.phone') }}: {{ item.phone }}</span></div>
              <div class="item-desc">{{ t('workReport.dailyReport.date') }}: {{ item.date }}</div>
            </div>
            <div class="item-actions">
              <span class="btn-edit" @click="editItem('visit', index)">{{ t('common.edit') }}</span>
              <span class="btn-del" @click="deleteItem('visit', index)">{{ t('common.delete') }}</span>
            </div>
          </div>
        </div>
        <div class="add-btn" @click="openModal('visit')">+ {{ t('workReport.dailyReport.addCustomer') }}</div>
      </div>

      <!-- 3. 视频看车 -->
      <div class="form-section">
        <div class="section-title">
          <span class="icon">🎥</span>
          <span>{{ t('workReport.dailyReport.secVideos') }}</span>
        </div>
        <div class="client-list">
          <div class="client-item" v-for="(item, index) in listVideoArr" :key="index">
            <div class="item-info">
              <div class="item-title"><span class="c-phone">{{ t('workReport.dailyReport.phone') }}: {{ item.phone }}</span></div>
              <div class="item-desc">{{ t('workReport.dailyReport.note') }}: {{ item.note }}</div>
            </div>
            <div class="item-actions">
              <span class="btn-edit" @click="editItem('video', index)">{{ t('common.edit') }}</span>
              <span class="btn-del" @click="deleteItem('video', index)">{{ t('common.delete') }}</span>
            </div>
          </div>
        </div>
        <div class="add-btn" @click="openModal('video')">+ {{ t('workReport.dailyReport.addCustomer') }}</div>
      </div>

      <!-- 4. 其他工作内容 -->
      <div class="form-section">
        <div class="section-title">
          <span class="icon">📝</span>
          <span>{{ t('workReport.dailyReport.secOther') }}</span>
        </div>
        <textarea 
          v-model.trim="detailOther" 
          class="form-textarea" 
          :placeholder="t('workReport.dailyReport.otherPlaceholder')"
        ></textarea>
      </div>

      <van-button 
        class="submit-btn" 
        block 
        @click="submitForm" 
        :loading="isSubmitting"
      >
        {{ t('workReport.dailyReport.submitBtn') }}
      </van-button>
    </div>

    <!-- 弹窗：添加/编辑客户信息 (使用 Vant Dialog) -->
    <van-dialog 
      v-model:show="showModal" 
      :title="t('workReport.dailyReport.modalTitle')" 
      show-cancel-button 
      @confirm="saveModal"
      @cancel="closeModal"
    >
      <van-cell-group inset style="padding: 15px 0;">
        <van-field
          v-model.trim="tempData.phone"
          type="tel"
          :label="t('workReport.dailyReport.phone')"
          :placeholder="t('workReport.dailyReport.inputPhone')"
          required
        />

        <van-field
          v-if="activeModal === 'call'"
          v-model.trim="tempData.intent"
          :label="t('workReport.dailyReport.intent')"
          :placeholder="t('workReport.dailyReport.inputIntent')"
          required
        />

        <!-- 使用只读的 field 唤起 Vant 日历，代替原生 picker -->
        <van-field
          v-if="activeModal === 'visit'"
          v-model="tempData.date"
          is-link
          readonly
          :label="t('workReport.dailyReport.date')"
          :placeholder="t('workReport.dailyReport.inputDate')"
          @click="showCalendar = true"
          required
        />

        <van-field
          v-if="activeModal === 'video'"
          v-model.trim="tempData.note"
          :label="t('workReport.dailyReport.note')"
          :placeholder="t('workReport.dailyReport.inputNote')"
          required
        />
      </van-cell-group>
    </van-dialog>

    <!-- 弹窗：日期选择器 -->
    <van-calendar v-model:show="showCalendar" @confirm="onCalendarConfirm" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
// 🌟 修复 1：正确引入 closeToast
import { showToast, closeToast, showConfirmDialog } from 'vant';
import request from '../../utils/request';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const editId = ref(route.query.editId || '');
const reportDate = ref('');
const isSubmitting = ref(false);

const detailOther = ref('');
const listCallsArr = ref([]);
const listVisitArr = ref([]);
const listVideoArr = ref([]);

const showModal = ref(false);
const showCalendar = ref(false);
const activeModal = ref('');
const editIndex = ref(-1);
const tempData = ref({ phone: '', intent: '', date: '', note: '' });

onMounted(() => {
  if (editId.value) {
    loadEditData(editId.value);
  } else {
    initTodayDate();
  }
});

const initTodayDate = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = ('0' + (d.getMonth() + 1)).slice(-2);
  const day = ('0' + d.getDate()).slice(-2);
  reportDate.value = `${y}-${m}-${day}`;
};

const loadEditData = async (id) => {
  showToast({ type: 'loading', message: t('common.loading', '加载中...'), duration: 0 });
  try {
    const res = await request.get('/api/report/daily/detail', { params: { id } });
    const data = res.data;
    
    reportDate.value = data.report_date;
    detailOther.value = data.detail_other || '';
    
    listCallsArr.value = Array.isArray(data.list_calls) ? data.list_calls : parseStringToArray(data.list_calls, 'call');
    listVisitArr.value = Array.isArray(data.list_visit) ? data.list_visit : parseStringToArray(data.list_visit, 'visit');
    listVideoArr.value = Array.isArray(data.list_video) ? data.list_video : parseStringToArray(data.list_video, 'video');
  } catch (err) {
    console.error('加载重填数据失败', err);
  } finally {
    closeToast();
  }
};

const parseStringToArray = (str, type) => {
  if (!str || str === '无' || str.trim() === '') return [];
  return str.split('\n').map(line => {
    let phone = (line.match(/电话:([^\s]+)/) || [])[1] || '';
    if (type === 'call') return { phone, intent: (line.match(/说明:(.+)/) || [])[1] || '' };
    if (type === 'visit') return { phone, date: (line.match(/日期:([^\s]+)/) || [])[1] || '' };
    if (type === 'video') return { phone, note: (line.match(/情况:(.+)/) || [])[1] || '' };
    return null;
  }).filter(item => item && item.phone); 
};

const openModal = (type) => {
  activeModal.value = type;
  editIndex.value = -1;
  tempData.value = { phone: '', intent: '', date: '', note: '' };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const onCalendarConfirm = (date) => {
  const y = date.getFullYear();
  const m = ('0' + (date.getMonth() + 1)).slice(-2);
  const d = ('0' + date.getDate()).slice(-2);
  tempData.value.date = `${y}-${m}-${d}`;
  showCalendar.value = false;
};

const saveModal = () => {
  if (!tempData.value.phone) return showToast(t('workReport.dailyReport.validatePhone'));

  let newItem = { phone: tempData.value.phone };
  let targetArr = null;

  if (activeModal.value === 'call') {
    if (!tempData.value.intent) return showToast(t('workReport.dailyReport.validateIntent'));
    newItem.intent = tempData.value.intent;
    targetArr = listCallsArr.value;
  } else if (activeModal.value === 'visit') {
    if (!tempData.value.date) return showToast(t('workReport.dailyReport.validateDate'));
    newItem.date = tempData.value.date;
    targetArr = listVisitArr.value;
  } else if (activeModal.value === 'video') {
    if (!tempData.value.note) return showToast(t('workReport.dailyReport.validateNote'));
    newItem.note = tempData.value.note;
    targetArr = listVideoArr.value;
  }

  if (editIndex.value > -1) {
    targetArr[editIndex.value] = newItem;
  } else {
    targetArr.push(newItem);
  }
  closeModal();
};

const editItem = (type, index) => {
  activeModal.value = type;
  editIndex.value = index;
  let item = {};
  if (type === 'call') item = listCallsArr.value[index];
  if (type === 'visit') item = listVisitArr.value[index];
  if (type === 'video') item = listVideoArr.value[index];

  tempData.value = { ...item };
  showModal.value = true;
};

const deleteItem = (type, index) => {
  showConfirmDialog({
    title: t('common.deleteConfirmTitle'),
    message: t('common.deleteConfirmMsg')
  }).then(() => {
    if (type === 'call') listCallsArr.value.splice(index, 1);
    if (type === 'visit') listVisitArr.value.splice(index, 1);
    if (type === 'video') listVideoArr.value.splice(index, 1);
  }).catch(() => {});
};

const submitForm = async () => {
  showConfirmDialog({
    title: t('common.submitConfirmTitle'),
    message: `${t('workReport.dailyReport.submitConfirmMsg')} ${reportDate.value} ?`,
    confirmButtonColor: '#10b981'
  }).then(async () => {
    isSubmitting.value = true;
    showToast({ type: 'loading', message: t('common.submitting', '保存中...'), duration: 0 });

    try {
      const res = await request.post('/api/report/daily/submit', {
        editId: editId.value,
        reportDate: reportDate.value,
        listCalls: listCallsArr.value,
        listVisit: listVisitArr.value,
        listVideo: listVideoArr.value,
        detailOther: detailOther.value
      });
      
      // 捕获拦截器未能截获的业务报错 (查重拦截)
      if (res.code && res.code !== 200) {
        closeToast();
        showToast(res.message);
        isSubmitting.value = false;
        return;
      }

      // 🌟 修复 2：使用正确的 API 关闭加载动画
      closeToast();
      showToast({ type: 'success', message: t('workReport.dailyReport.submitSuccess', '日报提交成功！') });
      
      // 🌟 修复 3：不再使用后退，使用 replace 清理历史直接回到销售工作台主页
      setTimeout(() => { 
        router.replace('/'); 
      }, 1000);

    } catch (err) {
      console.error('提交失败:', err);
      // 兜底保护
      closeToast();
      const errorMsg = err.message || err.data?.message || '提交失败';
      showToast(errorMsg);
    } finally {
      isSubmitting.value = false;
    }
  }).catch(() => {});
};
</script>

<style scoped>
/* 容器及基础样式，等比缩放 rpx -> px */
.container {
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #f5f7fa;
  color: #333;
  min-height: 100vh;
  box-sizing: border-box;
}

.form-header {
  width: 100%;
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: bold;
  color: #2c3e50;
  display: block;
}

.page-hint {
  font-size: 13px;
  color: #7f8c8d;
  margin-top: 5px;
  display: block;
  line-height: 1.4;
}

.form-wrapper {
  width: 100%;
}

.form-section {
  background: #fff;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
  width: 100%;
  box-sizing: border-box;
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

.date-section {
  padding: 12px 15px;
  display: flex;
  align-items: center;
}

.date-section .icon {
  margin-bottom: 0;
  margin-right: 6px;
  font-size: 18px;
}

.date-text {
  font-size: 14px;
  color: #374151;
  font-weight: bold;
}

.highlight-date {
  color: #3b82f6;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
  color: #34495e;
  margin-bottom: 12px;
  border-bottom: 1px solid #f1f2f6;
  padding-bottom: 8px;
}

.section-title .icon {
  margin-right: 7px;
  font-size: 18px;
}

/* 结构化列表样式 */
.client-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.client-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 8px 10px;
  border-radius: 6px;
}

.item-info {
  flex: 1;
}

.item-title {
  font-size: 14px;
  margin-bottom: 3px;
}

.c-phone {
  color: #3b82f6;
  font-family: monospace;
  font-weight: bold;
}

.item-desc {
  font-size: 12px;
  color: #64748b;
}

.item-actions {
  display: flex;
  gap: 10px;
  font-size: 12px;
}

.btn-edit { color: #10b981; cursor: pointer; }
.btn-del { color: #ef4444; cursor: pointer; }

.add-btn {
  background: #f8fafc;
  color: #5a83bc;
  text-align: center;
  padding: 8px 0;
  border-radius: 6px;
  font-size: 13px;
  border: 1px dashed #d7e9ff;
  margin-top: 5px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:active {
  background: #eef2ff;
}

.form-textarea {
  width: 100%;
  box-sizing: border-box;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 10px;
  font-size: 14px;
  height: 100px;
  line-height: 1.5;
  outline: none;
  resize: none;
}

.form-textarea:focus {
  border-color: #3b82f6;
  background: #ffffff;
}

.submit-btn {
  background: #10b981; 
  color: #fff;
  font-weight: bold;
  font-size: 16px;
  border-radius: 20px;
  height: 48px;
  margin-top: 25px;
  margin-bottom: 40px;
  box-shadow: 0 4px 10px rgba(16,185,129,0.3);
  width: 100%;
  border: none;
}

.submit-btn:active {
  background: #059669;
  transform: scale(0.99);
}
</style>