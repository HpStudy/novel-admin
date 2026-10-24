import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAiStats } from '../api/ai.js'

const normalizeCount = (value) => {
  const count = Number(value)
  return Number.isFinite(count) ? Math.max(0, count) : 0
}

export const useAiStatsStore = defineStore('aiStats', () => {
  const pendingTransferCount = ref(0)
  const stats = ref({})
  const loading = ref(false)

  const apply = (data = {}) => {
    stats.value = { ...data }
    pendingTransferCount.value = normalizeCount(
      data.pendingTransferCount ?? data.pendingTransfer ?? 0
    )
  }

  const refresh = async () => {
    loading.value = true
    try {
      const response = await getAiStats()
      const data = response.data || {}
      apply(data)
      return data
    } finally {
      loading.value = false
    }
  }

  const setPendingCount = (value) => {
    pendingTransferCount.value = normalizeCount(value)
  }

  return { pendingTransferCount, stats, loading, apply, refresh, setPendingCount }
})
