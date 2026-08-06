<template>
  <el-menu
    ref="menuRef"
    class="sidebar-menu"
    :class="{ 'is-horizontal': mode === 'horizontal' }"
    :mode="mode"
    :default-active="activeMenu"
    :default-openeds="initialOpenIds"
    router
    :background-color="bgColor"
    :text-color="textColor"
    :active-text-color="activeColor"
  >
    <xnSidebarMenuItem :menus="resolvedMenus" />
  </el-menu>
</template>

<script>
import { useMenuStore } from '@/stores/menu'
import { useThemeStore } from '@/stores/theme'
import { collectOpenMenuIds, filterHiddenMenus } from '@/utils/menu'
import xnSidebarMenuItem from './xnSidebarMenuItem.vue'

export default {
  name: 'XnSidebarMenu',
  components: { xnSidebarMenuItem },
  props: {
    mode: { type: String, required: false, default: 'vertical' },
    menus: { required: false },
  },
  setup() {
    const menuStore = useMenuStore()
    const themeStore = useThemeStore()
    return { menuStore, themeStore }
  },
  computed: {
    bgColor() {
      return this.themeStore.currentTheme.colors.sidebar.bg
    },
    textColor() {
      return this.themeStore.currentTheme.colors.sidebar.text
    },
    activeColor() {
      return this.themeStore.currentTheme.colors.sidebar.active
    },
    resolvedMenus() {
      return this.menus
        ? filterHiddenMenus(this.menus)
        : filterHiddenMenus(this.menuStore.menus)
    },
    activeMenu() {
      if (this.$route.meta.activeMenu) return this.$route.meta.activeMenu
      const base = this.$route.path.replace(/\/save(\/.*)?$/, '')
      return base || this.$route.path
    },
    /** 仅作首次挂载时的默认展开，后续不再用 key 强制重挂载，避免切换菜单时收起其他多级菜单 */
    initialOpenIds() {
      const ids = collectOpenMenuIds(this.resolvedMenus, this.activeMenu)
      return ids ?? []
    },
  },
  watch: {
    activeMenu: {
      async handler(path) {
        const ids = collectOpenMenuIds(this.resolvedMenus, path) ?? []
        await this.$nextTick()
        for (const id of ids) {
          this.$refs.menuRef?.open(id)
        }
      },
      immediate: true,
    },
    resolvedMenus: {
      async handler() {
        const ids = collectOpenMenuIds(this.resolvedMenus, this.activeMenu) ?? []
        await this.$nextTick()
        for (const id of ids) {
          this.$refs.menuRef?.open(id)
        }
      },
    },
  },
}
</script>

<style scoped>
.sidebar-menu {
  border-right: none !important;
  padding: 8px 10px 16px;
  /* Element Plus：level=0 时不会写入 CSS 变量，这里补上，保证层级缩进生效 */
  --el-menu-base-level-padding: 12px;
  --el-menu-level-padding: 22px;
  --el-menu-level: 0;
}

.sidebar-menu.is-horizontal {
  padding: 0;
  background: transparent !important;
}

.sidebar-menu:not(.is-horizontal) :deep(.el-menu-item),
.sidebar-menu:not(.is-horizontal) :deep(.el-sub-menu__title) {
  height: 42px;
  line-height: 42px;
  margin: 2px 0;
  border-radius: 8px;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.sidebar-menu:not(.is-horizontal) :deep(.el-menu-item:hover),
.sidebar-menu:not(.is-horizontal) :deep(.el-sub-menu__title:hover) {
  background-color: var(--app-sidebar-hover-bg) !important;
}

.sidebar-menu:not(.is-horizontal) :deep(.el-menu-item.is-active) {
  color: var(--app-sidebar-text-active) !important;
  background-color: var(--app-sidebar-active-bg) !important;
  font-weight: 600;
}

.sidebar-menu:not(.is-horizontal) :deep(.el-sub-menu .el-menu) {
  background-color: transparent !important;
}

/* 二级及以下：整体右移，和一级目录拉开层级 */
.sidebar-menu:not(.is-horizontal) :deep(.el-sub-menu .el-menu.el-menu--inline) {
  margin: 2px 0 6px 18px;
  padding-left: 10px;
}

.sidebar-menu:not(.is-horizontal) :deep(.el-sub-menu .el-menu .el-menu-item),
.sidebar-menu:not(.is-horizontal) :deep(.el-sub-menu .el-menu .el-sub-menu__title) {
  /* 覆盖 EP 默认，嵌套菜单自身已有 margin/padding，这里用较小的内容缩进即可 */
  padding-left: 12px !important;
  min-width: 0;
}

/* 三级再加深一层 */
.sidebar-menu:not(.is-horizontal)
  :deep(.el-sub-menu .el-menu .el-sub-menu .el-menu.el-menu--inline) {
  margin-left: 12px;
}

.sidebar-menu:not(.is-horizontal) :deep(.el-sub-menu.is-opened > .el-sub-menu__title) {
  color: var(--app-sidebar-text-active);
}
</style>
