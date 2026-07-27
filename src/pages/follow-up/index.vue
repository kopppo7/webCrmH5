<!-- src/pages/follow-up/index.vue -->
<template>
  
  
  <van-nav-bar
  :title="t('title.followUp')"
  :left-text="t('common.back')"
  left-arrow
  @click-left="router.back()"
/>
  <div class="container-wrapper">
    <div class="container">
      <div class="card">
        <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
          <span>{{ t("followUp.title", "跟进记录") }}</span>
          <div class="key-customer-toggle" style="display: flex; align-items: center">
            <span :style="{ fontSize: '13px', marginRight: '5px', color: isKeyCustomer ? '#f59e0b' : '#999' }">{{ t("followUp.keyCustomerLabel", "重点客户") }}</span>
            <van-switch v-model="isKeyCustomer" active-color="#f59e0b" size="20px" />
          </div>
        </div>

        <div class="form-item column" v-if="isKeyCustomer">
          <span class="label" style="color: #f59e0b"><span class="required-star">*</span> {{ t("followUp.keyReason", "重点原因") }}</span>
          <input class="input-box" :placeholder="t('followUp.keyReasonPlaceholder', '请简述作为重点客户的原因')" v-model.trim="keyCustomerReason" />
        </div>

        <div class="form-item" @click="showStatusPicker = true">
          <span class="label"><span class="required-star">*</span> {{ t("followUp.result", "跟进结果") }}</span>
          <div :class="['picker-val', { 'text-gray': !selectedStatusLabel }]">
            {{ selectedStatusLabel || t("followUp.resultPlaceholder", "请选择跟进结果") }}
          </div>
        </div>

        <!-- 智能显隐: 已成交专属表单 -->
        <template v-if="isClosedWon">
          <div class="form-item" @click="showDealCategoryPicker = true">
            <span class="label"><span class="required-star">*</span> {{ t("followUp.dealCategory", "成交机型") }}</span>
            <div :class="['picker-val', { 'text-gray': !dealCategoryLabel }]">
              {{ dealCategoryLabel || t("followUp.dealCategoryPlaceholder", "请选择成交机型") }}
            </div>
          </div>
          <div class="form-item column">
            <span class="label"><span class="required-star">*</span> {{ t("followUp.dealModel", "产品型号") }}</span>
            <input class="input-box" :placeholder="t('followUp.dealModelPlaceholder', '请输入具体成交产品型号')" v-model.trim="dealModel" />
          </div>
          <div class="form-item column">
            <span class="label"><span class="required-star">*</span> {{ t("followUp.transactionAmount", "成交金额") }}</span>
            <input class="input-box" type="number" :placeholder="t('followUp.amountPlaceholder', '请输入成交金额')" v-model="transactionAmount" />
          </div>
        </template>

        <!-- 智能显隐: 无效线索提示 -->
        <div class="form-item column" v-if="isInvalid" style="padding: 5px 0">
          <div style="background: #fee2e2; padding: 10px; border-radius: 4px; width: 100%; box-sizing: border-box;">
            <span style="color: #ef4444; font-size: 12px; line-height: 1.5">{{ t("followUp.invalidNotice", "系统提示：保存后该线索将被标记为无效并归档") }}</span>
          </div>
        </div>

        <!-- 智能显隐: 下次跟进时间 -->
        <div class="form-item" v-if="isRoutineFollowUp" @click="showDatePicker = true">
          <span class="label"><span class="required-star">*</span> {{ t("followUp.nextTime", "下次跟进") }}</span>
          <div :class="['picker-val', { 'text-gray': !nextFollowUp }]">
            {{ nextFollowUp || t("followUp.datePlaceholder", "请选择下次跟进日期") }}
          </div>
        </div>

        <!-- 智能显隐: 沟通详述/备注 -->
        <div class="form-item column" v-if="isRoutineFollowUp || isClosedWon || isClosedLost">
          <span class="label"><span class="required-star">*</span> {{ t("followUp.note", "沟通详述") }}</span>
          <textarea class="note-input" :placeholder="t('followUp.notePlaceholder', '请详细记录本次沟通的内容与客户反馈')" v-model="note"></textarea>
        </div>

        <!-- 智能显隐: 截图/图片上传 -->
        <div class="form-item column" v-if="isRoutineFollowUp || isNoAnswer">
          <div style="width: 100%; margin-bottom: 8px">
            <span v-if="isRoutineFollowUp || (isNoAnswer && todayNoAnswerCount >= 1)" class="required-star" style="margin-right: 4px;">*</span>
            <span class="label">{{ t("followUp.uploadFiles", "上传截图") }}</span>
            <span v-if="isNoAnswer && todayNoAnswerCount >= 1" style="font-size: 11px; color: #999; margin-left: 8px;">多次未接须提供截图凭证</span>
            <span v-if="isNoAnswer && todayNoAnswerCount === 0" style="font-size: 11px; color: #999; margin-left: 8px;">首次未接为选填</span>
          </div>
          <van-uploader v-model="fileList" multiple :max-count="3" :after-read="afterRead" />
        </div>
      </div>

      <!-- 客户画像高级卡片 -->
      <div class="card profile-card">
        <div class="profile-header" @click="toggleProfile">
          <div class="profile-title">
            <span class="icon">🎯</span>
            <span>{{ t("followUp.profileTitle", "完善客户画像(选填)") }}</span>
          </div>
          <span :class="['collapse-arrow', { expanded: isProfileExpanded }]">></span>
        </div>
        <div class="profile-body" v-show="isProfileExpanded">
          <div class="p-input-group" v-for="key in ['demand', 'motivation', 'userType', 'scenario', 'timeframe']" :key="key">
            <span class="p-label">{{ t(`customerDetail.profile_${key}`) }}</span>
            <input class="p-input p-placeholder" v-model="profile[key]" :placeholder="t(`followUp.placeholder_${key}`)" />
          </div>
        </div>
      </div>

      <van-button class="submit-btn" block @click="submitFollowUp" :loading="isSubmitting">{{ t("followUp.submit", "提交跟进记录") }}</van-button>

      <van-popup v-model:show="showStatusPicker" position="bottom" round>
        <van-picker :columns="statusOptions" @confirm="onStatusConfirm" @cancel="showStatusPicker = false" />
      </van-popup>
      <van-popup v-model:show="showDealCategoryPicker" position="bottom" round>
        <van-picker :columns="dealCategoryOptions" @confirm="onDealCategoryConfirm" @cancel="showDealCategoryPicker = false" />
      </van-popup>
      <van-calendar v-model:show="showDatePicker" @confirm="onDateConfirm" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { showToast, showDialog, closeToast } from "vant";
