<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { saveBook, getBook, getBookOptions } from '../../api/book'
import { uploadImage } from '../../api/upload'

const route = useRoute()
const router = useRouter()
const form = reactive({
  id: null,
  title: '',
  author: '',
  categoryId: null,
  cover: '',
  intro: '',
  tags: ['热门'],
  status: '连载中',
  vip: false,
  chapterPrice: 2,
  freeChapterCount: 3
})
const options = ref([])
const loading = ref(false)
const uploadingCover = ref(false)
const formRef = ref()
const rules = {
  title: [{ required: true, message: '请输入书名', trigger: 'blur' }],
  author: [{ required: true, message: '请输入作者', trigger: 'blur' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }]
}

const loadOptions = async () => {
  const res = await getBookOptions()
  options.value = res.data || []
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    await saveBook({
      ...form,
      wordCount: Number(form.wordCount) || 0,
      chapterCount: Number(form.chapterCount) || 0
    })
    ElMessage.success(form.id ? '更新成功' : '新增成功')
    router.push('/book/list')
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    loading.value = false
  }
}

const handleCoverBeforeUpload = (file) => {
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return false
  }

  if (file.size > 3 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 3MB')
    return false
  }

  uploadingCover.value = true
  uploadImage(file)
    .then((url) => {
      form.cover = url
      ElMessage.success('封面上传成功')
    })
    .catch((error) => ElMessage.error(error.message || '封面上传失败'))
    .finally(() => {
      uploadingCover.value = false
    })
  return false
}

onMounted(async () => {
  try {
    await loadOptions()
    const id = route.query.id
    if (id) {
      const res = await getBook(id)
      if (!res.data) {
        ElMessage.error('书籍不存在或已被删除')
        router.replace('/book/list')
        return
      }
      Object.assign(form, res.data)
    }
  } catch (error) {
    ElMessage.error(error.message || '书籍信息加载失败')
  }
})
</script>

<template>
  <div class="form-card">
    <div class="page-header">
      <h2>{{ form.id ? '编辑书籍' : '新增书籍' }}</h2>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="110px" label-position="right">
      <el-row :gutter="24">
        <el-col :span="12">
          <el-form-item label="书名" prop="title" required>
            <el-input v-model="form.title" placeholder="请输入书名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="作者" prop="author" required>
            <el-input v-model="form.author" placeholder="请输入作者" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="分类" prop="categoryId">
            <el-select v-model="form.categoryId" placeholder="请选择分类" style="width: 100%">
              <el-option v-for="item in options" :key="item.id" :label="item.label" :value="item.id" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="连载状态">
            <el-radio-group v-model="form.status">
              <el-radio value="连载中">连载中</el-radio>
              <el-radio value="已完结">已完结</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="封面上传">
            <el-upload
              class="avatar-uploader"
              :show-file-list="false"
              :disabled="uploadingCover"
              :before-upload="handleCoverBeforeUpload"
            >
              <el-icon v-if="uploadingCover" class="is-loading upload-trigger"><Loading /></el-icon>
              <img v-else-if="form.cover" :src="form.cover" class="upload-preview" />
              <el-icon v-else class="upload-trigger"><Plus /></el-icon>
            </el-upload>
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="简介">
            <el-input v-model="form.intro" type="textarea" :rows="4" placeholder="请输入简介" />
          </el-form-item>
        </el-col>

        <el-col :span="24">
          <el-form-item label="标签">
            <el-select v-model="form.tags" multiple filterable allow-create default-first-option style="width: 100%">
              <el-option label="热门" value="热门" />
              <el-option label="新书" value="新书" />
              <el-option label="热血" value="热血" />
              <el-option label="修仙" value="修仙" />
            </el-select>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="是否VIP书籍">
            <el-switch v-model="form.vip" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="每章价格">
            <el-input-number v-model="form.chapterPrice" :min="0" :step="1" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="免费章节数">
            <el-input-number v-model="form.freeChapterCount" :min="0" :step="1" />
          </el-form-item>
        </el-col>
      </el-row>

      <div class="form-actions">
        <el-button @click="router.push('/book/list')">取消</el-button>
        <el-button type="primary" :loading="loading" :disabled="uploadingCover" @click="handleSubmit">保存</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.avatar-uploader {
  width: 120px;
  height: 120px;
  border: 1px dashed #d9d9d9;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.upload-trigger {
  font-size: 28px;
  color: #8c939d;
}
</style>
