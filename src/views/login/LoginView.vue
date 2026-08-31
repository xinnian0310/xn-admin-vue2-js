<template>
  <div class="login-page">
    <div class="login-atmosphere" aria-hidden="true">
      <div class="orb orb-a" />
      <div class="orb orb-b" />
      <div class="orb orb-c" />
      <div class="mesh" />
      <div class="circuit" />
    </div>

    <div class="login-shell">
      <aside class="login-brand">
        <div class="brand-glow" aria-hidden="true" />
        <div class="brand-inner">
          <div class="brand-logo-plate">
            <img class="brand-logo" :src="logoSrc" alt="心念科技" @error="onLogoError" />
          </div>
          <p class="brand-slogan">心有所念，码有所成</p>
          <p class="brand-desc">
            专注于 IT 开发与软件创新，将每一个想法转化为可靠的软件产品，技术赋能企业数字化发展。
          </p>
          <ul class="brand-features">
            <li v-for="(f, i) in intro.features" :key="f.title" :style="{ '--i': i }">
              <span class="feature-icon">
                <el-icon :size="18"><component :is="iconOf(f.icon)" /></el-icon>
              </span>
              <span class="feature-text">
                <strong>{{ f.title }}</strong>
                <em>{{ f.desc }}</em>
              </span>
            </li>
          </ul>
        </div>
        <div class="brand-foot">
          <span>{{ intro.title }}</span>
          <span class="dot" />
          <span>{{ intro.version }}</span>
        </div>
      </aside>

      <section class="login-panel">
        <div class="login-card">
          <header class="login-header">
            <p class="welcome">{{ isRegister ? '创建账号' : '欢迎回来' }}</p>
            <h1>{{ appConfig.app.name }}</h1>
            <p class="hint">
              {{ isRegister ? '注册后将以普通用户身份使用系统' : '登录以继续管理您的系统' }}
            </p>
          </header>

          <el-tabs v-if="!isRegister" v-model="loginTab" class="login-tabs" stretch>
            <el-tab-pane label="账号登录" name="account" />
            <el-tab-pane label="短信登录" name="sms" />
          </el-tabs>

          <el-form
            ref="formRef"
            class="login-form"
            :model="form"
            :rules="rules"
            :validate-on-rule-change="false"
            size="large"
            @submit.prevent="handleSubmit"
          >
            <template v-if="isSmsLogin">
              <el-form-item prop="phone">
                <el-input
                  v-model="form.phone"
                  placeholder="请输入手机号"
                  :prefix-icon="Iphone"
                  maxlength="11"
                  clearable
                />
              </el-form-item>
              <el-form-item prop="smsCode">
                <xnSmsCode v-model="form.smsCode" :phone="form.phone" :request="sendLoginSms" />
              </el-form-item>
              <p class="sms-hint">演示号 18888888888（admin），验证码将弹窗展示</p>
            </template>
            <template v-else>
              <el-form-item prop="username">
                <el-input
                  v-model="form.username"
                  placeholder="请输入用户名"
                  :prefix-icon="User"
                  clearable
                />
              </el-form-item>
              <el-form-item v-if="isRegister" prop="nickname">
                <el-input
                  v-model="form.nickname"
                  placeholder="昵称（可选）"
                  :prefix-icon="User"
                  clearable
                />
              </el-form-item>
              <el-form-item prop="password">
                <el-input
                  v-model="form.password"
                  type="password"
                  placeholder="请输入密码"
                  show-password
                  :prefix-icon="Lock"
                  @keyup.enter="handleSubmit"
                />
              </el-form-item>
              <el-form-item v-if="isRegister" prop="confirmPassword">
                <el-input
                  v-model="form.confirmPassword"
                  type="password"
                  placeholder="请确认密码"
                  show-password
                  :prefix-icon="Lock"
                  @keyup.enter="handleSubmit"
                />
              </el-form-item>

              <el-form-item v-if="captchaEnabled && captchaType === 'IMAGE'" prop="captcha">
                <xnCaptcha
                  ref="captchaRef"
                  v-model="form.captcha"
                  v-model:captcha-id="captchaId"
                  type="IMAGE"
                />
              </el-form-item>

              <el-form-item v-if="captchaEnabled && captchaType === 'SLIDER'" prop="sliderOk">
                <xnCaptcha
                  ref="captchaRef"
                  v-model:captcha-id="captchaId"
                  type="SLIDER"
                  @verified="onSliderVerified"
                />
              </el-form-item>
            </template>

            <el-form-item class="login-action">
              <el-button
                type="primary"
                class="login-btn"
                :loading="loading"
                native-type="submit"
                @click="handleSubmit"
              >
                {{ isRegister ? '注 册' : '登 录' }}
              </el-button>
            </el-form-item>
          </el-form>

          <div class="login-switch">
            <template v-if="isRegister">
              已有账号？
              <button type="button" class="login-switch-link" @click="switchMode('login')">
                去登录
              </button>
            </template>
            <template v-else>
              没有账号？
              <button type="button" class="login-switch-link" @click="switchMode('register')">
                去注册
              </button>
            </template>
          </div>

          <footer class="login-foot">
            {{ appConfig.app.footer || `${intro.title} · Copyright © 2026` }}
          </footer>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import { ElMessage } from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { User, Lock, Iphone } from '@element-plus/icons-vue'
