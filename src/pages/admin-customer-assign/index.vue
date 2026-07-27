<template>
  <div class="assign-container">
     <van-nav-bar
  :title="t('title.assignCustomer')"
  :left-text="t('common.back')"
  left-arrow
  @click-left="router.back()"
/>

    <div class="main-content">
      <!-- 🌟 1. 产品品类选择 -->
      <div class="section-card">
        <div class="section-title">
          <van-icon name="apps-o" color="#1989fa" />
          <span>1. 选择产品类别</span>
        </div>
        <van-field
          v-model="importCategoryLabel"
          is-link
          readonly
          placeholder="点击选择产品类别"
          @click="showCategoryPicker = true"
          class="custom-field"
        />
        <div class="smart-tip" v-if="!hasActivePayload">
          <van-icon name="info-o" />
          <span
            >智能补全：系统将自动为本批次客户填充需求:
            <b>"{{ currentThaiPayload }}"</b></span
          >
        </div>
      </div>

      <!-- 🌟 2. 解析列拖拽配置区 (SortableJS 接管) -->
      <div class="section-card">
        <div class="section-title">
          <van-icon name="filter-o" color="#1989fa" />
          <span>2. 配置数据解析列</span>
        </div>
        <p class="sub-tip">按住左侧三道杠上下拖拽，点击开关控制是否解析</p>

        <!-- 这里去掉了原生拖拽事件，交由 Sortable.js 处理 -->
        <div ref="sortableListRef" class="sequence-config">
          <div
            v-for="(item, index) in parseSequence"
            :key="item.key"
            class="seq-item"
            :class="{ 'is-active': item.active }"
            @click="toggleActive(index)"
          >
            <div class="seq-content">
              <!-- 拖拽手柄图标 -->
              <van-icon name="bars" class="drag-handle" @click.stop />
              <span class="seq-num">{{ index + 1 }}</span>
              <span class="seq-label">{{ item.label }}</span>
            </div>

            <van-switch
              v-if="item.isDynamic"
              v-model="item.active"
              size="18px"
              @click.stop
              @change="handleSmartParse"
            />

            <van-icon v-else name="success" color="#1989fa" />
          </div>
        </div>
      </div>

      <!-- 🌟 3. 数据粘贴区 -->
      <div class="section-card">
        <div class="section-title">
          <van-icon name="description" color="#1989fa" />
          <span>3. 粘贴客户数据</span>
        </div>
        <van-field
          v-model="rawText"
          type="textarea"
          rows="4"
          autosize
          placeholder="支持单条或多条。请严格按照上方配置的顺序粘贴..."
          class="paste-area"
          @input="handleSmartParse"
        />
      </div>

      <!-- 🌟 4. 数据预览区 (直观表格展示) -->
      <div class="section-card" v-if="parsedLeads.length > 0">
        <div class="section-title">
          <van-icon name="eye-o" color="#1989fa" />
          <span>4. 数据预览</span>
          <span class="preview-count">共 {{ parsedLeads.length }} 条</span>
        </div>
        
        <div class="table-wrapper">
          <table class="preview-table">
            <thead>
              <tr>
                <th>需求 (Payload)</th>
                <th>姓名 (Name)</th>
                <th>城市 (City)</th>
                <th>电话 (Phone)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="lead in parsedLeads" :key="lead.id">
                <td :class="{'highlight-payload': lead.isDefaultPayload}">
                  {{ lead.payload }}
                </td>
                <td>{{ lead.name }}</td>
                <td>{{ lead.city }}</td>
                <td>
                  <span :class="lead.valid ? 'text-success' : 'text-danger'">
                    {{ lead.phone || '无效号码' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- 🌟 5. 分配销售 -->
      <div class="section-card">
        <div class="section-title">
          <van-icon name="contact" color="#1989fa" />
          <span>5. 批量分配给销售</span>
        </div>
        <van-field
          v-model="selectedSalesName"
          is-link
          readonly
          placeholder="请选择跟进该批客户的销售"
          @click="showSalesPicker = true"
          class="custom-field"
        />
      </div>
    </div>

    <!-- 底部提交栏 -->
    <div class="footer-bar">
      <van-button
        round
        block
        type="primary"
        class="shadow-btn"
        :loading="submitting"
        @click="submitBatch"
      >
        确认导入并分配 ({{ parsedLeads.length }}人)
      </van-button>
    </div>

    <!-- 弹窗组件 -->
    <van-popup v-model:show="showCategoryPicker" position="bottom" round>
      <van-picker
        title="选择产品类别"
        :columns="categoryOptions"
        @confirm="onCategoryConfirm"
        @cancel="showCategoryPicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showSalesPicker" position="bottom" round>
      <van-picker
        title="选择负责销售"
        :columns="salesOptions"
        @confirm="onSalesConfirm"
        @cancel="showSalesPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import { showToast, showDialog } from "vant";
import request from "../../utils/request";
// 引入强大的拖拽库
import Sortable from "sortablejs";

const router = useRouter();

// ================== 状态数据 ==================
const categoryOptions = ref([]);
const importCategoryValue = ref("");
const importCategoryLabel = ref("");
const showCategoryPicker = ref(false);

const salesOptions = ref([]);
const selectedSalesId = ref("");
const selectedSalesName = ref("");
const showSalesPicker = ref(false);

const rawText = ref("");
const parsedLeads = ref([]);
const submitting = ref(false);

// 用于绑定拖拽容器
const sortableListRef = ref(null);

// 解析列配置
const parseSequence = ref([
  { key: "payload", label: "需求 (Payload)", active: true, isDynamic: true },
  { key: "name", label: "姓名 (Name)", active: true, isDynamic: false },
  { key: "city", label: "城市 (City)", active: true, isDynamic: false },
  { key: "phone", label: "电话 (Phone)", active: true, isDynamic: false },
]);

// ================== 初始化请求与拖拽绑定 ==================
onMounted(() => {
  fetchCategories();
  fetchSalesList();
  initSortable(); // 初始化移动端拖拽
});

// 初始化 Sortable 拖拽
const initSortable = () => {
  nextTick(() => {
    if (sortableListRef.value) {
      Sortable.create(sortableListRef.value, {
        handle: ".drag-handle", // 只有按住左侧三道杠时才能拖拽，防止误触
        animation: 200, // 拖拽时的动画时长（毫秒），体验极佳
        ghostClass: "sortable-ghost", // 拖拽时占位元素的类名
        onEnd: (evt) => {
          // 拖拽结束时触发：更新底层数组顺序
          const { oldIndex, newIndex } = evt;
          if (oldIndex === newIndex) return;

          const seq = [...parseSequence.value];
          const movedItem = seq.splice(oldIndex, 1)[0];
          seq.splice(newIndex, 0, movedItem);

          parseSequence.value = seq;
          handleSmartParse(); // 顺序变化后，立刻重新解析下方的客户数据
        },
      });
    }
  });
};

// ================== 计算属性 ==================
const currentCategoryObj = computed(
  () =>
    categoryOptions.value.find((c) => c.value === importCategoryValue.value) ||
    {},
);

const currentThaiPayload = computed(() => {
  const cat = currentCategoryObj.value;
  if (!cat.value) return "none";
  return cat.originalLabel?.vi || cat.originalLabel?.zh || cat.value;
});

const hasActivePayload = computed(() => {
  const payloadItem = parseSequence.value.find((i) => i.key === "payload");
  return payloadItem && payloadItem.active;
});

// ================== 其他业务逻辑 ==================
const fetchCategories = async () => {
  try {
    const res = await request.get(
      "/api/system/dict/all?dict_type=product_category",
    );
    if (res.data) {
      categoryOptions.value = res.data.map((item) => ({
        text: item.label.zh || item.value,
        value: item.value,
        originalLabel: item.label,
      }));
      if (categoryOptions.value.length > 0) {
        importCategoryValue.value = categoryOptions.value[0].value;
        importCategoryLabel.value = categoryOptions.value[0].text;
      }
    }
  } catch (err) {
    showToast("字典加载失败");
  }
};

const fetchSalesList = async () => {
  try {
    const res = await request.get("/api/users/list");
    if (res.data) {
      salesOptions.value = res.data.map((user) => ({
        text: user.real_name || user.username,
        value: user._id,
      }));
    }
  } catch (err) {
    showToast("销售列表加载失败");
  }
};

const toggleActive = (index) => {
  const item = parseSequence.value[index];
  if (item.isDynamic) {
    item.active = !item.active;
    handleSmartParse();
  }
};

const onCategoryConfirm = ({ selectedOptions }) => {
  importCategoryValue.value = selectedOptions[0].value;
  importCategoryLabel.value = selectedOptions[0].text;
  showCategoryPicker.value = false;
  handleSmartParse();
};

const onSalesConfirm = ({ selectedOptions }) => {
  selectedSalesId.value = selectedOptions[0].value;
  selectedSalesName.value = selectedOptions[0].text;
  showSalesPicker.value = false;
};

const formatThaiPhone = (rawPhone) => {
  if (!rawPhone) return "";
  let cleaned = String(rawPhone).replace(/\D/g, "");
  if (cleaned.startsWith("66") && cleaned.length > 2)
    cleaned = "0" + cleaned.substring(2);
  if (cleaned.length === 10 && cleaned.startsWith("0"))
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  return cleaned || rawPhone;
};

const handleSmartParse = () => {
  if (!rawText.value.trim()) {
    parsedLeads.value = [];
    return;
  }

  const activeKeys = parseSequence.value
    .filter((i) => i.active)
    .map((i) => i.key);
  const lines = rawText.value
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);

  parsedLeads.value = lines.map((line, index) => {
    let cleanLine = line.replace(/[pP]:\s*/g, "");
    let parsedObj = { name: "", phone: "", city: "", payload: "" };
    let tokens = [];

    let isTabOrPipe = cleanLine.includes("\t") || cleanLine.includes("|");
    if (isTabOrPipe) {
      tokens = cleanLine
        .split(/[\t|]+/)
        .map((t) => t.trim())
        .filter((t) => t);
    } else {
      tokens = cleanLine
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t);
    }

    if (
      !isTabOrPipe &&
      tokens.length > activeKeys.length &&
      activeKeys.includes("name")
    ) {
      let nameIndex = activeKeys.indexOf("name");
      let beforeCount = nameIndex;
      let afterCount = activeKeys.length - 1 - nameIndex;

      activeKeys.forEach((key, i) => {
        if (key === "name") {
          parsedObj[key] = tokens
            .slice(beforeCount, tokens.length - afterCount)
            .join(" ");
        } else if (i < nameIndex) {
          parsedObj[key] = tokens[i] || "";
        } else {
          parsedObj[key] =
            tokens[tokens.length - afterCount + (i - nameIndex - 1)] || "";
        }
      });
    } else {
      activeKeys.forEach((key, i) => {
        parsedObj[key] = tokens[i] || "";
      });
    }

    let formattedPhone = formatThaiPhone(parsedObj.phone);
    let finalPayload =
      hasActivePayload.value && parsedObj.payload
        ? parsedObj.payload
        : currentThaiPayload.value;

    return {
      id: index,
      payload: finalPayload,
      isDefaultPayload: !hasActivePayload.value || !parsedObj.payload,
      name: parsedObj.name || "未知姓名",
      phone: formattedPhone,
      city: parsedObj.city || "未知城市",
      timeline: "none",
      valid: !!formattedPhone && formattedPhone.replace(/\s/g, "").length >= 9,
    };
  });
};

