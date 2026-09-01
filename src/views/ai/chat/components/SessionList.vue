<template>
  <aside class="ai-chat__sessions" :class="{ 'is-collapsed': collapsed }">
    <button
      v-if="collapsed"
      type="button"
      class="ai-chat__sessions-expand"
      title="展开历史对话"
      @click="$emit('toggle')"
    >
      <el-icon :size="16"><DArrowRight /></el-icon>
      <span>历史</span>
    </button>
    <template v-else>
      <div class="ai-chat__sessions-head">
        <span>历史对话</span>
        <div class="ai-chat__sessions-actions">
          <el-button type="primary" size="small" :disabled="!hasModel" @click="$emit('create')">
            新对话
          </el-button>
          <el-button text circle size="small" title="收起历史对话" @click="$emit('toggle')">
            <el-icon><DArrowLeft /></el-icon>
          </el-button>
        </div>
      </div>
      <el-empty v-if="!conversations.length" description="还没有会话" :image-size="64" />
      <div v-else class="ai-chat__session-list">
        <div v-for="group in groupedSessions" :key="group.label">
          <div v-if="group.items.length" class="ai-chat__group">{{ group.label }}</div>
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            class="ai-chat__session"
            :class="{ 'is-active': item.id === currentId }"
            :title="item.title || '新对话'"
            @click="$emit('open', item.id)"
          >
            <span class="ai-chat__session-main">
              <span class="ai-chat__session-title"
                >{{ item.pinned ? '📌 ' : '' }}{{ item.title || '新对话' }}</span
              >
              <span v-if="sessionTime(item)" class="ai-chat__session-time">{{
                sessionTime(item)
              }}</span>
            </span>
            <span class="ai-chat__session-del" title="删除" @click.stop="$emit('remove', item)">
              <el-icon><Delete /></el-icon>
            </span>
          </button>
        </div>
        <el-button
          v-if="hasMore"
          text
          class="ai-chat__session-more"
          :loading="loadingMore"
          @click="$emit('loadMore')"
        >
          加载更早的会话
        </el-button>
      </div>
    </template>
  </aside>
</template>

<script>
import { DArrowLeft, DArrowRight, Delete } from '@element-plus/icons-vue'
import { formatChatTime } from '@/utils/datetime'

export default {
  name: 'AiChatSessionList',
  components: { DArrowLeft, DArrowRight, Delete },
  emits: ['create', 'open', 'remove', 'loadMore', 'toggle'],
  props: {
    conversations: { type: Array, required: true },
    currentId: { type: String, required: true },
    hasModel: { type: Boolean, required: true },
    hasMore: { type: Boolean, default: false },
    loadingMore: { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
  },
  computed: {
    groupedSessions() {
      const now = Date.now()
      const pinned = []
      const groups = [
        { label: '置顶', items: pinned },
        { label: '今天', items: [] },
        { label: '7 天内', items: [] },
        { label: '更早', items: [] },
      ]
      const sorted = [...this.conversations].sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1
        return this.sessionTs(b) - this.sessionTs(a)
      })
      for (const item of sorted) {
        if (item.pinned) {
          pinned.push(item)
          continue
        }
        const ts = this.sessionTs(item) || now
        const days = (now - ts) / 86400000
        if (days < 1) groups[1].items.push(item)
        else if (days < 7) groups[2].items.push(item)
        else groups[3].items.push(item)
      }
      return groups
    },
  },
  methods: {
    sessionTs(item) {
      const t = item.lastMessageAt || item.createdAt
      if (!t) return 0
      const ts = new Date(t.replace(' ', 'T')).getTime()
      return Number.isNaN(ts) ? 0 : ts
    },
    sessionTime(item) {
      return formatChatTime(item.lastMessageAt || item.createdAt)
    },
  },
}
</script>

<style scoped>
.ai-chat__sessions {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--el-border-color-lighter);
  padding: 10px;
  overflow: auto;
  transition: width 0.2s ease;
}
.ai-chat__sessions.is-collapsed {
  width: 48px;
  padding: 8px 6px;
  overflow: hidden;
}
.ai-chat__sessions-expand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--el-text-color-regular);
  cursor: pointer;
  padding: 8px 0;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.2;
}
.ai-chat__sessions-expand:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}
.ai-chat__sessions-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-weight: 600;
  font-size: 13px;
}
.ai-chat__sessions-head > span {
  white-space: nowrap;
}
.ai-chat__sessions-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.ai-chat__sessions-head :deep(.el-button) {
  flex-shrink: 0;
  padding: 5px 8px;
}
.ai-chat__group {
  margin: 10px 0 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.ai-chat__session {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  border-radius: 6px;
  padding: 8px 8px 8px 10px;
  cursor: pointer;
  color: inherit;
}
.ai-chat__session.is-active,
.ai-chat__session:hover {
  background: var(--el-fill-color-light);
}
.ai-chat__session-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ai-chat__session-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 20px;
}
.ai-chat__session-time {
  color: var(--el-text-color-placeholder);
  font-size: 11px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
}
.ai-chat__session-del {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  color: var(--el-text-color-placeholder);
  opacity: 0.7;
  cursor: pointer;
}
.ai-chat__session:hover .ai-chat__session-del,
.ai-chat__session.is-active .ai-chat__session-del {
  opacity: 1;
}
.ai-chat__session-del:hover {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}
.ai-chat__session-more {
  display: block;
  margin: 8px auto 0;
}
</style>
