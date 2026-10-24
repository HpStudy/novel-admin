<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  closeConversation,
  getChunks,
  getConversation,
  getMessages,
  reply,
  takeOver
} from '../../../api/ai.js'
import { useAiStatsStore } from '../../../store/ai.js'
import { useAuthStore } from '../../../store/auth.js'

const route = useRoute()
const router = useRouter()
const aiStats = useAiStatsStore()
const auth = useAuthStore()

const PAGE_SIZE = 30
const POLL_INTERVAL = 12000

const conversation = ref({})
const messages = ref([])
const loading = ref(false)
const messageLoading = ref(false)
const historyLoading = ref(false)
const sending = ref(false)
const acting = ref('')
const replyContent = ref('')
const loadedPage = ref(1)
const total = ref(0)
const chatRef = ref()
const replyRef = ref()
const citationDrawerVisible = ref(false)
const citationLoading = ref(false)
const activeCitations = ref([])
const citationContents = ref({})
let pollTimer
let pollErrorShown = false

const statusOptions = [
  { value: 0, label: '进行中', type: 'primary' },
  { value: 1, label: '待转人工', type: 'warning' },
  { value: 2, label: '人工已接管', type: 'success' },
  { value: 3, label: '已结束', type: 'info' }
]

const asStatus = (value) => {
  const status = Number(value)
  return Number.isInteger(status) ? status : -1
}

const formatTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

const status = computed(() => asStatus(conversation.value.status))
const statusMeta = computed(
  () => statusOptions.find((option) => option.value === status.value) || { label: '未知', type: 'info' }
)
const canTakeOver = computed(() => status.value === 1)
const isTakenOver = computed(() => status.value === 2)
const isClosed = computed(() => status.value === 3)
const canReply = computed(() => {
  if (!isTakenOver.value) return false
  const agentId = conversation.value.agentId
  const currentId = auth.user?.id
  if (!agentId || !currentId) return true
  return String(agentId) === String(currentId)
})
const userLabel = computed(
  () => conversation.value.user?.nickname || conversation.value.nickname || `用户 ${conversation.value.userId || '-'}`
)
const agentLabel = computed(() => {
  const agentId = conversation.value.agentId
  if (!agentId) return '未接管'
  if (auth.user?.id && String(auth.user.id) === String(agentId)) {
    return auth.user.nickname || auth.user.username || `客服 #${agentId}`
  }
  return `客服 #${agentId}`
})
const sourceLabel = computed(() => {
  const source = conversation.value.source
  return { home: '首页', book: '书籍详情', chapter: '章节页', user: '个人中心' }[source] || source || '-'
})
const hasMoreHistory = computed(() => loadedPage.value > 1)
const timelineItems = computed(() => {
  const items = []
  const push = (label, value) => {
    if (!value) return
    items.push({ label, time: formatTime(value), raw: new Date(value).getTime() || 0 })
  }
  push('创建会话', conversation.value.createdAt)
  if (conversation.value.transferredAt) {
    const by = conversation.value.transferredBy
    const label = by === 'agent' ? '客服接管会话' : by === 'system' ? '系统自动转人工' : '用户申请转人工'
    push(label, conversation.value.transferredAt)
  }
  push('最后消息', conversation.value.lastMessageAt)
  push('会话结束', conversation.value.endedAt)
  return items.sort((a, b) => a.raw - b.raw)
})

const messageKey = (message) =>
  String(message?.id ?? `${message?.role}-${message?.createdAt}-${message?.content?.slice(0, 20)}`)

const compareMessages = (a, b) => {
  const timeA = new Date(a.createdAt).getTime() || 0
  const timeB = new Date(b.createdAt).getTime() || 0
  if (timeA !== timeB) return timeA - timeB
  const idA = Number(a.id)
  const idB = Number(b.id)
  if (Number.isFinite(idA) && Number.isFinite(idB)) return idA - idB
  return String(a.id ?? '').localeCompare(String(b.id ?? ''))
}

const mergeMessages = (list = []) => {
  const map = new Map(messages.value.map((message) => [messageKey(message), message]))
  list.forEach((message) => {
    if (message) map.set(messageKey(message), message)
  })
  messages.value = Array.from(map.values()).sort(compareMessages)
}

