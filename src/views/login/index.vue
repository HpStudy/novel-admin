<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../../store/auth'
import { login } from '../../api/login'

const router = useRouter()
const auth = useAuthStore()
const form = reactive({ username: 'admin', password: 'admin123' })
const loading = ref(false)
const formRef = ref()
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const submit = async () => {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    const res = await login(form)
    if (res.code === 0) {
      auth.setAuth({
        token: res.data.token,
        user: res.data.user
      })
      ElMessage.success('登录成功')
      router.push('/dashboard')
    } else {
      ElMessage.error(res.message || '登录失败')
    }
  } catch (error) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-title">小说管理后台</div>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" style="width: 100%" :loading="loading" @click="submit">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  height: 100vh;
  background: linear-gradient(135deg, #eef4ff, #f5f7fa);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: min(420px, calc(100vw - 32px));
  background: #fff;
  border-radius: 20px;
  padding: 32px 28px 24px;
  box-shadow: 0 16px 42px rgba(31, 41, 55, 0.12);
}

.login-title {
  text-align: center;
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 22px;
  color: #1f2937;
}
</style>
