<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCategories, saveCategory, deleteCategory } from '../../api/category'

const tableData = ref([])
const page = ref(1)
const pageSize = ref(10)
const dialogVisible = ref(false)
const isEdit = ref(false)
const saving = ref(false)
const formRef = ref()
const form = ref({ id: null, name: '', icon: '', sort: 1, status: '启用' })
const deleteDialogVisible = ref(false)
const deleteTarget = ref(null)
const reassignTo = ref(null)
const deleting = ref(false)
const reassignOptions = computed(() =>
  tableData.value.filter((item) => item.id !== deleteTarget.value?.id)
)
const rules = {
  name: [{ required: true, message: '请输入分类名', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}
const pageData = computed(() => tableData.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value))

const load = async () => {
  try {
    const res = await getCategories()
    tableData.value = res.data || []
  } catch (error) {
    ElMessage.error(error.message || '分类数据加载失败')
  }
}

const openCreate = () => {
  isEdit.value = false
  form.value = { id: null, name: '', icon: '', sort: 1, status: '启用' }
  dialogVisible.value = true
}

const openEdit = (row) => {
  isEdit.value = true
  form.value = { ...row }
  dialogVisible.value = true
}

const submit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    await saveCategory(form.value)
    ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
    dialogVisible.value = false
    await load()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const performDelete = async (id, targetId) => {
  deleting.value = true
  try {
    await deleteCategory(id, targetId)
    ElMessage.success('删除成功')
    deleteDialogVisible.value = false
    await load()
  } catch (error) {
    ElMessage.error(error.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确认删除分类“${row.name}”吗？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }

  const bookCount = Number(row.bookCount) || 0
  if (bookCount > 0) {
    if (!reassignOptions.value.length) {
      ElMessage.warning('该分类下还有书籍，请先新增其他分类用于转移')
      return
    }
    deleteTarget.value = row
    reassignTo.value = reassignOptions.value[0].id
    deleteDialogVisible.value = true
    return
  }

  await performDelete(row.id)
}

onMounted(load)
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="left"></div>
      <div class="right">
        <el-button type="primary" @click="openCreate">新增分类</el-button>
      </div>
    </div>

    <el-card>
      <el-table :data="pageData" stripe>
        <el-table-column prop="name" label="分类名" min-width="180" />
        <el-table-column prop="icon" label="图标" min-width="120" />
        <el-table-column prop="sort" label="排序" min-width="100" />
        <el-table-column prop="bookCount" label="书籍数" min-width="100" />
        <el-table-column label="状态" min-width="120">
          <template #default="scope">
            <el-tag :type="scope.row.status === '启用' ? 'success' : 'info'">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="160">
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

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑分类' : '新增分类'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="分类名" prop="name"><el-input v-model="form.name" maxlength="30" show-word-limit /></el-form-item>
        <el-form-item label="图标"><el-input v-model="form.icon" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="1" /></el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="启用" value="启用" />
            <el-option label="禁用" value="禁用" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submit">确认</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="deleteDialogVisible" title="转移并删除分类" width="520px">
      <p style="margin: 0 0 12px; line-height: 1.6">
        分类“{{ deleteTarget?.name }}”下还有 {{ deleteTarget?.bookCount }} 本书籍，删除后这些书籍将转移到以下分类：
      </p>
      <el-select v-model="reassignTo" style="width: 100%">
        <el-option v-for="item in reassignOptions" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="deleteDialogVisible = false">取消</el-button>
          <el-button type="danger" :loading="deleting" @click="performDelete(deleteTarget.id, reassignTo)">确认删除</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>
