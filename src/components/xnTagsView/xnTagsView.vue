<template>
  <div class="tags-view">
    <button
      v-show="showArrows"
      type="button"
      class="tags-view__arrow"
      :disabled="!canScrollLeft"
      title="向左"
      @click="scrollBy(-1)"
    >
      <el-icon><ArrowLeft /></el-icon>
    </button>

    <div ref="scrollRef" class="tags-view__scroll" @scroll="updateScrollState">
      <el-dropdown
        v-for="tag in tagsViewStore.visitedViews"
        :key="tag.path"
        trigger="contextmenu"
        placement="bottom-start"
        @command="(cmd) => onMenuCommand(cmd, tag)"
      >
        <div
          class="tags-view__item"
          :class="{ 'is-active': isActive(tag) }"
          @click="handleClick(tag)"
        >
          <span class="tags-view__title">{{ tag.title }}</span>
          <el-icon v-if="!tag.affix" class="tags-view__close" @click.stop="handleClose(tag)">
            <Close />
          </el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="refresh" :icon="RefreshRight"> 刷新 </el-dropdown-item>
            <el-dropdown-item divided command="close" :icon="Close" :disabled="!!tag.affix">
              关闭当前
            </el-dropdown-item>
            <el-dropdown-item
              command="closeLeft"
              :icon="DArrowLeft"
              :disabled="!hasClosableLeft(tag)"
            >
              关闭左侧
            </el-dropdown-item>
            <el-dropdown-item
              command="closeRight"
              :icon="DArrowRight"
              :disabled="!hasClosableRight(tag)"
            >
              关闭右侧
            </el-dropdown-item>
            <el-dropdown-item command="closeAll" :icon="CircleClose" :disabled="!hasClosableAny()">
              关闭全部
            </el-dropdown-item>
            <el-dropdown-item divided command="fullscreen" :icon="FullScreen">
              全屏当前标签
            </el-dropdown-item>
            <el-dropdown-item command="openWindow" :icon="CopyDocument">
              在新窗口打开
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <button
      v-show="showArrows"
      type="button"
      class="tags-view__arrow"
      :disabled="!canScrollRight"
      title="向右"
      @click="scrollBy(1)"
    >
      <el-icon><ArrowRight /></el-icon>
    </button>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  CircleClose,
  Close,
  CopyDocument,
  DArrowLeft,
  DArrowRight,
  FullScreen,
  RefreshRight,
} from '@element-plus/icons-vue'
import { useTagsViewStore } from '@/stores/tagsView'

