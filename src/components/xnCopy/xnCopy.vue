<template>
  <span class="xn-copy" :class="{ 'is-block': block }">
    <span v-if="showText" class="xn-copy__text">{{ displayText }}</span>
    <el-button
      :link="link"
      :type="type"
      :size="size"
      :disabled="disabled || !resolvedText"
      :icon="copied ? Check : DocumentCopy"
      @click.stop="onCopy"
    >
      {{ copied ? copiedLabel : label }}
    </el-button>
  </span>
</template>

<script>
import { markRaw } from 'vue'
import { Check, DocumentCopy } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { copyText } from '@/utils/clipboard'

export default {
  name: 'XnCopy',
  props: {
    text: { type: [String, Number], default: '' },
    /** 按钮文案；空则只显示图标 */
    label: { type: String, default: '' },
    copiedLabel: { type: String, default: '已复制' },
    /** 是否在按钮前展示文本 */
    showText: { type: Boolean, default: false },
    link: { type: Boolean, default: true },
    type: { type: String, default: 'primary' },
    size: { type: String, default: 'small' },
    disabled: { type: Boolean, default: false },
    block: { type: Boolean, default: false },
    silent: { type: Boolean, default: false },
  },
  emits: ['copied', 'error'],
  setup() {
    return {
      Check: markRaw(Check),
      DocumentCopy: markRaw(DocumentCopy),
    }
  },
  data() {
    return {
      copied: false,
      timer: null,
    }
  },
  computed: {
    resolvedText() {
      return this.text == null ? '' : String(this.text)
    },
    displayText() {
      return this.resolvedText || '—'
    },
  },
  beforeUnmount() {
    if (this.timer) clearTimeout(this.timer)
  },
  methods: {
    async onCopy() {
      const value = this.resolvedText
      if (!value || this.disabled) return
      const ok = await copyText(value)
      if (!ok) {
        this.$emit('error')
        if (!this.silent) ElMessage.error('复制失败')
        return
      }
      this.copied = true
      this.$emit('copied', value)
      if (!this.silent) ElMessage.success('已复制')
      if (this.timer) clearTimeout(this.timer)
      this.timer = setTimeout(() => {
        this.copied = false
      }, 1500)
    },
  },
}
</script>

<style scoped>
.xn-copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  vertical-align: middle;
}

.xn-copy.is-block {
  display: flex;
}

.xn-copy__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
