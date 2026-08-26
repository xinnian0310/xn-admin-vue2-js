<template>
  <div class="xn-sms-code">
    <el-input
      :model-value="modelValue"
      :disabled="disabled"
      :maxlength="maxlength"
      :placeholder="placeholder"
      @update:model-value="onCode"
    />
    <el-button :disabled="sendDisabled" :loading="sending" @click="handleSend">
      {{ buttonLabel }}
    </el-button>
  </div>
</template>

<script>
import { h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { copyText } from '@/utils/clipboard'

const PHONE_RE = /^1[3-9]\d{9}$/

export default {
  name: 'XnSmsCode',
  props: {
    modelValue: { type: String, default: '' },
    /** 发送目标手机号；不合法时不能发送 */
    phone: { type: String, default: '' },
    countdown: { type: Number, default: 60 },
    /** 传入则真正发短信；local 模式忽略 */
    request: { type: Function, default: undefined },
    /** auto：走 request；local：演示倒计时，不打接口 */
    mode: { type: String, default: 'auto' },
    disabled: { type: Boolean, default: false },
    maxlength: { type: Number, default: 6 },
    placeholder: { type: String, default: '请输入短信验证码' },
    sendText: { type: String, default: '获取验证码' },
  },
  emits: ['update:modelValue', 'sent', 'error'],
  data() {
    return {
      remain: 0,
      sending: false,
      timer: null,
    }
  },
  computed: {
    sendDisabled() {
      return this.disabled || this.sending || this.remain > 0 || !PHONE_RE.test(this.phone.trim())
    },
    buttonLabel() {
      return this.remain > 0 ? `${this.remain}s` : this.sendText
    },
  },
  unmounted() {
    this.clearTimer()
  },
  methods: {
    onCode(value) {
      this.$emit('update:modelValue', String(value).replace(/\D/g, '').slice(0, this.maxlength))
    },
    clearTimer() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    startCountdown() {
      this.remain = this.countdown
      this.clearTimer()
      this.timer = setInterval(() => {
        this.remain -= 1
        if (this.remain <= 0) this.clearTimer()
      }, 1000)
    },
    async handleSend() {
      const phone = this.phone.trim()
      if (this.disabled || this.sending || this.remain > 0) return
      if (!PHONE_RE.test(phone)) {
        ElMessage.warning('请输入正确的手机号')
        return
      }
      this.sending = true
      try {
        if (this.mode !== 'local') {
          if (!this.request) throw new Error('未配置短信发送请求')
          const result = await this.request(phone)
          const code = result && typeof result === 'object' ? result.code : undefined
          if (code) await this.showMockSms(phone, String(code))
        } else {
          await new Promise((resolve) => setTimeout(resolve, 280))
          ElMessage.success('验证码已发送（演示）')
        }
        this.startCountdown()
        this.$emit('sent', phone)
      } catch (error) {
        const message = error instanceof Error ? error.message : '发送失败'
        this.$emit('error', message)
        ElMessage.error(message)
      } finally {
        this.sending = false
      }
    },
    async showMockSms(phone, code) {
      await ElMessageBox({
        title: `短信  ${phone}`,
        type: 'success',
        confirmButtonText: '知道了',
        cancelButtonText: '复制验证码',
        showCancelButton: true,
        distinguishCancelAndClose: true,
        message: h('div', [
          h('p', { style: 'margin:0 0 8px' }, '【心念科技】您的验证码为'),
          h(
            'p',
            {
              style:
                'margin:0 0 8px;font-size:24px;font-weight:700;letter-spacing:6px;user-select:all;cursor:text',
            },
            code,
          ),
          h(
            'p',
            { style: 'margin:0;color:var(--el-text-color-secondary);font-size:13px' },
            '5分钟内有效，可全选复制或点「复制验证码」',
          ),
        ]),
        beforeClose: (action, _instance, done) => {
          if (action === 'cancel') {
            void copyText(code).then((ok) => {
              ElMessage[ok ? 'success' : 'error'](ok ? '验证码已复制' : '复制失败')
            })
            return
          }
          done()
        },
      }).catch(() => undefined)
    },
    send() {
      return this.handleSend()
    },
  },
}
</script>

<style scoped>
.xn-sms-code {
  display: flex;
  align-items: stretch;
  gap: 8px;
  width: 100%;
}

.xn-sms-code :deep(.el-input) {
  flex: 1;
}

.xn-sms-code :deep(.el-button) {
  flex: 0 0 auto;
  min-width: 108px;
}
</style>
