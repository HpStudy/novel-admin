<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getSettings, saveSettings } from '../../api/settings'

const form = reactive({
  siteName: '小说阅读平台',
  contact: '400-888-8888',
  email: 'admin@novel.com',
  version: 'v1.0.0'
})
const loading = ref(false)
const saving = ref(false)

const load = async () => {
  loading.value = true
  try {
    const response = await getSettings()
    Object.assign(form, response.data)
  } catch (error) {
    ElMessage.error(error.message || '系统设置加载失败')
  } finally {
    loading.value = false
  }
}

const save = async () => {
  saving.value = true
  try {
    await saveSettings({ ...form })
    ElMessage.success('设置已保存')
  } catch (error) {
    ElMessage.error(error.message || '设置保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="form-card">
    <div class="page-header">
      <h2>系统设置</h2>
    </div>

    <el-form v-loading="loading" :model="form" label-width="120px">
      <el-form-item label="站点名称">
        <el-input v-model="form.siteName" />
      </el-form-item>
      <el-form-item label="客服电话">
        <el-input v-model="form.contact" />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input v-model="form.email" />
      </el-form-item>
      <el-form-item label="版本号">
        <el-input v-model="form.version" />
      </el-form-item>
      <div class="form-actions">
        <el-button type="primary" :loading="saving" @click="save">保存设置</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
