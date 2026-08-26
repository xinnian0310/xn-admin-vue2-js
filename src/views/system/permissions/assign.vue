<template>
  <xnDialog
    v-model="visible"
    :title="`分配权限 - ${menuName}`"
    width="920px"
    show-fullscreen
    :show-cancel="false"
    confirm-text="完成"
    @confirm="visible = false"
    @closed="handleClosed"
  >
    <el-tabs v-model="activeTab">
      <el-tab-pane label="接口" name="api">
        <PermissionAssignPanel
          :items="groups.api"
          type="API"
          :menu-id="menuId"
          @changed="loadGroups"
        />
      </el-tab-pane>
      <el-tab-pane label="按钮" name="button">
        <PermissionAssignPanel
          :items="groups.button"
          type="BUTTON"
          :menu-id="menuId"
          :button-prefix="buttonPrefix"
          @changed="loadGroups"
        />
      </el-tab-pane>
      <el-tab-pane label="表格操作列按钮" name="tableButton">
        <PermissionAssignPanel
          :items="groups.tableButton"
          type="TABLE_BUTTON"
          :menu-id="menuId"
          :button-prefix="buttonPrefix"
          @changed="loadGroups"
        />
      </el-tab-pane>
    </el-tabs>
  </xnDialog>
</template>

<script>
import { getMenuGroups } from '@/api/permission'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import PermissionAssignPanel from './assign-panel.vue'

export default {
  name: 'PermissionAssign',
  components: { PermissionAssignPanel, xnDialog },
  emits: ['success'],
  data() {
    return {
      visible: false,
      activeTab: 'api',
      menuId: 0,
      menuName: '',
      groups: {
        menuId: 0,
        menuName: '',
        menuCode: '',
        api: [],
        button: [],
        tableButton: [],
      },
    }
  },
  computed: {
    buttonPrefix() {
      const code = this.groups.menuCode ?? ''
      const parts = code.split(':')
      return parts[parts.length - 1] || ''
    },
  },
  methods: {
    async loadGroups() {
      if (!this.menuId) return
      const res = await getMenuGroups(this.menuId)
      Object.assign(this.groups, res.data)
      this.$emit('success')
    },
    async open(id, name) {
      this.menuId = id
      this.menuName = name
      this.activeTab = 'api'
      this.visible = true
      await this.loadGroups()
    },
    handleClosed() {
      this.menuId = 0
      this.menuName = ''
      this.groups.menuCode = ''
      this.groups.api = []
      this.groups.button = []
      this.groups.tableButton = []
    },
  },
}
</script>
