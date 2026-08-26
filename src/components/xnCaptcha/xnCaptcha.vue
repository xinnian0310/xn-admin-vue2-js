<template>
  <div class="xn-captcha">
    <div v-if="resolvedType === 'IMAGE'" class="xn-captcha__image-row">
      <el-input
        :model-value="modelValue"
        :disabled="disabled"
        maxlength="6"
        placeholder="请输入验证码"
        @update:model-value="onCode"
      />
      <button
        type="button"
        class="xn-captcha__image"
        title="点击刷新"
        :disabled="disabled"
        @click="refresh"
      >
        <img v-if="image" :src="image" alt="验证码" />
        <span v-else>刷新</span>
        <span class="xn-captcha__image-tip">刷新</span>
      </button>
    </div>

    <div
      v-else-if="resolvedType === 'SLIDER'"
      class="xn-captcha__slider"
      :class="{ 'is-passed': passed, 'is-disabled': disabled }"
      @pointerdown="onStart"
    >
      <div class="xn-captcha__track">
        <div class="xn-captcha__progress" :style="{ width: `${percent}%` }" />
        <span class="xn-captcha__text">{{ passed ? '验证通过' : '拖动滑块完成验证' }}</span>
      </div>
      <div class="xn-captcha__thumb" :style="{ left: `calc((100% - 40px) * ${percent} / 100)` }">
        {{ passed ? '✓' : '»' }}
      </div>
    </div>
  </div>
</template>

<script>
import { fetchCaptcha, verifySliderCaptcha } from '@/api/auth'
import { ElMessage } from 'element-plus'

export default {
  name: 'XnCaptcha',
  props: {
    modelValue: { type: String, default: '' },
    captchaId: { type: String, default: '' },
    /** auto：请求后端；local：前端生成，演示用不打接口 */
    mode: { type: String, default: 'auto' },
    type: { type: String, default: undefined },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'update:captchaId', 'change', 'verified'],
  data() {
    return {
      resolvedType: this.type || 'IMAGE',
      image: '',
      innerId: this.captchaId || '',
      localAnswer: '',
      percent: 0,
      passed: false,
      dragging: false,
      startX: 0,
      startPercent: 0,
    }
  },
  computed: {
    captchaIdValue() {
      return this.innerId
    },
  },
  mounted() {
    void this.refresh()
  },
  methods: {
    onCode(value) {
      this.$emit('update:modelValue', value)
      this.$emit('change', { captchaId: this.innerId, captchaCode: value })
    },
    setId(id) {
      this.innerId = id
      this.$emit('update:captchaId', id)
    },
    async refresh() {
      if (this.disabled) return
      if (this.modelValue) this.$emit('update:modelValue', '')
      this.percent = 0
      this.passed = false
      this.$emit('verified', false)
      if (this.mode === 'local') {
        this.buildLocal()
        return
      }
      try {
        const res = await fetchCaptcha()
        const data = res.data
        if (!data) return
        this.setId(data.captchaId)
        this.resolvedType = this.type || data.captchaType || 'IMAGE'
        this.image = data.imageBase64 || ''
        this.$emit('change', { captchaId: data.captchaId })
      } catch {
        this.buildLocal()
      }
    },
    buildLocal() {
      this.resolvedType = this.type || 'IMAGE'
      this.setId(`local-${Date.now()}`)
      if (this.resolvedType === 'SLIDER') {
        this.image = ''
        return
      }
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let answer = ''
      for (let i = 0; i < 4; i += 1) answer += chars[Math.floor(Math.random() * chars.length)]
      this.localAnswer = answer
      this.image = this.drawLocalCaptcha(answer)
    },
    drawLocalCaptcha(answer) {
      const width = 120
      const height = 40
      const canvas = document.createElement('canvas')
      canvas.width = width * 2
      canvas.height = height * 2
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''
      ctx.scale(2, 2)
      ctx.fillStyle = '#f4f7fb'
      ctx.fillRect(0, 0, width, height)
      for (let i = 0; i < 5; i += 1) {
        ctx.strokeStyle = `rgba(64, 158, 255, ${0.12 + Math.random() * 0.18})`
        ctx.beginPath()
        ctx.moveTo(Math.random() * width, Math.random() * height)
        ctx.lineTo(Math.random() * width, Math.random() * height)
        ctx.stroke()
      }
      const colors = ['#303133', '#409eff', '#67c23a', '#e6a23c']
      for (let i = 0; i < answer.length; i += 1) {
        ctx.save()
        ctx.font = '700 20px "Segoe UI", "PingFang SC", sans-serif'
        ctx.fillStyle = colors[i % colors.length]
        ctx.translate(16 + i * 26, 27)
        ctx.rotate((Math.random() - 0.5) * 0.5)
        ctx.fillText(answer[i], 0, 0)
        ctx.restore()
      }
      return canvas.toDataURL('image/png')
    },
    onStart(event) {
      if (this.disabled || this.passed) return
      this.dragging = true
      this.startX = event.clientX
      this.startPercent = this.percent
      const move = (ev) => {
        const track = event.currentTarget ?? null
        const width = track?.clientWidth || 240
        const delta = ((ev.clientX - this.startX) / width) * 100
        this.percent = Math.min(100, Math.max(0, this.startPercent + delta))
      }
      const up = async () => {
        this.dragging = false
        document.removeEventListener('pointermove', move)
        document.removeEventListener('pointerup', up)
        if (this.percent < 92) {
          this.percent = 0
          return
        }
        this.percent = 100
        if (this.mode === 'local') {
          this.passed = true
          this.$emit('verified', true)
          this.$emit('change', { captchaId: this.innerId, captchaCode: '100' })
          return
        }
        try {
          await verifySliderCaptcha(this.innerId, 100)
          this.passed = true
          this.$emit('verified', true)
          this.$emit('change', { captchaId: this.innerId, captchaCode: '100' })
        } catch {
          this.percent = 0
          this.passed = false
          this.$emit('verified', false)
          ElMessage.error('滑动验证失败，请重试')
          void this.refresh()
        }
      }
      document.addEventListener('pointermove', move)
      document.addEventListener('pointerup', up)
    },
    getPayload() {
      return { captchaId: this.innerId, captchaCode: this.modelValue }
    },
  },
}
</script>

