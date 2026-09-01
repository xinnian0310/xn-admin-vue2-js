<template>
  <footer class="ai-chat__composer">
    <div v-if="unbound" class="ai-chat__tip">原模型已删除，请先选择模型再发送</div>
    <div v-else-if="trialExhausted" class="ai-chat__tip">
      {{ exceededTip || '本月试用额度已用完' }}
      <el-button type="primary" link @click="$router.push('/ai/models')">去添加我的模型</el-button>
    </div>
    <div
      class="ai-chat__input-wrap"
      :class="{ 'has-tools': supportsThinking || supportsFiles }"
      @paste="onPaste"
    >
      <div v-if="files.length" class="ai-chat__files">
        <span v-for="(file, idx) in files" :key="`${file.name}-${idx}`" class="ai-chat__file">
          <img v-if="isImage(file)" :src="previewSrc(file)" alt="" class="ai-chat__file-thumb" />
          <span class="ai-chat__file-name" :title="file.name">{{ file.name }}</span>
          <button
            type="button"
            class="ai-chat__file-x"
            :disabled="!canType"
            @click="removeFile(idx)"
          >
            ×
          </button>
        </span>
      </div>
      <el-input
        :model-value="draft"
        type="textarea"
        :autosize="{ minRows: 3, maxRows: 8 }"
        :disabled="!canType"
        :maxlength="maxChars"
        :placeholder="placeholder"
        resize="none"
        @update:model-value="$emit('update:draft', $event)"
        @keydown="$emit('keydown', $event)"
      />
      <div v-if="supportsThinking || supportsFiles" class="ai-chat__tools">
        <button
          v-if="supportsThinking"
          type="button"
          class="ai-chat__tool"
          :class="{ 'is-on': thinking }"
          :disabled="!canType"
          @click="$emit('update:thinking', !thinking)"
        >
          <el-icon><Opportunity /></el-icon>
          深度思考
        </button>
        <button
          v-if="supportsFiles"
          type="button"
          class="ai-chat__tool"
          :disabled="!canType"
          @click="pickFile"
        >
          <el-icon><Paperclip /></el-icon>
          上传
        </button>
      </div>
      <input
        ref="fileRef"
        class="ai-chat__file-input"
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md,.csv,.json,application/pdf,text/plain"
        @change="onFilePicked"
      />
      <el-tooltip :content="streaming ? '停止生成' : '发送'" placement="top" :show-after="300">
        <span class="ai-chat__send-hit">
          <el-button
            class="ai-chat__send-btn"
            circle
            :type="streaming ? 'warning' : 'primary'"
            :icon="streaming ? VideoPause : Promotion"
            :disabled="!streaming && !canSend"
            @click="streaming ? $emit('stop') : $emit('send')"
          />
        </span>
      </el-tooltip>
    </div>
  </footer>
</template>

<script>
import { markRaw } from 'vue'
import { ElMessage } from 'element-plus'
import { Opportunity, Paperclip, Promotion, VideoPause } from '@element-plus/icons-vue'

const MAX_FILES = 4
const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
])