import request from "../../utils/request";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();

const customerId = ref(route.query.id || "");
const isProfileExpanded = ref(true);
const isSubmitting = ref(false);

const profile = ref({ demand: "", motivation: "", userType: "", scenario: "", timeframe: "" });
const isKeyCustomer = ref(false);
const keyCustomerReason = ref("");

const statusOptions = ref([]);
const showStatusPicker = ref(false);
const selectedStatus = ref("");
const selectedStatusLabel = ref("");

const dealCategoryOptions = ref([]);
const showDealCategoryPicker = ref(false);
const dealCategory = ref("");
const dealCategoryLabel = ref("");
const dealModel = ref("");
const transactionAmount = ref("");

const showDatePicker = ref(false);
const nextFollowUp = ref("");
const note = ref("");
const fileList = ref([]); 

const todayNoAnswerCount = ref(0);
const todayFirstLogId = ref("");

const isClosedWon = computed(() => selectedStatus.value === 'deal_completed');
const isInvalid = computed(() => selectedStatus.value === 'invalid_lead');
const isNoAnswer = computed(() => selectedStatus.value === 'missed_call');
const isClosedLost = computed(() => selectedStatus.value === 'clear_reject');
const isRoutineFollowUp = computed(() => {
  return selectedStatus.value !== '' && !isClosedWon.value && !isInvalid.value && !isClosedLost.value && !isNoAnswer.value;
});

onMounted(() => {
  if (!customerId.value) return showToast("缺少客户ID");
  fetchStatusDict();
  fetchDealCategoryDict();
  fetchInitData();
});

const fetchInitData = async () => {
  try {
    // ⚠️ 注意：接口路径已更新为统一的 /api/customers 路由下
    const res = await request.get("/api/customers/follow-up/init-data", { params: { id: customerId.value } });
    if (res.data.profile) profile.value = { ...profile.value, ...res.data.profile };
    isKeyCustomer.value = res.data.is_key_customer || false;
    keyCustomerReason.value = res.data.key_customer_reason || "";
    todayNoAnswerCount.value = res.data.todayNoAnswerCount || 0;
    todayFirstLogId.value = res.data.todayFirstLogId || "";
  } catch (err) {
    console.error("拉取现有画像失败", err);
  }
};