const parseMeta = (message) => {
  let meta = message?.meta
  if (typeof meta === 'string') {
    try {
      meta = JSON.parse(meta)
    } catch {
      meta = {}
    }
  }
  return meta && typeof meta === 'object' ? meta : {}
}

const citationsOf = (message) => {
  const citations = parseMeta(message).citations
  return Array.isArray(citations) ? citations : []
}

const agentNameOf = (message) => {
  const meta = parseMeta(message)
  return meta.agentName || meta.agentNickname || (conversation.value.agentId ? agentLabel.value : '')
}

const isNearBottom = () => {
  const container = chatRef.value
  if (!container) return true
  return container.scrollHeight - container.scrollTop - container.clientHeight < 80
}

const scrollToBottom = async () => {
  await nextTick()
  const container = chatRef.value
  if (container) container.scrollTop = container.scrollHeight
}

const handleError = (error, fallback) => {
  if (!localStorage.getItem('admin_token')) return
  ElMessage.error(error?.message || fallback)
}

const loadConversation = async () => {
  const response = await getConversation(route.params.id)
  conversation.value = response.data || {}
}

const loadMessages = async () => {
  messageLoading.value = true
  try {
    const first = await getMessages(route.params.id, { page: 1, pageSize: PAGE_SIZE })
    const firstData = first.data || {}
    total.value = Number(firstData.total) || 0
    const lastPage = Math.max(1, Math.ceil(total.value / PAGE_SIZE))
    let list = firstData.list || []
    if (lastPage > 1) {
      const last = await getMessages(route.params.id, { page: lastPage, pageSize: PAGE_SIZE })
      list = last.data?.list || []
    }
    loadedPage.value = lastPage
    messages.value = [...list].sort(compareMessages)
    await scrollToBottom()
  } catch (error) {
    handleError(error, '会话消息加载失败')
  } finally {
    messageLoading.value = false
  }
}

const fetchLatestMessages = async () => {
  const previousLastPage = Math.max(1, Math.ceil(total.value / PAGE_SIZE))
  const first = await getMessages(route.params.id, { page: 1, pageSize: PAGE_SIZE })
  const firstData = first.data || {}
  const latestTotal = Number(firstData.total) || 0
  const lastPage = Math.max(1, Math.ceil(latestTotal / PAGE_SIZE))
  let list = firstData.list || []
  if (lastPage > 1) {
    const last = await getMessages(route.params.id, { page: lastPage, pageSize: PAGE_SIZE })
    list = last.data?.list || []
    if (lastPage > previousLastPage) {
      const previous = await getMessages(route.params.id, {
        page: previousLastPage,
        pageSize: PAGE_SIZE
      })
      list = [...(previous.data?.list || []), ...list]
    }
  }
  total.value = latestTotal
  const stick = isNearBottom()
  const previousCount = messages.value.length
  mergeMessages(list)
  if (lastPage > loadedPage.value) loadedPage.value = lastPage
  const lastMessage = messages.value[messages.value.length - 1]
  if (messages.value.length > previousCount && (stick || lastMessage?.role === 'agent')) {
    await scrollToBottom()
  }
}

const loadHistory = async () => {
  const container = chatRef.value
  if (!container || historyLoading.value || loadedPage.value <= 1 || container.scrollTop > 40) return
  historyLoading.value = true
  const previousHeight = container.scrollHeight
  const previousTop = container.scrollTop
  try {
    const nextPage = loadedPage.value - 1
    const response = await getMessages(route.params.id, { page: nextPage, pageSize: PAGE_SIZE })
    mergeMessages(response.data?.list || [])
    loadedPage.value = nextPage
    await nextTick()
    const nextContainer = chatRef.value
    if (nextContainer) {
      nextContainer.scrollTop = nextContainer.scrollHeight - previousHeight + previousTop
    }
  } catch (error) {
    handleError(error, '历史消息加载失败')
  } finally {
    historyLoading.value = false
  }
}

