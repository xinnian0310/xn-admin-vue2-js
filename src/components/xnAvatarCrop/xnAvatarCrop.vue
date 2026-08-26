<template>
  <div class="xn-avatar-crop">
    <el-avatar :size="size" :src="modelValue || undefined">{{ fallback }}</el-avatar>
    <div class="xn-avatar-crop__actions">
      <el-button size="small" :disabled="disabled" @click="pick">选择图片</el-button>
      <el-button v-if="modelValue && !disabled" size="small" link type="danger" @click="clear">
        清除
      </el-button>
    </div>
    <input
      ref="inputRef"
      type="file"
      accept="image/png,image/jpeg,image/jpg,image/webp"
      hidden
      @change="onFile"
    />

    <xnDialog
      v-model="open"
      title="裁剪头像"
      width="480px"
      confirm-text="确定"
      :confirm-loading="submitting"
      @confirm="confirm"
    >
      <div class="xn-avatar-crop__stage" @wheel.prevent="onWheel">
        <canvas
          ref="canvasRef"
          width="360"
          height="360"
          @pointerdown="onDown"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointerleave="onUp"
        />
      </div>
      <div class="xn-avatar-crop__hint">滚轮缩放，拖拽调整位置</div>
    </xnDialog>
  </div>
</template>

<script>
import { ElMessage } from 'element-plus'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import { showCaughtError } from '@/utils/request'

export default {
  name: 'XnAvatarCrop',
  components: { xnDialog },
  props: {
    modelValue: { type: String, default: '' },
    size: { type: Number, default: 88 },
    fallback: { type: String, default: '头像' },
    disabled: { type: Boolean, default: false },
    /** 自定义上传，返回可访问 URL；不传则用本地 blob */
    request: { type: Function, default: undefined },
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      open: false,
      submitting: false,
      image: null,
      scale: 1,
      offset: { x: 0, y: 0 },
      dragging: false,
      last: { x: 0, y: 0 },
    }
  },
  methods: {
    pick() {
      if (this.disabled) return
      this.$refs.inputRef?.click()
    },
    onFile(event) {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        this.image = img
        this.scale = Math.max(360 / img.width, 360 / img.height)
        this.offset = { x: 0, y: 0 }
        this.open = true
        void this.$nextTick(this.draw)
        URL.revokeObjectURL(url)
      }
      img.src = url
    },
    draw() {
      const canvas = this.$refs.canvasRef
      const img = this.image
      if (!canvas || !img) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, 360, 360)
      ctx.fillStyle = '#1d1d1d'
      ctx.fillRect(0, 0, 360, 360)
      const w = img.width * this.scale
      const h = img.height * this.scale
      ctx.drawImage(img, 180 - w / 2 + this.offset.x, 180 - h / 2 + this.offset.y, w, h)
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth = 2
      ctx.strokeRect(1, 1, 358, 358)
    },
    onWheel(event) {
      this.scale = Math.min(4, Math.max(0.2, this.scale * (event.deltaY > 0 ? 0.92 : 1.08)))
      this.draw()
    },
    onDown(event) {
      this.dragging = true
      this.last = { x: event.clientX, y: event.clientY }
      event.target.setPointerCapture(event.pointerId)
    },
    onMove(event) {
      if (!this.dragging) return
      this.offset = {
        x: this.offset.x + event.clientX - this.last.x,
        y: this.offset.y + event.clientY - this.last.y,
      }
      this.last = { x: event.clientX, y: event.clientY }
      this.draw()
    },
    onUp() {
      this.dragging = false
    },
    async confirm() {
      const canvas = this.$refs.canvasRef
      if (!canvas) return
      this.submitting = true
      try {
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (item) => (item ? resolve(item) : reject(new Error('裁剪失败'))),
            'image/png',
          )
        })
        const file = new File([blob], 'avatar.png', { type: 'image/png' })
        const url = this.request ? await this.request(file) : URL.createObjectURL(blob)
        this.$emit('update:modelValue', url)
        this.$emit('change', url)
        this.open = false
        ElMessage.success('已裁剪')
      } catch (error) {
        showCaughtError(error, '裁剪失败')
      } finally {
        this.submitting = false
      }
    },
    clear() {
      this.$emit('update:modelValue', '')
      this.$emit('change', '')
    },
  },
}
</script>

<style scoped>
.xn-avatar-crop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.xn-avatar-crop__actions {
  display: flex;
  gap: 8px;
}

.xn-avatar-crop__stage {
  display: flex;
  justify-content: center;
}

.xn-avatar-crop__stage canvas {
  border-radius: 8px;
  cursor: grab;
  background: #111;
}

.xn-avatar-crop__hint {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