const toggleProfile = () => { isProfileExpanded.value = !isProfileExpanded.value; };

const fetchStatusDict = async () => {
  try {
    const res = await request.get("/api/system/dict", { params: { type: "customer_status" } });
    statusOptions.value = res.data.filter((item) => item.value !== "pending").map((item) => ({
      value: item.value,
      text: item[`label_${locale.value}`] || item.label_zh || item.label,
    }));
  } catch (e) { console.error("获取动态状态字典失败", e); }
};

const fetchDealCategoryDict = async () => {
  try {
    const res = await request.get("/api/system/dict", { params: { type: "product_category" } });
    dealCategoryOptions.value = res.data.map((item) => ({
      value: item.value,
      text: item[`label_${locale.value}`] || item.label_zh || item.label,
    }));
  } catch (e) { console.error("获取产品字典失败", e); }
};

const onStatusConfirm = ({ selectedOptions }) => {
  selectedStatus.value = selectedOptions[0].value;
  selectedStatusLabel.value = selectedOptions[0].text;
  showStatusPicker.value = false;
};
const onDealCategoryConfirm = ({ selectedOptions }) => {
  dealCategory.value = selectedOptions[0].value;
  dealCategoryLabel.value = selectedOptions[0].text;
  showDealCategoryPicker.value = false;
};
const onDateConfirm = (date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  nextFollowUp.value = `${year}-${month}-${day}`;
  showDatePicker.value = false;
};

