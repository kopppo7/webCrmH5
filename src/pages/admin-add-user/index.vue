<template>
  <div class="add-user-container"> <van-nav-bar
  :title="t('title.addUSer')"
  :left-text="t('common.back')"
  left-arrow
  @click-left="router.back()"
/>

    <van-form @submit="onSubmit">
      <van-cell-group title="基础信息">
        <van-field
          v-model="form.username"
          :readonly="isView"
          label="登录账号"
          autocomplete="off"
          placeholder="请输入账号"
        />
        <van-field
          v-model="form.password"
          :readonly="isView"
          type="password"
          label="登录密码"
          autocomplete="off"
          placeholder="请输入密码"
        />
        <van-field
          v-model="form.real_name"
          :readonly="isView"
          label="真实姓名"
          placeholder="请输入姓名"
        />
      </van-cell-group>

      <van-cell-group title="详细信息">
        <!-- 岗位选择器 -->
        <van-field
          readonly
          clickable
          label="岗位"
          :disabled="isView"
          v-model="form.positionLabel"
          placeholder="请选择岗位"
          @click="showPositionPicker = true"
        />

        <van-field
          v-model="form.birthday"
          readonly
          :disabled="isView"
          label="出生日期"
          placeholder="点击选择"
          @click="showBirthdayPicker = true"
        />
        <van-field
          v-model="form.hire_date"
          readonly
          :disabled="isView"
          label="入职日期"
          placeholder="点击选择"
          @click="showHirePicker = true"
        />

        <van-field
          v-model="form.personal_phone"
          :readonly="isView"
          label="个人手机"
          autocomplete="off"
          type="tel"
          placeholder="请输入手机号"
        />
        <van-field
          v-model="form.company_phone"
          :readonly="isView"
          label="公司手机"
          autocomplete="off"
          type="tel"
          placeholder="请输入公司配号"
        />
        <van-field
          v-model="form.base_salary"
          :readonly="isView"
          label="基础底薪"
          type="number"
          placeholder="请输入金额"
        />
      </van-cell-group>

      <div style="margin: 30px 16px">
        <van-button round block type="primary" native-type="submit"
          >提交创建</van-button
        >
      </div>
    </van-form>

    <!-- 岗位选择弹出层 -->
    <van-popup v-model:show="showPositionPicker" position="bottom">
      <van-picker
        :columns="positionOptions"
        @confirm="onPositionConfirm"
        @cancel="showPositionPicker = false"
      />
    </van-popup>

    <!-- 日期选择弹出层 -->
    <van-popup v-model:show="showBirthdayPicker" position="bottom">
      <van-date-picker
        v-model="currentDateArr"
        title="选择日期"
        @confirm="onBirthdayConfirm"
        @cancel="showBirthdayPicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showHirePicker" position="bottom">
      <van-date-picker
        v-model="currentDateArr"
        title="选择入职日期"
        @confirm="onHireConfirm"
        @cancel="showHirePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { showToast } from "vant";
import request from "../../utils/request";

const router = useRouter();
const route = useRoute();

const isView = computed(() => route.query.mode === "view");
const isEdit = computed(() => route.query.mode === "edit");
const targetId = route.query.id; // 编辑/查看模式下会有 ID

// 表单数据
const form = ref({
  username: "",
  password: "",
  real_name: "",
  birthday: "",
  personal_phone: "",
  company_phone: "",
  position: "",
  positionLabel: "",
  hire_date: "",
  base_salary: "",
});

// UI 控制
const showPositionPicker = ref(false);
const showBirthdayPicker = ref(false);
const showHirePicker = ref(false);
const currentDateArr = ref(["2026", "01", "01"]);

const positionOptions = ref([]);

onMounted(async () => {
  // 1. 先获取并组装岗位字典
  try {
    const res = await request.get("/api/system/dict?dict_type=position");
    positionOptions.value = res.data.map((item) => ({
      text: item.label,
      value: item.value,
    }));
  } catch (err) {
    showToast("岗位字典加载失败");
  }

  // 2. 获取员工详情并反显数据
  if (targetId) {
    try {
      const res = await request.get(`/api/users/detail?id=${targetId}`);
      // 将后端数据填入表单
      Object.assign(form.value, res.data);
      
      // 🌟 核心修复点：根据 position 的值，去字典里匹配出中文 Label
      if (form.value.position && positionOptions.value.length > 0) {
        const matchedOption = positionOptions.value.find(
          (opt) => opt.value === form.value.position
        );
        if (matchedOption) {
          form.value.positionLabel = matchedOption.text;
        }
      }
    } catch (error) {
      showToast("数据加载失败");
    }
  }
});

// 修改 src/pages/admin-add-user/index.vue 中的 onPositionConfirm
const onPositionConfirm = (event) => {
  console.log("--- 岗位选择器返回数据 ---", event); // 🌟 这一步能让你看到控制台里的真实数据结构

  // 确保能从事件参数中获取到 selectedOptions
  // Vant 4 的 confirm 事件是一个对象，包含 { selectedValues, selectedOptions }
  const options = event.selectedOptions;

  if (options && options.length > 0) {
    const selected = options[0];
    form.value.position = selected.value;
    form.value.positionLabel = selected.text;
    console.log("赋值成功:", form.value.position, form.value.positionLabel);
  } else {
    console.warn("未获取到选中项");
  }

  showPositionPicker.value = false;
};

const onBirthdayConfirm = ({ selectedValues }) => {
  form.value.birthday = selectedValues.join("-");
  showBirthdayPicker.value = false;
};

const onHireConfirm = ({ selectedValues }) => {
  form.value.hire_date = selectedValues.join("-");
  showHirePicker.value = false;
};

// 提交
const onSubmit = async () => {
  try {
    if (isEdit.value) {
      // 编辑模式走修改接口
      await request.post("/api/users/update", { id: targetId, ...form.value });
      showToast("修改成功");
    } else {
      // 默认走新增接口
      await request.post("/api/users/add", form.value);
      showToast("员工创建成功");
    }
    router.back();
  } catch (err) {
    showToast("操作失败");
  }
};
</script>

<style scoped>
.add-user-container {
  min-height: 100vh;
  background-color: #f7f8fa;
  padding-bottom: 50px;
}
</style>
