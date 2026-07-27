<template>
  <div class="dict-manager-container">
    
  <van-nav-bar
  :title="t('title.dictManage')"
  :left-text="t('common.back')"
  left-arrow
  @click-left="router.back()"
/>

    <!-- ================================================== -->
    <!-- 视图 1：字典分类大类 (Level 1) -->
    <!-- ================================================== -->
    <div v-show="currentView === 'category'" class="view-panel">
      <div class="header-desc">
        <h3>全局字典目录</h3>
        <p>动态管理系统的所有基础配置数据。</p>
      </div>

      <div class="custom-category-list">
        <van-swipe-cell v-for="cat in dictCategories" :key="cat._id" class="swipe-wrap">
          <div class="category-card" @click="enterCategory(cat)">
            <div class="cat-icon-box">
              <van-icon name="apps-o" size="24" color="#1989fa" />
            </div>
            <div class="cat-info">
              <span class="cat-title">{{ cat.title }}</span>
              <span class="cat-desc">{{ cat.desc || cat.type }}</span>
            </div>
            <van-icon name="arrow" color="#c8c9cc" />
          </div>
          
          <!-- 🌟 新增：大类的左滑编辑与删除操作区 -->
          <template #right>
            <div class="swipe-actions">
              <van-button square type="primary" class="action-btn edit-btn" @click="openCatDialog('edit', cat)">
                <span>编辑</span>
              </van-button>
              <van-button square type="danger" class="action-btn delete-btn" @click="handleDeleteCategory(cat._id)">
                <span>删除</span>
              </van-button>
            </div>
          </template>
        </van-swipe-cell>
      </div>
      
      <van-empty v-if="dictCategories.length === 0" description="暂无字典分类，请点击下方新增" image="search" />

      <!-- 底部悬浮添加分类按钮 -->
      <div class="footer-bar">
        <van-button round block type="primary" plain class="shadow-btn" icon="plus" @click="openCatDialog('add')">
          新增字典大类
        </van-button>
      </div>
    </div>

    <!-- ================================================== -->
    <!-- 视图 2：具体字典项列表 (Level 2) -->
    <!-- ================================================== -->
    <div v-show="currentView === 'items'" class="view-panel">
      <div class="list-header">
        <h3 class="title">{{ activeCategoryTitle }}</h3>
        <span class="subtitle">共 {{ dictList.length }} 项</span>
      </div>

      <div class="custom-item-list">
        <van-swipe-cell v-for="item in dictList" :key="item._id" class="swipe-wrap">
          <div class="modern-card">
            <div class="card-top">
              <div class="title-wrap">
                <span class="main-title">{{ item.label.zh }}</span>
                <van-tag type="primary" plain round size="small" class="sort-tag">排序 {{ item.sort }}</van-tag>
              </div>
              <div class="identifier">
                <span class="id-text">{{ item.value }}</span>
              </div>
            </div>
            
            <div class="card-bottom">
              <div class="lang-row">
                <span class="lang-icon">🇻🇳</span>
                <span class="lang-text" :class="{'empty-text': !item.label.vi}">
                  {{ item.label.vi || '暂无越文翻译' }}
                </span>
              </div>
              <van-icon name="arrow-left" size="12" color="#dcdee0" />
            </div>
          </div>
          
          <template #right>
            <div class="swipe-actions">
              <van-button square type="primary" class="action-btn edit-btn" @click="openItemDialog('edit', item)">
                <span>编辑</span>
              </van-button>
              <van-button square type="danger" class="action-btn delete-btn" @click="handleDeleteItem(item._id)">
                <span>删除</span>
              </van-button>
            </div>
          </template>
        </van-swipe-cell>
      </div>
      
      <van-empty v-if="dictList.length === 0" description="该分类下暂无数据，请点击下方新增" image="search" />

      <div class="footer-bar">
        <van-button round block type="primary" class="shadow-btn" icon="plus" @click="openItemDialog('add')">
          新增 {{ activeCategoryTitle }} 数据
        </van-button>
      </div>
    </div>

    <!-- ================================================== -->
    <!-- 弹窗 1：新增/编辑 字典大类 -->
    <!-- ================================================== -->
    <van-popup v-model:show="showCatDialog" position="bottom" round :style="{ height: '50%' }">
      <div class="popup-header">
        <h3>{{ isCatEdit ? '编辑' : '新增' }} - 字典大类</h3>
      </div>
      <van-form @submit="onCatSubmit">
        <van-cell-group inset>
          <van-field 
            v-model="catForm.type" 
            label="分类标识" 
            placeholder="纯英文 (如 position)" 
            :rules="[{ required: true, message: '必填' }]" 
            :readonly="isCatEdit" 
          />
          <van-field 
            v-model="catForm.title" 
            label="分类名称" 
            placeholder="中文 (如 员工岗位)" 
            :rules="[{ required: true, message: '必填' }]" 
          />
          <van-field 
            v-model="catForm.desc" 
            label="描述" 
            placeholder="选填，描述该字典用途" 
          />
        </van-cell-group>
        <div style="margin: 30px 16px;">
          <van-button round block type="primary" native-type="submit">提交保存</van-button>
        </div>
      </van-form>
    </van-popup>

    <!-- 弹窗 2：新增/编辑 具体字典项 -->
    <van-popup v-model:show="showItemDialog" position="bottom" round :style="{ height: '65%' }">
      <div class="popup-header">
        <h3>{{ isItemEdit ? '编辑' : '新增' }} - {{ activeCategoryTitle }}</h3>
      </div>
      <van-form @submit="onItemSubmit">
        <van-cell-group inset>
          <van-field v-model="itemForm.value" label="字典标识" placeholder="纯英文标识 (如 sales)" :rules="[{ required: true, message: '请输入纯英文标识' }]" :readonly="isItemEdit" />
          <van-field v-model="itemForm.labelZh" label="中文名称" placeholder="请输入中文" :rules="[{ required: true, message: '请输入中文名称' }]" />
          <van-field v-model="itemForm.labelVi" label="越南文名称" placeholder="请输入越南语" :rules="[{ required: true, message: '请输入越南文名称' }]" />
          <van-field v-model="itemForm.sort" type="digit" label="显示排序" placeholder="数字越小越靠前" />
        </van-cell-group>
        <div style="margin: 30px 16px;">
          <van-button round block type="primary" native-type="submit">保存提交</van-button>
        </div>
      </van-form>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { showToast, showConfirmDialog } from 'vant';
