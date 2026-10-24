<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createKnowledge,
  deleteKnowledge,
  getChunks,
  getKnowledge,
  parseKnowledge,
  updateKnowledge,
  uploadKnowledgeFile
} from '../../../api/ai.js'

const ALLOWED_EXTENSIONS = ['txt', 'md', 'pdf', 'docx']
const MAX_FILE_SIZE = 10 * 1024 * 1024
const SOURCE_LABELS = { 1: '手工录入', 2: '文件上传', 3: '网页抓取' }

const loading = ref(false)
const docs = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const busyIds = ref(new Set())

const dialogVisible = ref(false)
const dialogMode = ref('create')
const dialogSaving = ref(false)
const uploadLoading = ref(false)
const formRef = ref()
const defaultForm = () => ({
  id: null,
  title: '',
  sourceType: 1,
  content: '',
  fileUrl: '',
  url: '',
  fileName: ''
})
const form = reactive(defaultForm())

const chunksDrawerVisible = ref(false)
const chunksLoading = ref(false)
const chunks = ref([])
const chunksDoc = ref(null)

let statusTimer

const asStatus = (value) => {
  const status = Number(value)
  return Number.isInteger(status) ? status : -1
}
const sourceLabel = (value) => SOURCE_LABELS[Number(value)] || '未知'
const formatTime = (value) => (value ? new Date(value).toLocaleString() : '-')
const hasParsing = computed(() => docs.value.some((doc) => asStatus(doc.status) === 1))

const stopStatusPolling = () => {
  if (statusTimer) {
    window.clearInterval(statusTimer)
    statusTimer = undefined
  }
}

const startStatusPolling = () => {
  if (statusTimer) return
  statusTimer = window.setInterval(() => {
    if (!hasParsing.value) {
      stopStatusPolling()
      return
    }
    loadDocs(true)
  }, 5000)
}

const loadDocs = async (silent = false) => {
  if (!silent) loading.value = true
  try {
    const response = await getKnowledge({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined
    })
    docs.value = response.data?.list || []
    total.value = Number(response.data?.total) || 0
    if (hasParsing.value) {
      startStatusPolling()
    } else {
      stopStatusPolling()
    }
  } catch (error) {
    if (!silent) ElMessage.error(error.message || '知识库列表加载失败')
  } finally {
    if (!silent) loading.value = false
  }
}

const search = () => {
  page.value = 1
  loadDocs()
}

const reset = () => {
  keyword.value = ''
  page.value = 1
  loadDocs()
}

const resetForm = () => {
  Object.assign(form, defaultForm())
  formRef.value?.clearValidate()
}

const openCreate = () => {
  resetForm()
  dialogMode.value = 'create'
  dialogVisible.value = true
}

const openEdit = (row) => {
  resetForm()
  dialogMode.value = 'edit'
  const sourceType = Number(row.sourceType) || 1
  Object.assign(form, {
    id: row.id,
    title: row.title || '',
    sourceType,
    content: row.content || '',
    fileUrl: row.fileUrl || '',
    url: sourceType === 3 ? row.fileUrl || '' : '',
    fileName: row.fileUrl ? decodeURIComponent(row.fileUrl.split('/').pop() || '') : ''
  })
  dialogVisible.value = true
}

const beforeUpload = (file) => {
  const extension = String(file.name || '').split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    ElMessage.error('仅支持 TXT、MD、PDF、DOCX 文件')
    return false
  }
  if (file.size > MAX_FILE_SIZE) {
    ElMessage.error('文件大小不能超过 10MB')
    return false
  }
  return true
}

const handleUploadRequest = async ({ file, onSuccess, onError }) => {
  uploadLoading.value = true
  try {
    const fileUrl = await uploadKnowledgeFile(file)
    form.fileUrl = fileUrl
    form.fileName = file.name
    onSuccess({ fileUrl })
    ElMessage.success('文件上传成功')
  } catch (error) {
    onError(error)
    ElMessage.error(error.message || '文件上传失败')
  } finally {
    uploadLoading.value = false
  }
}

