<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getChapters, saveChapter, deleteChapter } from '../../api/chapter'
import { getBooks } from '../../api/book'

const router = useRouter()
const bookId = ref(1)
const bookOptions = ref([])
const tableData = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const editVisible = ref(false)
const saving = ref(false)
const editFormRef = ref()
const editForm = ref({ id: null, number: 1, title: '', wordCount: 0, isFree: true })
const editRules = {
  number: [{ required: true, message: '请输入章节序号', trigger: 'blur' }],
  title: [{ required: true, message: '请输入章节标题', trigger: 'blur' }]
}

const fetchData = async () => {
  if (!bookId.value) {
    tableData.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    const res = await getChapters(bookId.value, { page: page.value, pageSize: pageSize.value })
    tableData.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (error) {
    ElMessage.error(error.message || '章节数据加载失败')
  } finally {
    loading.value = false
  }
}

const openEdit = (row) => {
  editForm.value = { ...row }
  editVisible.value = true
}

const submitEdit = async () => {
  try {
    await editFormRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    await saveChapter(editForm.value)
    ElMessage.success('章节已更新')
    editVisible.value = false
    await fetchData()
  } catch (error) {
    ElMessage.error(error.message || '更新失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除章节《${row.title}》吗？`, '删除确认', { type: 'warning' })
    await deleteChapter(row.id)
    ElMessage.success('删除成功')
    await fetchData()
  } catch (error) {
    if (error && error !== 'cancel') ElMessage.error('删除失败')
  }
}

const handleUpload = () => router.push({ path: '/chapter/upload', query: { bookId: bookId.value } })

onMounted(async () => {
  try {
    const res = await getBooks({ page: 1, pageSize: 1000 })
    bookOptions.value = res.data.list.map((book) => ({ label: book.title, value: book.id }))
    if (!bookOptions.value.some((book) => book.value === bookId.value)) {
      bookId.value = bookOptions.value[0]?.value || ''
    }
    await fetchData()
  } catch (error) {
    ElMessage.error(error.message || '书籍列表加载失败')
  }
})
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="left">
        <el-select v-model="bookId" placeholder="请选择书籍" style="width: 220px" @change="page = 1; fetchData()">
          <el-option v-for="book in bookOptions" :key="book.value" :label="book.label" :value="book.value" />
        </el-select>
      </div>
      <div class="right">
        <el-button type="primary" @click="handleUpload">新增章节</el-button>
      </div>
    </div>

    <el-card>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="number" label="章节序号" width="120" />
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="wordCount" label="字数" width="120" />
        <el-table-column label="是否免费" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.isFree ? 'success' : 'warning'">{{ scope.row.isFree ? '免费' : '收费' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publishTime" label="发布时间" width="180" />
        <el-table-column fixed="right" label="操作" width="150">
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
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, prev, pager, next, sizes"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <el-dialog v-model="editVisible" title="编辑章节" width="520px">
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
        <el-form-item label="章节序号" prop="number">
          <el-input-number v-model="editForm.number" :min="1" />
        </el-form-item>
        <el-form-item label="标题" prop="title">
          <el-input v-model="editForm.title" />
        </el-form-item>
        <el-form-item label="字数">
          <el-input-number v-model="editForm.wordCount" :min="0" />
        </el-form-item>
        <el-form-item label="是否免费">
          <el-switch v-model="editForm.isFree" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitEdit">保存</el-button>
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
</style>
