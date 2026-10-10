<template>
  <div class="assign-container">
    <van-nav-bar
      :title="t('title.assignCustomer')"
      :left-text="t('common.back')"
      left-arrow
      @click-left="handleBack"
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

      <!-- 🌟 2. 动态解析列配置 -->
      <div class="section-card">
        <div class="section-title config-title-row">
          <div class="title-left">
            <van-icon name="filter-o" color="#1989fa" />
            <span>2. 配置数据解析列</span>
          </div>
          <div class="config-action-buttons">
            <van-button
              size="small"
              plain
              type="primary"
              icon="bookmark-o"
              @click="openSchemeLoader"
            >
              加载方案
            </van-button>

            <van-button
              size="small"
              plain
              type="primary"
              icon="setting-o"
              @click="openConfigPanel"
            >
              配置
            </van-button>
          </div>
        </div>

        <div class="config-meta-row">
          <span>当前类别：{{ importCategoryLabel || "未选择" }}</span>
          <span v-if="activeSchemeName" class="saved-state">
            当前方案：{{ activeSchemeName }}
          </span>
          <span v-else-if="configLoaded" class="saved-state">
            当前：上次保存配置
          </span>
        </div>

        <div class="scheme-bar" v-if="parseSchemes.length">
          <span class="scheme-label">快速方案：</span>
          <div class="scheme-list">
            <van-tag
              v-for="scheme in parseSchemes"
              :key="scheme.id"
              plain
              round
              type="primary"
              class="scheme-tag"
              @click="applyScheme(scheme)"
            >
              {{ scheme.name }}
            </van-tag>
          </div>
        </div>

        <p class="sub-tip">
          按住左侧三道杠调整列顺序。需求子项会自动合并到“需求”字段，不新增数据库字段。
        </p>

        <div ref="sortableListRef" class="sequence-config">
          <div
            v-for="(item, index) in parseSequence"
            :key="item.id"
            class="seq-item is-active"
          >
            <div class="seq-content">
              <van-icon name="bars" class="drag-handle" @click.stop />
              <span class="seq-num">{{ index + 1 }}</span>
              <span class="seq-label">{{ item.label }}</span>
            </div>
            <span class="seq-type">{{ modeLabel(item.mode) }}</span>
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
                <th>姓名</th>
                <th>电话</th>
                <th>城市</th>
                <th>需求</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="lead in parsedLeads" :key="lead.id">
                <td>{{ lead.name }}</td>
                <td>
                  <span :class="lead.valid ? 'text-success' : 'text-danger'">
                    {{ lead.phone || "无效号码" }}
                  </span>
                </td>
                <td>{{ lead.city }}</td>
                <td class="payload-cell">{{ lead.payload }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- 🌟 5. 销售轮询分配 -->
      <div class="section-card allocation-card">
        <div class="section-title allocation-title-row">
          <div class="title-left">
            <van-icon name="contact" color="#1989fa" />
            <span>5. 销售轮询分配</span>
          </div>
          <span class="allocation-summary">
            {{ parsedLeads.length }} 条客户 / {{ activeSales.length }} 位销售
          </span>
        </div>

        <div class="allocation-tip">
          客户保持当前顺序，系统按参与销售顺序逐条轮询分配：销售1 → 销售2 →
          销售3 → … → 销售1。 无法整除时，可指定一位销售认领全部余数。
        </div>

        <div v-if="salesOptions.length === 0" class="empty-sales">
          暂无可分配销售
        </div>

        <van-radio-group v-else v-model="remainderSalesId">
          <div class="sales-grid">
            <div
              v-for="sales in salesOptions"
              :key="sales.value"
              class="sales-card"
              :class="{
                'sales-disabled': disabledSalesIds.includes(sales.value),
              }"
            >
              <div class="sales-main-row">
                <div class="sales-info">
                  <div class="sales-avatar">
                    {{ getSalesInitial(sales.text) }}
                  </div>
                  <div class="sales-name-wrap">
                    <div class="sales-name">
                      {{ sales.text }}
                      <span
                        v-if="String(sales.realName || '').trim() === '是卡卡'"
                        class="default-off-tag"
                      >
                        默认不选
                      </span>
                    </div>
                    <div class="sales-count">
                      本次预计分配
                      <b>{{ allocationCountMap[sales.value] || 0 }}</b> 条
                    </div>
                  </div>
                </div>

                <van-switch
                  :model-value="!disabledSalesIds.includes(sales.value)"
                  size="20px"
                  @update:model-value="
                    (enabled) => setSalesEnabled(sales.value, enabled)
                  "
                />
              </div>

              <div
                v-if="
                  !disabledSalesIds.includes(sales.value) && remainderCount > 0
                "
                class="remainder-row"
              >
                <span class="remainder-label"
                  >认领剩余 {{ remainderCount }} 条</span
                >
                <van-radio :name="sales.value" icon-size="18px" />
              </div>
            </div>
          </div>
        </van-radio-group>

        <div class="allocation-stats" v-if="activeSales.length > 0">
          <div class="stat-item">
            <span class="stat-label">参与销售</span>
            <strong>{{ activeSales.length }}</strong>
          </div>
          <div class="stat-item">
            <span class="stat-label">基础数量</span>
            <strong>{{ baseAllocationCount }}</strong>
          </div>
          <div class="stat-item">
            <span class="stat-label">剩余数量</span>
            <strong>{{ remainderCount }}</strong>
          </div>
        </div>
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

    <!-- 已保存分组方案加载弹窗 -->
    <van-popup
      v-model:show="showSchemeLoader"
      position="bottom"
      round
      :style="{ minHeight: '36vh', maxHeight: '65vh' }"
    >
      <div class="scheme-loader-popup">
        <div class="scheme-loader-header">
          <div>
            <div class="scheme-loader-title">加载已保存方案</div>
            <div class="scheme-loader-subtitle">
              仅显示“{{ importCategoryLabel }}”类别 · 共 {{ parseSchemes.length }} 个方案
            </div>
          </div>
          <van-icon name="cross" size="20" @click="showSchemeLoader = false" />
        </div>

        <div v-if="parseSchemes.length === 0" class="scheme-empty">
          当前产品类别还没有保存分组方案
        </div>

        <div v-else class="scheme-loader-list">
          <div
            v-for="scheme in parseSchemes"
            :key="scheme.id"
            class="scheme-loader-item"
          >
            <div class="scheme-loader-info">
              <div class="scheme-loader-name">{{ scheme.name }}</div>
              <div class="scheme-loader-fields">
                {{
                  (scheme.fields || [])
                    .filter(item => item.mode !== 'ignore')
                    .map(item => item.mode === 'request' ? item.label : modeLabel(item.mode))
                    .join(' → ')
                }}
              </div>
            </div>

            <van-button
              size="small"
              type="primary"
              @click="loadSchemeAndClose(scheme)"
            >
              载入
            </van-button>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 解析列配置弹窗 -->
    <van-popup
      v-model:show="showConfigPanel"
      position="bottom"
      round
      :style="{ height: '82vh' }"
    >
      <div class="config-popup">
        <div class="config-popup-header">
          <div>
            <div class="config-popup-title">编辑解析列</div>
            <div class="config-popup-subtitle">
              {{ importCategoryLabel }} · 额外内容统一合并到“需求”
            </div>
          </div>
          <van-icon name="cross" size="20" @click="showConfigPanel = false" />
        </div>

        <div class="config-editor-list">
          <div
            v-for="(item, index) in editingSequence"
            :key="item.id"
            class="config-editor-item"
          >
            <div class="config-row-top">
              <span class="config-index">{{ index + 1 }}</span>

              <van-field
                v-model="item.label"
                class="config-name-input"
                :readonly="['name','phone','city'].includes(item.mode)"
                placeholder="显示名称"
              />

              <van-button
                v-if="!['name','phone','city'].includes(item.mode)"
                size="mini"
                plain
                type="danger"
                @click="removeEditingItem(index)"
              >
                删除
              </van-button>
            </div>

            <div class="config-row-bottom">
              <span class="config-type-label">列类型</span>
              <van-radio-group v-model="item.mode" direction="horizontal">
                <van-radio
                  name="request"
                  :disabled="isCoreModeLocked(item, 'request')"
                >
                  需求子项
                </van-radio>
                <van-radio
                  name="ignore"
                  :disabled="isCoreModeLocked(item, 'ignore')"
                >
                  忽略
                </van-radio>
              </van-radio-group>
              <span v-if="['name','phone','city'].includes(item.mode)" class="core-badge">
                {{ modeLabel(item.mode) }}
              </span>
            </div>
          </div>
        </div>

        <van-button
          block
          plain
          type="primary"
          icon="plus"
          class="add-config-btn"
          @click="addRequestItem"
        >
          新增需求子项
        </van-button>

        <div class="scheme-save-box">
          <van-field
            v-model.trim="schemeNameInput"
            label="方案名称"
            :placeholder="`默认：${importCategoryLabel || '当前类别'}`"
            clearable
          />
          <div class="scheme-save-help">
            方案会自动归属到当前页面上方选择的产品类别；不填写名称时，默认使用当前类别名称。
          </div>
          <van-button size="small" plain type="primary" @click="saveAsScheme">
            仅保存为分组方案
          </van-button>
        </div>

        <div class="saved-scheme-box" v-if="parseSchemes.length">
          <div class="saved-scheme-title">已保存方案</div>
          <div
            v-for="scheme in parseSchemes"
            :key="scheme.id"
            class="saved-scheme-row"
          >
            <span @click="applySchemeToEditor(scheme)">{{ scheme.name }}</span>
            <van-button size="mini" plain type="danger" @click="deleteScheme(scheme)">
              删除
            </van-button>
          </div>
        </div>

        <div class="config-popup-footer">
          <van-button block @click="showConfigPanel = false">取消</van-button>
          <van-button
            block
            type="primary"
            :loading="savingConfig"
            @click="saveCurrentConfig"
          >
            保存配置并保存方案
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 弹窗组件 -->
    <van-popup v-model:show="showCategoryPicker" position="bottom" round>
      <van-picker
        title="选择产品类别"
        :columns="categoryOptions"
        @confirm="onCategoryConfirm"
        @cancel="showCategoryPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import { showToast, showDialog } from "vant";