import { appConfig, defaultAppConfig } from '@/config/app'
import { homeConfig } from '@/config/home'
import { useUserStore } from '@/stores/user'
import { getActive } from '@/api/login-page'
import { register as registerApi, sendSms } from '@/api/auth'
import xnCaptcha from '@/components/xnCaptcha/xnCaptcha.vue'
import xnSmsCode from '@/components/xnSmsCode/xnSmsCode.vue'

const iconMap = ElementPlusIconsVue

export default {
  name: 'LoginView',
  components: { xnCaptcha, xnSmsCode },
  setup() {
    const userStore = useUserStore()
    return {
      userStore,
      User: markRaw(User),
      Lock: markRaw(Lock),
      Iphone: markRaw(Iphone),
      appConfig,
      localLogo: defaultAppConfig.app.logo,
      intro: homeConfig.intro,
      iconMap,
    }
  },
  data() {
    return {
      loading: false,
      mode: 'login',
      loginTab: 'account',
      logoFailed: false,
      captchaEnabled: false,
      captchaType: null,
      captchaId: '',
      sliderOk: false,
      form: {
        username: 'admin',
        password: 'admin',
        nickname: '',
        confirmPassword: '',
        captcha: '',
        sliderOk: false,
        phone: '18888888888',
        smsCode: '',
      },
    }
  },
  computed: {
    isRegister() {
      return this.mode === 'register'
    },
    isSmsLogin() {
      return !this.isRegister && this.loginTab === 'sms'
    },
    logoSrc() {
      const configured = (this.appConfig.app.logo || '').trim()
      return this.logoFailed ? this.localLogo : configured || this.localLogo
    },
    rules() {
      if (this.isSmsLogin) {
        return {
          phone: [
            { required: true, message: '请输入手机号', trigger: 'blur' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
          ],
          smsCode: [
            { required: true, message: '请输入短信验证码', trigger: 'blur' },
            { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: 'blur' },
          ],
        }
      }
      const base = {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' },
          ...(this.isRegister
            ? [{ min: 2, max: 50, message: '用户名长度需在2-50之间', trigger: 'blur' }]
            : []),
        ],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
      }
      if (this.isRegister) {
        base.nickname = [{ max: 50, message: '昵称长度不能超过50', trigger: 'blur' }]
        base.confirmPassword = [
          { required: true, message: '请再次输入密码', trigger: 'blur' },
          {
            validator: (_r, value, callback) => {
              if (value !== this.form.password) {
                callback(new Error('两次输入的密码不一致'))
                return
              }
              callback()
            },
            trigger: 'blur',
          },
        ]
      }
      if (this.captchaEnabled && this.captchaType === 'IMAGE') {
        base.captcha = [{ required: true, message: '请输入验证码', trigger: 'blur' }]
      }
      if (this.captchaEnabled && this.captchaType === 'SLIDER') {
        base.sliderOk = [
          {
            validator: (_r, _value, callback) => {
              if (!this.sliderOk) {
                callback(new Error('请完成滑块验证'))
                return
              }
              callback()
            },
            trigger: 'change',
          },
        ]
      }
      return base
    },
  },
  mounted() {
    document.documentElement.classList.add('login-no-scroll')
    document.body.classList.add('login-no-scroll')
    this.loadPageConfig()
  },
  beforeUnmount() {
    document.documentElement.classList.remove('login-no-scroll')
    document.body.classList.remove('login-no-scroll')
  },
  methods: {
    onLogoError() {
      if (this.logoSrc !== this.localLogo) this.logoFailed = true
    },
    iconOf(name) {
      return iconMap[name] || ElementPlusIconsVue.InfoFilled
    },
    refreshCaptcha() {
      if (!this.captchaEnabled) return
      this.form.captcha = ''
      this.sliderOk = false
      this.form.sliderOk = false
      this.$refs.captchaRef?.refresh()
    },
    onSliderVerified(ok) {
      this.sliderOk = ok
      this.form.sliderOk = ok
      if (ok) this.$refs.formRef?.clearValidate('sliderOk')
    },
    switchMode(next) {
      this.mode = next
      this.loginTab = 'account'
      this.form.nickname = ''
      this.form.confirmPassword = ''
      this.form.captcha = ''
      this.form.smsCode = ''
      if (next === 'login') {
        this.form.username = 'admin'
        this.form.password = 'admin'
        this.form.phone = '18888888888'
      } else {
        this.form.username = ''
        this.form.password = ''
      }
      this.$refs.formRef?.clearValidate()
      this.refreshCaptcha()
    },
    async loadPageConfig() {
      try {
        const res = await getActive()
        const cfg = res.data
        if (!cfg) return
        this.captchaEnabled = !!cfg.captchaEnabled
        this.captchaType = cfg.captchaType || null
        await this.$nextTick()
        this.$refs.formRef?.clearValidate(['captcha', 'sliderOk'])
      } catch {
        // 无配置或接口失败时不启用验证码
      }
    },
    async sendLoginSms(phone) {
      const res = await sendSms({ phone, scene: 'LOGIN' })
      return res.data
    },
    async handleSubmit() {
      const formRef = this.$refs.formRef
      if (!formRef) return
      await formRef.validate(async (valid) => {
        if (!valid) return
        this.loading = true
        const captchaOpts = {
          captchaId: this.captchaEnabled ? this.captchaId : undefined,
          captchaCode:
            this.captchaEnabled && this.captchaType === 'IMAGE' ? this.form.captcha : undefined,
        }
        try {
          if (this.isRegister) {
            await registerApi({
              username: this.form.username,
              password: this.form.password,
              nickname: this.form.nickname || undefined,
              ...captchaOpts,
            })
            ElMessage.success('注册成功，请登录')
            const username = this.form.username
            this.switchMode('login')
            this.form.username = username
            this.form.password = ''
            return
          }
          const data = this.isSmsLogin
            ? await this.userStore.loginBySms(this.form.phone, this.form.smsCode)
            : await this.userStore.login(this.form.username, this.form.password, captchaOpts)
          if (data.user?.mustChangePassword) {
            ElMessage.warning('请先修改密码后再使用系统')
            this.$router.push({ path: '/profile', query: { forcePwd: '1' } })
          } else {
            ElMessage.success('登录成功')
            this.$router.push('/dashboard')
          }
        } catch {
          if (this.captchaEnabled && !this.isSmsLogin) {
            await this.refreshCaptcha()
          }
        } finally {
          this.loading = false
        }
      })
    },
  },
}
</script>

