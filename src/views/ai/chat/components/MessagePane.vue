<template>
  <div class="ai-chat__pane">
    <div ref="bodyRef" class="ai-chat__body" @scroll="onScroll" @click="onCopyCode">
      <div v-if="!hasModel" class="ai-chat__guide">
        <el-empty :description="unavailableMessage || '暂无可用模型，请先在「模型」中添加'">
          <el-button type="primary" @click="$router.push('/ai/models')">去添加我的模型</el-button>
        </el-empty>
      </div>
      <div v-else-if="!currentId || (!visibleMessages.length && !streaming)" class="ai-chat__guide">
        <el-empty description="开始一段新对话，或点下面的示例">
          <div class="ai-chat__hints">
            <el-tag
              v-for="q in hints"
              :key="q"
              effect="plain"
              class="is-clickable"
              @click="$emit('hint', q)"
            >
              {{ q }}
            </el-tag>
          </div>
        </el-empty>
      </div>
      <template v-else>
        <el-button
          v-if="hasMore"
          text
          class="ai-chat__more"
          :loading="loadingMore"
          @click="$emit('loadMore')"
        >
          加载更早的消息
        </el-button>
        <article
          v-for="msg in visibleMessages"
          :key="msg.id"
          class="ai-msg"
          :class="`is-${msg.role.toLowerCase()}`"
        >
          <el-avatar
            v-if="msg.role !== 'USER'"
            class="ai-msg__avatar is-assistant"
            :size="36"
            :src="assistantAvatarSrc(msg)"
          >
            {{ assistantAvatarText(msg) }}
          </el-avatar>
          <div class="ai-msg__main">
            <div class="ai-msg__meta">
              <span>{{ msg.role === 'USER' ? userName : chatModelLabel(msg.modelSnapshot) }}</span>
              <span v-if="formatChatTime(msg.createdAt)" class="ai-msg__time">{{
                formatChatTime(msg.createdAt)
              }}</span>
              <span v-if="msg.status === 'STOPPED'" class="is-muted">已停止</span>
              <span v-else-if="msg.status === 'FAILED'" class="is-danger">{{ failText(msg) }}</span>
              <span v-else-if="msg.status === 'STREAMING'" class="is-muted">
                {{ streaming ? '生成中…' : '已中断' }}
              </span>
              <span v-if="versionsOf(msg).length > 1" class="ai-msg__ver">
                <el-button link size="small" @click="$emit('shiftVersion', msg, -1)"
                  >上一版</el-button
                >
                {{ versionIndex(msg) + 1 }}/{{ versionsOf(msg).length }}
                <el-button link size="small" @click="$emit('shiftVersion', msg, 1)"
                  >下一版</el-button
                >
              </span>
            </div>
            <div v-if="msg.role === 'ASSISTANT'" class="ai-msg__bubble ai-msg__md">
              <details v-if="thinkingOf(msg)" class="ai-msg__think">
                <summary>
                  {{
                    streaming && msg.status === 'STREAMING' && !answerOf(msg)
                      ? '思考中…'
                      : '深度思考'
                  }}
                </summary>
                <pre class="ai-msg__think-body">{{ thinkingOf(msg) }}</pre>
              </details>
              <div v-if="answerOf(msg)" v-html="renderMarkdown(answerOf(msg))" />
            </div>
            <div v-else class="ai-msg__bubble ai-msg__plain">{{ msg.content }}</div>
            <div class="ai-msg__ops">
              <el-button link size="small" @click="$emit('copy', copyTextOf(msg))">复制</el-button>
              <el-button
                v-if="msg.role === 'USER' && !streaming"
                link
                size="small"
                @click="$emit('edit', msg)"
              >
                编辑重发
              </el-button>
              <el-button
                v-if="canRegenerate(msg)"
                link
                size="small"
                :disabled="streaming"
                @click="$emit('regenerate', msg)"
              >
                重新生成
              </el-button>
            </div>
          </div>
          <el-avatar v-if="msg.role === 'USER'" class="ai-msg__avatar" :size="36" :src="userAvatar">
            {{ userAvatarText }}
          </el-avatar>
        </article>
      </template>
    </div>
    <el-button
      class="ai-chat__jump"
      :class="{ 'is-on': showJump }"
      type="primary"
      circle
      title="回到底部"
      aria-label="回到底部"
      :aria-hidden="!showJump"
      :tabindex="showJump ? 0 : -1"
      @click="scrollToBottom(true, true)"
    >
      <el-icon><ArrowDown /></el-icon>
    </el-button>
  </div>