<style scoped>
.xn-captcha {
  width: 100%;
}

.xn-captcha__image-row {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.xn-captcha__image-row :deep(.el-input) {
  flex: 1;
}

.xn-captcha__image-row :deep(.el-input__wrapper) {
  height: 40px;
  padding-left: 12px;
}

.xn-captcha__image {
  position: relative;
  flex: 0 0 120px;
  width: 120px;
  height: 40px;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-fill-color-light);
  cursor: pointer;
}

.xn-captcha__image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.xn-captcha__image-tip {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.42);
  color: #fff;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.15s;
}

.xn-captcha__image:hover .xn-captcha__image-tip {
  opacity: 1;
}

.xn-captcha__image:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.xn-captcha__slider {
  position: relative;
  height: 40px;
  user-select: none;
  touch-action: none;
}

.xn-captcha__track {
  height: 40px;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-fill-color-light);
}

.xn-captcha__progress {
  height: 100%;
  background: var(--el-color-primary-light-7);
}

.xn-captcha__text {
  position: absolute;
  inset: 0 0 0 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  pointer-events: none;
}

.xn-captcha__thumb {
  position: absolute;
  top: 0;
  width: 40px;
  height: 40px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: #fff;
  color: var(--el-color-primary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  cursor: grab;
}

.xn-captcha__thumb:active {
  cursor: grabbing;
}

.xn-captcha__slider.is-passed .xn-captcha__track {
  border-color: var(--el-color-success-light-5);
  background: var(--el-color-success-light-9);
}

.xn-captcha__slider.is-passed .xn-captcha__progress {
  background: var(--el-color-success-light-7);
}

.xn-captcha__slider.is-passed .xn-captcha__text {
  color: var(--el-color-success);
}

.xn-captcha__slider.is-passed .xn-captcha__thumb {
  color: #fff;
  background: var(--el-color-success);
  border-color: var(--el-color-success);
}

.xn-captcha__slider.is-disabled {
  pointer-events: none;
  opacity: 0.65;
}
</style>