import request from '../../utils/request';

const router = useRouter();

// ================== 状态管理 ==================
const currentView = ref('category'); 
const dictCategories = ref([]); 
const dictList = ref([]); 

const activeCategoryType = ref('');
const activeCategoryTitle = ref('');

const navTitle = computed(() => {
  return currentView.value === 'category' ? '配置中心' : `维护`;
});

// 大类表单状态
const showCatDialog = ref(false);
const isCatEdit = ref(false);
const currentCatId = ref('');
const catForm = ref({ type: '', title: '', desc: '' });

// 字典项表单状态
const showItemDialog = ref(false);
const isItemEdit = ref(false);
const currentItemId = ref('');
const itemForm = ref({ value: '', labelZh: '', labelVi: '', sort: 10 });

// ================== 初始化 ==================
onMounted(() => {
  fetchCategories();
});

// ================== 大类逻辑 (Level 1) ==================
const fetchCategories = async () => {
  try {
    const res = await request.get('/api/system/dict-category/all');
    dictCategories.value = res.data || [];
  } catch (err) {
    showToast('分类加载失败');
  }
};

// 打开新增/编辑大类弹窗
const openCatDialog = (actionType, cat = null) => {
  isCatEdit.value = actionType === 'edit';
  if (actionType === 'edit') {
    currentCatId.value = cat._id;
    catForm.value = {
      type: cat.type,
      title: cat.title,
      desc: cat.desc || ''
    };
  } else {
    currentCatId.value = '';
    catForm.value = { type: '', title: '', desc: '' };
  }
  showCatDialog.value = true;
};

// 提交大类
const onCatSubmit = async () => {
  try {
    if (isCatEdit.value) {
      await request.post('/api/system/dict-category/update', { id: currentCatId.value, ...catForm.value });
      showToast('分类修改成功');
    } else {
      await request.post('/api/system/dict-category/add', catForm.value);
      showToast('分类新增成功');
    }
    showCatDialog.value = false;
    fetchCategories();
  } catch (err) {
    showToast('分类保存失败');
  }
};

const handleDeleteCategory = (id) => {
  showConfirmDialog({ title: '危险操作', message: '确认删除该分类吗？相关数据可能会失效。' }).then(async () => {
    try {
      await request.post('/api/system/dict-category/delete', { id });
      showToast('删除成功');
      fetchCategories();
    } catch (err) { showToast('删除失败'); }
  }).catch(() => {});
};

// ================== 字典项逻辑 (Level 2) ==================
const enterCategory = (cat) => {
  activeCategoryType.value = cat.type;
  activeCategoryTitle.value = cat.title;
  currentView.value = 'items';
  fetchItems();
};

const handleBack = () => {
  if (currentView.value === 'items') {
    currentView.value = 'category';
    dictList.value = [];
  } else {
    router.back();
  }
};

const fetchItems = async () => {
  try {
    const res = await request.get(`/api/system/dict/all?dict_type=${activeCategoryType.value}`);
    dictList.value = res.data || [];
  } catch (err) {
    showToast('列表加载失败');
  }
};

