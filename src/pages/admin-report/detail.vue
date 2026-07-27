<!-- src/pages/admin-report/detail.vue -->
<template>
  <div class="report-detail-container">
    <van-nav-bar
      :title="t('title.detailTitle')"
      :left-text="t('common.back')"
      left-arrow
      @click-left="router.back()"
      fixed
      placeholder
    />

    <div class="content-wrap" v-if="reportData._id">
      <!-- ================= 1. 顶部状态横幅 ================= -->
      <div :class="['status-banner', `banner-${reportData.approval_status || 'pending'}`]">
        <div class="banner-title">
          <van-icon :name="statusIconMap[reportData.approval_status || 'pending']" />
          <span>{{ statusTextMap[reportData.approval_status || 'pending'] }}</span>
        </div>
        <div class="banner-desc" v-if="reportData.approval_status === 'pending'">
          等待您的审阅与批复
        </div>
      </div>

      <!-- ================= 2. 基础信息卡片 ================= -->
      <div class="card base-info-card">
        <div class="info-row">
          <span class="label">{{ t('adminReport.submitter') }}:</span>
          <span class="value sales-name">{{ reportData.sales_name }}</span>
        </div>
        <div class="info-row">
          <span class="label">{{ t('adminReport.reportDate') }}:</span>
          <span class="value">{{ reportData.report_date || reportData.week_range || reportData.week_start }}</span>
        </div>
        <div class="info-row">
          <span class="label">{{ t('adminReport.submitTime') }}:</span>
          <span class="value">{{ formatDateTime(reportData.created_at) }}</span>
        </div>
      </div>

      <!-- ================= 3. 汇报内容卡片 ================= -->
      <div class="card content-card">
        <div class="card-title">{{ t('adminReport.reportContent') }}</div>
        
        <!-- 适配日报字段 -->
        <template v-if="reportData.type === 'daily_report'">
          <div class="content-block" v-if="reportData.today_work">
            <div class="block-title">{{ t('adminReport.todayWork') }}</div>
            <div class="block-text">{{ reportData.today_work }}</div>
          </div>
          <div class="content-block" v-if="reportData.tomorrow_plan">
            <div class="block-title">{{ t('adminReport.tomorrowPlan') }}</div>
            <div class="block-text">{{ reportData.tomorrow_plan }}</div>
          </div>
        </template>

        <!-- 适配周计划字段 -->
        <template v-else-if="reportData.type === 'weekly_plan'">
          <div class="content-block" v-if="reportData.this_week_work">
            <div class="block-title">{{ t('adminReport.thisWeekWork') }}</div>
            <div class="block-text">{{ reportData.this_week_work }}</div>
          </div>
          <div class="content-block" v-if="reportData.next_week_plan">
            <div class="block-title">{{ t('adminReport.nextWeekPlan') }}</div>
            <div class="block-text">{{ reportData.next_week_plan }}</div>
          </div>
        </template>

        <!-- 通用摘要/问题字段 -->
        <div class="content-block" v-if="reportData.summary || reportData.issue">
          <div class="block-title">{{ t('adminReport.summaryAndIssues') }}</div>
          <div class="block-text">{{ reportData.summary || reportData.issue }}</div>
        </div>

        <!-- 凭证图片展示 -->
        <div class="content-images" v-if="reportData.images && reportData.images.length > 0">
          <van-image
            v-for="(img, index) in reportData.images"
            :key="index"
            width="80"
            height="80"
            fit="cover"
            :src="img"
            radius="6"
            @click="previewImage(img, reportData.images)"
          />
        </div>
      </div>

      <!-- ================= 4. 审批历史时间轴 ================= -->
      <div class="card history-card">
        <div class="card-title">{{ t('adminReport.approvalHistory') }}</div>
        
        <van-steps direction="vertical" :active="historySteps.length - 1" active-color="#1989fa">
          <van-step v-for="(step, index) in historySteps" :key="index">
            <div class="step-header">
              <span class="step-status" :class="`text-${step.status}`">{{ step.title }}</span>
              <span class="step-time">{{ step.time }}</span>
            </div>
            <div class="step-operator">{{ t('adminReport.operator') }}: {{ step.operator }}</div>
            <div class="step-remark" v-if="step.remark">
              {{ t('adminReport.remark') }}: {{ step.remark }}
            </div>
          </van-step>
        </van-steps>
      </div>
    </div>

    <!-- ================= 5. 底部审批操作区 ================= -->
    <div class="footer-action" v-if="reportData.approval_status === 'pending' || !reportData.approval_status">
      <div class="btn-group">
        <van-button 
          class="reject-btn" 
          plain 
          type="danger" 
          @click="showRejectDialog = true"
        >
          {{ t('adminReport.btnReject') }}
        </van-button>
        
        <van-button 
          class="pass-btn" 
          type="success" 
          @click="showPassDialog = true"
        >
          {{ t('adminReport.btnPass') }}
        </van-button>
      </div>
    </div>

    <!-- 驳回弹窗 -->
    <van-dialog 
      v-model:show="showRejectDialog" 
      :title="t('adminReport.rejectTitle')" 
      show-cancel-button
      @confirm="submitApproval('rejected')"
      :before-close="onBeforeRejectClose"
    >
      <div class="dialog-content">
        <textarea 
          class="custom-textarea" 
          v-model.trim="rejectReason" 
          :placeholder="t('adminReport.rejectPlaceholder')"
          autocomplete="off"
        ></textarea>
      </div>
    </van-dialog>

    <!-- 通过弹窗 -->
    <van-dialog 
      v-model:show="showPassDialog" 
      :title="t('adminReport.passTitle')" 
      show-cancel-button
      @confirm="submitApproval('approved')"
    >
      <div class="dialog-content">
        <textarea 
          class="custom-textarea" 
          v-model.trim="passRemark" 
          :placeholder="t('adminReport.passPlaceholder')"
          autocomplete="off"
        ></textarea>
      </div>
    </van-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import request from '../../utils/request';
