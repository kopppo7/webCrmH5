<!-- src/pages/sale-add-customer/index.vue -->
<template>
  <div class="container-wrapper">
    <van-nav-bar
      :title="t('title.saleAddCustomer')"
      :left-text="t('common.back')"
      left-arrow
      @click-left="handleBack"
    />
    <div class="container">
      <div class="card">
        <van-form @submit="submitCustomer">
          <!-- 1. 客户来源 (动态字典单选框) -->
          <div class="form-item no-border">
            <div class="label-row">
              <span class="required">*</span>
              <span class="label">{{
                t("addCustomer.source", "客户来源")
              }}</span>
            </div>
            <van-radio-group
              v-model="form.source"
              direction="horizontal"
              class="custom-radio-group"
            >
              <van-radio
                v-for="item in sourceOptions"
                :key="item.value"
                :name="item.value"
                checked-color="#10b981"
                class="radio-label"
              >
                {{ item.label }}
              </van-radio>
            </van-radio-group>
          </div>

          <!-- 2. 姓名 (选填) -->
          <div class="form-item">
            <div class="label-row">
              <span class="label" style="padding-left: 7px">{{
                t("addCustomer.name", "客户姓名")
              }}</span>
            </div>
            <input
              class="input-box"
              v-model.trim="form.name"
              :placeholder="
                t('addCustomer.namePlaceholder', '请输入客户姓名 (选填)')
              "
            />
          </div>

          <!-- 3. 手机号 (必填) -->
          <div class="form-item">
            <div class="label-row">
              <span class="required">*</span>
              <span class="label">{{
                t("addCustomer.phone", "手机号码")
              }}</span>
            </div>
            <input
              class="input-box"
              type="tel"
              v-model.trim="form.phone"
              :placeholder="t('addCustomer.phonePlaceholder', '请输入手机号码')"
            />
          </div>

          <!-- 4. 产品品类 (动态字典下拉菜单) -->
          <div class="form-item" @click="showProductPicker = true">
            <div class="label-row">
              <span class="required">*</span>
              <span class="label">{{
                t("addCustomer.category", "产品品类")
              }}</span>
            </div>
            <div class="input-box select-box">
              <span
                :style="{
                  color: form.product_category ? '#1f2937' : '#9ca3af',
                }"
              >
                {{
                  selectedCategoryLabel ||
                  t("addCustomer.categoryPlaceholder", "请选择意向产品品类")
                }}
              </span>
              <van-icon name="arrow-down" color="#9ca3af" size="12" />
            </div>
          </div>

          <!-- 5. 需求机型 (细分型号 - 必填) -->
          <div class="form-item">
            <div class="label-row">
              <span class="required">*</span>
              <span class="label">{{
                t("addCustomer.payload", "需求机型")
              }}</span>
            </div>
            <input
              class="input-box"
              v-model.trim="form.payload"
              :placeholder="
                t('addCustomer.payloadPlaceholder', '例如：微小挖 15 型号')
              "
            />
          </div>

          <!-- 6. 备注信息 (选填) -->
          <div class="form-item no-border">
            <div class="label-row">
              <span class="label" style="padding-left: 7px">{{
                t("addCustomer.remark", "备注信息")
              }}</span>
            </div>
            <textarea
              class="textarea-box"
              v-model.trim="form.remark"
              :placeholder="
                t(
                  'addCustomer.remarkPlaceholder',
                  '补充说明客户需求或特殊情况...',
                )
              "
            ></textarea>
          </div>

          <!-- 底部提交按钮 -->
          <div class="footer-btn">
            <button class="submit-btn" type="submit" :disabled="isSubmitting">
              <span class="btn-icon">⚡</span>
              <span>{{ t("addCustomer.submitBtn", "确认提交并跟进") }}</span>
            </button>
          </div>
        </van-form>
      </div>

      <!-- 弹窗：产品品类选择 -->
      <van-popup v-model:show="showProductPicker" position="bottom" round>
        <van-picker
          :columns="productCategoryOptions"
          @confirm="onProductConfirm"
          @cancel="showProductPicker = false"
        />
      </van-popup>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { showToast, closeToast } from "vant";
import request from "../../utils/request";

const router = useRouter();
const { t, locale } = useI18n();

const isSubmitting = ref(false);
const showProductPicker = ref(false);

const form = ref({
  source: "",
  name: "",
  phone: "",
  product_category: "",
  payload: "",
  remark: "",
});

const sourceOptions = ref([]);
const productCategoryOptions = ref([]);

onMounted(async () => {
  try {
    const sourceRes = await request.get("/api/system/dict", {
      params: { type: "customer_source" },
    });
    sourceOptions.value = sourceRes.data
      .filter((item) => item.value !== "operate_allocate")
      .map((item) => ({
        label: item[`label_${locale.value}`] || item.label_zh || item.label,
        value: item.value,
      }));

    if (sourceOptions.value.length > 0 && !form.value.source) {
      form.value.source = sourceOptions.value[0].value;
    }

    const catRes = await request.get("/api/system/dict", {
      params: { type: "product_category" },
    });
    productCategoryOptions.value = catRes.data.map((item) => ({
      text: item[`label_${locale.value}`] || item.label_zh || item.label,
      value: item.value,
    }));
  } catch (err) {
    console.error("获取系统字典失败:", err);
  }
});