</template>

<script>
import { ArrowDown } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { renderMarkdown, splitThink } from '@/utils/ai-markdown'
import { aiErrorText } from '@/utils/ai-errors'
import { formatChatTime } from '@/utils/datetime'
import { isImageSrc } from '@/utils/icons'
import { chatModelLabel } from '@/utils/ai-model-cascader'

export default {
  name: 'AiChatMessagePane',
  components: { ArrowDown },
  emits: ['hint', 'loadMore', 'copy', 'edit', 'regenerate', 'shiftVersion'],
  props: {
    hasModel: { type: Boolean, required: true },
    unavailableMessage: { type: String, default: '' },
    currentId: { type: String, required: true },
    messages: { type: Array, required: true },
    visibleMessages: { type: Array, required: true },
    streaming: { type: Boolean, required: true },
    hasMore: { type: Boolean, required: true },
    loadingMore: { type: Boolean, required: true },
    hints: { type: Array, required: true },
    assistantIcon: { type: String, default: '' },
  },
  setup() {
    const userStore = useUserStore()
    return { userStore }
  },
  data() {
    return {
      follow: true,
      showJump: false,
      jumping: false,
      jumpTimer: 0,
    }
  },
  computed: {
    userAvatar() {
      return this.userStore.user?.avatar || undefined
    },
    userName() {
      return this.userStore.user?.nickname || this.userStore.user?.username || '我'
    },
    userAvatarText() {
      return this.userName.charAt(0).toUpperCase()
    },
  },
  beforeUnmount() {
    window.clearTimeout(this.jumpTimer)
  },
  methods: {
    formatChatTime,
    chatModelLabel,
    renderMarkdown,
    assistantAvatarSrc(msg) {
      const icon = msg.providerIcon || this.assistantIcon
      return isImageSrc(icon) ? icon || undefined : undefined
    },
    assistantAvatarText(msg) {
      return this.chatModelLabel(msg.modelSnapshot).slice(0, 1)
    },
    thinkingOf(msg) {
      if (msg.thinking) return msg.thinking
      return splitThink(msg.content || '').thinking
    },
    answerOf(msg) {
      if (msg.thinking) return msg.content || ''
      return splitThink(msg.content || '').answer
    },
    copyTextOf(msg) {
      return msg.role === 'ASSISTANT' ? this.answerOf(msg) : msg.content
    },
    versionsOf(msg) {
      if (msg.role !== 'ASSISTANT' || !msg.parentId) return [msg]
      return this.messages.filter((m) => m.role === 'ASSISTANT' && m.parentId === msg.parentId)
    },
    versionIndex(msg) {
      return Math.max(
        0,
        this.versionsOf(msg).findIndex((m) => m.id === msg.id),
      )
    },
    failText(msg) {
      return aiErrorText(msg.errorCode || undefined, '生成失败')
    },
    canRegenerate(msg) {
      if (msg.role !== 'ASSISTANT' || this.streaming) return false
      const vis = this.visibleMessages
      return vis.length > 0 && vis[vis.length - 1].id === msg.id
    },
    nearBottom(el) {
      return el.scrollHeight - el.scrollTop - el.clientHeight <= 80
    },
    onScroll() {
      const el = this.$refs.bodyRef
      if (!el) return
      if (this.jumping) {
        if (this.nearBottom(el)) {
          this.jumping = false
          window.clearTimeout(this.jumpTimer)
          this.follow = true
          this.showJump = false
        }
        return
      }
      if (this.nearBottom(el)) {
        this.follow = true
        this.showJump = false
      } else {
        this.follow = false
        this.showJump = true
      }
    },
    scrollToBottom(force, smooth = false) {
      const el = this.$refs.bodyRef
      if (!el) return
      if (!force && !this.follow) return
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (smooth && !reduceMotion) {
        this.jumping = true
        this.follow = true
        this.showJump = false
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
        window.clearTimeout(this.jumpTimer)
        this.jumpTimer = window.setTimeout(() => {
          this.jumping = false
          const pane = this.$refs.bodyRef
          if (!pane) return
          const atBottom = this.nearBottom(pane)
          this.follow = atBottom
          this.showJump = !atBottom
        }, 700)
        return
      }
      el.scrollTo({ top: el.scrollHeight, behavior: 'auto' })
      this.showJump = false
    },
    stick() {
      this.follow = true
    },
    isFollowing() {
      return this.follow
    },
    async onCopyCode(e) {
      const btn = e.target?.closest?.('.ai-code__copy')
      if (!btn) return
      const code = btn.parentElement?.querySelector('code')?.textContent || ''
      await navigator.clipboard.writeText(code)
      btn.textContent = '已复制'
      window.setTimeout(() => {
        btn.textContent = '复制'
      }, 1200)
    },
  },
}
</script>

