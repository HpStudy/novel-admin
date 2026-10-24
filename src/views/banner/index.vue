<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getBanners, saveBanner, deleteBanner } from '../../api/banner'
import { uploadImage } from '../../api/upload'

const tableData = ref([])
const page = ref(1)
const pageSize = ref(10)
const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const uploadingImage = ref(false)
const formRef = ref()
const form = ref({
  id: null,
  title: '',
  image: '',
  sort: 1,
  status: '已上线',
  href: '',
  startTime: '',
  endTime: ''
})
const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  image: [{ required: true, message: '请上传Banner图片', trigger: 'change' }],
  href: [
    { required: true, message: '请输入跳转链接', trigger: 'blur' },
    { type: 'url', message: '请输入有效的跳转链接', trigger: 'blur' }
  ],
  startTime: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  endTime: [{ required: true, message: '请选择结束时间', trigger: 'change' }]
}
const pageData = computed(() => tableData.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

const load = async () => {
  try {
    const res = await getBanners()
    tableData.value = res.data.list || []
  } catch (error) {
    ElMessage.error(error.message || 'Banner数据加载失败')
  }
}

const openCreate = () => {
  form.value = { id: null, title: '', image: '', sort: 1, status: '已上线', href: '', startTime: '', endTime: '' }
  isEdit.value = false
  dialogVisible.value = true
}

const openEdit = (row) => {
  form.value = { ...row }
  isEdit.value = true
  dialogVisible.value = true
}

const submit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  if (form.value.endTime < form.value.startTime) {
    ElMessage.warning('结束时间不能早于开始时间')
    return
  }

  saving.value = true
  try {
    await saveBanner(form.value)
    ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
    dialogVisible.value = false
    await load()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const handleImageBeforeUpload = (file) => {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return false
  }
  if (file.size > 1024 * 1024) {
    ElMessage.error('图片大小不能超过 1MB')
    return false
  }
  uploadingImage.value = true
  uploadImage(file)
    .then((url) => {
      form.value.image = url
      formRef.value?.clearValidate('image')
      ElMessage.success('Banner图片上传成功')
    })
    .catch((error) => ElMessage.error(error.message || 'Banner图片上传失败'))
    .finally(() => {
      uploadingImage.value = false
    })
  return false
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除Banner“${row.title}”吗？`, '删除确认', { type: 'warning' })
    await deleteBanner(row.id)
    ElMessage.success('删除成功')
    await load()
  } catch (error) {
    if (error && error !== 'cancel') ElMessage.error('删除失败')
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="left"></div>
      <div class="right">
        <el-button type="primary" @click="openCreate">新增Banner</el-button>
      </div>
    </div>

    <el-card>
      <el-table :data="pageData" stripe>
        <el-table-column label="图片预览" width="140">
          <template #default="scope">
            <img :src="scope.row.image" class="banner-image" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="sort" label="排序" min-width="80" />
        <el-table-column label="状态" min-width="120">
          <template #default="scope">
            <el-tag :type="scope.row.status === '已上线' ? 'success' : 'warning'">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="开始时间" min-width="150" />
        <el-table-column prop="endTime" label="结束时间" min-width="150" />
        <el-table-column fixed="right" label="操作" width="180">
          <template #default="scope">
            <el-button type="primary" link @click="openEdit(scope.row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-box">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          background
          :total="tableData.length"
          :page-sizes="[10, 20, 50]"
          layout="total, prev, pager, next, sizes"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑Banner' : '新增Banner'" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="标题" prop="title"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="Banner图片" prop="image">
          <div class="image-upload">
            <img v-if="form.image" :src="form.image" class="banner-image" />
            <el-upload :show-file-list="false" :disabled="uploadingImage" :before-upload="handleImageBeforeUpload">
              <el-button :loading="uploadingImage">{{ form.image ? '更换图片' : '选择图片' }}</el-button>
            </el-upload>
          </div>
        </el-form-item>
        <el-form-item label="跳转链接" prop="href"><el-input v-model="form.href" placeholder="https://example.com" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="1" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="已上线" value="已上线" />
            <el-option label="待上线" value="待上线" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始时间" prop="startTime"><el-date-picker v-model="form.startTime" value-format="YYYY-MM-DD" type="date" style="width: 100%" /></el-form-item>
        <el-form-item label="结束时间" prop="endTime"><el-date-picker v-model="form.endTime" value-format="YYYY-MM-DD" type="date" style="width: 100%" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="uploadingImage" @click="submit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.pagination-box {
  display: flex;
  justify-content: flex-end;
  padding-top: 18px;
}

.image-upload {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}
</style>
