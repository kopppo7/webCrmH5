<!-- src/pages/work-report/weekly.vue -->
<template>
  <div class="container">
    <div class="form-header">
      <span class="page-title">{{ t('workReport.weeklyPlan.title') }}</span>
      <span class="page-hint">{{ t('workReport.weeklyPlan.hint') }}</span>
    </div>

    <div class="form-wrapper">
      <!-- 周期展示模块 -->
      <div class="form-section">
        <div class="section-title">
          <span class="icon">📅</span>
          <span>{{ t('workReport.weeklyPlan.periodLabel') }}</span>
        </div>
        <div class="picker-box readonly-box">
          <span style="color: #3b82f6; font-weight: bold;">{{ weekRange }}</span>
        </div>
      </div>

      <!-- 核心量化目标模块 -->
      <div class="form-section">
        <div class="section-title">
          <span class="icon">🎯</span>
          <span>{{ t('workReport.weeklyPlan.targetLabel') }}</span>
        </div>

        <div class="input-group">
          <span class="label">{{ t('workReport.weeklyPlan.targetCall') }}</span>
          <input 
            type="number" 
            v-model.number="form.planCalls" 
            :placeholder="t('workReport.weeklyPlan.placeholderNumber')" 
            class="h5-input"
          />
        </div>

        <div class="input-group">
          <span class="label">{{ t('workReport.weeklyPlan.targetVisit') }}</span>
          <input 
            type="number" 
            v-model.number="form.planVisit" 
            :placeholder="t('workReport.weeklyPlan.placeholderNumber')" 
            class="h5-input"
          />
        </div>

        <div class="input-group">
          <span class="label">{{ t('workReport.weeklyPlan.targetVideo') }}</span>
          <input 
            type="number" 
            v-model.number="form.planVideo" 
            :placeholder="t('workReport.weeklyPlan.placeholderNumber')" 
            class="h5-input"
          />
        </div>
      </div>

      <!-- 其他工作安排模块 -->
      <div class="form-section">
        <div class="section-title">
          <span class="icon">📝</span>
          <span>{{ t('workReport.weeklyPlan.otherLabel') }}</span>
        </div>
        <textarea 
          v-model.trim="form.planOther" 
          class="form-textarea" 
          :placeholder="t('workReport.weeklyPlan.placeholderOther')"
        ></textarea>
      </div>

      <van-button 
        class="submit-btn" 
        block 
        @click="submitForm" 
        :loading="isSubmitting"
      >
        {{ t('workReport.weeklyPlan.submitBtn') }}
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { showToast } from 'vant';
import request from '../../utils/request';

const router = useRouter();
const { t } = useI18n();

const weekRange = ref('');
const weekStart = ref('');
const isSubmitting = ref(false);

const form = ref({
  planCalls: '',
  planVisit: '',
  planVideo: '',
  planOther: ''
});

onMounted(() => {
  initCurrentWeek();
});

// 自动计算出当前的周一到周日
const initCurrentWeek = () => {
  const today = new Date();
  const day = today.getDay();
  // 计算本周一
  const diffMonday = today.getDate() - day + (day === 0 ? -6 : 1); 
  const monday = new Date(today.setDate(diffMonday));
  // 计算本周日
  const sunday = new Date(monday.getTime());
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = ('0' + (d.getMonth() + 1)).slice(-2);
    const date = ('0' + d.getDate()).slice(-2);
    return `${y}-${m}-${date}`;
  };

  const startStr = formatDate(monday);
  const endStr = formatDate(sunday);

  weekStart.value = startStr;
  weekRange.value = `${startStr} ${t('common.to', '至')} ${endStr}`;
};

// 提交表单
const submitForm = async () => {
  // 必填项校验：确保3个量化目标均已填写
  if (form.value.planCalls === '' || form.value.planVisit === '' || form.value.planVideo === '') {
    return showToast(t('workReport.weeklyPlan.validateRequired'));
  }

  isSubmitting.value = true;
  showToast({ type: 'loading', message: t('common.submitting', '提交中...'), duration: 0 });

  try {
    await request.post('/api/report/weekly', {
      week_start: weekStart.value,
      week_range: weekRange.value,
      plan_calls: Number(form.value.planCalls) || 0,
      plan_visit: Number(form.value.planVisit) || 0,
      plan_video: Number(form.value.planVideo) || 0,
      plan_other: form.value.planOther || ''
    });

    showToast.clear();
    showToast({ type: 'success', message: t('workReport.weeklyPlan.submitSuccess', '计划提交成功！') });
    
    setTimeout(() => {
      router.back();
    }, 1500);

  } catch (err) {
    console.error('提交周计划失败:', err);
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
/* 样式保留原版的高级质感，单位由 rpx 等比缩放为 px */
.container {
  background: #f5f7fa;
  color: #333;
  min-height: 100vh;
  padding: 15px;
  box-sizing: border-box;
}

.form-header {
  width: 95%;
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

.picker-box {
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 12px;
  font-size: 15px;
  color: #2c3e50;
}

.input-group {
  margin-bottom: 15px;
}

.input-group .label {
  font-size: 13px;
  color: #7f8c8d;
  display: block;
  margin-bottom: 5px;
}

.h5-input {
  width: 100%;
  box-sizing: border-box;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.h5-input:focus {
  border-color: #3b82f6;
  background: #ffffff;
}

.form-textarea {
  width: 100%;
  box-sizing: border-box;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 10px;
  font-size: 14px;
  height: 90px;
  resize: none;
  outline: none;
}

.form-textarea:focus {
  border-color: #3b82f6;
  background: #ffffff;
}

.submit-btn {
  background: #3b82f6;
  color: #fff;
  font-weight: bold;
  font-size: 16px;
  border-radius: 20px;
  height: 44px;
  margin-top: 25px;
  margin-bottom: 30px;
  box-shadow: 0 4px 10px rgba(59,130,246,0.3);
  border: none;
}

.submit-btn:active {
  background: #2563eb;
  transform: scale(0.99);
}
</style>