<style>
html.login-no-scroll,
body.login-no-scroll {
  overflow: hidden !important;
  height: 100%;
  overscroll-behavior: none;
}
</style>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap');

.login-page {
  --xn-navy: #0b2a4a;
  --xn-navy-deep: #071c33;
  --xn-teal: #1a8f91;
  --xn-teal-bright: #2bb3b0;
  --xn-accent: #c17a45;
  --xn-accent-soft: rgba(193, 122, 69, 0.18);
  --xn-ink: #12263a;
  --xn-muted: #5b6b7c;
  /* 登录页是独立浅色卡片，不跟随后台 html.dark / color-scheme */
  color-scheme: light;
  --el-text-color-primary: var(--xn-ink);
  --el-text-color-regular: var(--xn-ink);
  --el-text-color-secondary: var(--xn-muted);
  --el-text-color-placeholder: #8a97a6;
  --el-text-color-disabled: #c0c4cc;
  --el-input-text-color: var(--xn-ink);
  --el-input-placeholder-color: #8a97a6;
  --el-input-bg-color: #ffffff;
  --el-fill-color-blank: #ffffff;
  --el-bg-color: #ffffff;

  position: relative;
  width: 100%;
  /* 100vh 兜底旧浏览器；100dvh 按移动端动态视口，避免地址栏造成溢出 */
  height: 100vh;
  height: 100dvh;
  max-height: 100vh;
  max-height: 100dvh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  font-family: 'Outfit', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background:
    radial-gradient(ellipse 80% 60% at 12% 18%, rgba(43, 179, 176, 0.22), transparent 55%),
    radial-gradient(ellipse 70% 50% at 88% 82%, rgba(193, 122, 69, 0.12), transparent 50%),
    linear-gradient(145deg, #071c33 0%, #0b2a4a 42%, #0f4a5c 72%, #14616a 100%);
  color: var(--xn-ink);
}

.login-atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.mesh {
  position: absolute;
  inset: 0;
  opacity: 0.22;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 20%, transparent 75%);
}