const afterRead = async (file) => {
  file.status = "uploading";
  file.message = t("common.uploading", "上传中");
  try {
    const formData = new FormData();
    formData.append("file", file.file);
    const res = await request.post("/api/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
    file.url = res.url;
    file.status = "done";
  } catch (err) {
    file.status = "failed";
    file.message = t("common.uploadFailed", "上传失败");
  }
};

const submitFollowUp = async () => {
  // ==========================================
  // 🌟 核心拦截：动态必填项强校验逻辑
  // ==========================================

  // 1. 基础状态校验
  if (!selectedStatus.value) return showToast(t("followUp.validateStatus", "请选择跟进结果"));
  
  // 2. 重点客户原因必填
  if (isKeyCustomer.value && !keyCustomerReason.value.trim()) return showToast(t("followUp.validateKeyReason", "请填写重点客户原因"));

  // 3. 已成交专属表单必填
  if (isClosedWon.value) {
    if (!dealCategory.value) return showToast(t("followUp.validateDealCat", "请选择成交机型"));
    if (!dealModel.value.trim()) return showToast(t("followUp.validateDealModel", "请输入产品型号"));
    if (!transactionAmount.value) return showToast(t("followUp.validateAmount", "请输入成交金额"));
  }

  // 4. 沟通详述必填（只要显示了文本框就必须填）
  if ((isRoutineFollowUp.value || isClosedWon.value || isClosedLost.value) && !note.value.trim()) {
    return showToast(t("followUp.validateNote", "请填写沟通详述"));
  }

  // 5. 下次跟进时间必填（常规跟进时显示）
  if (isRoutineFollowUp.value && !nextFollowUp.value) {
    return showToast(t("followUp.validateNextTime", "请选择下次跟进时间"));
  }

  // 6. 截图上传必填校验
  const uploadedUrls = fileList.value.filter((f) => f.status === "done").map((f) => f.url);
  if (isRoutineFollowUp.value) {
    // 常规跟进：只要显示了截图框就必填
    if (uploadedUrls.length === 0) return showToast(t("followUp.validateImage", "请上传沟通截图"));
  } else if (isNoAnswer.value && todayNoAnswerCount.value > 0) {
    // 多次未接：强制上传截图凭证
    if (uploadedUrls.length === 0) return showToast(t("followUp.validateImage", "多次未接必须上传通话记录截图"));
  }

  // ==========================================
  // 数据组装与提交
  // ==========================================
  let finalNote = note.value;
  let finalNextFollowUp = nextFollowUp.value;

  // 终结状态清空日期
  if (isInvalid.value || isClosedWon.value || isClosedLost.value) {
    finalNextFollowUp = "";
  }

  if (isInvalid.value) {
    finalNote = finalNote || t("followUp.autoInvalidNote", "标记为无效线索");
  } else if (isNoAnswer.value) {
    finalNote = ""; 
    // 多次未接自动推迟时间
    if (todayNoAnswerCount.value > 0 && !finalNextFollowUp) {
      const tmr = new Date();
      tmr.setDate(tmr.getDate() + 1);
      finalNextFollowUp = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, "0")}-${String(tmr.getDate()).padStart(2, "0")}`;
    }
  }

  isSubmitting.value = true;
  showToast({ type: "loading", message: t("common.saving", "保存记录..."), duration: 0 });

  try {
    // ⚠️ 注意：接口路径已更新为统一的 /api/customers 路由下
    const res = await request.post("/api/customers/follow-up/submit", {
      customerId: customerId.value,
      status: selectedStatus.value,
      nextFollowUp: finalNextFollowUp,
      note: finalNote, 
      dealCategory: isClosedWon.value ? dealCategory.value : "",
      dealModel: isClosedWon.value ? dealModel.value : "",
      transactionAmount: isClosedWon.value ? transactionAmount.value : "",
      isKeyCustomer: isKeyCustomer.value,
      keyCustomerReason: keyCustomerReason.value,
      profile: profile.value,
      images: uploadedUrls,
      todayFirstLogId: todayFirstLogId.value,
    });

    // 🌟 修复：使用正确的 closeToast 关闭 loading，防止卡死
    closeToast(); 

    if (res.code && res.code !== 200) {
      showToast(res.message || "提交失败");
      isSubmitting.value = false;
      return;
    }

    if (isClosedWon.value) {
      showDialog({ 
        title: t("followUp.wonTitle", "恭喜成交"), 
        message: t("followUp.wonMessage", "系统已记录成交明细！"), 
        confirmButtonColor: "#10b981" 
      }).then(() => router.back());
    } else {
      showToast({ type: "success", message: t("common.success", "保存成功") });
      setTimeout(() => router.back(), 1000);
    }
  } catch (err) {
    // 🌟 修复：无论网络断开还是业务报错，确保解除加载卡死状态
    closeToast(); 
    isSubmitting.value = false;
    showToast(err.message || err.data?.message || t("common.error", "提交失败"));
  }
};
</script>

<style scoped>
.container-wrapper { background-color: #f5f7fa; min-height: 100vh; }
.container { padding: 15px; padding-bottom: 40px; box-sizing: border-box; }
.card { width: 100%; background: #fff; border-radius: 12px; padding: 15px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); box-sizing: border-box; margin-bottom: 15px; }
.card-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #333; border-left: 4px solid #07c160; padding-left: 8px; }

/* 必填红星样式 */
.required-star { color: #e74c3c; font-weight: bold; margin-right: 2px; }

.form-item { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
.form-item.column { flex-direction: column; align-items: flex-start; border-bottom: none; }
.label { width: 80px; font-size: 14px; color: #555; margin-bottom: 8px; font-weight: 500; flex-shrink: 0;}
.picker-val { flex: 1; font-size: 15px; color: #07c160; font-weight: 500; }
.text-gray { color: #999; }
.input-box { width: 100%; height: 40px; background: #f9f9f9; padding: 0 10px; border-radius: 8px; font-size: 14px; box-sizing: border-box; border: none; }
.note-input { width: 100%; height: 80px; background: #f9f9f9; padding: 10px; border-radius: 8px; box-sizing: border-box; font-size: 14px; border: none; resize: none; }
.submit-btn { background: #07c160; color: #fff; margin-top: 20px; border-radius: 8px; font-weight: bold; border: none; }
.profile-card { margin-top: 15px; padding: 0; }
.profile-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; cursor: pointer; }
.profile-title { font-size: 15px; font-weight: bold; color: #3b82f6; display: flex; align-items: center; }
.profile-title .icon { margin-right: 6px; font-size: 17px; }
.collapse-arrow { color: #94a3b8; font-size: 15px; font-family: monospace; transition: transform 0.3s ease; }
.collapse-arrow.expanded { transform: rotate(90deg); }
.profile-body { padding: 15px; }
.p-input-group { margin-bottom: 13px; }
.p-input-group:last-child { margin-bottom: 0; }
.p-label { display: block; font-size: 13px; color: #64748b; margin-bottom: 6px; }
.p-input { width: 100%; box-sizing: border-box; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; font-size: 14px; color: #1e293b; padding: 8px; transition: all 0.2s ease; outline: none; }
.p-input:focus { border-color: #3b82f6; background: #ffffff; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
</style>