const openItemDialog = (actionType, item = null) => {
  isItemEdit.value = actionType === 'edit';
  if (actionType === 'edit') {
    currentItemId.value = item._id;
    itemForm.value = {
      value: item.value,
      labelZh: item.label?.zh || '',
      labelVi: item.label?.vi || '',
      sort: item.sort || 10
    };
  } else {
    currentItemId.value = '';
    itemForm.value = { value: '', labelZh: '', labelVi: '', sort: 10 };
  }
  showItemDialog.value = true;
};

const onItemSubmit = async () => {
  try {
    const submitData = {
      dict_type: activeCategoryType.value,
      value: itemForm.value.value,
      sort: Number(itemForm.value.sort),
      label: { zh: itemForm.value.labelZh, vi: itemForm.value.labelVi }
    };

    if (isItemEdit.value) {
      await request.post('/api/system/dict/update', { id: currentItemId.value, ...submitData });
      showToast('修改成功');
    } else {
      await request.post('/api/system/dict/add', submitData);
      showToast('新增成功');
    }
    showItemDialog.value = false;
    fetchItems();
  } catch (err) {
    showToast('保存失败');
  }
};

const handleDeleteItem = (id) => {
  showConfirmDialog({ title: '危险操作', message: '确认删除该数据吗？' }).then(async () => {
    try {
      await request.post('/api/system/dict/delete', { id });
      showToast('删除成功');
      fetchItems();
    } catch (err) { showToast('删除失败'); }
  }).catch(() => {});
};
</script>

<style scoped>
/* 基础背景与布局 */
.dict-manager-container {
  min-height: 100vh;
  background-color: #f4f6f9;
}
.custom-nav {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.02);
}
.view-panel {
  padding-bottom: 90px; 
  animation: fadeIn 0.3s ease;
}

/* 页面头部文本 */
.header-desc { padding: 20px 20px 10px; }
.header-desc h3 { margin: 0 0 6px; font-size: 22px; color: #1c1c1e; font-weight: 600;}
.header-desc p { margin: 0; font-size: 13px; color: #8e8e93; }

/* ================= Level 1: 分类卡片美化 ================= */
.custom-category-list {
  padding: 0 16px;
  margin-top: 12px;
}
.category-card {
  background: #fff;
  padding: 16px;
  display: flex;
  align-items: center;
}
.cat-icon-box {
  width: 44px;
  height: 44px;
  background: #f0f7ff;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 14px;
}
.cat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.cat-title { font-size: 16px; font-weight: bold; color: #323233; margin-bottom: 4px; }
.cat-desc { font-size: 13px; color: #969799; }

/* ================= Level 2: 字典项卡片美化 ================= */
.list-header {
  padding: 16px 20px 8px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.list-header .title { margin: 0; font-size: 18px; color: #1c1c1e; }
.list-header .subtitle { font-size: 12px; color: #8e8e93; }

.custom-item-list {
  padding: 0 16px;
  margin-top: 8px;
}
.swipe-wrap {
  margin-bottom: 14px;
  border-radius: 12px;
  overflow: hidden; 
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03); 
}

.modern-card {
  padding: 16px;
  background: #fff;
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.main-title {
  font-size: 17px;
  font-weight: 600;
  color: #1c1c1e;
}
.identifier {
  background: #f2f3f5;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: #8e8e93;
  font-family: SFMono-Regular, Consolas, monospace;
}

.card-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8faff;
  padding: 10px 12px;
  border-radius: 8px;
  border-left: 3px solid #1989fa;
}
.lang-row { display: flex; align-items: center; gap: 8px; }
.lang-icon { font-size: 14px; }
.lang-text { font-size: 14px; color: #1989fa; font-weight: 500; }
.empty-text { color: #c8c9cc; font-weight: normal; }

/* ================= 滑动操作按钮美化 ================= */
.swipe-actions {
  height: 100%;
  display: flex;
}
.action-btn {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: none;
  width: 65px;
}
.edit-btn { background-color: #1989fa; }
.delete-btn { background-color: #ff3b30; }
.action-btn span { font-size: 12px; margin-top: 4px; }

/* ================= 其他公用样式 ================= */
.footer-bar {
  position: fixed; bottom: 0; left: 0; width: 100%; padding: 16px 20px;
  background: linear-gradient(180deg, rgba(255,255,255,0) 0%, #fff 30%);
  box-sizing: border-box; z-index: 100;
}
.shadow-btn {
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.2);
}
.popup-header { padding: 16px; text-align: center; border-bottom: 1px solid #f5f6f7; margin-bottom: 16px; }
.popup-header h3 { margin: 0; font-size: 16px; color: #323233; font-weight: bold; }

@keyframes fadeIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
</style>