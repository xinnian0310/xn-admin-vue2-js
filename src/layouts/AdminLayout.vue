<template>
  <div class="admin-layout" :class="{ 'is-fullscreen': tagsViewStore.isFullscreen }">
    <xnWatermark>
      <component :is="layoutComponent" :is-fullscreen="tagsViewStore.isFullscreen" />
    </xnWatermark>

    <xnUiPreferenceFab />

    <transition name="fade">
      <button
        v-if="tagsViewStore.isFullscreen"
        type="button"
        class="exit-fullscreen"
        title="退出全屏 (Esc)"
        @click="tagsViewStore.setFullscreen(false)"
      >
        <el-icon><Close /></el-icon>
        <span>退出全屏</span>
      </button>
    </transition>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { appConfig } from '@/config/app'
import { useNoticeStore } from '@/stores/notice'
import { useTagsViewStore } from '@/stores/tagsView'
import xnUiPreferenceFab from '@/components/xnUiPreference/xnUiPreferenceFab.vue'
import xnWatermark from '@/components/xnWatermark/xnWatermark.vue'
import SideLayout from './modes/SideLayout.vue'
import TopLayout from './modes/TopLayout.vue'
import MixLayout from './modes/MixLayout.vue'
import ColumnsLayout from './modes/ColumnsLayout.vue'

const layoutMap = {
  side: markRaw(SideLayout),
  top: markRaw(TopLayout),
  mix: markRaw(MixLayout),
  columns: markRaw(ColumnsLayout),
}

export default {
  name: 'AdminLayout',
  components: {
    Close,
    xnUiPreferenceFab,
    xnWatermark,
    SideLayout,
    TopLayout,
    MixLayout,
    ColumnsLayout,
  },
  setup() {
    const tagsViewStore = useTagsViewStore()
    const noticeStore = useNoticeStore()
    return { tagsViewStore, noticeStore }
  },
  computed: {
    layoutComponent() {
      return layoutMap[appConfig.ui.layout.mode] ?? SideLayout
    },
  },
  mounted() {
    window.addEventListener('keydown', this.onKeydown)
    this.noticeStore.startRealtime()
  },
  unmounted() {
    window.removeEventListener('keydown', this.onKeydown)
    this.tagsViewStore.setFullscreen(false)
    this.noticeStore.stopRealtime()
  },
  methods: {
    onKeydown(e) {
      if (e.key === 'Escape' && this.tagsViewStore.isFullscreen) {
        this.tagsViewStore.setFullscreen(false)
      }
    },
  },
}
</script>

<style scoped>
.admin-layout {
  height: 100vh;
  position: relative;
}

.admin-layout :deep(.xn-watermark),
.admin-layout :deep(.el-watermark) {
  height: 100%;
}

.exit-fullscreen {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 3000;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--app-border-color, #dcdfe6);
  border-radius: 4px;
  background: var(--app-card-bg, #fff);
  color: var(--app-text-muted, #606266);
  font-size: var(--app-font-size-main);
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.exit-fullscreen:hover {
  color: var(--app-color-primary);
  border-color: var(--app-color-primary-light-5);
  background: var(--app-color-primary-light-9);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
