<template>
  <div class="ai-chat">
    <SessionList
      :conversations="conversations"
      :current-id="currentId"
      :has-model="hasModel"
      :has-more="sessionHasMore"
      :loading-more="sessionLoadingMore"
      :collapsed="sessionsCollapsed"
      @create="onNew"
      @open="openConversation"
      @remove="onDelete"
      @load-more="loadMoreSessions"
      @toggle="toggleSessions"
    />

    <section class="ai-chat__main">
      <MessagePane
        ref="paneRef"
        :has-model="hasModel"
        :unavailable-message="models.unavailableMessage"
        :current-id="currentId"
        :messages="messages"
        :visible-messages="visibleMessages"
        :streaming="streaming"
        :has-more="hasMore"
        :loading-more="loadingMore"
        :hints="hints"
        :assistant-icon="assistantIcon"
        @hint="useHint"
        @load-more="loadMore"
        @copy="copyText"
        @edit="onEdit"
        @regenerate="onRegenerate"
        @shift-version="shiftVersion"
      />
      <ModelSwitch
        :model-pick="modelPick"
        :models="pickerModels"
        :streaming="streaming"
        :has-model="hasModel"
        :quota-low="quotaLow"
        @update:model-pick="modelPick = $event"
        @change="onModelChange"
      />
      <Composer
        :draft="draft"
        @update:draft="draft = $event"
        :unbound="unbound"
        :trial-exhausted="trialExhausted"
        :exceeded-tip="quota.exceededTip"
        :can-type="canType"
        :can-send="canSend"
        :streaming="streaming"
        :max-chars="settings.maxMessageChars || 32000"
        :placeholder="composerPlaceholder"
        :supports-thinking="supportsThinking"
        :supports-files="supportsFiles"
        :thinking="thinking"
        :files="chatFiles"
        @update:thinking="thinking = $event"
        @update:files="chatFiles = $event"
        @keydown="onKeydown"
        @stop="onStop"
        @send="onSend()"
      />
    </section>
  </div>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  updateConversation,
} from '@/api/ai/conversation'
import { stopChat, streamChat } from '@/api/ai/chat'
import { listModels, testModel } from '@/api/ai/model'
import { getMyQuota } from '@/api/ai/quota'
import { getAiSettings } from '@/api/ai/setting'
import { formatDateTime } from '@/utils/datetime'
import { isImageSrc } from '@/utils/icons'
import { modelVisibleName } from '@/utils/ai-model-cascader'
import SessionList from './components/SessionList.vue'
import ModelSwitch from './components/ModelSwitch.vue'
import MessagePane from './components/MessagePane.vue'
import Composer from './components/Composer.vue'

const hints = ['帮我写一段周报提纲', '解释这段报错是什么意思', '把这段需求拆成开发任务']
const SESSION_PAGE_SIZE = 100
const SESSION_COLLAPSE_KEY = 'ai:chat:sessions-collapsed'