.circuit {
  position: absolute;
  inset: 0;
  opacity: 0.35;
  background:
    radial-gradient(
      circle at 18% 72%,
      transparent 0 5px,
      rgba(43, 179, 176, 0.45) 5px 6px,
      transparent 7px
    ),
    radial-gradient(
      circle at 78% 28%,
      transparent 0 4px,
      rgba(193, 122, 69, 0.5) 4px 5px,
      transparent 6px
    ),
    radial-gradient(
      circle at 62% 78%,
      transparent 0 3px,
      rgba(43, 179, 176, 0.35) 3px 4px,
      transparent 5px
    );
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  animation: float 12s ease-in-out infinite;
}

.orb-a {
  width: 340px;
  height: 340px;
  left: -80px;
  top: -60px;
  background: rgba(43, 179, 176, 0.35);
}

.orb-b {
  width: 280px;
  height: 280px;
  right: -40px;
  bottom: 10%;
  background: rgba(11, 42, 74, 0.55);
  animation-delay: -4s;
}

.orb-c {
  width: 180px;
  height: 180px;
  left: 42%;
  bottom: -40px;
  background: rgba(193, 122, 69, 0.22);
  animation-delay: -7s;
}

@keyframes float {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(18px, -22px, 0) scale(1.06);
  }
}

.login-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  width: min(1080px, 100%);
  height: min(640px, 100%);
  max-height: 100%;
  min-height: 0;
  border-radius: 28px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    0 30px 80px rgba(3, 16, 32, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px);
  animation: shell-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes shell-in {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.login-brand {
  position: relative;
  padding: 36px 40px 24px;
  color: #eef6f8;
  background:
    linear-gradient(160deg, rgba(7, 28, 51, 0.55) 0%, rgba(15, 74, 92, 0.35) 100%),
    linear-gradient(180deg, transparent 60%, rgba(7, 28, 51, 0.35));
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.brand-glow {
  position: absolute;
  width: 280px;
  height: 280px;
  right: -60px;
  top: -40px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(43, 179, 176, 0.35), transparent 70%);
  pointer-events: none;
}

.brand-inner {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: brand-in 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
}

@keyframes brand-in {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.brand-logo-plate {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  max-width: 100%;
  padding: 12px 16px;
  margin-bottom: 18px;
  border-radius: 16px;
  background: #fff;
  box-shadow:
    0 16px 40px rgba(3, 16, 32, 0.28),
    0 0 0 1px rgba(255, 255, 255, 0.35);
}

.brand-logo {
  width: min(200px, 100%);
  height: auto;
  max-height: 88px;
  object-fit: contain;
  display: block;
}

.brand-slogan {
  margin: 0 0 8px;
  flex-shrink: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.35;
  background: linear-gradient(90deg, #f4fbfb 0%, #9fd9d7 55%, #e8b58a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.brand-desc {
  margin: 0 0 16px;
  flex-shrink: 0;
  max-width: 38em;
  font-size: 13px;
  line-height: 1.65;
  color: rgba(232, 242, 245, 0.78);
  font-weight: 400;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.brand-features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
}

.brand-features li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  animation: feature-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(0.22s + var(--i) * 0.08s);
}

@keyframes feature-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.feature-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  color: #9fe3e0;
  background: linear-gradient(145deg, rgba(43, 179, 176, 0.28), rgba(11, 42, 74, 0.35));
  border: 1px solid rgba(43, 179, 176, 0.28);
}

.feature-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.feature-text strong {
  font-size: 14px;
  font-weight: 600;
  color: #f5fbfb;
}

.feature-text em {
  font-style: normal;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(220, 232, 236, 0.68);
}

.brand-foot {
  position: relative;
  flex-shrink: 0;
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(232, 242, 245, 0.55);
}

.brand-foot .dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--xn-accent);
  box-shadow: 0 0 0 3px var(--xn-accent-soft);
}

