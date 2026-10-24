<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getBooks, getBookOptions, deleteBook } from '../../api/book'

const router = useRouter()
const loading = ref(false)
const keyword = ref('')
const category = ref('全部')
const categories = ref(['全部'])
const tableData = ref([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const fetchData = async () => {
  loading.value = true
  try {
    const res = await getBooks({ keyword: keyword.value, category: category.value, page: currentPage.value, pageSize: pageSize.value })
    if (res.code === 0) {
      tableData.value = res.data.list
      total.value = res.data.total
    }
  } catch (error) {
    ElMessage.error(error.message || '书籍数据加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchData()
}

const handleEdit = (row) => {
  router.push({ path: '/book/edit', query: { id: row.id } })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除《${row.title}》吗？`, '删除确认', { type: 'warning' })
    await deleteBook(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error && error !== 'cancel') ElMessage.error('删除失败')
  }
}

const handleAdd = () => router.push('/book/edit')

onMounted(async () => {
  try {
    const res = await getBookOptions()
    categories.value = ['全部', ...res.data.map((item) => item.value)]
  } catch (error) {
    ElMessage.error(error.message || '分类加载失败')
  }
  fetchData()
})
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="left">
        <el-input v-model="keyword" placeholder="按书名/作者搜索" clearable style="width: 240px" @keyup.enter="handleSearch" />
        <el-select v-model="category" placeholder="分类筛选" style="width: 140px" @change="handleSearch">
          <el-option v-for="item in categories" :key="item" :label="item" :value="item" />
        </el-select>
      </div>
      <div class="right">
        <el-button type="primary" @click="handleAdd">新增书籍</el-button>
      </div>
    </div>

    <el-card>
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column label="封面" width="110">
          <template #default="scope">
            <img :src="scope.row.cover" class="book-cover" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="书名" min-width="180" />
        <el-table-column prop="author" label="作者" min-width="140" />
        <el-table-column prop="category" label="分类" min-width="120" />
        <el-table-column prop="wordCount" label="字数" min-width="110" />
        <el-table-column prop="chapterCount" label="章节数" min-width="110" />
        <el-table-column label="状态" min-width="120">
          <template #default="scope">
            <el-tag :type="scope.row.status === '已完结' ? 'success' : 'primary'">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rating" label="评分" min-width="90" />
        <el-table-column fixed="right" label="操作" width="150">
          <template #default="scope">
            <el-button type="primary" link @click="handleEdit(scope.row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-box">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          background
          layout="total, prev, pager, next, sizes"
          :total="total"
          :page-sizes="[10, 20, 50]"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.pagination-box {
  display: flex;
  justify-content: flex-end;
  padding-top: 18px;
}
</style>