import { showToast, showImagePreview, closeToast } from 'vant';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const reportId = ref(route.query.id || '');
const reportData = ref({});

// 弹窗与表单状态
const showRejectDialog = ref(false);
const showPassDialog = ref(false);
const rejectReason = ref('');
const passRemark = ref('');

// 状态字典映射
const statusIconMap = {
  pending: 'clock-o',
  approved: 'checked',
  rejected: 'clear'
};

const statusTextMap = computed(() => ({
  pending: t('adminReport.statusPending'),
  approved: t('adminReport.statusApproved'),
  rejected: t('adminReport.statusRejected')
}));

// ================== 初始化数据 ==================
onMounted(() => {
  if (!reportId.value) {
    showToast('参数错误，缺少汇报ID');
    return router.back();
  }
  fetchDetail();
});

const fetchDetail = async () => {
  showToast({ type: 'loading', message: '加载中...', duration: 0 });
  try {
    const res = await request.get('/api/admin/reports/detail', { params: { id: reportId.value } });
    if (res.code === 200) {
      reportData.value = res.data;
      // 🌟 核心修复：数据加载成功后，手动关闭一直 loading 的 Toast
      closeToast(); 
    } else {
      showToast(res.message || '获取失败');
    }
  } catch (err) {
    showToast('服务器异常');
  }
};

// ================== 构建时间轴快照 ==================
const historySteps = computed(() => {
  if (!reportData.value._id) return [];
  
  // 1. 始终包含的系统起始节点
  const steps = [{
    title: t('adminReport.submitNode'),
    status: 'submit',
    time: formatDateTime(reportData.value.created_at),
    operator: reportData.value.sales_name,
    remark: ''
  }];

  // 2. 遍历后端返回的精确时间轴数组
  const history = reportData.value.approval_history || [];
  history.forEach(log => {
    steps.push({
      title: log.status === 'approved' ? t('adminReport.statusApproved') : t('adminReport.statusRejected'),
      status: log.status,
      time: log.formattedTime || formatDateTime(log.timestamp),
      operator: log.operator_name || '管理员',
      remark: log.status === 'rejected' ? log.reject_reason : log.remark
    });
  });

  return steps;
});