.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  overflow: hidden;
  padding: 32px 36px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, #f7fafb 100%);
}

.login-card {
  width: 100%;
  max-width: 360px;
  animation: panel-in 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both;
}

@keyframes panel-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  margin-bottom: 22px;
  text-align: left;
}

.welcome {
  margin: 0 0 6px;
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--xn-teal);
  font-weight: 600;
}

.login-header h1 {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--xn-navy);
  line-height: 1.25;
}

.hint {
  margin: 0;
  font-size: 14px;
  color: var(--xn-muted);
}

.login-tabs {
  margin: -4px 0 12px;
}

.login-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.login-tabs :deep(.el-tabs__item) {
  font-weight: 600;
  color: var(--xn-muted);
}

.login-tabs :deep(.el-tabs__item.is-active) {
  color: var(--xn-navy);
}

.login-tabs :deep(.el-tabs__content) {
  display: none;
}

.sms-hint {
  margin: -4px 0 12px;
  font-size: 12px;
  color: var(--xn-muted);
}

.login-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  padding: 4px 14px;
  box-shadow: 0 0 0 1px rgba(11, 42, 74, 0.1) inset;
  background: rgba(255, 255, 255, 0.9);
  transition:
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.login-form :deep(.el-input__inner) {
  color: var(--xn-ink);
  -webkit-text-fill-color: var(--xn-ink);
}

.login-form :deep(.el-input__inner::placeholder) {
  color: #8a97a6;
  -webkit-text-fill-color: #8a97a6;
}

.login-form :deep(.el-input__prefix),
.login-form :deep(.el-input__suffix) {
  color: var(--xn-muted);
}

.login-form :deep(input:-webkit-autofill),
.login-form :deep(input:-webkit-autofill:hover),
.login-form :deep(input:-webkit-autofill:focus) {
  -webkit-text-fill-color: var(--xn-ink);
  caret-color: var(--xn-ink);
  transition: background-color 9999s ease-out;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px rgba(26, 143, 145, 0.35) inset;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px var(--xn-teal) inset,
    0 0 0 3px rgba(26, 143, 145, 0.15) !important;
}

.login-action {
  margin-bottom: 0 !important;
  margin-top: 8px;
}