const submitBatch = async () => {
  if (parsedLeads.value.length === 0) return showToast("没有可导入的有效数据");
  if (!selectedSalesId.value) return showToast("请选择需要分配的销售");

  submitting.value = true;
  try {
    const payloadData = parsedLeads.value.map((lead) => ({
      name: lead.name,
      phone: lead.phone,
      city: lead.city,
      payload: lead.payload,
      timeline: lead.timeline,
      remark: "none",
      product_category: importCategoryValue.value,
      customer_source: "operate_allocate",
      assigned_sales_id: selectedSalesId.value,
      sales_name: selectedSalesName.value,
      status: "pending",
    }));

    await request.post("/api/customers/batch-import", { leads: payloadData });

    showDialog({
      title: "导入成功",
      message: `已成功录入并分配了 ${parsedLeads.value.length} 位客户！`,
    }).then(() => {
      rawText.value = "";
      parsedLeads.value = [];
      router.back();
    });
  } catch (err) {
    showToast("导入失败，请检查网络");
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.assign-container {
  min-height: 100vh;
  background-color: #f4f6f9;
  padding-bottom: 90px;
}
.custom-nav {
  background: #fff;
}
.main-content {
  padding: 12px;
}

/* 卡片模块 */
.section-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: bold;
  color: #323233;
  margin-bottom: 14px;
}
.sub-tip {
  font-size: 12px;
  color: #969799;
  margin: -6px 0 12px 24px;
}
.smart-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  background: #fffcf8;
  border-left: 3px solid #ff976a;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
  font-size: 12px;
  color: #ed6a0c;
  line-height: 1.4;
}
.custom-field {
  background: #f7f8fa;
  border-radius: 8px;
  padding: 10px 14px;
}
.paste-area {
  background: #f7f8fa;
  border-radius: 8px;
  font-family: SFMono-Regular, Consolas, monospace;
}