export default {
  name: 'XnTagsView',
  components: {
    ArrowLeft,
    ArrowRight,
  },
  setup() {
    const tagsViewStore = useTagsViewStore()
    return {
      tagsViewStore,
      CircleClose: markRaw(CircleClose),
      Close: markRaw(Close),
      CopyDocument: markRaw(CopyDocument),
      DArrowLeft: markRaw(DArrowLeft),
      DArrowRight: markRaw(DArrowRight),
      FullScreen: markRaw(FullScreen),
      RefreshRight: markRaw(RefreshRight),
    }
  },
  data() {
    return {
      showArrows: false,
      canScrollLeft: false,
      canScrollRight: false,
      resizeObserver: null,
    }
  },
  watch: {
    '$route.path': {
      async handler() {
        await this.$nextTick()
        this.scheduleScrollActiveIntoView()
      },
    },
    'tagsViewStore.visitedViews.length': {
      async handler() {
        await this.$nextTick()
        this.scheduleScrollActiveIntoView()
      },
    },
  },
  mounted() {
    this.updateScrollState()
    this.scheduleScrollActiveIntoView()
    const el = this.$refs.scrollRef
    if (el && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateScrollState())
      this.resizeObserver.observe(el)
    }
    window.addEventListener('resize', this.updateScrollState)
  },
  beforeUnmount() {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    window.removeEventListener('resize', this.updateScrollState)
  },
  methods: {
    isActive(tag) {
      return tag.path === this.$route.path
    },
    hasClosableLeft(tag) {
      const index = this.tagsViewStore.visitedViews.findIndex((v) => v.path === tag.path)
      if (index <= 0) return false
      return this.tagsViewStore.visitedViews.slice(0, index).some((v) => !v.affix)
    },
    hasClosableRight(tag) {
      const index = this.tagsViewStore.visitedViews.findIndex((v) => v.path === tag.path)
      if (index === -1) return false
      return this.tagsViewStore.visitedViews.slice(index + 1).some((v) => !v.affix)
    },
    hasClosableAny() {
      return this.tagsViewStore.visitedViews.some((v) => !v.affix)
    },
    handleClick(tag) {
      if (tag.path !== this.$route.path) {
        this.$router.push(tag.path)
      }
    },
    ensureRouteAlive(fallback) {
      if (!this.tagsViewStore.visitedViews.some((v) => v.path === this.$route.path)) {
        this.$router.push(fallback.path)
      }
    },
    handleClose(tag) {
      const views = this.tagsViewStore.visitedViews
      const index = views.findIndex((v) => v.path === tag.path)
      this.tagsViewStore.delView(tag)
      if (tag.path !== this.$route.path) {
        this.$nextTick(this.updateScrollState)
        return
      }
      if (views.length <= 1) {
        this.$router.push('/dashboard')
        return
      }
      const nextTag = views[index + 1] || views[index - 1]
      if (nextTag) {
        this.$router.push(nextTag.path)
      } else {
        this.$router.push('/dashboard')
      }
    },
    async handleRefresh(tag) {
      if (tag.path !== this.$route.path) {
        await this.$router.push(tag.path)
      }
      this.tagsViewStore.delCachedView(tag.name)
      await this.$router.replace({ path: `/redirect${tag.path}`, query: this.$route.query })
    },
    async handleFullscreen(tag) {
      if (tag.path !== this.$route.path) {
        await this.$router.push(tag.path)
      }
      this.tagsViewStore.setFullscreen(true)
    },
    handleOpenWindow(tag) {
      const { href } = this.$router.resolve(tag.path)
      window.open(href, '_blank')
    },
    async onMenuCommand(command, tag) {
      await this.handleMenuCommand(command, tag)
    },
    async handleMenuCommand(command, tag) {
      switch (command) {
        case 'refresh':
          await this.handleRefresh(tag)
          break
        case 'close':
          this.handleClose(tag)
          break
        case 'closeLeft':
          this.tagsViewStore.delLeftViews(tag)
          this.ensureRouteAlive(tag)
          break
        case 'closeRight':
          this.tagsViewStore.delRightViews(tag)
          this.ensureRouteAlive(tag)
          break
        case 'closeAll':
          this.tagsViewStore.delAllViews()
          this.ensureRouteAlive(this.tagsViewStore.visitedViews[0] || tag)
          break
        case 'fullscreen':
          await this.handleFullscreen(tag)
          break
        case 'openWindow':
          this.handleOpenWindow(tag)
          break
      }
      await this.$nextTick()
      this.scheduleScrollActiveIntoView()
    },
    updateScrollState() {
      const el = this.$refs.scrollRef
      if (!el) {
        this.showArrows = false
        this.canScrollLeft = false
        this.canScrollRight = false
        return
      }
      const overflow = el.scrollWidth > el.clientWidth + 1
      this.showArrows = overflow
      this.canScrollLeft = el.scrollLeft > 1
      this.canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    },
    scrollBy(direction) {
      const el = this.$refs.scrollRef
      if (!el) return
      const step = Math.max(160, Math.floor(el.clientWidth * 0.6))
      el.scrollBy({ left: direction * step, behavior: 'smooth' })
    },
    scrollActiveIntoView() {
      const container = this.$refs.scrollRef
      if (!container) {
        this.updateScrollState()
        return
      }
      const activeEl = container.querySelector('.tags-view__item.is-active')
      if (!activeEl) {
        this.updateScrollState()
        return
      }

      const padding = 12
      const cRect = container.getBoundingClientRect()
      const aRect = activeEl.getBoundingClientRect()

      if (aRect.left < cRect.left + padding) {
        container.scrollBy({ left: aRect.left - cRect.left - padding, behavior: 'smooth' })
      } else if (aRect.right > cRect.right - padding) {
        container.scrollBy({ left: aRect.right - cRect.right + padding, behavior: 'smooth' })
      }
      this.updateScrollState()
    },
    scheduleScrollActiveIntoView() {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.scrollActiveIntoView())
      })
    },
  },
}
</script>

<style scoped>
.tags-view {
  display: flex;
  align-items: stretch;
  height: var(--app-tags-view-height);
  background: var(--app-tags-bg);
  border-bottom: 1px solid var(--app-tags-border);
  font-size: var(--app-font-size-tags-view);
}

.tags-view__arrow {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  border: none;
  border-right: 1px solid var(--app-tags-border);
  background: var(--app-tags-bg);
  color: var(--app-tags-item-text);
  cursor: pointer;
  padding: 0;
}

.tags-view__arrow:last-child {
  border-right: none;
  border-left: 1px solid var(--app-tags-border);
}

.tags-view__arrow:hover:not(:disabled) {
  color: var(--app-color-primary);
  background: var(--app-tags-item-hover-bg);
}

.tags-view__arrow:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.tags-view__scroll {
  display: flex;
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}

.tags-view__scroll::-webkit-scrollbar {
  display: none;
  height: 0;
}

.tags-view__scroll :deep(.el-dropdown) {
  display: inline-flex;
  height: 100%;
  flex-shrink: 0;
}

.tags-view__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 100%;
  padding: 0 12px;
  background: var(--app-tags-item-bg);
  color: var(--app-tags-item-text);
  font-size: inherit;
  cursor: pointer;
  white-space: nowrap;
  border: none;
  border-right: 1px solid var(--app-tags-border);
  transition:
    background 0.2s,
    color 0.2s;
  outline: none;
}

.tags-view__item:hover {
  background: var(--app-tags-item-hover-bg);
}

.tags-view__item.is-active {
  background: var(--app-tags-item-active-bg);
  color: var(--app-tags-item-active-text);
}

.tags-view__title {
  line-height: 1;
}

.tags-view__close {
  font-size: var(--app-font-size-main);
  border-radius: 50%;
  padding: 1px;
}

.tags-view__item:not(.is-active) .tags-view__close:hover {
  color: var(--app-color-primary);
  background: var(--app-color-primary-light-9);
}

.tags-view__item.is-active .tags-view__close:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
