<template>
  <div class="xn-image-upload" :class="{ 'is-full': hidePlus }">
    <el-upload
      :disabled="disabled"
      :file-list="fileList"
      class="xn-image-upload__card"
      :class="{ 'is-full': hidePlus }"
      list-type="picture-card"
      :accept="accept"
      :limit="limit"
      :multiple="limit > 1"
      :http-request="handleRequest"
      :before-upload="beforeUpload"
      :on-exceed="onExceed"
      :on-remove="onRemove"
      :on-preview="onPreview"
    >
      <el-icon><Plus /></el-icon>
    </el-upload>
    <div v-if="tip" class="xn-image-upload__tip">{{ tip }}</div>
    <el-image-viewer
      v-if="previewVisible"
      :url-list="previewUrls"
      :initial-index="previewIndex"
      @close="previewVisible = false"
    />
  </div>
</template>

<script>
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { uploadFile } from '@/api/file-job'
import { showCaughtError } from '@/utils/request'

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml'

function normalizeUrls(value) {
  if (Array.isArray(value)) {
    return value.map((item) => (item || '').trim()).filter(Boolean)
  }
  const text = (value || '').trim()
  return text ? [text] : []
}

function fileNameOf(url, index) {
  const path = url.split('?')[0] || ''
  const name = path.substring(path.lastIndexOf('/') + 1)
  return name || `image-${index + 1}`
}

function sameUrls(a, b) {
  return a.length === b.length && a.every((item, index) => item === b[index])
}

export default {
  name: 'XnImageUpload',
  components: { Plus },
  props: {
    modelValue: { type: [String, Array], default: '' },
    limit: { type: Number, default: 1 },
    disabled: { type: Boolean, default: false },
    accept: { type: String, default: DEFAULT_ACCEPT },
    maxSize: { type: Number, default: 5 * 1024 * 1024 },
    tip: { type: String, default: '' },
    request: { type: Function, default: undefined },
  },
  emits: ['update:modelValue', 'change', 'success', 'error', 'exceed', 'remove'],
  data() {
    return {
      fileList: [],
      localUrls: [],
      previewVisible: false,
      previewIndex: 0,
      uidMap: new Map(),
      uidSeq: 1,
    }
  },
  computed: {
    previewUrls() {
      return this.localUrls
    },
    hidePlus() {
      return this.disabled || this.localUrls.length >= this.limit
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(value) {
        const next = normalizeUrls(value)
        if (sameUrls(next, this.localUrls)) return
        this.localUrls = next
        this.syncFileList()
      },
    },
  },
  methods: {
    uidOf(url) {
      const existed = this.uidMap.get(url)
      if (existed != null) return existed
      const id = this.uidSeq++
      this.uidMap.set(url, id)
      return id
    },
    syncFileList() {
      this.fileList = this.localUrls.map((url, index) => ({
        name: fileNameOf(url, index),
        url,
        status: 'success',
        uid: this.uidOf(url),
      }))
    },
    emitValue(list) {
      this.localUrls = list
      this.syncFileList()
      const value = this.limit === 1 ? list[0] || '' : [...list]
      this.$emit('update:modelValue', value)
      this.$emit('change', value)
    },
    beforeUpload(file) {
      const types = this.accept
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
      const mime = (file.type || '').toLowerCase()
      const ext = file.name.includes('.')
        ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
        : ''
      const matched = types.some((type) => {
        if (type.endsWith('/*')) return mime.startsWith(type.slice(0, -1))
        if (type.startsWith('.')) return ext === type
        return mime === type
      })
      if (types.length && !matched) {
        ElMessage.warning('仅支持图片文件')
        return false
      }
      if (this.maxSize > 0 && file.size > this.maxSize) {
        ElMessage.warning(`图片不能超过 ${Math.round(this.maxSize / 1024 / 1024)}MB`)
        return false
      }
      return true
    },
    async defaultUpload(file) {
      const res = await uploadFile(file)
      const url = res.data?.url?.trim()
      if (!url) throw new Error('上传失败')
      return url
    },
    async handleRequest(opt) {
      try {
        const file = opt.file
        const url = this.request ? await this.request(file) : await this.defaultUpload(file)
        if (!url) throw new Error('上传失败')
        const next =
          this.limit === 1
            ? [url]
            : [...this.localUrls.filter((item) => item !== url), url].slice(0, this.limit)
        this.emitValue(next)
        this.$emit('success', url)
        opt.onSuccess?.(url)
      } catch (error) {
        const message = error instanceof Error ? error.message : '上传失败'
        this.$emit('error', message)
        showCaughtError(error, '上传失败')
        opt.onError?.(error)
      }
    },
    onExceed() {
      this.$emit('exceed')
      ElMessage.warning(this.limit === 1 ? '仅允许上传一张图片' : `最多上传 ${this.limit} 张图片`)
    },
    onRemove(file) {
      const url = (file.url || '').trim()
      this.emitValue(this.localUrls.filter((item) => item !== url))
      if (url) this.$emit('remove', url)
    },
    onPreview(file) {
      const url = (file.url || '').trim()
      const index = this.localUrls.indexOf(url)
      if (index < 0) return
      this.previewIndex = index
      this.previewVisible = true
    },
  },
}
</script>

<style scoped>
.xn-image-upload__card :deep(.el-upload--picture-card),
.xn-image-upload__card :deep(.el-upload-list__item) {
  width: 96px;
  height: 96px;
}

.xn-image-upload__card.is-full :deep(.el-upload--picture-card) {
  display: none;
}

.xn-image-upload__tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
</style>
