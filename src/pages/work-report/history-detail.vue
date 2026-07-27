<!-- src/pages/work-report/history-detail.vue -->
<template>
  <div class="container-wrapper">
    
  <van-nav-bar
  :title="t('title.reportDetail')"
  :left-text="t('common.back')"
  left-arrow
  @click-left="router.back()"
/>

    <div class="container" v-if="report">
      
      <!-- 🌟 1. 核心状态判断：审批状态 Banner -->
      <div :class="['approval-banner', `status-${report.approval_status || 'pending'}`]">
        <span class="icon">{{ statusIcon }}</span>
        <span class="status-text">{{ statusText }}</span>
      </div>

      <!-- 🌟 3. 具体原因与备注 (针对最新状态的按需展示) -->
      <div class="reason-card" v-if="report.approval_status === 'rejected' || report.approval_remark">
        <div class="reason-item" v-if="report.unfinished_reason">
          <span class="label">{{ t('workReport.detail.unfinishedReason', '未完成原因') }}: </span>
          <span>{{ report.unfinished_reason }}</span>
        </div>
        <div class="reason-item" v-if="report.reject_reason">
          <span class="label">{{ t('workReport.detail.rejectReason', '驳回理由') }}: </span>
          <span>{{ report.reject_reason }}</span>
        </div>
        <div class="reason-item" v-if="report.approval_remark">
          <span class="label">{{ t('workReport.detail.approvalRemark', '审批备注') }}: </span>
          <span>{{ report.approval_remark }}</span>
        </div>
      </div>

      <!-- 📅 汇报日期/周期头部 -->
      <div class="header-card">
        <span class="icon">{{ type === 'daily' ? '📅' : '📆' }}</span>
        <span class="date-text">
          {{ type === 'daily' 
              ? `${t('workReport.detail.dateLabel', '汇报日期')}: ${report.report_date}` 
              : `${t('workReport.detail.weekLabel', '汇报周期')}: ${report.week_range || report.week_start}` 
          }}
        </span>
      </div>

      <!-- 📝 汇报详情内容 (动态生成) -->
      <div class="detail-content">
        <div class="text-block" v-html="formattedText"></div>
      </div>

      <!-- 🌟 4. 遗留待办智能变色展示 -->
      <div class="detail-content mt-15" v-if="report.pending_todos && report.pending_todos.length > 0">
        <div class="section-title">{{ t('workReport.detail.pendingTodos', '遗留待办') }}</div>
        <div :class="['text-block', isTodosCleared ? 'text-green' : 'text-red']">
          <div v-for="(todo, index) in report.pending_todos" :key="index">
            {{ index + 1 }}. {{ todo.name }} - {{ todo.phone }} ({{ todo.status }})
          </div>
        </div>
      </div>

      <!-- 🌟 2. 审批历史时间轴 (Timeline) -->
      <div class="history-section" v-if="report.approval_history && report.approval_history.length > 0">
        <div class="section-title">{{ t('workReport.detail.approvalHistory', '审批历史记录') }}</div>
        
        <div class="timeline">
          <div class="timeline-item" v-for="(item, index) in report.approval_history" :key="index">
            <div :class="['timeline-dot', `dot-${item.status}`]"></div>
            <div class="timeline-line" v-if="index !== report.approval_history.length - 1"></div>
            
            <div class="timeline-content">
              <div class="time-row">
                <span :class="['status-badge', `badge-${item.status}`]">{{ getTimelineStatus(item.status) }}</span>
                <span class="time-text">{{ item.formattedTime || item.created_at }}</span>
              </div>
              <div class="history-reason" v-if="item.unfinished_reason">
                {{ t('workReport.detail.unfinishedReason', '未完成原因') }}: {{ item.unfinished_reason }}
              </div>
              <div class="history-reason" v-if="item.reject_reason">
                {{ t('workReport.detail.rejectReason', '驳回理由') }}: {{ item.reject_reason }}
              </div>
              <div class="history-reason" v-if="item.remark">
                {{ t('workReport.detail.approvalRemark', '备注') }}: {{ item.remark }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 🌟 重新修改按钮 (仅在被驳回且是日报时显示) -->
      <div class="edit-btn-container" v-if="report.approval_status === 'rejected' && type === 'daily'">
        <button class="edit-btn" @click="goToEdit">
          {{ t('workReport.detail.reEditBtn', '重新修改并提交') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { showToast, closeToast } from 'vant';
import request from '../../utils/request';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const report = ref(null);
const type = ref(route.query.type || 'daily');
const reportId = ref(route.query.id || '');

onMounted(() => {
  if (reportId.value) {
    fetchDetail();
  }
});

// 获取详情数据 (对接统一的 detail 接口)
const fetchDetail = async () => {
  showToast({ type: 'loading', message: t('common.loading', '加载中...'), duration: 0 });
  try {
    const res = await request.get('/api/report/detail', { 
      params: { id: reportId.value } 
    });
    report.value = res.data;
  } catch (err) {
    console.error('获取详情失败', err);
    showToast(t('common.error', '加载失败'));
  } finally {
    closeToast();
  }
};

// --- 计算属性与状态映射 ---

const statusIcon = computed(() => {
  if (report.value?.approval_status === 'approved') return '✅';
  if (report.value?.approval_status === 'rejected') return '❌';
  return '⏳';
});

const statusText = computed(() => {
  const s = report.value?.approval_status;
  if (s === 'approved') return t('workReport.status.approved', '已通过');
  if (s === 'rejected') return t('workReport.status.rejected', '被驳回');
  return t('workReport.status.pending', '待审核');
});

const getTimelineStatus = (status) => {
  return status === 'approved' 
    ? t('workReport.status.approved', '已通过') 
    : t('workReport.status.rejected', '被驳回');
};

const isTodosCleared = computed(() => {
  return !report.value?.pending_todos || report.value.pending_todos.length === 0;
});

// 🌟 核心防崩溃逻辑：兼容解析旧版的字符串数据
const parseLegacyString = (str, type) => {
  if (!str || typeof str !== 'string' || str.trim() === '' || str === '无') return [];
  return str.split('\n').map(line => {
    let phone = (line.match(/电话:([^\s]+)/) || [])[1] || '';
    if (type === 'call') return { phone, intent: (line.match(/说明:(.+)/) || [])[1] || '' };
    if (type === 'visit') return { phone, date: (line.match(/日期:([^\s]+)/) || [])[1] || '' };
    if (type === 'video') return { phone, note: (line.match(/情况:(.+)/) || [])[1] || '' };
    return null;
  }).filter(item => item && item.phone);
};

// 探测并规范化数组
const normalizeArray = (data, type) => {
  if (Array.isArray(data)) return data;
  return parseLegacyString(data, type);
};

// 动态将数据解析为文本格式展示
const formattedText = computed(() => {
  if (!report.value) return '';
  let html = '';

  if (type.value === 'daily') {
    // 强制过滤与转化，彻底规避 String 类型调用 .map() 导致的崩溃
    const calls = normalizeArray(report.value.list_calls, 'call');
    const visits = normalizeArray(report.value.list_visit, 'visit');
    const videos = normalizeArray(report.value.list_video, 'video');

    html += `<div class="info-group"><strong>📞 ${t('workReport.dailyReport.secCalls', '通话客户')}:</strong><br/>`;
    html += calls.length ? calls.map(c => `- ${c.phone} (${c.intent})`).join('<br/>') : t('common.none', '无');
    html += `</div>`;

    html += `<div class="info-group"><strong>🏪 ${t('workReport.dailyReport.secVisits', '邀约看车')}:</strong><br/>`;
    html += visits.length ? visits.map(v => `- ${v.phone} (${v.date})`).join('<br/>') : t('common.none', '无');
    html += `</div>`;

    html += `<div class="info-group"><strong>🎥 ${t('workReport.dailyReport.secVideos', '视频看车')}:</strong><br/>`;
    html += videos.length ? videos.map(v => `- ${v.phone} (${v.note})`).join('<br/>') : t('common.none', '无');
    html += `</div>`;

    html += `<div class="info-group"><strong>📝 ${t('workReport.dailyReport.secOther', '其他工作')}:</strong><br/>`;
    html += report.value.detail_other ? report.value.detail_other.replace(/\n/g, '<br/>') : t('common.none', '无');
    html += `</div>`;
  } else {
    html += `<div class="info-group"><strong>🎯 ${t('workReport.weeklyPlan.targetCall', '计划通话')}: </strong>${report.value.plan_calls || 0}</div>`;
    html += `<div class="info-group"><strong>🏪 ${t('workReport.weeklyPlan.targetVisit', '计划邀约')}: </strong>${report.value.plan_visit || 0}</div>`;
    html += `<div class="info-group"><strong>🎥 ${t('workReport.weeklyPlan.targetVideo', '计划视频')}: </strong>${report.value.plan_video || 0}</div>`;
    html += `<div class="info-group"><strong>📝 ${t('workReport.weeklyPlan.otherLabel', '其他安排')}:</strong><br/>`;
    html += report.value.plan_other ? report.value.plan_other.replace(/\n/g, '<br/>') : t('common.none', '无');
    html += `</div>`;
  }

  return html;
});

// 驳回重新编辑跳转
const goToEdit = () => {
  router.replace({ 
    path: '/work-report/daily', 
    query: { editId: reportId.value } 
  });
};
</script>

<style scoped>
/* 🌟 将小程序 WXSS (rpx) 等比转换为 H5 标准 (px)[cite: 16] */
.container-wrapper { background: #f4f6f9; min-height: 100vh; }
.container {
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.approval-banner {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: 12px 15px;
  border-radius: 6px;
  margin-bottom: 15px;
}
.status-pending { background: #fef3c7; color: #d97706; }
.status-approved { background: #d1fae5; color: #059669; }
.status-rejected { background: #fee2e2; color: #dc2626; }

.approval-banner .icon { margin-right: 8px; font-size: 18px; }
.approval-banner .status-text { font-weight: bold; font-size: 16px; }

.reason-card {
  width: 100%;
  box-sizing: border-box;
  background: #fffafa;
  border: 1px dashed #fca5a5;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 15px;
}
.reason-item {
  font-size: 14px;
  color: #dc2626;
  margin-bottom: 6px;
  line-height: 1.5;
}
.reason-item:last-child { margin-bottom: 0; }
.reason-item .label { font-weight: bold; }

.header-card {
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}
.header-card .icon { font-size: 20px; margin-right: 10px; }
.header-card .date-text { font-size: 16px; font-weight: bold; color: #1f2937; }

.detail-content {
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  padding: 15px;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}

.mt-15 { margin-top: 15px; }

.section-title {
  font-weight: bold;
  margin-bottom: 10px;
  font-size: 16px;
  color: #1f2937;
}

.text-block {
  font-size: 14px;
  color: #475569;
  line-height: 1.8;
  word-break: break-all;
}

:deep(.info-group) { margin-bottom: 12px; }
:deep(.info-group:last-child) { margin-bottom: 0; }

.text-green { color: #10b981 !important; font-weight: bold; }
.text-red { color: #ef4444 !important; font-weight: bold; }

.history-section {
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  padding: 15px;
  border-radius: 6px;
  margin-top: 15px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.03);
}

.timeline { margin-top: 10px; padding-left: 10px; }
.timeline-item {
  position: relative;
  padding-bottom: 20px;
  padding-left: 20px;
}
.timeline-item:last-child { padding-bottom: 0; }

.timeline-dot {
  position: absolute;
  left: -4px;
  top: 5px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  z-index: 2;
}
.dot-approved { background: #10b981; }
.dot-rejected { background: #ef4444; }

.timeline-line {
  position: absolute;
  left: -0.5px;
  top: 10px;
  bottom: -5px;
  width: 2px;
  background: #e2e8f0;
  z-index: 1;
}

.time-row { display: flex; align-items: center; margin-bottom: 6px; }
.status-badge {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 3px;
  color: #fff;
  margin-right: 8px;
  font-weight: bold;
}
.badge-approved { background: #10b981; }
.badge-rejected { background: #ef4444; }

.time-text { font-size: 12px; color: #94a3b8; }
.history-reason {
  font-size: 13px;
  color: #475569;
  background: #f8fafc;
  padding: 8px;
  border-radius: 4px;
  margin-top: 6px;
  line-height: 1.5;
}

.edit-btn-container { width: 100%; box-sizing: border-box; margin: 20px auto; }
.edit-btn {
  background: #3b82f6;
  color: #fff;
  font-weight: bold;
  border-radius: 6px;
  padding: 12px 0;
  font-size: 16px;
  width: 100%;
  border: none;
  text-align: center;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
}
.edit-btn:active { background: #2563eb; }
</style>