export default {
  name: 'AiChat',
  components: { SessionList, ModelSwitch, MessagePane, Composer },
  data() {
    return {
      hints,
      conversations: [],
      messages: [],
      currentId: '',
      modelPick: '',
      draft: '',
      thinking: false,
      chatFiles: [],
      streaming: false,
      sending: false,
      streamId: '',
      hasMore: false,
      loadingMore: false,
      sessionPage: 1,
      sessionTotal: 0,
      sessionHasMore: false,
      sessionLoadingMore: false,
      sessionsCollapsed: localStorage.getItem(SESSION_COLLAPSE_KEY) === '1',
      versionPick: {},
      abortController: null,
      models: { trial: null, mine: [] },
      quota: {},
      settings: {},
      probeSeq: 0,
      sendSeq: 0,
      openSeq: 0,
    }
  },
  computed: {
    enabledMine() {
      return (this.models.mine || []).filter((m) => m.status === 1)
    },
    usableMine() {
      return this.enabledMine.filter((m) => m.lastCheckOk !== false)
    },
    trialUsable() {
      return !!this.models.trial && this.models.trial.lastCheckOk !== false
    },
    hasModel() {
      return !!this.models.trial || this.enabledMine.length > 0
    },
    hasUsableModel() {
      return this.trialUsable || this.usableMine.length > 0
    },
    pickerModels() {
      return {
        trial: this.models.trial,
        mine: this.enabledMine,
        available: this.models.available,
        unavailableCode: this.models.unavailableCode,
        unavailableMessage: this.models.unavailableMessage,
      }
    },
    quotaLow() {
      return (this.quota.estimatedTurnsLeft ?? 99) < 5
    },
    supportsThinking() {
      if (this.models.trial && this.modelPick === this.models.trial.id) {
        return !!this.models.trial.supportsThinking
      }
      return !!this.enabledMine.find((m) => m.id === this.modelPick)?.supportsThinking
    },
    supportsFiles() {
      if (this.models.trial && this.modelPick === this.models.trial.id) {
        return !!this.models.trial.supportsFiles
      }
      return !!this.enabledMine.find((m) => m.id === this.modelPick)?.supportsFiles
    },
    assistantIcon() {
      const conv = this.conversations.find((c) => c.id === this.currentId)
      const modelId = this.modelPick || conv?.modelId
      if (
        this.models.trial &&
        this.models.trial.id === modelId &&
        isImageSrc(this.models.trial.providerIcon)
      ) {
        return this.models.trial.providerIcon || ''
      }
      const mine = this.enabledMine.find((m) => m.id === modelId)
      if (isImageSrc(mine?.providerIcon)) return mine?.providerIcon || ''
      const picked = this.enabledMine.find((m) => m.id === this.modelPick)
      if (isImageSrc(picked?.providerIcon)) return picked?.providerIcon || ''
      if (this.models.trial && isImageSrc(this.models.trial.providerIcon)) {
        return this.models.trial.providerIcon || ''
      }
      return ''
    },
    trialSelected() {
      return !!this.models.trial && this.modelPick === this.models.trial.id
    },
    trialExhausted() {
      return this.trialSelected && (this.quota.estimatedTurnsLeft ?? 1) <= 0
    },
    unbound() {
      const conv = this.conversations.find((c) => c.id === this.currentId)
      return !!conv && !conv.modelId && !this.modelPick
    },
    canType() {
      return this.hasUsableModel && !!this.modelPick && !this.trialExhausted && !this.unbound
    },
    canSend() {
      return (
        this.canType &&
        (!!this.draft.trim() || (this.supportsFiles && this.chatFiles.length > 0)) &&
        !this.streaming &&
        !this.sending
      )
    },
    composerPlaceholder() {
      if (!this.hasModel) return '请先添加模型'
      if (!this.hasUsableModel) return '当前模型不可用，请改选其他模型'
      if (this.trialExhausted) return '试用额度已用完'
      if (this.supportsFiles) return '输入消息，Enter 发送；可粘贴或上传文件'
      return '输入消息，Enter 发送，Shift+Enter 换行'
    },
    visibleMessages() {
      const hidden = new Set()
      for (const msg of this.messages) {
        if (msg.role !== 'ASSISTANT' || !msg.parentId) continue
        const versions = this.versionsOf(msg)
        const chosen = this.versionPick[msg.parentId] || versions[versions.length - 1]?.id
        for (const v of versions) {
          if (v.id !== chosen) hidden.add(v.id)
        }
      }
      return this.messages.filter((m) => !hidden.has(m.id))
    },
  },
  watch: {
    modelPick() {
      if (!this.supportsThinking) this.thinking = false
      if (!this.supportsFiles) this.chatFiles = []
    },
  },
  async mounted() {
    window.addEventListener('pagehide', this.onPageHide)
    window.addEventListener('beforeunload', this.onPageHide)
    const [convRes, modelRes, quotaRes, settingRes] = await Promise.all([
      listConversations({ page: 1, size: SESSION_PAGE_SIZE }),
      listModels(),
      getMyQuota(),
      getAiSettings(),
    ])
    this.conversations = convRes.data?.records ?? []
    this.sessionTotal = convRes.data?.total ?? this.conversations.length
    this.sessionHasMore = this.conversations.length < this.sessionTotal
    Object.assign(this.models, modelRes.data)
    Object.assign(this.quota, quotaRes.data)
    Object.assign(this.settings, settingRes.data)
    this.modelPick = this.firstUsableId()
    void this.probePickerModels()
  },
  beforeUnmount() {
    window.removeEventListener('pagehide', this.onPageHide)
    window.removeEventListener('beforeunload', this.onPageHide)
    this.probeSeq += 1
    this.flushStop(true)
  },
  methods: {
    toggleSessions() {
      this.sessionsCollapsed = !this.sessionsCollapsed
      localStorage.setItem(SESSION_COLLAPSE_KEY, this.sessionsCollapsed ? '1' : '0')
    },
    async refreshQuota() {
      const res = await getMyQuota()
      Object.assign(this.quota, res.data)
    },
    firstUsableId() {
      if (this.trialUsable && this.models.trial) return this.models.trial.id
      return this.usableMine[0]?.id || ''
    },
    isUsableId(id) {
      if (!id) return false
      if (this.models.trial && this.models.trial.id === id)
        return this.models.trial.lastCheckOk !== false
      const mine = this.enabledMine.find((item) => item.id === id)
      return !!mine && mine.lastCheckOk !== false
    },
    isPickerId(id) {
      if (!id) return false
      if (this.models.trial?.id === id) return true
      return this.enabledMine.some((item) => item.id === id)
    },
    normalizeModelLabel(value) {
      return value
        .replace(/（试用）/g, '')
        .replace(/\s+/g, '')
        .toLowerCase()
    },
    pickedModelLabel() {
      if (this.models.trial && this.modelPick === this.models.trial.id) {
        return modelVisibleName({
          id: this.models.trial.id,
          name: this.models.trial.name,
          modelId: this.models.trial.modelId,
          modelDisplayName: this.models.trial.modelDisplayName || this.models.trial.name,
          trial: true,
        })
      }
      const mine = this.enabledMine.find((item) => item.id === this.modelPick)
      if (!mine) return ''
      return modelVisibleName({
        id: mine.id,
        name: mine.name,
        modelId: mine.modelId,
        modelDisplayName: mine.modelDisplayName,
      })
    },
    pickerIdBySnapshot(snapshot) {
      if (!snapshot) return ''
      const snap = this.normalizeModelLabel(snapshot)
      if (!snap) return ''
      const candidates = [...(this.models.trial ? [this.models.trial] : []), ...this.enabledMine]
      const hit = candidates.find((item) => {
        const display = 'modelDisplayName' in item ? item.modelDisplayName : item.name
        const labels = [item.name, item.modelId, display]
        if (item.providerName) {
          labels.push(
            `${item.providerName} / ${display}`,
            `${item.providerName} / ${item.modelId}`,
            `${item.providerName} / ${item.name}`,
          )
        }
        return labels.some((label) => {
          if (!label) return false
          const normalized = this.normalizeModelLabel(label)
          return snap === normalized || snap.endsWith(`/${normalized}`)
        })
      })
      return hit?.id || ''
    },
    lastUsedModelId(fallback) {
      for (let i = this.messages.length - 1; i >= 0; i--) {
        const msg = this.messages[i]
        if (msg.role !== 'ASSISTANT') continue
        const fromSnapshot = this.pickerIdBySnapshot(msg.modelSnapshot)
        if (fromSnapshot) return fromSnapshot
      }
      if (fallback && this.isPickerId(fallback)) return fallback
      return fallback || ''
    },
    applyConversationModel(conv) {
      const next = this.lastUsedModelId(conv?.modelId)
      if (next) this.modelPick = next
    },
    async ensureUsablePick() {
      if (this.isUsableId(this.modelPick)) return
      const next = this.firstUsableId()
      if (next === this.modelPick) return
      this.modelPick = next
      if (next && this.currentId) {
        await updateConversation(this.currentId, { modelId: next })
        await this.reloadSessions()
      }
    },
    applyProbeResult(id, ok) {
      if (this.models.trial && this.models.trial.id === id) {
        if (this.models.trial.lastCheckOk === ok) return
        this.models.trial.lastCheckOk = ok
        return
      }
      const mine = this.models.mine.find((item) => item.id === id)
      if (!mine || mine.lastCheckOk === ok) return
      mine.lastCheckOk = ok
    },
    finishGeneration() {
      this.streaming = false
      this.sending = false
      this.streamId = ''
      this.abortController = null
    },
    abortGeneration() {
      this.sendSeq += 1
      this.flushStop()
      this.finishGeneration()
    },
    async probePickerModels() {
      if (this.streaming) return
      const ids = [
        ...(this.models.trial ? [this.models.trial.id] : []),
        ...this.enabledMine.map((item) => item.id),
      ]
      if (!ids.length) return
      const seq = ++this.probeSeq
      await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await testModel(id, true)
            if (seq !== this.probeSeq) return
            this.applyProbeResult(id, !!res.data?.ok)
          } catch {
            if (seq !== this.probeSeq) return
            this.applyProbeResult(id, false)
          }
        }),
      )
      if (seq !== this.probeSeq) return
      await this.ensureUsablePick()
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
    shiftVersion(msg, delta) {
      if (!msg.parentId) return
      const list = this.versionsOf(msg)
      const idx = this.versionIndex(msg) + delta
      if (idx < 0 || idx >= list.length) return
      this.versionPick[msg.parentId] = list[idx].id
    },
    async reloadSessions() {
      this.sessionPage = 1
      const res = await listConversations({ page: 1, size: SESSION_PAGE_SIZE })
      this.conversations = res.data?.records ?? []
      this.sessionTotal = res.data?.total ?? this.conversations.length
      this.sessionHasMore = this.conversations.length < this.sessionTotal
    },
    async loadMoreSessions() {
      if (this.sessionLoadingMore || !this.sessionHasMore) return
      this.sessionLoadingMore = true
      try {
        const next = this.sessionPage + 1
        const res = await listConversations({ page: next, size: SESSION_PAGE_SIZE })
        const more = res.data?.records ?? []
        const seen = new Set(this.conversations.map((c) => c.id))
        this.conversations = [...this.conversations, ...more.filter((c) => !seen.has(c.id))]
        this.sessionPage = next
        this.sessionTotal = res.data?.total ?? this.sessionTotal
        this.sessionHasMore = this.conversations.length < this.sessionTotal
      } finally {
        this.sessionLoadingMore = false
      }
    },
    atConversationLimit() {
      const max = this.settings.maxConversationsPerUser || 500
      return this.sessionTotal >= max
    },
    async openConversation(id) {
      if (id !== this.currentId && (this.streaming || this.sending)) {
        this.abortGeneration()
      }
      const seq = ++this.openSeq
      this.currentId = id
      const conv = this.conversations.find((c) => c.id === id)
      if (conv?.modelId && this.isPickerId(conv.modelId)) this.modelPick = conv.modelId
      const res = await listMessages(id, { size: 30 })
      if (seq !== this.openSeq) return
      const page = Array.isArray(res.data) ? { records: res.data, hasMore: false } : res.data
      this.messages = page?.records ?? []
      this.hasMore = !!page?.hasMore
      this.applyConversationModel(conv)
      this.$refs.paneRef?.stick()
      await this.$nextTick()
      if (seq !== this.openSeq) return
      this.$refs.paneRef?.scrollToBottom(true)
    },
    async loadMore() {
      if (!this.currentId || !this.messages.length) return
      this.loadingMore = true
      try {
        const first = this.messages[0]
        const res = await listMessages(this.currentId, { beforeId: first.id, size: 30 })
        const page = Array.isArray(res.data) ? { records: res.data, hasMore: false } : res.data
        this.messages = [...(page?.records ?? []), ...this.messages]
        this.hasMore = !!page?.hasMore
      } finally {
        this.loadingMore = false
      }
    },
    async onNew() {
      if (this.atConversationLimit()) {
        ElMessage.warning(
          `会话数已达上限 ${this.settings.maxConversationsPerUser || 500}，请先删除旧会话`,
        )
        return
      }
      this.abortGeneration()
      const res = await createConversation({ modelId: this.modelPick || undefined })
      await this.reloadSessions()
      if (res.data?.id) await this.openConversation(res.data.id)
    },
    async onDelete(item) {
      await ElMessageBox.confirm('删除后会话不再可见，消息会保留在库中。', '删除会话', {
        type: 'warning',
      })
      await deleteConversation(item.id)
      if (this.currentId === item.id) {
        this.currentId = ''
        this.messages = []
      }
      await this.reloadSessions()
    },
    async onModelChange(id) {
      if (!this.currentId) return
      await updateConversation(this.currentId, { modelId: id })
      await this.reloadSessions()
    },
    useHint(q) {
      this.draft = q
    },
    onKeydown(e) {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return
      e.preventDefault()
      this.onSend()
    },
    async onSend(extra) {
      if (this.streaming || this.sending) return
      const seq = ++this.sendSeq
      this.sending = true
      try {
        const content = extra?.content ?? this.draft.trim()
        const sendFiles =
          extra?.regenerateOf || extra?.editOf ? [] : this.supportsFiles ? [...this.chatFiles] : []
        if (!extra?.regenerateOf && !content && !sendFiles.length) return
        if (!this.hasModel) return
        if (!this.modelPick) {
          ElMessage.warning('请先选择模型')
          return
        }
        const maxChars = this.settings.maxMessageChars || 32000
        if (!extra?.regenerateOf && content.length > maxChars) {
          ElMessage.warning(`输入超出 ${maxChars} 字，请精简后再发送`)
          return
        }
        if (!this.currentId) {
          if (this.atConversationLimit()) {
            ElMessage.warning(
              `会话数已达上限 ${this.settings.maxConversationsPerUser || 500}，请先删除旧会话`,
            )
            return
          }
          const created = await createConversation({ modelId: this.modelPick })
          if (seq !== this.sendSeq) return
          this.currentId = created.data.id
          await this.reloadSessions()
          if (seq !== this.sendSeq) return
        }
        const current = this.conversations.find((c) => c.id === this.currentId)
        const maxMessages = this.settings.maxMessagesPerConversation || 1000
        if ((current?.messageCount ?? this.messages.length) >= maxMessages) {
          ElMessage.warning(`该会话消息已达上限 ${maxMessages}，请新建会话继续`)
          return
        }
        if (!extra?.regenerateOf) {
          this.draft = ''
          this.chatFiles = []
        }
        if (!extra?.regenerateOf && !extra?.editOf) {
          const conv = this.conversations.find((c) => c.id === this.currentId)
          if (conv && !conv.title) {
            const compact = (content || sendFiles.map((f) => f.name).join(' '))
              .replace(/\s+/g, ' ')
              .trim()
            conv.title = compact.length <= 20 ? compact : compact.slice(0, 20)
          }
        }
        if (seq !== this.sendSeq) return
        this.streaming = true
        this.$refs.paneRef?.stick()
        const controller = new AbortController()
        this.abortController = controller
        const clientMsgId = `c-${crypto.randomUUID()}`
        if (!extra?.regenerateOf) {
          const fileNote = sendFiles.length
            ? `[附件: ${sendFiles.map((f) => f.name).join('、')}]`
            : ''
          this.messages.push({
            id: `tmp-u-${clientMsgId}`,
            role: 'USER',
            content: content && fileNote ? `${content}\n\n${fileNote}` : content || fileNote,
            status: 'DONE',
            createdAt: formatDateTime(new Date()),
          })
        }
        this.messages.push({
          id: `tmp-a-${clientMsgId}`,
          role: 'ASSISTANT',
          content: '',
          status: 'STREAMING',
          parentId: extra?.regenerateOf ? extra.regenerateOf : undefined,
          modelSnapshot: this.pickedModelLabel() || undefined,
          providerIcon: this.assistantIcon || undefined,
          createdAt: formatDateTime(new Date()),
        })
        await this.$nextTick()
        if (seq !== this.sendSeq) return
        this.$refs.paneRef?.scrollToBottom(true)
        try {
          await streamChat(
            {
              conversationId: this.currentId,
              modelId: this.modelPick,
              content,
              clientMsgId,
              regenerateOf: extra?.regenerateOf,
              editOf: extra?.editOf,
              thinking: this.supportsThinking ? this.thinking : undefined,
              files: sendFiles.length ? sendFiles : undefined,
            },
            {
              onMeta: (meta) => {
                if (seq !== this.sendSeq) return
                this.streamId = meta.streamId
                if (meta.conversationTitle) {
                  const conv = this.conversations.find((c) => c.id === this.currentId)
                  if (conv) conv.title = meta.conversationTitle
                }
                const lastA = this.messages[this.messages.length - 1]
                const lastU = this.messages[this.messages.length - 2]
                if (lastU && lastU.role === 'USER' && meta.userMessageId)
                  lastU.id = meta.userMessageId
                if (lastA) {
                  lastA.id = meta.assistantMessageId
                  lastA.modelSnapshot = meta.modelSnapshot
                  lastA.providerIcon = meta.providerIcon
                  lastA.parentId = meta.userMessageId || lastA.parentId
                }
              },
              onDelta: (chunk) => {
                if (seq !== this.sendSeq) return
                const last = this.messages[this.messages.length - 1]
                if (last && last.role === 'ASSISTANT') last.content += chunk
                this.$refs.paneRef?.scrollToBottom(false)
              },
              onThinking: (chunk) => {
                if (seq !== this.sendSeq) return
                const last = this.messages[this.messages.length - 1]
                if (last && last.role === 'ASSISTANT') last.thinking = (last.thinking || '') + chunk
                this.$refs.paneRef?.scrollToBottom(false)
              },
              onDone: () => {
                if (seq !== this.sendSeq) return
                const last = this.messages[this.messages.length - 1]
                if (last) last.status = 'DONE'
                this.finishGeneration()
              },
              onError: (code, message) => {
                if (seq !== this.sendSeq) return
                ElMessage.error(message)
                const last = this.messages[this.messages.length - 1]
                if (last && last.role === 'ASSISTANT') {
                  last.status = 'FAILED'
                  last.errorCode = code
                }
                this.finishGeneration()
              },
            },
            controller.signal,
          )
        } catch (e) {
          if (e?.name !== 'AbortError') {
            ElMessage.error(e?.message || '发送失败')
          }
        } finally {
          if (seq === this.sendSeq) {
            this.finishGeneration()
            await this.reloadSessions()
            await this.refreshQuota()
          }
        }
      } finally {
        if (seq === this.sendSeq) this.sending = false
      }
    },
    flushStop(keepalive = false) {
      this.abortController?.abort()
      const id = this.streamId
      if (!id) {
        return
      }
      void stopChat(id, { keepalive }).catch(() => undefined)
    },
    onStop() {
      this.flushStop()
      this.finishGeneration()
    },
    onRegenerate(msg) {
      this.onSend({ regenerateOf: msg.id, content: '' })
    },
    async onEdit(msg) {
      const { value } = await ElMessageBox.prompt('编辑后将截断这条之后的消息并重发', '编辑重发', {
        inputValue: msg.content,
        inputType: 'textarea',
      })
      const idx = this.messages.findIndex((m) => m.id === msg.id)
      if (idx >= 0) this.messages = this.messages.slice(0, idx)
      this.onSend({ editOf: msg.id, content: value })
    },
    async copyText(text) {
      await navigator.clipboard.writeText(text || '')
      ElMessage.success('已复制')
    },
    onPageHide() {
      this.flushStop(true)
    },
  },
}
</script>

<style scoped>
.ai-chat {
  display: flex;
  height: calc(100vh - 120px);
  min-height: 480px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
}
.ai-chat__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>
