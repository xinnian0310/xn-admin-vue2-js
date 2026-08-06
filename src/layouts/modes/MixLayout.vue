<template>
  <!-- 混合布局：顶栏一级菜单 + 左侧当前一级的子菜单 -->
  <el-container class="layout-mix" direction="vertical">
    <el-header v-show="!isFullscreen" class="layout-mix__header">
      <div class="layout-mix__brand">
        <xnAppBrandLogo />
        <span>{{ appConfig.app.name }}</span>
      </div>
      <el-menu
        class="layout-mix__top-menu"
        mode="horizontal"
        :ellipsis="false"
        :default-active="activeTopId"
        :background-color="sidebarColors.bg"
        :text-color="sidebarColors.text"
        :active-text-color="sidebarColors.active"
        @select="onTopSelect"
      >
        <el-menu-item v-for="item in rootMenus" :key="item.id" :index="item.id">
          <xnAppIcon v-if="item.icon" :name="item.icon" class="layout-mix__icon" />
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
      <LayoutHeader embed class="layout-mix__user" />
    </el-header>

    <el-container class="layout-mix__body">
      <LayoutAside
        v-if="sideMenus.length"
        :visible="!isFullscreen"
        :show-logo="false"
        :subtitle="activeTop?.title"
        :menus="sideMenus"
        width="200px"
      />
      <el-container class="layout-mix__main">
        <xnTagsView v-show="!isFullscreen" />
        <LayoutContent />
      </el-container>
    </el-container>
  </el-container>
</template>

<script>
import xnAppBrandLogo from '@/components/xnAppBrandLogo/xnAppBrandLogo.vue'
import xnAppIcon from '@/components/xnAppIcon/xnAppIcon.vue'
import xnTagsView from '@/components/xnTagsView/xnTagsView.vue'
import { useMenuStore } from '@/stores/menu'
import { useThemeStore } from '@/stores/theme'
import { filterHiddenMenus, findFirstNavigablePath, findTopLevelMenu } from '@/utils/menu'
import { appConfig } from '@/config/app'
import LayoutAside from '../components/LayoutAside.vue'
import LayoutHeader from '../components/LayoutHeader.vue'
import LayoutContent from '../components/LayoutContent.vue'

export default {
  name: 'MixLayout',
  components: {
    xnAppBrandLogo,
    xnAppIcon,
    xnTagsView,
    LayoutAside,
    LayoutHeader,
    LayoutContent,
  },
  props: {
    isFullscreen: { required: true },
  },
  setup() {
    const menuStore = useMenuStore()
    const themeStore = useThemeStore()
    return { menuStore, themeStore }
  },
  computed: {
    appConfig() {
      return appConfig
    },
    sidebarColors() {
      return this.themeStore.currentTheme.colors.sidebar
    },
    rootMenus() {
      return filterHiddenMenus(this.menuStore.menus)
    },
    activePath() {
      if (this.$route.meta.activeMenu) return this.$route.meta.activeMenu
      return this.$route.path.replace(/\/save(\/.*)?$/, '') || this.$route.path
    },
    activeTop() {
      return findTopLevelMenu(this.rootMenus, this.activePath) ?? this.rootMenus[0]
    },
    activeTopId() {
      return this.activeTop?.id ?? ''
    },
    sideMenus() {
      return this.activeTop?.children ?? []
    },
  },
  methods: {
    onTopSelect(id) {
      const item = this.rootMenus.find((m) => m.id === id)
      if (!item) return
      const path = findFirstNavigablePath(item)
      if (path && path !== this.$route.path) {
        this.$router.push(path)
      }
    },
  },
}
</script>

<style scoped>
.layout-mix {
  height: 100%;
}

.layout-mix__header {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 50px;
  padding: 0 16px;
  background: var(--app-sidebar-bg);
  border-bottom: 1px solid var(--app-sidebar-border);
}

.layout-mix__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  color: var(--app-sidebar-text-active);
  font-size: var(--app-font-size-main);
  font-weight: 600;
}

.layout-mix__top-menu {
  flex: 1;
  min-width: 0;
  border-bottom: none !important;
}

.layout-mix__icon {
  margin-right: 6px;
}

.layout-mix__user {
  flex-shrink: 0;
}

.layout-mix__user :deep(.layout-header__username),
.layout-mix__user :deep(.el-icon) {
  color: var(--app-sidebar-text-active);
}

.layout-mix__body {
  flex: 1;
  min-height: 0;
}

.layout-mix__main {
  flex-direction: column;
  min-width: 0;
}
</style>