export default {
  name: 'AiChatComposer',
  components: { Opportunity, Paperclip },
  emits: ['update:draft', 'update:thinking', 'update:files', 'keydown', 'stop', 'send'],
  props: {
    unbound: { type: Boolean, required: true },
    trialExhausted: { type: Boolean, required: true },
    exceededTip: { type: String, default: '' },
    draft: { type: String, required: true },
    canType: { type: Boolean, required: true },
    canSend: { type: Boolean, required: true },
    streaming: { type: Boolean, required: true },
    maxChars: { type: Number, required: true },
    placeholder: { type: String, required: true },
    supportsThinking: { type: Boolean, required: true },
    supportsFiles: { type: Boolean, required: true },
    thinking: { type: Boolean, required: true },
    files: { type: Array, required: true },
  },
  data() {
    return {
      Promotion: markRaw(Promotion),
      VideoPause: markRaw(VideoPause),
    }
  },
  methods: {
    isImage(file) {
      return (file.mime || '').startsWith('image/')
    },
    previewSrc(file) {
      if (file.data.startsWith('data:')) return file.data
      return `data:${file.mime || 'application/octet-stream'};base64,${file.data}`
    },
    pickFile() {
      if (!this.canType) return
      this.$refs.fileRef?.click()
    },
    removeFile(idx) {
      this.$emit(
        'update:files',
        this.files.filter((_, i) => i !== idx),
      )
    },
    onFilePicked(e) {
      const input = e.target
      const list = input.files ? Array.from(input.files) : []
      input.value = ''
      void this.addFiles(list)
    },
    onPaste(e) {
      if (!this.supportsFiles || !this.canType) return
      const fromFiles = Array.from(e.clipboardData?.files || [])
      const fromItems = []
      for (const item of Array.from(e.clipboardData?.items || [])) {
        if (item.kind !== 'file') continue
        const file = item.getAsFile()
        if (file) fromItems.push(file)
      }
      const list = fromFiles.length ? fromFiles : fromItems
      if (!list.length) return
      e.preventDefault()
      void this.addFiles(list)
    },
    async addFiles(list) {
      if (!list.length) return
      const next = [...this.files]
      for (const file of list) {
        if (next.length >= MAX_FILES) {
          ElMessage.warning(`最多上传 ${MAX_FILES} 个文件`)
          break
        }
        const mime = this.normalizeMime(file.type, file.name)
        if (!ALLOWED.has(mime)) {
          ElMessage.warning(`不支持的文件类型：${file.name}`)
          continue
        }
        if (file.size > MAX_BYTES) {
          ElMessage.warning(`单个附件不超过 2MB：${file.name}`)
          continue
        }
        const data = await this.readAsDataUrl(file)
        next.push({ name: file.name, mime, data })
      }
      this.$emit('update:files', next)
    },
    normalizeMime(type, name) {
      const lower = (type || '').toLowerCase()
      if (lower === 'image/jpg') return 'image/jpeg'
      if (ALLOWED.has(lower)) return lower
      const n = name.toLowerCase()
      if (n.endsWith('.png')) return 'image/png'
      if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg'
      if (n.endsWith('.gif')) return 'image/gif'
      if (n.endsWith('.webp')) return 'image/webp'
      if (n.endsWith('.bmp')) return 'image/bmp'
      if (n.endsWith('.pdf')) return 'application/pdf'
      if (n.endsWith('.md')) return 'text/markdown'
      if (n.endsWith('.csv')) return 'text/csv'
      if (n.endsWith('.json')) return 'application/json'
      if (n.endsWith('.txt')) return 'text/plain'
      return lower
    },
    readAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
    },
  },
}
</script>

<style scoped>
.ai-chat__composer {
  padding: 8px 16px 16px;
}
.ai-chat__tip {
  margin-bottom: 8px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.ai-chat__input-wrap {
  position: relative;
}
.ai-chat__input-wrap :deep(.el-textarea__inner) {
  padding: 12px 48px 12px 12px;
  line-height: 1.6;
}
.ai-chat__input-wrap.has-tools :deep(.el-textarea__inner) {
  padding-bottom: 44px;
}
.ai-chat__files {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.ai-chat__file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 180px;
  padding: 4px 8px 4px 4px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-light);
  font-size: 12px;
}
.ai-chat__file-thumb {
  width: 28px;
  height: 28px;
  object-fit: cover;
  border-radius: 4px;
}
.ai-chat__file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ai-chat__file-x {
  border: 0;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}
.ai-chat__tools {
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 1;
  display: flex;
  gap: 6px;
}
.ai-chat__tool {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 999px;
  background: var(--el-bg-color);
  color: var(--el-text-color-regular);
  font-size: 12px;
  cursor: pointer;
}
.ai-chat__tool:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ai-chat__tool.is-on {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.ai-chat__file-input {
  display: none;
}
.ai-chat__send-hit {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 1;
  line-height: 0;
}
.ai-chat__send-btn {
  width: 32px;
  height: 32px;
  margin: 0;
}
</style>
