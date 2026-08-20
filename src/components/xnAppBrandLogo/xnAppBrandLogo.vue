<template>
  <img
    v-if="!useIconFallback"
    class="app-brand-logo"
    :key="resolvedSrc"
    :src="resolvedSrc"
    :alt="alt"
    :width="resolvedWidth ?? undefined"
    :height="resolvedHeight ?? undefined"
    :style="sizeStyle"
    @error="onImgError"
  />
  <el-icon v-else class="app-brand-logo is-fallback" :size="fallbackSize" :style="fallbackStyle">
    <Monitor />
  </el-icon>
</template>

<script>
import { Monitor } from '@element-plus/icons-vue'
import { appConfig, defaultAppConfig } from '@/config/app'

export default {
  name: 'XnAppBrandLogo',
  components: { Monitor },
  props: {
    src: { required: false, default: undefined },
    width: { required: false, default: undefined },
    height: { required: false, default: undefined },
    alt: { type: String, required: false, default: appConfig.app.name },
  },
  data() {
    return {
      loadFailed: false,
      localFailed: false,
    }
  },
  computed: {
    localLogo() {
      return defaultAppConfig.app.logo
    },
    configuredSrc() {
      const value = this.src ?? appConfig.app.logo
      return value?.trim() || ''
    },
    resolvedSrc() {
      if (this.loadFailed) return this.localLogo
      return this.configuredSrc || this.localLogo
    },
    useIconFallback() {
      return this.localFailed
    },
    resolvedWidth() {
      return this.width !== undefined ? this.width : appConfig.app.logoWidth
    },
    resolvedHeight() {
      return this.height !== undefined ? this.height : appConfig.app.logoHeight
    },
    /** 只设一边时另一边为 auto，保持原图比例；两边都设则定宽高 */
    sizeStyle() {
      const w = this.resolvedWidth
      const h = this.resolvedHeight
      return {
        width: w != null ? `${w}px` : 'auto',
        height: h != null ? `${h}px` : 'auto',
      }
    },
    fallbackSize() {
      const w = this.resolvedWidth
      const h = this.resolvedHeight
      if (w != null && h != null) return Math.min(w, h)
      if (w != null) return w
      if (h != null) return h
      return 28
    },
    fallbackStyle() {
      return {
        width: `${this.fallbackSize}px`,
        height: `${this.fallbackSize}px`,
        fontSize: `${this.fallbackSize}px`,
      }
    },
  },
  watch: {
    configuredSrc() {
      this.loadFailed = false
      this.localFailed = false
    },
  },
  methods: {
    onImgError() {
      if (this.resolvedSrc !== this.localLogo) {
        this.loadFailed = true
        return
      }
      this.localFailed = true
    },
  },
}
</script>

<style scoped>
.app-brand-logo {
  display: inline-block;
  flex-shrink: 0;
  object-fit: contain;
  vertical-align: middle;
}

.app-brand-logo.is-fallback {
  color: var(--app-sidebar-active);
}
</style>