const selectedCategoryLabel = computed(() => {
  const found = productCategoryOptions.value.find(
    (c) => c.value === form.value.product_category,
  );
  return found ? found.text : "";
});

const onProductConfirm = ({ selectedOptions }) => {
  form.value.product_category = selectedOptions[0].value;
  showProductPicker.value = false;
};

const submitCustomer = async () => {
  if (!form.value.source) {
    return showToast(t("addCustomer.validateSource", "请选择客户来源"));
  }
  if (!form.value.phone) {
    return showToast(t("addCustomer.validatePhone", "请填写手机号码"));
  }
  if (!form.value.product_category) {
    return showToast(t("addCustomer.validateCategory", "请选择产品品类"));
  }
  if (!form.value.payload) {
    return showToast(t("addCustomer.validatePayload", "请填写具体需求机型"));
  }

  isSubmitting.value = true;
  showToast({
    type: "loading",
    message: t("common.saving", "正在验证并建档..."),
    duration: 0,
  });

  try {
    // 提交前，前端也可先自行去除空格保证整洁
    const cleanPhone = form.value.phone.replace(/\s+/g, "");

    const res = await request.post("/api/customers/add", {
      customer_source: form.value.source,
      name: form.value.name || t("addCustomer.unnamed", "未命名"),
      phone: cleanPhone,
      product_category: form.value.product_category,
      payload: form.value.payload,
      remark: form.value.remark,
    });

    // 🌟 处理后端的查重拦截与报错提示
    // Axios 拦截器一般会在 HTTP 状态码为 200 但业务 code !== 200 时把响应直接抛出来，
    // 如果没有抛出，我们在这里手动判定：
    if (res.code && res.code !== 200) {
      closeToast();
      showToast(res.message || "客户重复，请截图联系管理员");
      isSubmitting.value = false;
      return;
    }

    closeToast();
    showToast({
      type: "success",
      message: t("addCustomer.success", "建档成功"),
    });

    // 🌟 查重通过，成功拿到后端返回的新 ID，直达新增跟进记录页面
    const newCustomerId = res.data?.id || res.id;
    setTimeout(() => {
      // 用 replace 替换当前历史记录，防止按返回键又回到这个表单
      router.replace({
        path: "/follow-up",
        query: { id: newCustomerId },
      });
    }, 1000);
  } catch (err) {
    console.error("建档异常:", err);
    closeToast();
    // 兜底捕获异常提示，比如 Axios 拦截器直接将后端的 400 抛成了 err
    const errorMsg =
      err.message || err.data?.message || "客户重复，请截图联系管理员";
    showToast(errorMsg);
    isSubmitting.value = false;
  }
};

const handleBack = () => {
  router.push("/");
};
</script>

<style scoped>
.container-wrapper {
  background-color: #f7f8fa;
  min-height: 100vh;
}
.container {
  background-color: #f7f8fa;
  padding: 15px 12px 60px 12px;
  box-sizing: border-box;
}

.card {
  background: #ffffff;
  border-radius: 10px;
  padding: 18px 14px;
  box-shadow: 0 2px 12px rgba(153, 163, 174, 0.08);
  margin-bottom: 20px;
}

.form-item {
  margin-bottom: 16px;
}

.no-border {
  margin-bottom: 20px;
}

.label-row {
  display: flex;
  align-items: center;
  margin-bottom: 7px;
}

.required {
  color: #ef4444;
  font-size: 14px;
  font-weight: bold;
  margin-right: 3px;
}

.label {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.input-box {
  width: 100%;
  height: 44px;
  background-color: #f3f4f6;
  border-radius: 6px;
  padding: 0 12px;
  box-sizing: border-box;
  font-size: 14px;
  color: #1f2937;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  outline: none;
}

.input-box:focus {
  background-color: #ffffff;
  border-color: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.08);
}

.select-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.textarea-box {
  width: 100%;
  height: 80px;
  background-color: #f3f4f6;
  border-radius: 6px;
  padding: 10px 12px;
  box-sizing: border-box;
  font-size: 14px;
  color: #1f2937;
  border: none;
  resize: none;
  outline: none;
}

/* Vant Radio 定制样式 */
.custom-radio-group {
  padding: 5px 0;
  gap: 20px;
}

.radio-label {
  padding: 6px 12px;
  background-color: #f3f4f6;
  border-radius: 25px;
  font-size: 14px;
}

.footer-btn {
  margin-top: 24px;
  padding: 0 5px;
}

.submit-btn {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 24px;
  color: #ffffff;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
  transition: all 0.2s ease;
  border: none;
  cursor: pointer;
}

.submit-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 5px rgba(16, 185, 129, 0.2);
  opacity: 0.9;
}

.submit-btn:disabled {
  opacity: 0.6;
  transform: none;
}

.btn-icon {
  margin-right: 6px;
  font-size: 16px;
}
</style>
