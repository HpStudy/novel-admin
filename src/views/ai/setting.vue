<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getAiSettings, testAi, updateAiSettings } from '../../api/ai.js'

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'doubao', label: '火山方舟（豆包）' },
  { value: 'zhipu', label: '智谱 GLM' }
]

const activeTab = ref('model')
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const testQuestion = ref('')
const testTopK = ref(5)
const testResult = ref(null)

const form = reactive({
  llmProvider: 'openai',
  llmModel: '',
  llmApiKey: '',
  llmApiKeyMasked: '',
  embeddingModel: '',
  embeddingDimensions: 1536,
  systemPrompt: '',
  welcomeMessage: '',
  topK: 5,
  similarityThreshold: 0.5,
  enableCitation: true,
  noHitFallback: '',
  allowUserTransfer: true,
  rateLimitPerMinute: 10,
  sseTimeoutSec: 60
})

const applySettings = (data = {}) => {
  Object.assign(form, data)
  form.llmApiKey = ''
  form.llmApiKeyMasked = data.llmApiKeyMasked || ''
  testTopK.value = Number(data.topK) || 5
}

const load = async () => {
  loading.value = true
  try {
    const response = await getAiSettings()
    applySettings(response.data)
  } catch (error) {
    ElMessage.error(error.message || 'AI 配置加载失败')
  } finally {
    loading.value = false
  }
}

const validate = () => {
  const topK = Number(form.topK)
  if (!Number.isInteger(topK) || topK < 1 || topK > 10) return 'topK 必须为 1-10 的整数'
  const threshold = Number(form.similarityThreshold)
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) return '相似度阈值必须在 0 到 1 之间'
  for (const [key, label] of [
    ['rateLimitPerMinute', '限流条数/分钟'],
    ['sseTimeoutSec', 'SSE 超时秒数'],
    ['embeddingDimensions', 'Embedding 维度']
  ]) {
    const value = Number(form[key])
    if (!Number.isInteger(value) || value < 1 || value > 10000) return `${label} 必须为正整数`
  }
  if (!String(form.llmModel || '').trim()) return '请输入对话模型名'
  if (!String(form.embeddingModel || '').trim()) return '请输入 Embedding 模型名'

  const apiKey = form.llmApiKey.trim()
  if (apiKey) {
    if (form.llmProvider === 'openai' && !/^sk-.+/i.test(apiKey)) {
      return 'OpenAI API Key 通常以 sk- 开头，请检查后重试'
    }
    if (form.llmProvider === 'zhipu' && !apiKey.includes('.')) {
      return '智谱 API Key 格式通常为 id.secret，请检查后重试'
    }
  }
  return ''
}

const save = async () => {
  const message = validate()
  if (message) {
    ElMessage.warning(message)
    return
  }
  saving.value = true
  try {
    const payload = {
      llmProvider: form.llmProvider,
      llmModel: form.llmModel.trim(),
      embeddingModel: form.embeddingModel.trim(),
      embeddingDimensions: Number(form.embeddingDimensions),
      systemPrompt: form.systemPrompt,
      welcomeMessage: form.welcomeMessage,
      topK: Number(form.topK),
      similarityThreshold: Number(form.similarityThreshold),
      enableCitation: form.enableCitation,
      noHitFallback: form.noHitFallback,
      allowUserTransfer: form.allowUserTransfer,
      rateLimitPerMinute: Number(form.rateLimitPerMinute),
      sseTimeoutSec: Number(form.sseTimeoutSec)
    }
    if (form.llmApiKey.trim()) {
      payload.llmApiKey = form.llmApiKey.trim()
    }
    const response = await updateAiSettings(payload)
    applySettings(response.data)
    ElMessage.success('AI 配置已保存并生效')
  } catch (error) {
    ElMessage.error(error.message || 'AI 配置保存失败')
  } finally {
    saving.value = false
  }
}