const refreshSilently = async () => {
  if (loading.value || messageLoading.value) return
  try {
    const [detail] = await Promise.all([getConversation(route.params.id), fetchLatestMessages()])
    conversation.value = detail.data || conversation.value
    pollErrorShown = false
  } catch (error) {
    if (!pollErrorShown) {
      handleError(error, '会话状态刷新失败')
      pollErrorShown = true
    }
  }
}

const handleTakeOver = async () => {
  try {
    await ElMessageBox.confirm(
      '接管后 AI 将停止回复该会话，由你直接回复用户，确认接管？',
      '接管会话',
      { type: 'warning', confirmButtonText: '确认接管', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  acting.value = 'take-over'
  try {
    await takeOver(route.params.id)
    ElMessage.success('接管成功，现在可以回复用户')
    await Promise.all([loadConversation(), fetchLatestMessages()])
    await scrollToBottom()
    aiStats.refresh().catch(() => {})
    replyRef.value?.focus()
  } catch (error) {
    handleError(error, '接管会话失败')
  } finally {
    acting.value = ''
  }
}

const handleClose = async () => {
  try {
    await ElMessageBox.confirm(
      '结束后该会话将不可继续回复，确认结束？',
      '结束会话',
      { type: 'warning', confirmButtonText: '确认结束', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  acting.value = 'close'
  try {
    await closeConversation(route.params.id)
    ElMessage.success('会话已结束')
    await Promise.all([loadConversation(), fetchLatestMessages()])
    aiStats.refresh().catch(() => {})
  } catch (error) {
    handleError(error, '结束会话失败')
  } finally {
    acting.value = ''
  }
}

const handleSend = async () => {
  if (sending.value || !canReply.value) return
  const content = replyContent.value.trim()
  if (!content) return
  sending.value = true
  try {
    const response = await reply(route.params.id, content)
    replyContent.value = ''
    if (response.data && response.data.id !== undefined) {
      mergeMessages([response.data])
    } else {
      await fetchLatestMessages()
    }
    await scrollToBottom()
    await loadConversation()
  } catch (error) {
    handleError(error, '消息发送失败')
  } finally {
    sending.value = false
  }
}

const handleReplyKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    handleSend()
  }
}

const loadCitationContents = async (citations) => {
  const docIds = Array.from(
    new Set(citations.map((citation) => String(citation.docId)).filter(Boolean))
  )
  if (!docIds.length) return
  citationLoading.value = true
  try {
    await Promise.all(
      docIds.map(async (docId) => {
        try {
          const response = await getChunks(docId)
          const list = Array.isArray(response.data) ? response.data : response.data?.list || []
          const next = { ...citationContents.value }
          list.forEach((chunk) => {
            next[`${docId}-${chunk.chunkIndex}`] = chunk.content
          })
          citationContents.value = next
        } catch {
          // 切片原文加载失败时保留标题等信息，不阻断阅读
        }
      })
    )
  } finally {
    citationLoading.value = false
  }
}

const openCitations = async (message) => {
  const citations = citationsOf(message)
  if (!citations.length) return
  activeCitations.value = citations.map((citation) => ({ ...citation }))
  citationDrawerVisible.value = true
  await loadCitationContents(citations)
}

const citationContent = (citation) => {
  if (citation.content) return citation.content
  return citationContents.value[`${citation.docId}-${citation.chunkIndex}`] || ''
}

const init = async () => {
  window.clearInterval(pollTimer)
  loading.value = true
  try {
    await Promise.all([loadConversation(), loadMessages()])
  } finally {
    loading.value = false
  }
  pollTimer = window.setInterval(refreshSilently, POLL_INTERVAL)
}

onMounted(init)

onBeforeUnmount(() => {
  window.clearInterval(pollTimer)
})
</script>

<template>
  <div v-loading="loading" class="conversation-detail">
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="router.push('/ai/conversations')">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2>会话详情</h2>
        <el-tag :type="statusMeta.type" effect="light">{{ statusMeta.label }}</el-tag>
      </div>
      <div class="header-actions">
        <el-button
          v-if="canTakeOver"
          type="success"
          :loading="acting === 'take-over'"
          @click="handleTakeOver"
        >接管会话</el-button>
        <el-button
          v-if="!isClosed"
          type="danger"
          plain
          :loading="acting === 'close'"
          @click="handleClose"
        >结束会话</el-button>
      </div>
    </div>

    <div class="detail-body">
      <el-card class="info-panel" shadow="never">
        <div class="panel-title">会话信息</div>
        <div class="info-item">
          <span>会话编号</span>
          <b>{{ conversation.sessionNo || `#${conversation.id}` }}</b>
        </div>
        <div class="info-item">
          <span>用户</span>
          <b>{{ userLabel }}</b>
        </div>
        <div v-if="conversation.user?.phone" class="info-item">
          <span>手机号</span>
          <b>{{ conversation.user.phone }}</b>
        </div>
        <div class="info-item">
          <span>来源</span>
          <b>{{ sourceLabel }}</b>
        </div>
        <div class="info-item">
          <span>状态</span>
          <el-tag :type="statusMeta.type" effect="light" size="small">{{ statusMeta.label }}</el-tag>
        </div>
        <div class="info-item">
          <span>接管人</span>
          <b>{{ agentLabel }}</b>
        </div>
        <div class="info-item">
          <span>消息数</span>
          <b>{{ total }}</b>
        </div>

        <div class="panel-title timeline-title">时间线</div>
        <el-timeline v-if="timelineItems.length">
          <el-timeline-item
            v-for="item in timelineItems"
            :key="`${item.label}-${item.time}`"
            :timestamp="item.time"
            placement="top"
          >
            {{ item.label }}
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无时间信息" :image-size="60" />
      </el-card>

      <el-card class="chat-panel" shadow="never" body-style="padding: 0">
        <div class="chat-header">
          <span class="chat-title">{{ userLabel }}</span>
          <span class="chat-sub">{{ conversation.sessionNo || `#${conversation.id}` }}</span>
        </div>

        <div ref="chatRef" v-loading="messageLoading" class="chat-window" @scroll.passive="loadHistory">
          <div v-if="historyLoading" class="history-tip">正在加载更早消息...</div>
          <div v-else-if="hasMoreHistory" class="history-tip">向上滚动加载更早消息</div>

          <el-empty
            v-if="!messages.length && !messageLoading"
            description="暂无消息"
            :image-size="70"
          />

          <template v-for="message in messages" :key="messageKey(message)">
            <div v-if="message.role === 'system'" class="system-line">
              <span>{{ message.content }}</span>
              <span class="system-time">{{ formatTime(message.createdAt) }}</span>
            </div>
            <div
              v-else
              class="message-row"
              :class="[`role-${message.role}`, { 'is-self': message.role === 'user' }]"
            >
              <div class="bubble-wrap">
                <div class="bubble-meta">
                  <template v-if="message.role === 'user'">用户</template>
                  <template v-else-if="message.role === 'assistant'">AI 客服</template>
                  <template v-else>
                    客服<template v-if="agentNameOf(message)"> · {{ agentNameOf(message) }}</template>
                  </template>
                </div>
                <div class="bubble">{{ message.content }}</div>
                <div
                  v-if="message.role === 'assistant' && citationsOf(message).length"
                  class="citation-list"
                >
                  <span class="citation-label">参考来源：</span>
                  <el-button
                    v-for="(citation, index) in citationsOf(message)"
                    :key="index"
                    link
                    type="primary"
                    size="small"
                    @click="openCitations(message)"
                  >
                    [{{ index + 1 }}] {{ citation.title || `文档 ${citation.docId}` }}
                  </el-button>
                </div>
                <div class="bubble-time">{{ formatTime(message.createdAt) }}</div>
              </div>
            </div>
          </template>
        </div>


        <div class="reply-box">
          <template v-if="isClosed">
            <el-alert type="info" :closable="false" title="会话已结束，无法继续回复" />
          </template>
          <template v-else-if="canTakeOver">
            <div class="takeover-box">
              <div class="takeover-tip">该会话正在等待人工客服，接管后可回复用户</div>
              <el-button
                type="success"
                :loading="acting === 'take-over'"
                @click="handleTakeOver"
              >接管会话</el-button>
            </div>
          </template>
          <template v-else-if="isTakenOver">
            <template v-if="canReply">
              <el-input
                ref="replyRef"
                v-model="replyContent"
                type="textarea"
                :rows="3"
                maxlength="5000"
                show-word-limit
                placeholder="输入回复内容，Enter 发送，Shift+Enter 换行"
                @keydown="handleReplyKeydown"
              />
              <div class="reply-actions">
                <span class="reply-tip">正在以「{{ agentLabel }}」身份回复</span>
                <el-button
                  type="primary"
                  :loading="sending"
                  :disabled="!replyContent.trim()"
                  @click="handleSend"
                >发送</el-button>
              </div>
            </template>
            <el-alert
              v-else
              type="warning"
              :closable="false"
              :title="`该会话已由 ${agentLabel} 接管，你无法回复`"
            />
          </template>
          <template v-else>
            <el-alert
              type="info"
              :closable="false"
              title="用户尚未申请转人工，待用户发起转人工后可接管会话"
            />
          </template>
        </div>
      </el-card>
    </div>

    <el-drawer v-model="citationDrawerVisible" title="参考来源" size="440px">
      <div v-loading="citationLoading" class="citation-drawer">
        <el-empty v-if="!activeCitations.length" description="暂无引用" />
        <div v-for="(citation, index) in activeCitations" :key="index" class="citation-item">
          <div class="citation-title">
            [{{ index + 1 }}] {{ citation.title || `文档 ${citation.docId}` }}
          </div>
          <div class="citation-sub">
            文档 ID：{{ citation.docId }} · 切片序号：{{ citation.chunkIndex }}
          </div>
          <pre class="citation-content">{{ citationContent(citation) || '未获取到切片原文' }}</pre>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.conversation-detail {
  min-height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  font-size: 22px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.detail-body {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.info-panel {
  position: sticky;
  top: 0;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
}

.timeline-title {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid #ebeef5;
}

.info-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  font-size: 13px;
  color: #606266;
}

.info-item b {
  font-weight: 500;
  color: #303133;
  text-align: right;
  word-break: break-all;
}

.chat-panel {
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
}

.chat-title {
  font-weight: 600;
}

.chat-sub {
  color: #909399;
  font-size: 12px;
}

.chat-window {
  height: 55vh;
  min-height: 360px;
  overflow-y: auto;
  padding: 18px 20px;
  background: #f7f8fa;
}

.history-tip {
  text-align: center;
  color: #909399;
  font-size: 12px;
  padding-bottom: 12px;
}

.system-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin: 14px 0;
  color: #909399;
  font-size: 12px;
  text-align: center;
}

.system-time {
  color: #c0c4cc;
  font-size: 11px;
}

.message-row {
  display: flex;
  margin-bottom: 16px;
}

.message-row.is-self {
  justify-content: flex-end;
}

.bubble-wrap {
  max-width: 65%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.is-self .bubble-wrap {
  align-items: flex-end;
}

.bubble-meta {
  font-size: 12px;
  color: #909399;
}

.bubble {
  padding: 10px 14px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #ebeef5;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.7;
  font-size: 14px;
  color: #303133;
}

.role-user .bubble {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}

.role-agent .bubble {
  background: #f0f9eb;
  border-color: #e1f3d8;
}

.bubble-time {
  font-size: 11px;
  color: #c0c4cc;
}

.citation-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  font-size: 12px;
}

.citation-label {
  color: #909399;
}

.reply-box {
  border-top: 1px solid #ebeef5;
  padding: 14px 20px 18px;
  background: #fff;
}

.takeover-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.takeover-tip {
  color: #e6a23c;
  font-size: 13px;
}

.reply-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
}

.reply-tip {
  color: #909399;
  font-size: 12px;
}

.citation-drawer {
  min-height: 120px;
}

.citation-item {
  padding: 12px 0;
  border-bottom: 1px dashed #ebeef5;
}

.citation-item:last-child {
  border-bottom: none;
}

.citation-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.citation-sub {
  color: #909399;
  font-size: 12px;
  margin-bottom: 8px;
}

.citation-content {
  margin: 0;
  padding: 10px;
  border-radius: 8px;
  background: #f5f7fa;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
}

@media (max-width: 1100px) {
  .detail-body {
    grid-template-columns: 1fr;
  }

  .info-panel {
    position: static;
  }
}
</style>