import { useI18n } from "vue-i18n";
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
const disabledSalesIds = ref([]);
const remainderSalesId = ref("");

const rawText = ref("");
const parsedLeads = ref([]);
const submitting = ref(false);
const { t } = useI18n();

// 用于绑定拖拽容器
const sortableListRef = ref(null);

const handleBack = () => {
  router.push("/");
};

// ================== 动态解析列（最终只写入固定字段） ==================
const makeId = () => `col_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const DEFAULT_PARSE_SEQUENCE = [
  { id: "core_name", mode: "name", label: "姓名" },
  { id: "core_phone", mode: "phone", label: "电话" },
  { id: "core_city", mode: "city", label: "城市" },
];

const cloneSequence = (list = []) =>
  JSON.parse(JSON.stringify(Array.isArray(list) ? list : []));

const normalizeSequence = (list = []) => {
  const normalized = cloneSequence(list)
    .filter(item => item && item.mode)
    .map(item => ({
      id: String(item.id || makeId()),
      mode: String(item.mode),
      label: String(item.label || "").trim() || "未命名项",
    }));

  // 固定字段必须存在且只能有一个
  const ensureCore = (mode, label, id) => {
    const first = normalized.find(item => item.mode === mode);
    if (first) {
      first.label = label;
      first.id = first.id || id;
    } else {
      normalized.push({ id, mode, label });
    }
  };

  ensureCore("name", "姓名", "core_name");
  ensureCore("phone", "电话", "core_phone");
  ensureCore("city", "城市", "core_city");

  const seenCore = new Set();
  return normalized.filter(item => {
    if (!["name", "phone", "city"].includes(item.mode)) return true;
    if (seenCore.has(item.mode)) return false;
    seenCore.add(item.mode);
    return true;
  });
};

const parseSequence = ref(cloneSequence(DEFAULT_PARSE_SEQUENCE));
const editingSequence = ref([]);
const parseSchemes = ref([]);
const showConfigPanel = ref(false);
const showSchemeLoader = ref(false);
const savingConfig = ref(false);
const configLoaded = ref(false);
const schemeNameInput = ref("");
const activeSchemeName = ref("");

// ================== 初始化请求与拖拽绑定 ==================
onMounted(async () => {
  await fetchCategories();
  await fetchSalesList();
  initSortable();
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
  if (!cat.value) return "";
  return cat.originalLabel?.vi || cat.originalLabel?.zh || cat.value;
});

const modeLabel = (mode) => {
  const map = {
    name: "姓名",
    phone: "电话",
    city: "城市",
    request: "需求子项",
    ignore: "忽略",
  };
  return map[mode] || mode;
};

const activeSales = computed(() =>
  salesOptions.value.filter(
    (sales) => !disabledSalesIds.value.includes(sales.value),
  ),
);

const baseAllocationCount = computed(() => {
  if (activeSales.value.length === 0) return 0;
  return Math.floor(parsedLeads.value.length / activeSales.value.length);
});

const remainderCount = computed(() => {
  if (activeSales.value.length === 0) return 0;
  return parsedLeads.value.length % activeSales.value.length;
});

const allocationCountMap = computed(() => {
  const map = {};
  const active = activeSales.value;

  salesOptions.value.forEach((sales) => {
    map[sales.value] = 0;
  });

  if (active.length === 0) return map;

  active.forEach((sales) => {
    map[sales.value] = baseAllocationCount.value;
  });

  if (remainderCount.value > 0) {
    const remainderOwner = active.find(
      (sales) => sales.value === remainderSalesId.value,
    );

    if (remainderOwner) {
      map[remainderOwner.value] += remainderCount.value;
    } else {
      for (let i = 0; i < remainderCount.value; i += 1) {
        map[active[i].value] += 1;
      }
    }
  }

  return map;
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
        await loadParseConfig(importCategoryValue.value);
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
        value: String(user._id || ""),
        username: String(user.username || ""),
        realName: String(user.real_name || ""),
      }));

      // “是卡卡”默认不参与本次分配。
      // 根据实际用户数据，账号 username 为 "cs"，姓名 real_name 才是 "是卡卡"。
      // 因此这里只按 real_name 精确匹配。
      const isKakaAccount = (sales) => {
        const realName = String(sales.realName || "").trim();
        return realName === "是卡卡";
      };

      const kakaIds = salesOptions.value
        .filter(isKakaAccount)
        .map((sales) => sales.value)
        .filter(Boolean);

      // 只做“默认不选”，用户仍可手动重新开启卡卡。
      disabledSalesIds.value = Array.from(
        new Set([...disabledSalesIds.value, ...kakaIds]),
      );

      // 如果卡卡之前被设置成“余数认领人”，同步清空
      if (kakaIds.includes(remainderSalesId.value)) {
        remainderSalesId.value = "";
      }
    }
  } catch (err) {
    showToast("销售列表加载失败");
  }
};

const loadParseConfig = async (productCategory) => {
  if (!productCategory) return;

  configLoaded.value = false;
  try {
    const res = await request.get("/api/customers/parse-config", {
      params: { productCategory },
    });

    parseSequence.value = normalizeSequence(
      res.data?.fields?.length ? res.data.fields : DEFAULT_PARSE_SEQUENCE
    );
    const schemes = res.data?.schemes;
    parseSchemes.value = Array.isArray(schemes) ? schemes : [];
    activeSchemeName.value = "";
    configLoaded.value = true;
    handleSmartParse();
  } catch (err) {
    console.error("加载解析配置失败", err);
    parseSequence.value = cloneSequence(DEFAULT_PARSE_SEQUENCE);
    parseSchemes.value = [];
    showToast("解析配置加载失败，已使用默认列");
  }
};

const openSchemeLoader = async () => {
  // 每次打开都重新读取一次，避免刚保存的新方案因为页面状态没有刷新而看不到。
  try {
    const res = await request.get("/api/customers/parse-config", {
      params: { productCategory: importCategoryValue.value },
    });

    parseSchemes.value = Array.isArray(res.data?.schemes) ? res.data.schemes : [];
  } catch (err) {
    console.error("刷新分组方案失败", err);
  }

  if (parseSchemes.value.length === 0) {
    showToast("当前产品类别暂无已保存方案");
  }

  showSchemeLoader.value = true;
};

const openConfigPanel = () => {
  editingSequence.value = normalizeSequence(parseSequence.value);

  // 默认使用当前页面上方选择的产品类别作为方案名称。
  // 用户仍然可以手动改名，从而在同一类别下保存多套方案。
  schemeNameInput.value = importCategoryLabel.value || "";
  showConfigPanel.value = true;
};

const addRequestItem = () => {
  editingSequence.value.push({
    id: makeId(),
    mode: "request",
    label: `需求项 ${editingSequence.value.filter(i => i.mode === "request").length + 1}`,
  });
};

const removeEditingItem = (index) => {
  const item = editingSequence.value[index];
  if (!item || ["name", "phone", "city"].includes(item.mode)) return;
  editingSequence.value.splice(index, 1);
};

const isCoreModeLocked = (item, targetMode) => {
  // 固定姓名/电话/城市不可改成需求或忽略
  return ["name", "phone", "city"].includes(item.mode);
};

const validateEditingSequence = () => {
  const coreModes = ["name", "phone", "city"];

  for (const mode of coreModes) {
    if (editingSequence.value.filter(item => item.mode === mode).length !== 1) {
      showToast(`${modeLabel(mode)}列必须且只能保留一个`);
      return false;
    }
  }

  for (const item of editingSequence.value) {
    if (item.mode === "request" && !String(item.label || "").trim()) {
      showToast("需求子项名称不能为空");
      return false;
    }
  }

  return true;
};

const persistCurrentConfig = (sequence) =>
  request.post("/api/customers/parse-config/save", {
    productCategory: importCategoryValue.value,
    fields: normalizeSequence(sequence),
  });

const saveCurrentConfig = async () => {
  if (!validateEditingSequence()) return;

  savingConfig.value = true;
  try {
    const normalized = normalizeSequence(editingSequence.value);

    // 默认方案名 = 当前页面上方选择的产品类别
    const schemeName =
      schemeNameInput.value.trim() ||
      importCategoryLabel.value ||
      importCategoryValue.value ||
      "默认方案";

    // ① 保存当前类别正在使用的配置
    await persistCurrentConfig(normalized);

    // ② 同时保存成当前类别下的一套命名方案
    const schemeRes = await request.post("/api/customers/parse-config/scheme", {
      productCategory: importCategoryValue.value,
      name: schemeName,
      fields: normalized,
    });

    parseSchemes.value = Array.isArray(schemeRes.data?.schemes)
      ? schemeRes.data.schemes
      : parseSchemes.value;

    parseSequence.value = normalized;
    activeSchemeName.value = schemeName;
    showConfigPanel.value = false;
    configLoaded.value = true;
    handleSmartParse();

    showToast(`已保存到“${importCategoryLabel.value}”下：${schemeName}`);
    schemeNameInput.value = "";
  } catch (err) {
    console.error("保存解析配置失败", err);
    showToast("保存失败，请稍后重试");
  } finally {
    savingConfig.value = false;
  }
};

const saveAsScheme = async () => {
  if (!validateEditingSequence()) return;

  const name =
    schemeNameInput.value.trim() ||
    importCategoryLabel.value ||
    importCategoryValue.value ||
    "默认方案";

  savingConfig.value = true;
  try {
    const normalized = normalizeSequence(editingSequence.value);

    const res = await request.post("/api/customers/parse-config/scheme", {
      // 方案自动归属于当前页面选中的产品类别
      productCategory: importCategoryValue.value,
      name,
      fields: normalized,
    });

    parseSchemes.value = Array.isArray(res.data?.schemes)
      ? res.data.schemes
      : parseSchemes.value;

    const refreshRes = await request.get("/api/customers/parse-config", {
      // 加载也只刷新当前产品类别下的方案
      params: { productCategory: importCategoryValue.value },
    });

    parseSchemes.value = Array.isArray(refreshRes.data?.schemes)
      ? refreshRes.data.schemes
      : parseSchemes.value;

    showToast(`已保存到“${importCategoryLabel.value}”下：${name}`);
    schemeNameInput.value = importCategoryLabel.value || "";
  } catch (err) {
    console.error("保存分组方案失败", err);
    showToast("方案保存失败");
  } finally {
    savingConfig.value = false;
  }
};

const applyScheme = async (scheme) => {
  if (!scheme?.fields) return;

  const normalized = normalizeSequence(scheme.fields);
  parseSequence.value = normalized;
  activeSchemeName.value = scheme.name || "";

  try {
    await persistCurrentConfig(normalized);
    handleSmartParse();
    showToast(`已套用：${scheme.name}`);
  } catch (err) {
    console.error("套用方案失败", err);
    showToast("方案已套用，但保存当前配置失败");
  }
};

const loadSchemeAndClose = async (scheme) => {
  await applyScheme(scheme);
  showSchemeLoader.value = false;
};

const applySchemeToEditor = (scheme) => {
  if (!scheme?.fields) return;
  editingSequence.value = normalizeSequence(scheme.fields);
  showToast(`已载入：${scheme.name}`);
};

const deleteScheme = async (scheme) => {
  if (!scheme?.id) return;

  try {
    await showDialog({
      title: "删除方案",
      message: `确认删除“${scheme.name}”吗？`,
      showCancelButton: true,
    });

    const res = await request.post("/api/customers/parse-config/scheme/delete", {
      productCategory: importCategoryValue.value,
      schemeId: scheme.id,
    });

    parseSchemes.value = Array.isArray(res.data?.schemes)
      ? res.data.schemes
      : parseSchemes.value.filter(item => item.id !== scheme.id);

    showToast("方案已删除");
  } catch (err) {
    // 用户取消时无需提示
  }
};

const onCategoryConfirm = async ({ selectedOptions }) => {
  importCategoryValue.value = selectedOptions[0].value;
  importCategoryLabel.value = selectedOptions[0].text;
  showCategoryPicker.value = false;

  await loadParseConfig(importCategoryValue.value);
};

const getSalesInitial = (name) => {
  const text = String(name || "").trim();
  return text ? text.slice(0, 1).toUpperCase() : "S";
};

const setSalesEnabled = (salesId, enabled) => {
  if (enabled) {
    disabledSalesIds.value = disabledSalesIds.value.filter(
      (id) => id !== salesId,
    );
  } else {
    if (!disabledSalesIds.value.includes(salesId)) {
      disabledSalesIds.value.push(salesId);
    }
    if (remainderSalesId.value === salesId) {
      remainderSalesId.value = "";
    }
  }
};

const buildAllocationQueue = () => {
  const active = activeSales.value;
  if (active.length === 0) return [];

  const remaining = {};
  active.forEach((sales) => {
    remaining[sales.value] = allocationCountMap.value[sales.value] || 0;
  });

  const queue = [];
  while (queue.length < parsedLeads.value.length) {
    let addedThisRound = false;

    active.forEach((sales) => {
      if (queue.length >= parsedLeads.value.length) return;
      if (remaining[sales.value] > 0) {
        queue.push(sales);
        remaining[sales.value] -= 1;
        addedThisRound = true;
      }
    });

    if (!addedThisRound) break;
  }

  return queue;
};

const formatThaiPhone = (rawPhone) => {
  if (!rawPhone) return "";
  let cleaned = String(rawPhone).replace(/\D/g, "");
  // 修改：解析 66 或者 84 前缀
  if (
    (cleaned.startsWith("66") || cleaned.startsWith("84")) &&
    cleaned.length > 2
  )
    cleaned = "0" + cleaned.substring(2);
  if (cleaned.length === 10 && cleaned.startsWith("0"))
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  return cleaned || rawPhone;
};

const normalizeReadableValue = (value) => {
  const text = String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const handleSmartParse = () => {
  if (!rawText.value.trim()) {
    parsedLeads.value = [];
    return;
  }

  const columns = parseSequence.value;
  const lines = rawText.value
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);

  parsedLeads.value = lines.map((line, index) => {
    const cleanLine = line.replace(/[pP]:\s*/g, "");
    const isTabOrPipe = cleanLine.includes("\t") || cleanLine.includes("|");

    let tokens = isTabOrPipe
      ? cleanLine
          .split(/[\t|]+/)
          .map(t => t.trim())
          .filter(Boolean)
      : cleanLine
          .split(/\s+/)
          .map(t => t.trim())
          .filter(Boolean);

    const values = new Array(columns.length).fill("");

    // 使用 Tab / | 时，一列对应一个值，最可靠
    if (isTabOrPipe || tokens.length <= columns.length) {
      columns.forEach((column, i) => {
        values[i] = tokens[i] || "";
      });
    } else {
      // 纯空格文本下，姓名可能含空格。
      // 将多出来的 token 自动合并进“姓名”列。
      const nameIndex = columns.findIndex(c => c.mode === "name");
      if (nameIndex >= 0) {
        const beforeCount = nameIndex;
        const afterCount = columns.length - nameIndex - 1;

        columns.forEach((column, i) => {
          if (i === nameIndex) {
            values[i] = tokens
              .slice(beforeCount, tokens.length - afterCount)
              .join(" ");
          } else if (i < nameIndex) {
            values[i] = tokens[i] || "";
          } else {
            values[i] =
              tokens[tokens.length - afterCount + (i - nameIndex - 1)] || "";
          }
        });
      } else {
        columns.forEach((column, i) => {
          values[i] = tokens[i] || "";
        });
      }
    }

    let name = "";
    let phone = "";
    let city = "";
    const requestParts = [];

    columns.forEach((column, i) => {
      const rawValue = values[i] || "";
      if (column.mode === "ignore") return;

      if (column.mode === "name") {
        name = rawValue;
      } else if (column.mode === "phone") {
        phone = rawValue;
      } else if (column.mode === "city") {
        city = rawValue;
      } else if (column.mode === "request") {
        const readable = normalizeReadableValue(rawValue);
        if (readable) {
          requestParts.push(`${column.label}: ${readable}`);
        }
      }
    });

    const formattedPhone = formatThaiPhone(phone);

    // 没有额外需求子项时，仍保留原来的产品类别作为需求兜底。
    const finalPayload = requestParts.length
      ? requestParts.join(" | ")
      : currentThaiPayload.value;

    return {
      id: index,
      payload: finalPayload,
      name: name || "未知姓名",
      phone: formattedPhone,
      city: city || "未知城市",
      timeline: "none",
      valid: !!formattedPhone && formattedPhone.replace(/\s/g, "").length >= 9,
    };
  });
};

const submitBatch = async () => {
  if (parsedLeads.value.length === 0) return showToast("没有可导入的有效数据");
  if (activeSales.value.length === 0) return showToast("请至少启用一位销售");

  const allocationQueue = buildAllocationQueue();
  if (allocationQueue.length !== parsedLeads.value.length) {
    return showToast("分配数量计算异常，请重新尝试");
  }

  submitting.value = true;
  try {
    const payloadData = parsedLeads.value.map((lead, index) => {
      const sales = allocationQueue[index];

      return {
        name: lead.name,
        phone: lead.phone,
        city: lead.city,
        payload: lead.payload,
        timeline: lead.timeline,
        remark: "none",
        product_category: importCategoryValue.value,
        customer_source: "operate_allocate",
        assigned_sales_id: sales.value,
        sales_name: sales.text,
        status: "pending",
      };
    });

    await request.post("/api/customers/batch-import", { leads: payloadData });

    const summary = activeSales.value
      .map(
        (sales) =>
          `${sales.text}：${allocationCountMap.value[sales.value] || 0} 条`,
      )
      .join("\n");

    showDialog({
      title: "导入成功",
      message: `已成功录入并轮询分配 ${parsedLeads.value.length} 位客户！\n\n${summary}`,
    }).then(() => {
      rawText.value = "";
      parsedLeads.value = [];
      remainderSalesId.value = "";
    });
  } catch (err) {
    console.error(err);
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

/* ================== 销售轮询分配 ================== */
.allocation-title-row {
  justify-content: space-between;
}

.title-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.allocation-summary {
  font-size: 12px;
  color: #1989fa;
  font-weight: 500;
}

.allocation-tip {
  padding: 10px 12px;
  margin-bottom: 12px;
  background: #f7f8fa;
  border-radius: 8px;
  color: #646566;
  font-size: 12px;
  line-height: 1.6;
}

.sales-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.sales-card {
  padding: 12px;
  border: 1px solid #ebedf0;
  border-radius: 10px;
  background: #fff;
  transition:
    opacity 0.2s ease,
    background 0.2s ease;
}

.sales-card.sales-disabled {
  opacity: 0.52;
  background: #f7f8fa;
}

.sales-main-row,
.remainder-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sales-info {
  display: flex;
  align-items: center;
  min-width: 0;
}

.sales-avatar {
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  margin-right: 10px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ecf5ff;
  color: #1989fa;
  font-weight: 700;
}

.sales-name-wrap {
  min-width: 0;
}

.sales-name {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sales-count {
  margin-top: 3px;
  font-size: 12px;
  color: #969799;
}

.sales-count b {
  color: #1989fa;
}

.remainder-row {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #ebedf0;
}

.remainder-label {
  font-size: 12px;
  color: #646566;
}

.allocation-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.stat-item {
  padding: 10px 6px;
  background: #f7f8fa;
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: #969799;
}

.stat-item strong {
  color: #323233;
  font-size: 16px;
}

.empty-sales {
  padding: 24px 0;
  color: #969799;
  text-align: center;
  font-size: 13px;
}

/* ================== H5 / PC 响应式适配 ================== */
@media (min-width: 768px) {
  .assign-container {
    padding-bottom: 110px;
  }

  .main-content {
    width: min(1180px, calc(100% - 48px));
    margin: 0 auto;
    padding: 24px 0;
  }

  .section-card {
    padding: 20px 24px;
    margin-bottom: 16px;
  }

  .sequence-config {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .paste-area :deep(.van-field__control) {
    min-height: 120px;
  }

  .sales-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .footer-bar {
    left: 50%;
    width: min(1180px, calc(100% - 48px));
    transform: translateX(-50%);
    padding: 18px 0 22px;
  }

  .shadow-btn {
    width: 360px;
    margin-left: auto;
  }
}

@media (min-width: 1100px) {
  .sales-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .preview-table {
    font-size: 14px;
  }
}

/* ================== 动态解析配置 ================== */
.config-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.config-meta-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin: -4px 0 12px 24px;
  font-size: 12px;
  color: #646566;
}
.saved-state {
  color: #07c160;
}
.scheme-bar {
  margin-bottom: 12px;
}
.scheme-label {
  font-size: 12px;
  color: #969799;
}
.scheme-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 6px;
}
.scheme-tag {
  cursor: pointer;
}
.seq-type {
  font-size: 12px;
  color: #969799;
}
.payload-cell {
  min-width: 220px;
  white-space: normal;
  line-height: 1.5;
}
.config-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 18px 16px 16px;
  box-sizing: border-box;
}
.config-popup-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.config-popup-title {
  font-size: 18px;
  font-weight: 700;
}
.config-popup-subtitle {
  margin-top: 4px;
  color: #969799;
  font-size: 12px;
}
.config-editor-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.config-editor-item {
  padding: 12px 0;
  border-bottom: 1px solid #f2f3f5;
}
.config-row-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.config-index {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #eef5ff;
  color: #1989fa;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.config-name-input {
  flex: 1;
  background: #f7f8fa;
  border-radius: 8px;
}
.config-row-bottom {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0 0 32px;
}
.config-type-label {
  font-size: 12px;
  color: #969799;
}
.core-badge {
  margin-left: auto;
  color: #1989fa;
  font-size: 12px;
}
.add-config-btn {
  margin-top: 12px;
}
.scheme-save-box {
  margin-top: 12px;
  padding: 10px;
  background: #f7f8fa;
  border-radius: 10px;
}
.saved-scheme-box {
  margin-top: 10px;
  max-height: 120px;
  overflow-y: auto;
}
.saved-scheme-title {
  font-size: 12px;
  color: #969799;
  margin-bottom: 6px;
}
.saved-scheme-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 2px;
  border-bottom: 1px solid #f2f3f5;
  font-size: 13px;
}
.saved-scheme-row span {
  flex: 1;
}
.config-popup-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding-top: 12px;
}


.config-action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.scheme-loader-popup {
  padding: 18px 16px 20px;
  box-sizing: border-box;
}

.scheme-loader-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}

.scheme-loader-title {
  font-size: 18px;
  font-weight: 700;
  color: #323233;
}

.scheme-loader-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #969799;
}

.scheme-empty {
  padding: 38px 12px;
  text-align: center;
  color: #969799;
  font-size: 13px;
}

.scheme-loader-list {
  max-height: 48vh;
  overflow-y: auto;
}

.scheme-loader-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 2px;
  border-bottom: 1px solid #f2f3f5;
}

.scheme-loader-info {
  flex: 1;
  min-width: 0;
}

.scheme-loader-name {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
}

.scheme-loader-fields {
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.45;
  color: #969799;
  white-space: normal;
  word-break: break-word;
}


.scheme-save-help {
  margin: 4px 0 10px 16px;
  font-size: 11px;
  line-height: 1.5;
  color: #969799;
}

.default-off-tag {
  display: inline-block;
  margin-left: 5px;
  padding: 1px 5px;
  border-radius: 8px;
  background: #f2f3f5;
  color: #969799;
  font-size: 10px;
  font-weight: 400;
}
</style>