const handleParse = async (row) => {
  busyIds.value.add(row.id)
  try {
    await parseKnowledge(row.id)
    row.status = 1
    row.failReason = ''
    ElMessage.success(row.chunkCount ? '已提交重新解析' : '已开始解析文档')
    startStatusPolling()
  } catch (error) {
    ElMessage.error(error.message || '触发解析失败')
  } finally {
    busyIds.value.delete(row.id)
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `删除「${row.title}」后将同步删除向量与切片，不可恢复，确认删除？`,
      '删除知识库文档',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await deleteKnowledge(row.id)
    ElMessage.success('文档已删除')
    if (docs.value.length === 1 && page.value > 1) page.value -= 1
    await loadDocs()
  } catch (error) {
    ElMessage.error(error.message || '删除失败')
  }
}

const openChunks = async (row) => {
  chunksDoc.value = row
  chunks.value = []
  chunksDrawerVisible.value = true
  chunksLoading.value = true
  try {
    const response = await getChunks(row.id)
    chunks.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    ElMessage.error(error.message || '切片加载失败')
  } finally {
    chunksLoading.value = false
  }
}

const validateForm = () => {
  if (!form.title.trim()) return '请输入文档标题'
  if (form.sourceType === 1 && !form.content.trim()) return '请输入文档正文'
  if (form.sourceType === 2 && !form.fileUrl) return '请先上传知识库文件'
  if (form.sourceType === 3) {
    const url = form.url.trim()
    if (!url) return '请输入网页 URL'
    if (!/^https:\/\//i.test(url)) return '网页抓取仅支持 HTTPS 地址'
  }
  return ''
}

const submit = async () => {
  const message = validateForm()
  if (message) {
    ElMessage.warning(message)
    return
  }
  dialogSaving.value = true
  try {
    const payload = { title: form.title.trim(), sourceType: form.sourceType }
    if (form.sourceType === 1) {
      payload.content = form.content.trim()
    } else if (form.sourceType === 2) {
      payload.fileUrl = form.fileUrl
    } else {
      payload.url = form.url.trim()
    }

    let docId = form.id
    if (dialogMode.value === 'create') {
      const response = await createKnowledge(payload)
      docId = response.data?.id
    } else {
      await updateKnowledge(form.id, payload)
    }

    if (docId) {
      try {
        await parseKnowledge(docId)
      } catch {
        ElMessage.warning('文档已保存，但自动解析触发失败，请手动点击「解析」')
      }
    }
    ElMessage.success(dialogMode.value === 'create' ? '文档已创建，正在解析' : '已提交重新解析')
    dialogVisible.value = false
    page.value = 1
    await loadDocs()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    dialogSaving.value = false
  }
}

const parseButtonLabel = (row) => {
  const status = asStatus(row.status)
  if (status === 1) return '解析中'
  if (status === 3) return '重试'
  if (status === 2) return '重新解析'
  return '解析'
}

onMounted(loadDocs)

onBeforeUnmount(stopStatusPolling)
</script>

<template>
  <div class="knowledge-page">
    <div class="page-header">
      <h2>知识库管理</h2>
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon>
        新增文档
      </el-button>
    </div>

    <el-card shadow="never">
      <div class="toolbar">
        <div class="left">
          <el-input
            v-model="keyword"
            class="keyword-input"
            placeholder="按标题搜索"
            clearable
            @keyup.enter="search"
            @clear="search"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" @click="search">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </div>
        <div class="right">
          <el-tag v-if="hasParsing" type="warning" effect="light">
            <el-icon class="is-loading"><Loading /></el-icon>
            解析中，每 5 秒自动刷新
          </el-tag>
          <el-button text :loading="loading" @click="loadDocs()">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="docs" stripe row-key="id">
        <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
        <el-table-column label="来源类型" width="120">
          <template #default="{ row }">
            <el-tag type="info" effect="plain" size="small">{{ sourceLabel(row.sourceType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="切片数" width="100">
          <template #default="{ row }">{{ row.chunkCount ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="130">
          <template #default="{ row }">
            <el-tag v-if="asStatus(row.status) === 1" type="warning" effect="light">
              <el-icon class="is-loading"><Loading /></el-icon>
              解析中
            </el-tag>
            <el-tooltip
              v-else-if="asStatus(row.status) === 3"
              :content="row.failReason || '解析失败，请重试'"
              placement="top"
            >
              <el-tag type="danger" effect="light">失败</el-tag>
            </el-tooltip>
            <el-tag v-else-if="asStatus(row.status) === 2" type="success" effect="light">已入库</el-tag>
            <el-tag v-else type="info" effect="light">待解析</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" min-width="170">
          <template #default="{ row }">{{ formatTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="290">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              :loading="busyIds.has(row.id)"
              :disabled="asStatus(row.status) === 1"
              @click="handleParse(row)"
            >{{ parseButtonLabel(row) }}</el-button>
            <el-button link type="primary" @click="openChunks(row)">查看切片</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无知识库文档" />
        </template>
      </el-table>

      <div class="pagination-box">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          background
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="search"
          @current-change="loadDocs()"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增文档' : '编辑文档'"
      width="640px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" label-width="96px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" maxlength="200" show-word-limit placeholder="请输入文档标题" />
        </el-form-item>
        <el-form-item label="来源类型">
          <el-radio-group v-model="form.sourceType">
            <el-radio :value="1">手工录入</el-radio>
            <el-radio :value="2">文件上传</el-radio>
            <el-radio :value="3">网页抓取</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.sourceType === 1" label="文档正文" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="8"
            placeholder="请输入知识库正文内容"
          />
        </el-form-item>

        <el-form-item v-else-if="form.sourceType === 2" label="知识库文件" required>
          <div class="upload-box">
            <el-upload
              action="#"
              accept=".txt,.md,.pdf,.docx"
              :show-file-list="false"
              :http-request="handleUploadRequest"
              :before-upload="beforeUpload"
            >
              <el-button :loading="uploadLoading">选择文件上传</el-button>
              <template #tip>
                <div class="el-upload__tip">支持 TXT / MD / PDF / DOCX，单个文件不超过 10MB</div>
              </template>
            </el-upload>
            <div v-if="form.fileUrl" class="file-info">
              已上传：{{ form.fileName || form.fileUrl }}
            </div>
          </div>
        </el-form-item>

        <el-form-item v-else label="网页地址" required>
          <el-input v-model="form.url" placeholder="https://example.com/doc" />
          <div class="form-tip">仅支持 HTTPS 地址，抓取内容不超过 10MB</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dialogSaving" :disabled="uploadLoading" @click="submit">
          保存并解析
        </el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="chunksDrawerVisible"
      :title="`切片列表 - ${chunksDoc?.title || ''}`"
      size="560px"
    >
      <div v-loading="chunksLoading" class="chunks-drawer">
        <el-empty v-if="!chunks.length && !chunksLoading" description="暂无切片，请先解析文档" />
        <div v-for="chunk in chunks" :key="chunk.id" class="chunk-item">
          <div class="chunk-head">
            <b>切片 {{ chunk.chunkIndex }}</b>
            <span class="chunk-meta">
              {{ chunk.tokenCount ?? 0 }} tokens ·
              {{ chunk.embedded ? '已生成向量' : '未生成向量' }}
            </span>
          </div>
          <pre class="chunk-content">{{ chunk.content }}</pre>
        </div>
      </div>
    </el-drawer>

  </div>
</template>

<style scoped>
.keyword-input {
  width: 260px;
}

.pagination-box {
  display: flex;
  justify-content: flex-end;
  padding-top: 18px;
}

.upload-box {
  width: 100%;
}

.file-info {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #f5f7fa;
  color: #606266;
  font-size: 13px;
  word-break: break-all;
}

.form-tip {
  width: 100%;
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}

.chunks-drawer {
  min-height: 160px;
}

.chunk-item {
  padding: 14px 0;
  border-bottom: 1px dashed #ebeef5;
}

.chunk-item:last-child {
  border-bottom: none;
}

.chunk-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.chunk-meta {
  color: #909399;
  font-size: 12px;
}

.chunk-content {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f5f7fa;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
}

:deep(.el-tag .el-icon) {
  margin-right: 4px;
  vertical-align: -2px;
}
</style>