<style scoped>
.ai-chat__pane {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.ai-chat__body {
  flex: 1;
  overflow: auto;
  padding: 16px 20px 24px;
}
.ai-chat__guide {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ai-chat__hints {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.ai-chat__more {
  display: block;
  margin: 0 auto 12px;
}
.ai-msg {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 20px;
  max-width: 860px;
}
.ai-msg.is-user {
  margin-left: auto;
  flex-direction: row;
  justify-content: flex-end;
}
.ai-msg.is-assistant {
  margin-right: auto;
}
.ai-msg__avatar {
  flex-shrink: 0;
  margin-top: 2px;
}
.ai-msg__avatar.is-assistant {
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
}
.ai-msg__avatar.is-assistant :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: var(--el-fill-color-light);
}
.ai-msg__time {
  color: var(--el-text-color-placeholder);
  font-variant-numeric: tabular-nums;
}
.ai-msg__main {
  min-width: 0;
  max-width: calc(100% - 46px);
}
.ai-msg.is-user .ai-msg__main {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.ai-msg__meta,
.ai-msg__ops {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.ai-msg.is-user .ai-msg__meta,
.ai-msg.is-user .ai-msg__ops {
  flex-direction: row-reverse;
}
.ai-msg__bubble {
  margin: 6px 0;
  padding: 10px 14px;
  border-radius: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
.ai-msg__plain {
  background: var(--el-color-primary-light-9);
  color: var(--el-text-color-primary);
  border-bottom-right-radius: 4px;
}
.ai-msg__md {
  background: var(--el-fill-color-light);
  border-bottom-left-radius: 4px;
}
.ai-msg__think {
  margin-bottom: 10px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.ai-msg__think summary {
  cursor: pointer;
  user-select: none;
}
.ai-msg__think-body {
  margin: 8px 0 0;
  padding: 8px 10px;
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--el-fill-color);
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.6;
}
.ai-msg__md :deep(pre) {
  overflow: auto;
  padding: 10px;
  background: var(--el-fill-color);
  border-radius: 6px;
}
.ai-msg__md :deep(table) {
  border-collapse: collapse;
  width: 100%;
}
.ai-msg__md :deep(th),
.ai-msg__md :deep(td) {
  border: 1px solid var(--el-border-color-lighter);
  padding: 4px 8px;
}
.ai-msg__md :deep(.ai-code) {
  position: relative;
}
.ai-msg__md :deep(.ai-code__copy) {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  border: 0;
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
  background: var(--el-bg-color);
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.ai-msg__md :deep(.ai-kw) {
  color: #7c5cbf;
}
.ai-msg__md :deep(.ai-str) {
  color: #0a8f5a;
}
.ai-msg__md :deep(.ai-cm) {
  color: var(--el-text-color-secondary);
}
.ai-chat__jump {
  position: absolute;
  bottom: -8px;
  left: 50%;
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%) translateY(8px) scale(0.86);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
  transition:
    opacity 0.28s ease,
    transform 0.28s ease;
}
.ai-chat__jump.is-on {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0) scale(1);
}
@media (prefers-reduced-motion: reduce) {
  .ai-chat__jump {
    transition: none;
  }
}
.is-clickable {
  cursor: pointer;
}
.is-muted {
  color: var(--el-text-color-secondary);
}
.is-danger {
  color: var(--el-color-danger);
}
</style>
