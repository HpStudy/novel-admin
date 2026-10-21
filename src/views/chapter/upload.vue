<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { uploadChapters } from '../../api/chapter'
import { getBooks } from '../../api/book'

const route = useRoute()
const router = useRouter()
const content = ref('')
const bookId = ref(Number(route.query.bookId) || '')
const bookOptions = ref([])
const isFree = ref(true)
const loading = ref(false)
const loadingBooks = ref(false)

const parseChapterNumber = (value, fallback) => {
  if (/^\d+$/.test(value)) return Number(value)
  const digits = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
  const units = { 十: 10, 百: 100, 千: 1000 }
  let total = 0
  let current = 0

  for (const character of value) {
    if (character in digits) {
      current = digits[character]
    } else if (character in units) {
      total += (current || 1) * units[character]
      current = 0
    } else {
      return fallback
    }
  }
  return total + current || fallback
}

const chapterList = computed(() => {
  const text = content.value || ''
  const headingPattern = /^第\s*(\d+|[零〇一二两三四五六七八九十百千万]+)\s*章[^\r\n]*$/gm
  const headings = [...text.matchAll(headingPattern)]
  return headings.map((heading, index) => {
    const start = heading.index + heading[0].length
    const end = headings[index + 1]?.index ?? text.length
    const chapterText = text.slice(start, end).trim()
    const numberText = heading[1]
    return {
      number: parseChapterNumber(numberText, index + 1),
      title: heading[0].trim(),
      wordCount: chapterText.replace(/\s/g, '').length,
      content: chapterText
    }
  })
})

const handleConfirm = async () => {
  const list = chapterList.value
  if (!bookId.value) {
    ElMessage.warning('请先选择书籍')
    return
  }

  if (!list.length) {
    ElMessage.warning('未检测到有效章节内容')
    return
  }
  if (loadingBooks.value || !bookOptions.value.length) {
    ElMessage.warning('当前没有可选书籍，请先创建书籍')
    return
  }

  loading.value = true
  try {
    await uploadChapters({ bookId: bookId.value, isFree: isFree.value, chapters: list })
    ElMessage.success(`成功导入 ${list.length} 个章节`)
    router.push('/chapter/list')
  } catch (error) {
    ElMessage.error(error.message || '导入失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  loadingBooks.value = true
  try {
    const res = await getBooks({ page: 1, pageSize: 1000 })
    bookOptions.value = res.data.list.map((book) => ({ label: book.title, value: book.id }))
    if (!bookOptions.value.some((book) => book.value === bookId.value)) {
      bookId.value = bookOptions.value[0]?.value || ''
    }
  } catch (error) {
    ElMessage.error(error.message || '书籍列表加载失败')
  } finally {
    loadingBooks.value = false
  }
})
</script>

<template>
  <div class="form-card">
    <div class="page-header">
      <h2>批量上传章节</h2>
    </div>

    <el-form label-width="110px">
      <el-form-item label="选择书籍">
        <el-select v-model="bookId" :loading="loadingBooks" :disabled="loadingBooks || !bookOptions.length" style="width: 220px">
          <el-option v-for="book in bookOptions" :key="book.value" :label="book.label" :value="book.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="是否免费">
        <el-switch v-model="isFree" />
      </el-form-item>
      <el-form-item label="章节内容">
        <el-input v-model="content" type="textarea" :rows="12" placeholder="粘贴 TXT 文本，内容中包含“第X章”即可自动识别" />
      </el-form-item>
    </el-form>

    <div class="preview-box">
      <h3>预览切分结果</h3>
      <el-table :data="chapterList" stripe>
        <el-table-column prop="number" label="章节序号" width="120" />
        <el-table-column prop="title" label="标题" />
        <el-table-column prop="wordCount" label="字数" width="120" />
      </el-table>
    </div>

    <div class="form-actions">
      <el-button @click="router.push('/chapter/list')">取消</el-button>
      <el-button type="primary" :loading="loading" :disabled="loadingBooks || !bookOptions.length" @click="handleConfirm">确认导入</el-button>
    </div>
  </div>
</template>

<style scoped>
.preview-box {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #ebeef5;
}

.form-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