/* 🌟 列配置区与拖拽样式 */
.sequence-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.seq-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: #f7f8fa;
  border-radius: 8px;
  border: 1px solid transparent;
  background-color: #f7f8fa; /* 显式声明背景，防止拖拽时透明 */
}
/* 激活状态 */
.seq-item.is-active {
  background: #f0f7ff;
  border-color: #e1f0ff;
}
/* Sortable.js 专用的拖拽中占位符样式 */
.sortable-ghost {
  opacity: 0.4;
  background: #f4f6f9;
  border: 1px dashed #1989fa;
}

.seq-content {
  display: flex;
  align-items: center;
  gap: 12px;
}
/* 🌟 核心修复：禁止手柄在触摸时引发页面滚动 */
.drag-handle {
  color: #c8c9cc;
  font-size: 18px;
  padding-right: 4px;
  touch-action: none; /* 防止手机端页面跟随滚动 */
}
.seq-num {
  background: #fff;
  color: #1989fa;
  font-size: 12px;
  font-weight: bold;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.seq-label {
  font-size: 15px;
  font-weight: 500;
  color: #323233;
}
.seq-item:not(.is-active) .seq-label {
  color: #969799;
}
.seq-item:not(.is-active) .seq-num {
  color: #969799;
}

/* 🌟 预览表格区专用样式 */
.preview-count { 
  font-size: 13px; 
  color: #1989fa; 
  margin-left: auto; 
  font-weight: normal; 
}
.table-wrapper {
  width: 100%;
  overflow-x: auto; /* 内容过多时允许横向滚动 */
  border-radius: 8px;
  border: 1px solid #ebedf0;
  -webkit-overflow-scrolling: touch;
}
.preview-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;
  white-space: nowrap; /* 强制所有数据保持单行显示 */
}
.preview-table th, 
.preview-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #ebedf0;
  color: #323233;
}
.preview-table th {
  background-color: #f8faff;
  color: #969799;
  font-weight: 500;
}
.preview-table tbody tr:last-child td {
  border-bottom: none;
}
.preview-table tbody tr:nth-child(even) {
  background-color: #fafbfc; /* 斑马线效果，提升阅读体验 */
}

/* 文本高亮状态 */
.highlight-payload { 
  color: #ff976a !important; 
  font-weight: bold; 
}
.text-success {
  color: #07c160;
  font-weight: bold;
}
.text-danger {
  color: #ee0a24;
  font-weight: bold;
}

/* 底部操作 */
.footer-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 16px 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #fff 30%);
  box-sizing: border-box;
  z-index: 100;
}
.shadow-btn {
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.3);
  font-weight: bold;
}
</style>