// ================== 审批提交逻辑 ==================
const onBeforeRejectClose = (action) => {
  if (action === 'confirm' && !rejectReason.value) {
    showToast('必须填写驳回理由');
    return false; // 阻止弹窗关闭
  }
  return true;
};

const submitApproval = async (status) => {
  showToast({ type: 'loading', message: '处理中...', duration: 0 });
  try {
    const payload = {
      id: reportId.value,
      status: status,
      remark: status === 'approved' ? passRemark.value : '',
      reject_reason: status === 'rejected' ? rejectReason.value : ''
    };

    const res = await request.post('/api/admin/reports/approve', payload);
    if (res.code === 200) {
      showToast({ type: 'success', message: '操作成功' });
      // 刷新当前页面数据以展示最新时间轴与状态
      await fetchDetail();
      
      // 也可以选择操作成功后直接返回列表
      // setTimeout(() => router.back(), 1000);
    } else {
      showToast(res.message || '操作失败');
    }
  } catch (err) {
    showToast('服务器异常');
  }
};

// ================== 工具函数 ==================
const formatDateTime = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const previewImage = (current, images) => {
  showImagePreview({
    images: images,
    startPosition: images.indexOf(current),
    closeable: true,
  });
};
</script>

<style scoped>
.report-detail-container {
  min-height: 100vh;
  background-color: #f4f6f9;
  padding-bottom: 80px; /* 为底部操作栏留白 */
}

.content-wrap {
  padding: 15px;
}

/* 顶部状态横幅 */
.status-banner {
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 15px;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.banner-pending { background: linear-gradient(135deg, #f59e0b, #d97706); }
.banner-approved { background: linear-gradient(135deg, #10b981, #059669); }
.banner-rejected { background: linear-gradient(135deg, #ef4444, #dc2626); }

.banner-title {
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
}

.banner-desc {
  font-size: 13px;
  margin-top: 6px;
  opacity: 0.9;
}

/* 通用卡片样式 */
.card {
  background: #fff;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.card-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 15px;
  border-left: 4px solid #1989fa;
  padding-left: 8px;
}

/* 基础信息卡片 */
.base-info-card .info-row {
  display: flex;
  align-items: center;
  font-size: 14px;
  margin-bottom: 8px;
}
.base-info-card .info-row:last-child { margin-bottom: 0; }
.base-info-card .label { color: #888; width: 75px; flex-shrink: 0; }
.base-info-card .value { color: #333; font-weight: 500; }
.sales-name { color: #1989fa !important; font-weight: bold !important; }

/* 汇报内容区块 */
.content-block {
  margin-bottom: 16px;
  background: #f8fafc;
  padding: 12px;
  border-radius: 6px;
}
.content-block:last-child { margin-bottom: 0; }
.block-title {
  font-size: 13px;
  font-weight: bold;
  color: #64748b;
  margin-bottom: 6px;
}
.block-text {
  font-size: 15px;
  color: #1e293b;
  line-height: 1.6;
  white-space: pre-wrap;
}
.content-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
}

/* 时间轴修饰 */
.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.step-status { font-weight: bold; font-size: 14px; }
.text-submit { color: #333; }
.text-approved { color: #10b981; }
.text-rejected { color: #ef4444; }
.step-time { font-size: 12px; color: #999; }
.step-operator { font-size: 13px; color: #666; margin-bottom: 2px; }
.step-remark { font-size: 13px; color: #dc2626; background: #fef2f2; padding: 6px; border-radius: 4px; margin-top: 4px; }

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
.reject-btn { flex: 1; border-radius: 24px; font-weight: bold; }
.pass-btn { flex: 1.6; border-radius: 24px; font-weight: bold; }

/* 弹窗输入框 */
.dialog-content { padding: 15px; }
.custom-textarea {
  width: 100%;
  height: 100px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
  box-sizing: border-box;
  font-size: 14px;
  resize: none;
  outline: none;
}
.custom-textarea:focus { border-color: #3b82f6; }
</style>