.login-btn {
  width: 100%;
  height: 46px;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.28em;
  background: linear-gradient(120deg, var(--xn-teal) 0%, #14707c 48%, var(--xn-navy) 100%);
  box-shadow: 0 12px 28px rgba(20, 112, 124, 0.35);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.login-btn:hover,
.login-btn:focus {
  filter: brightness(1.06);
  box-shadow: 0 14px 32px rgba(20, 112, 124, 0.42);
  transform: translateY(-1px);
  background: linear-gradient(120deg, var(--xn-teal-bright) 0%, #14707c 48%, var(--xn-navy) 100%);
}

.login-btn:active {
  transform: translateY(0);
}

.login-switch {
  margin-top: 4px;
  text-align: center;
  font-size: 13px;
  color: var(--xn-muted);
}

.login-switch-link {
  border: none;
  background: none;
  padding: 0;
  margin-left: 4px;
  color: var(--xn-teal);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.login-switch-link:hover {
  color: var(--xn-teal-bright);
  text-decoration: underline;
}

.login-foot {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  line-height: 1.5;
  color: #8a97a6;
}

/* 外观-暗色：跟后台炭黑表面 / 主题主色对齐，右侧不再用独立浅色卡片 */
html.dark .login-page {
  color-scheme: dark;
  --xn-navy: #e5eaf3;
  --xn-navy-deep: #141414;
  --xn-teal: var(--app-color-primary, #409eff);
  --xn-teal-bright: var(--el-color-primary-dark-2, #66b1ff);
  --xn-accent: var(--app-color-primary, #409eff);
  --xn-accent-soft: rgba(var(--app-color-primary-rgb, 64, 158, 255), 0.2);
  --xn-ink: #e5eaf3;
  --xn-muted: #a3a6ad;
  --el-text-color-primary: #e5eaf3;
  --el-text-color-regular: #e5eaf3;
  --el-text-color-secondary: #a3a6ad;
  --el-text-color-placeholder: #8d9095;
  --el-input-text-color: #e5eaf3;
  --el-input-placeholder-color: #8d9095;
  --el-input-bg-color: #262727;
  --el-fill-color-blank: #262727;
  --el-bg-color: #1d1e1f;
  color: var(--xn-ink);
  background:
    radial-gradient(
      ellipse 80% 60% at 12% 18%,
      rgba(var(--app-color-primary-rgb, 64, 158, 255), 0.16),
      transparent 55%
    ),
    radial-gradient(ellipse 70% 50% at 88% 82%, rgba(64, 158, 255, 0.06), transparent 50%),
    linear-gradient(145deg, #0a0a0a 0%, #141414 48%, #1d1e1f 100%);
}

html.dark .login-page .login-shell {
  background: #141414;
  border-color: #414243;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
}

html.dark .login-page .login-brand {
  color: #e5eaf3;
  background: linear-gradient(160deg, #141414 0%, #1d1e1f 100%);
}

html.dark .login-page .brand-glow {
  background: radial-gradient(
    circle,
    rgba(var(--app-color-primary-rgb, 64, 158, 255), 0.22),
    transparent 70%
  );
}

html.dark .login-page .brand-logo-plate {
  background: #1d1e1f;
  box-shadow: 0 0 0 1px #414243;
}

html.dark .login-page .brand-slogan {
  background: linear-gradient(90deg, #e5eaf3 0%, var(--xn-teal) 70%);
  -webkit-background-clip: text;
  background-clip: text;
}

html.dark .login-page .feature-icon {
  color: var(--xn-teal);
  background: rgba(var(--app-color-primary-rgb, 64, 158, 255), 0.14);
  border-color: rgba(var(--app-color-primary-rgb, 64, 158, 255), 0.28);
}

html.dark .login-page .login-panel {
  background: #1d1e1f;
}

html.dark .login-page .login-form :deep(.el-input__wrapper) {
  background: #262727;
  box-shadow: 0 0 0 1px #414243 inset;
}

html.dark .login-page .login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--xn-teal) inset;
}

html.dark .login-page .login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px var(--xn-teal) inset,
    0 0 0 3px rgba(var(--app-color-primary-rgb, 64, 158, 255), 0.18) !important;
}

html.dark .login-page .login-form :deep(.el-input__inner::placeholder) {
  color: #8d9095;
  -webkit-text-fill-color: #8d9095;
}

html.dark .login-page .login-btn {
  background: var(--xn-teal);
  box-shadow: 0 12px 28px rgba(var(--app-color-primary-rgb, 64, 158, 255), 0.28);
}

html.dark .login-page .login-btn:hover,
html.dark .login-page .login-btn:focus {
  background: var(--xn-teal-bright);
  box-shadow: 0 14px 32px rgba(var(--app-color-primary-rgb, 64, 158, 255), 0.36);
}

html.dark .login-page .login-foot {
  color: #a3a6ad;
}

@media (max-height: 760px) {
  .brand-logo {
    max-height: 72px;
    width: min(170px, 100%);
  }

  .brand-desc {
    display: none;
  }

  .brand-features li em {
    display: none;
  }

  .brand-features li {
    align-items: center;
    padding: 7px 10px;
  }

  .login-header {
    margin-bottom: 16px;
  }

  .login-header h1 {
    font-size: 22px;
  }

  .login-form :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  .login-foot {
    margin-top: 12px;
  }
}

@media (max-height: 640px) {
  .brand-features {
    display: none;
  }

  .brand-slogan {
    font-size: 18px;
  }

  .brand-logo-plate {
    padding: 8px 12px;
    margin-bottom: 12px;
  }

  .brand-logo {
    max-height: 56px;
  }
}

@media (max-width: 920px) {
  .login-page {
    padding: 12px;
  }

  .login-shell {
    grid-template-columns: 1fr;
    height: 100%;
    border-radius: 22px;
  }

  .login-brand {
    padding: 20px 22px 12px;
    flex: 0 0 auto;
  }

  .brand-logo-plate {
    padding: 10px 12px;
    margin-bottom: 10px;
  }

  .brand-logo {
    width: min(160px, 56vw);
    max-height: 64px;
  }

  .brand-slogan {
    font-size: 18px;
    margin-bottom: 0;
  }

  .brand-desc,
  .brand-features,
  .brand-foot {
    display: none;
  }

  .login-panel {
    padding: 20px 22px 18px;
    flex: 1;
  }

  .login-header h1 {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 0;
  }

  .login-shell {
    border-radius: 0;
    height: 100%;
    border: none;
  }
}
</style>
