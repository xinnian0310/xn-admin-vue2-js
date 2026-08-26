<template>
  <el-dialog
    v-model="visible"
    class="xn-dialog"
    :class="{ 'is-full': resolvedFullscreen }"
    :title="useCustomHeader ? undefined : title"
    :width="resolvedWidth"
    :fullscreen="resolvedFullscreen"
    :align-center="resolvedAlignCenter"
    :draggable="resolvedDraggable"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
    :close-on-press-escape="closeOnPressEscape"
    :append-to-body="appendToBody"
    :show-close="showClose"
    :before-close="beforeClose"
    @closed="onClosed"
  >
    <template v-if="useCustomHeader" #header>
      <slot name="header">
        <div class="xn-dialog__header">
          <span class="xn-dialog__title">{{ title }}</span>
          <button
            v-if="showFullscreen"
            type="button"
            class="xn-dialog__full"
            :title="resolvedFullscreen ? '退出全屏' : '全屏'"
            @click="toggleFullscreen"
          >
            <el-icon><FullScreen /></el-icon>
          </button>
        </div>
      </slot>
    </template>
    <div class="xn-dialog__body" v-loading="loading">
      <slot />
    </div>
    <template v-if="showFooter || $slots.footer" #footer>
      <slot name="footer">
        <el-button v-if="showCancel" @click="onCancel">{{ cancelText }}</el-button>
        <el-button
          v-if="showConfirm"
          type="primary"
          :loading="confirmLoading"
          :disabled="confirmDisabled"
          @click="onConfirm"
        >
          {{ confirmText }}
        </el-button>
      </slot>
    </template>
  </el-dialog>
</template>

<script>
import { FullScreen } from '@element-plus/icons-vue'
import { appConfig } from '@/config/app'

const SIZE_WIDTH = { small: 420, default: 560, large: 720 }

export default {
  name: 'XnDialog',
  components: { FullScreen },
  props: {
    modelValue: { type: Boolean, required: true },
    title: { type: String, default: '' },
    width: { type: [String, Number], default: undefined },
    /** 不传则用 size 对应宽度 */
    size: { type: String, default: 'default' },
    fullscreen: { type: Boolean, default: false },
    /** 标题栏全屏切换 */
    showFullscreen: { type: Boolean, default: false },
    /** 内容区遮罩，详情拉取时用 */
    loading: { type: Boolean, default: false },
    /** 不传则读 appConfig.ui.elementPlus.dialog.alignCenter */
    alignCenter: { type: Boolean, default: undefined },
    /** 不传则读 appConfig.ui.elementPlus.dialog.draggable */
    draggable: { type: Boolean, default: undefined },
    destroyOnClose: { type: Boolean, default: true },
    closeOnClickModal: { type: Boolean, default: false },
    closeOnPressEscape: { type: Boolean, default: true },
    appendToBody: { type: Boolean, default: true },
    showClose: { type: Boolean, default: true },
    showFooter: { type: Boolean, default: true },
    showCancel: { type: Boolean, default: true },
    showConfirm: { type: Boolean, default: true },
    cancelText: { type: String, default: '取消' },
    confirmText: { type: String, default: '确定' },
    confirmLoading: { type: Boolean, default: false },
    confirmDisabled: { type: Boolean, default: false },
    beforeClose: { type: Function, default: undefined },
  },
  emits: ['update:modelValue', 'confirm', 'cancel', 'closed'],
  data() {
    return {
      innerFullscreen: this.fullscreen,
    }
  },
  computed: {
    visible: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      },
    },
    resolvedAlignCenter() {
      return this.alignCenter ?? appConfig.ui.elementPlus.dialog.alignCenter
    },
    resolvedFullscreen() {
      return this.innerFullscreen
    },
    resolvedDraggable() {
      const draggable = this.draggable ?? appConfig.ui.elementPlus.dialog.draggable
      return !this.resolvedFullscreen && draggable
    },
    resolvedWidth() {
      return this.width ?? SIZE_WIDTH[this.size] ?? SIZE_WIDTH.default
    },
    useCustomHeader() {
      return Boolean(this.$slots.header) || this.showFullscreen
    },
  },
  watch: {
    fullscreen(value) {
      this.innerFullscreen = value
    },
    modelValue(value) {
      if (!value) this.innerFullscreen = this.fullscreen
    },
  },
  methods: {
    toggleFullscreen() {
      this.innerFullscreen = !this.innerFullscreen
    },
    onConfirm() {
      this.$emit('confirm')
    },
    onCancel() {
      this.$emit('cancel')
      this.visible = false
    },
    onClosed() {
      this.$emit('closed')
    },
    close() {
      this.visible = false
    },
  },
}
</script>

<style scoped>
.xn-dialog :deep(.el-dialog) {
  max-height: var(--app-dialog-max-height, 80vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.xn-dialog :deep(.el-dialog__header) {
  flex-shrink: 0;
}

.xn-dialog :deep(.el-dialog__body) {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-top: 8px;
}

.xn-dialog :deep(.el-dialog__footer) {
  flex-shrink: 0;
}

.xn-dialog.is-full :deep(.el-dialog) {
  max-height: 100vh;
}

.xn-dialog__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 8px;
  min-height: 24px;
}

.xn-dialog__title {
  flex: 1;
  min-width: 0;
  font-size: var(--el-dialog-title-font-size, 16px);
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.xn-dialog__full {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--el-color-info);
  cursor: pointer;
}

.xn-dialog__full:hover {
  color: var(--el-color-primary);
}
</style>