const runTest = async () => {
  const question = testQuestion.value.trim()
  if (!question) {
    ElMessage.warning('请输入测试问题')
    return
  }
  const topK = Number(testTopK.value)
  if (!Number.isInteger(topK) || topK < 1 || topK > 50) {
    ElMessage.warning('测试 topK 必须为 1-50 的整数')
    return
  }
  testing.value = true
  try {
    const response = await testAi(question, topK)
    testResult.value = response.data || {}
  } catch (error) {
    ElMessage.error(error.message || 'AI 测试失败')
  } finally {
    testing.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="ai-setting-page">
    <div class="page-header">
      <h2>AI 设置</h2>
      <div class="header-actions">
        <el-button :loading="loading" @click="load">重新加载</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存配置</el-button>
      </div>
    </div>

    <el-card v-loading="loading" shadow="never" class="setting-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="模型配置" name="model">
          <el-form :model="form" label-width="140px" class="setting-form">
            <el-form-item label="模型供应商">
              <el-select v-model="form.llmProvider" class="provider-select">
                <el-option
                  v-for="provider in PROVIDERS"
                  :key="provider.value"
                  :label="provider.label"
                  :value="provider.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="对话模型名">
              <el-input v-model="form.llmModel" placeholder="例如 gpt-4o-mini / doubao-pro-32k" />
            </el-form-item>
            <el-form-item label="API Key">
              <el-input
                v-model="form.llmApiKey"
                type="password"
                show-password
                autocomplete="new-password"
                :placeholder="form.llmApiKeyMasked ? `已配置 ${form.llmApiKeyMasked}，留空表示不修改` : '请输入 API Key'"
              />
              <div class="form-tip">出于安全考虑仅回显脱敏值，留空保存表示不修改现有 Key</div>
              <div v-if="form.llmApiKeyMasked" class="masked-key">
                当前已配置：{{ form.llmApiKeyMasked }}
              </div>
            </el-form-item>
            <el-form-item label="Embedding 模型">
              <el-input v-model="form.embeddingModel" placeholder="例如 text-embedding-3-small" />
            </el-form-item>
            <el-form-item label="Embedding 维度">
              <el-input-number v-model="form.embeddingDimensions" :min="1" :max="10000" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="对话配置" name="dialog">
          <el-form :model="form" label-width="140px" class="setting-form">
            <el-form-item label="系统提示词">
              <el-input v-model="form.systemPrompt" type="textarea" :rows="6" />
              <div class="form-tip">建议约束：仅依据知识库资料回答，资料不足时引导用户转人工</div>
            </el-form-item>
            <el-form-item label="欢迎语">
              <el-input v-model="form.welcomeMessage" maxlength="500" show-word-limit />
              <div class="form-tip">用户新建会话时展示的第一条消息</div>
            </el-form-item>
            <el-form-item label="topK">
              <el-input-number v-model="form.topK" :min="1" :max="10" />
              <span class="inline-tip">检索时返回的知识切片数量（1-10）</span>
            </el-form-item>
            <el-form-item label="相似度阈值">
              <div class="threshold-box">
                <el-slider v-model="form.similarityThreshold" :min="0" :max="1" :step="0.01" show-input />
              </div>
            </el-form-item>
            <el-form-item label="启用引用">
              <el-switch v-model="form.enableCitation" />
              <span class="inline-tip">AI 回复中展示参考来源</span>
            </el-form-item>
            <el-form-item label="模型异常兜底话术">
              <el-input v-model="form.noHitFallback" type="textarea" :rows="3" />
              <div class="form-tip">
                仅在模型调用失败或没有返回内容时使用；知识库无命中时仍会调用模型回答
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>


        <el-tab-pane label="转人工与限流" name="transfer">
          <el-form :model="form" label-width="140px" class="setting-form">
            <el-form-item label="允许用户转人工">
              <el-switch v-model="form.allowUserTransfer" />
              <span class="inline-tip">关闭后用户端将隐藏转人工入口</span>
            </el-form-item>
            <el-form-item label="限流条数/分钟">
              <el-input-number v-model="form.rateLimitPerMinute" :min="1" :max="10000" />
              <span class="inline-tip">单个用户每分钟最多提问次数</span>
            </el-form-item>
            <el-form-item label="SSE 超时秒数">
              <el-input-number v-model="form.sseTimeoutSec" :min="1" :max="600" />
              <span class="inline-tip">AI 流式响应超时时间</span>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-card shadow="never" class="test-card">
      <div class="section-title">测试预览</div>
      <div class="test-toolbar">
        <el-input
          v-model="testQuestion"
          class="test-question"
          placeholder="输入问题，测试知识库检索与 AI 回答"
          @keyup.enter="runTest"
        />
        <el-input-number v-model="testTopK" :min="1" :max="50" />
        <el-button type="primary" :loading="testing" @click="runTest">开始测试</el-button>
      </div>
      <div class="form-tip">测试不会入库，也不会产生会话记录</div>

      <div v-if="testResult" class="test-result">
        <div class="section-title">AI 回答</div>
        <pre class="test-answer">{{ testResult.answer || '（无回答）' }}</pre>

        <div class="section-title">命中切片（{{ testResult.matches?.length || 0 }}）</div>
        <el-empty
          v-if="!testResult.matches?.length"
          description="未命中任何知识切片，请调整阈值或补充知识库内容"
        />
        <el-table v-else :data="testResult.matches" size="small" stripe>
          <el-table-column prop="title" label="文档" min-width="160" show-overflow-tooltip />
          <el-table-column prop="chunkIndex" label="切片" width="80" />
          <el-table-column label="相似度" width="100">
            <template #default="{ row }">
              {{ `${(Number(row.similarity) * 100).toFixed(1)}%` }}
            </template>
          </el-table-column>
          <el-table-column prop="content" label="内容" min-width="320" show-overflow-tooltip />
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-card {
  margin-bottom: 18px;
}

.setting-form {
  width: 100%;
  padding-top: 8px;
}

.provider-select {
  width: 260px;
}

.threshold-box {
  width: 100%;
}

.form-tip {
  width: 100%;
  margin-top: 6px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}

.masked-key {
  width: 100%;
  margin-top: 4px;
  color: #606266;
  font-size: 12px;
}

.inline-tip {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}

.test-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.test-question {
  flex: 1;
  min-width: 260px;
}

.section-title {
  margin: 16px 0 10px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.test-card > .section-title:first-child {
  margin-top: 0;
}

.test-answer {
  margin: 0;
  padding: 14px 16px;
  border-radius: 10px;
  background: #f5f7fa;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.8;
  color: #303133;
}

.test-result {
  margin-top: 18px;
}
</style>

