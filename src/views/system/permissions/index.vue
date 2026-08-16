<template>
  <xnPageLayout>
    <template #aside>
      <xnTreePanel
        title="选择角色"
        width="240px"
        v-model:filter="roleKeyword"
        filter-placeholder="搜索角色名称/编码"
      >
        <div
          v-for="role in filteredRoles"
          :key="role.id"
          class="role-item"
          :class="{ 'is-active': currentRole?.id === role.id }"
          @click="selectRole(role)"
        >
          <span class="role-item__name">{{ role.name }}</span>
          <el-tag v-if="role.builtIn" type="warning">内置</el-tag>
        </div>
      </xnTreePanel>
    </template>

    <template #toolbar>
      <div v-if="currentRole && !isSuperAdminRole">
        <h3 class="role-perm__title">为「{{ currentRole.name }}」配置权限</h3>
        <p class="role-perm__desc">左侧选菜单，右侧勾选后点击下方「保存」。</p>
      </div>
      <div v-else-if="currentRole">
        <h3 class="role-perm__title">{{ currentRole.name }}</h3>
      </div>
    </template>

    <div
      v-if="currentRole"
      class="role-perm__main-body"
      :class="{ 'is-super-admin': isSuperAdminRole }"
    >
      <div v-if="isSuperAdminRole" class="role-perm__locked">
        <div class="role-perm__locked-card">
          <div class="role-perm__locked-icon">
            <el-icon><Lock /></el-icon>
          </div>
          <h3 class="role-perm__locked-title">超级管理员</h3>
          <p class="role-perm__locked-desc">
            该角色默认拥有系统全部权限，无需在此配置，也无法修改。
          </p>
        </div>
      </div>

      <template v-else>
        <div v-loading="treeLoading" class="role-perm__body">
          <xnTreePanel
            ref="menuTreeRef"
            title="菜单"
            width="260px"
            v-model:filter="menuKeyword"
            filter-placeholder="搜索菜单名称/权限码"
            :data="menuTree"
            :tree-props="{ label: 'name', children: 'children', disabled: 'disabled' }"
            :filter-node-method="filterMenuNode"
            :current-key="selectedRouteId ?? undefined"
            class="role-perm__menus"
            @node-click="onMenuClick"
          >
            <template #node="{ data }">
              <span class="menu-node" :class="{ 'is-disabled': data.disabled }">
                <el-checkbox
                  :model-value="data.permissionId != null && isChecked(data.permissionId)"
                  :disabled="data.disabled || data.permissionId == null"
                  class="menu-node__check"
                  @click.stop
                  @change="
                    !data.disabled && data.permissionId != null && toggleItem(data.permissionId)
                  "
                />
                <span class="menu-node__name">{{ data.name }}</span>
                <el-tag
                  v-if="!data.permissionControl && data.type === 'MENU'"
                  type="info"
                  effect="plain"
                  class="menu-node__badge"
                >
                  未控权
                </el-tag>
                <el-tag
                  v-else-if="menuStat(data).total"
                  :type="menuStat(data).checked === menuStat(data).total ? 'success' : 'info'"
                  effect="plain"
                  class="menu-node__badge"
                >
                  {{ menuStat(data).checked }}/{{ menuStat(data).total }}
                </el-tag>
              </span>
            </template>
          </xnTreePanel>

          <section class="role-perm__detail">
            <template v-if="selectedRoute">
              <div class="role-perm__detail-header">
                <div class="role-perm__detail-title">
                  <span>{{ selectedRoute?.title }}</span>
                  <span v-if="selectedMenu?.code" class="role-perm__detail-code">{{
                    selectedMenu.code
                  }}</span>
                </div>
                <el-checkbox
                  v-if="assignableItems.length"
                  :model-value="isAllChecked"
                  :indeterminate="isIndeterminate"
                  @change="toggleSelectAll"
                >
                  全选
                </el-checkbox>
              </div>

              <el-scrollbar v-if="assignableItems.length" class="role-perm__detail-scroll">
                <div v-if="detailGroups.capability.length" class="perm-group">
                  <div class="perm-group__title">
                    <span>敏感信息</span>
                    <span class="perm-group__count">{{ detailGroups.capability.length }}</span>
                  </div>
                  <p class="perm-group__hint">
                    控制列表/详情/导出是否显示手机号、邮箱明文（字段范围在系统配置中设置）
                  </p>
                  <div class="perm-group__items">
                    <el-checkbox
                      v-for="item in detailGroups.capability"
                      :key="item.id"
                      border
                      :model-value="isChecked(item.id)"
                      class="perm-btn"
                      @change="toggleItem(item.id)"
                    >
                      {{ item.name }}
                      <el-tag type="danger" effect="plain" class="perm-btn__type">敏感</el-tag>
                    </el-checkbox>
                  </div>
                </div>

                <div v-if="detailGroups.button.length" class="perm-group">
                  <div class="perm-group__title">
                    <span>按钮</span>
                    <span class="perm-group__count">{{ detailGroups.button.length }}</span>
                  </div>
                  <p class="perm-group__hint">页面工具栏（新增 / 导入 / 导出等）</p>
                  <div class="perm-group__items">
                    <el-checkbox
                      v-for="item in detailGroups.button"
                      :key="item.id"
                      border
                      :model-value="isChecked(item.id)"
                      class="perm-btn"
                      @change="toggleItem(item.id)"
                    >
                      {{ item.name }}
                    </el-checkbox>
                  </div>
                </div>

                <div v-if="detailGroups.tableButton.length" class="perm-group">
                  <div class="perm-group__title">
                    <span>表格按钮</span>
                    <span class="perm-group__count">{{ detailGroups.tableButton.length }}</span>
                  </div>
                  <p class="perm-group__hint">表格操作列（查看 / 编辑 / 删除等）</p>
                  <div class="perm-group__items">
                    <el-checkbox
                      v-for="item in detailGroups.tableButton"
                      :key="item.id"
                      border
                      :model-value="isChecked(item.id)"
                      class="perm-btn"
                      @change="toggleItem(item.id)"
                    >
                      {{ item.name }}
                    </el-checkbox>
                  </div>
                </div>

                <div v-if="detailGroups.api.length" class="perm-group">
                  <div class="perm-group__title">
                    <span>接口权限</span>
                    <span class="perm-group__count">{{ detailGroups.api.length }}</span>
                  </div>
                  <div class="perm-group__apis">
                    <label
                      v-for="item in detailGroups.api"
                      :key="item.id"
                      class="perm-api"
                      :class="{ 'is-checked': isChecked(item.id) }"
                    >
                      <el-checkbox
                        :model-value="isChecked(item.id)"
                        @change="toggleItem(item.id)"
                      />
                      <el-tag :type="methodTagType(item.method)" class="perm-api__method">
                        {{ item.method || '-' }}
                      </el-tag>
                      <span class="perm-api__name">{{ item.name }}</span>
                      <code class="perm-api__path">{{ item.path }}</code>
                    </label>
                  </div>
                </div>
              </el-scrollbar>

              <el-empty
                v-else
                description="该菜单为分组菜单，请选择其下的子菜单进行配置"
                :image-size="90"
              />
            </template>

            <el-empty
              v-else
              description="请从左侧选择一个菜单，查看其接口与按钮权限"
              :image-size="110"
            />
          </section>
        </div>

        <div class="role-perm__footer">
          <span class="role-perm__footer-tip" :class="{ 'is-dirty': dirty }">
            {{ dirty ? '有未保存的修改' : '当前配置已保存' }}
          </span>
          <el-button type="primary" :loading="saving" :disabled="!dirty" @click="handleSave">
            保存
          </el-button>
        </div>
      </template>
    </div>

    <el-empty
      v-else
      class="role-perm__empty"
      description="请从最左侧选择一个角色"
      :image-size="120"
    />
  </xnPageLayout>
</template>

<script>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnTreePanel from '@/components/xnTreePanel/xnTreePanel.vue'
import { assignPermissions, get, getOptions } from '@/api/role'
import { list as listPermissions } from '@/api/permission'
import { list as listRoutes } from '@/api/route'

const permissionById = new Map()
const permissionByCode = new Map()
const routeById = new Map()

export default {
  name: 'RolePermissions',
  components: { xnPageLayout, xnTreePanel, Lock },
  setup() {
    const checkedIds = ref(new Set())
    const savedIds = ref(new Set())
    return { checkedIds, savedIds }
  },
  data() {
    return {
      roleKeyword: '',
      menuKeyword: '',
      roles: [],
      currentRole: null,
      routeTree: [],
      treeLoading: false,
      saving: false,
      selectedRouteId: null,
    }
  },
  computed: {
    dirty() {
      if (this.checkedIds.size !== this.savedIds.size) return true
      for (const id of this.checkedIds) {
        if (!this.savedIds.has(id)) return true
      }
      return false
    },
    isSuperAdminRole() {
      return this.currentRole?.code === 'SUPER_ADMIN'
    },
    filteredRoles() {
      const keyword = this.roleKeyword.trim().toLowerCase()
      if (!keyword) return this.roles
      return this.roles.filter(
        (role) =>
          role.name.toLowerCase().includes(keyword) || role.code.toLowerCase().includes(keyword),
      )
    },
    menuTree() {
      return this.toMenuNodes(this.routeTree)
    },
    selectedRoute() {
      return this.selectedRouteId != null ? (routeById.get(this.selectedRouteId) ?? null) : null
    },
    selectedMenu() {
      const code = this.selectedRoute?.permission
      return code ? (permissionByCode.get(code) ?? null) : null
    },
    detailGroups() {
      const groups = {
        capability: [],
        api: [],
        button: [],
        tableButton: [],
      }
      for (const child of this.selectedMenu?.children ?? []) {
        if (child.action === 'capability' || child.code === 'user:sensitive:view') {
          groups.capability.push(child)
        } else if (child.type === 'API') {
          groups.api.push(child)
        } else if (child.type === 'BUTTON') {
          groups.button.push(child)
        } else if (child.type === 'TABLE_BUTTON') {
          groups.tableButton.push(child)
        }
      }
      return groups
    },
    assignableItems() {
      return [
        ...this.detailGroups.capability,
        ...this.detailGroups.button,
        ...this.detailGroups.tableButton,
        ...this.detailGroups.api,
      ]
    },
    isAllChecked() {
      return (
        this.assignableItems.length > 0 &&
        this.assignableItems.every((item) => this.checkedIds.has(item.id))
      )
    },
    isIndeterminate() {
      const checked = this.assignableItems.filter((item) => this.checkedIds.has(item.id)).length
      return checked > 0 && checked < this.assignableItems.length
    },
  },
  watch: {
    '$route.query.roleId'() {
      if (this.roles.length) {
        this.selectDefaultRole()
      }
    },
  },
  mounted() {
    window.addEventListener('beforeunload', this.onBeforeUnload)
    this.initPage()
  },
  beforeUnmount() {
    window.removeEventListener('beforeunload', this.onBeforeUnload)
  },
  async beforeRouteLeave() {
    return this.confirmDiscardChanges()
  },
  methods: {
    async initPage() {
      await this.loadRoles()
      await this.selectDefaultRole()
    },
    async confirmDiscardChanges() {
      if (!this.dirty) return true
      try {
        await ElMessageBox.confirm('有未保存的权限修改，确定离开吗？', '未保存提示', {
          type: 'warning',
          confirmButtonText: '离开',
          cancelButtonText: '继续编辑',
        })
        return true
      } catch {
        return false
      }
    },
    onBeforeUnload(e) {
      if (!this.dirty) return
      e.preventDefault()
      e.returnValue = ''
    },
    filterMenuNode(value, data) {
      if (!value) return true
      const q = value.trim().toLowerCase()
      if (!q) return true
      return (
        String(data.name ?? '')
          .toLowerCase()
          .includes(q) ||
        String(data.code ?? '')
          .toLowerCase()
          .includes(q)
      )
    },
    toMenuNodes(nodes) {
      return [...nodes]
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
        .map((node) => {
          const code = node.permission || undefined
          const permissionControl = !!node.permissionControl
          const disabled = !(node.type === 'MENU' && permissionControl)
          return {
            id: node.id,
            name: node.title,
            code,
            type: node.type,
            permissionControl,
            disabled,
            permissionId: code ? permissionByCode.get(code)?.id : undefined,
            children: node.children?.length ? this.toMenuNodes(node.children) : [],
          }
        })
    },
    indexPermissions(nodes) {
      for (const node of nodes) {
        permissionById.set(node.id, node)
        if (node.code) permissionByCode.set(node.code, node)
        if (node.children?.length) this.indexPermissions(node.children)
      }
    },
    indexRoutes(nodes) {
      for (const node of nodes) {
        routeById.set(node.id, node)
        if (node.children?.length) this.indexRoutes(node.children)
      }
    },
    collectDirectAssignable(node) {
      if (!node?.children) return []
      return node.children.filter((child) => child.type !== 'MENU')
    },
    collectAssignableUnderRoute(node) {
      const map = new Map()
      const walk = (n) => {
        if (n.code) {
          for (const item of this.collectDirectAssignable(permissionByCode.get(n.code))) {
            map.set(item.id, item)
          }
        }
        n.children.forEach(walk)
      }
      walk(node)
      return Array.from(map.values())
    },
    menuStat(node) {
      const items = this.collectAssignableUnderRoute(node)
      const checked = items.filter((item) => this.checkedIds.has(item.id)).length
      return { total: items.length, checked }
    },
    methodTagType(method) {
      switch (method) {
        case 'GET':
          return 'success'
        case 'POST':
          return 'primary'
        case 'PUT':
          return 'warning'
        case 'DELETE':
          return 'danger'
        default:
          return 'info'
      }
    },
    isChecked(id) {
      return this.checkedIds.has(id)
    },
    setChecked(id, value) {
      const next = new Set(this.checkedIds)
      if (value) next.add(id)
      else next.delete(id)
      this.checkedIds = next
    },
    toggleItem(id) {
      this.setChecked(id, !this.checkedIds.has(id))
    },
    toggleSelectAll(value) {
      const on = Boolean(value)
      for (const item of this.assignableItems) this.setChecked(item.id, on)
    },
    onMenuClick(data) {
      if (data.disabled) return
      this.selectedRouteId = Number(data.id)
    },
    firstAssignableRouteId(nodes) {
      const walk = (list, requireAssignable) => {
        for (const node of list) {
          if (
            !node.disabled &&
            (!requireAssignable ||
              this.collectDirectAssignable(node.code ? permissionByCode.get(node.code) : undefined)
                .length > 0)
          ) {
            return node.id
          }
          const childMatch = walk(node.children, requireAssignable)
          if (childMatch != null) return childMatch
        }
        return null
      }
      return walk(nodes, true) ?? walk(nodes, false)
    },
    async loadRoles() {
      const res = await getOptions()
      this.roles = (res.data || []).filter((r) => r.code !== 'SUPER_ADMIN')
    },
    async loadTrees() {
      if (this.routeTree.length && permissionByCode.size) return
      this.treeLoading = true
      try {
        const [routeRes, permRes] = await Promise.all([listRoutes(), listPermissions()])
        this.routeTree = routeRes.data
        routeById.clear()
        this.indexRoutes(routeRes.data)
        permissionById.clear()
        permissionByCode.clear()
        this.indexPermissions(permRes.data)
      } finally {
        this.treeLoading = false
      }
    },
    async selectRole(role) {
      if (this.currentRole && this.currentRole.id !== role.id) {
        const ok = await this.confirmDiscardChanges()
        if (!ok) return
      }
      this.currentRole = role
      this.selectedRouteId = null
      this.menuKeyword = ''
      this.checkedIds = new Set()
      this.savedIds = new Set()
      await this.loadTrees()
      if (role.code === 'SUPER_ADMIN') {
        return
      }
      const detail = await get(role.id)
      const ids = new Set(detail.data.permissionIds)
      this.checkedIds = new Set(ids)
      this.savedIds = new Set(ids)
      const firstId = this.firstAssignableRouteId(this.menuTree)
      this.selectedRouteId = firstId
      await this.$nextTick()
      if (firstId != null) this.$refs.menuTreeRef?.setCurrentKey(firstId)
    },
    async handleSave() {
      if (!this.currentRole || !this.dirty) return
      this.saving = true
      try {
        await assignPermissions(this.currentRole.id, Array.from(this.checkedIds))
        this.savedIds = new Set(this.checkedIds)
        ElMessage.success(`已为「${this.currentRole.name}」保存权限配置`)
      } finally {
        this.saving = false
      }
    },
    selectRoleByQuery() {
      const roleId = Number(this.$route.query.roleId)
      if (!roleId) return false
      const role = this.roles.find((item) => item.id === roleId)
      if (!role) return false
      this.selectRole(role)
      return true
    },
    async selectDefaultRole() {
      if (this.selectRoleByQuery()) return
      if (this.roles.length) {
        await this.selectRole(this.roles[0])
      }
    },
  },
}
</script>

<style scoped>
.role-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid var(--el-border-color);
  margin-bottom: 8px;
  transition: all 0.2s;
  box-sizing: border-box;
}

.role-item:hover {
  background: var(--app-fill-color, #f5f7fa);
}

.role-item.is-active {
  background: var(--app-surface-soft, #ecf5ff);
  border-color: var(--app-surface-soft-border, #b3d8ff);
}

.role-item__name {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  color: var(--app-text-primary, #303133);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

.role-item :deep(.el-tag) {
  flex-shrink: 0;
  margin: 0;
}

.role-perm__title {
  margin: 0 0 4px;
  font-size: var(--app-font-size-main);
  color: #303133;
}

.role-perm__desc {
  margin: 0;
  font-size: var(--app-font-size-main);
  color: #909399;
}

.role-perm__main-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.role-perm__main-body.is-super-admin {
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--app-card-bg, #fff);
}

.role-perm__locked {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.role-perm__locked-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 360px;
  padding: 32px 28px;
}

.role-perm__locked-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 16px;
  border-radius: 50%;
  background: var(--app-surface-soft);
  color: var(--app-color-primary);
}

.role-perm__locked-title {
  margin: 0 0 8px;
  font-size: var(--app-font-size-main);
  font-weight: 600;
  color: var(--app-text-primary, #303133);
}

.role-perm__locked-desc {
  margin: 0;
  font-size: var(--app-font-size-main);
  line-height: 1.6;
  color: var(--app-text-muted, #909399);
}

.role-perm__body {
  flex: 1;
  min-height: 0;
  display: flex;
  margin: 16px 16px 0;
  border: 1px solid var(--app-border-color, #ebeef5);
  overflow: hidden;
  background: var(--app-card-bg, #fff);
}

.role-perm__footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin: 0 16px 16px;
  padding: 12px 16px;
  background: var(--app-card-bg, #fff);
  border: 1px solid var(--app-border-color, #ebeef5);
  border-top: none;
}

.role-perm__footer-tip {
  margin-right: auto;
  font-size: var(--app-font-size-main);
  color: var(--app-text-muted, #909399);
}

.role-perm__footer-tip.is-dirty {
  color: #e6a23c;
}

.role-perm__menus {
  border-right: 1px solid var(--app-border-color, #ebeef5);
}

.menu-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  overflow: hidden;
}

.menu-node.is-disabled .menu-node__name {
  color: #c0c4cc;
}

.menu-node__check {
  height: auto;
}

.menu-node__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-node__badge {
  flex-shrink: 0;
}

.role-perm__detail {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  overflow: hidden;
}

.role-perm__detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
  flex-shrink: 0;
}

.role-perm__detail-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: var(--app-font-size-main);
  font-weight: 600;
  color: #303133;
}

.role-perm__detail-code {
  font-size: var(--app-font-size-main);
  font-weight: 400;
  color: #909399;
}

.role-perm__detail-scroll {
  flex: 1;
  min-height: 0;
}

.perm-group {
  margin-bottom: 20px;
}

.perm-group__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--app-font-size-main);
  font-weight: 600;
  color: #606266;
  margin-bottom: 12px;
}

.perm-group__hint {
  margin: -4px 0 12px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.perm-group__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  font-size: var(--app-font-size-main);
  font-weight: 400;
  color: #909399;
  background: #f0f2f5;
  border-radius: 9px;
}

.perm-group__items {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.perm-btn {
  margin-right: 0;
}

.perm-btn__type {
  margin-left: 6px;
}

.perm-group__apis {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.perm-api {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--app-border-color, #ebeef5);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.perm-api:hover {
  background: var(--app-fill-color, #f5f7fa);
}

.perm-api.is-checked {
  background: var(--app-surface-soft, #ecf5ff);
  border-color: var(--app-surface-soft-border, #b3d8ff);
}

.perm-api__method {
  flex-shrink: 0;
  width: 62px;
  text-align: center;
  font-family: monospace;
}

.perm-api__name {
  flex-shrink: 0;
  color: var(--app-text-primary, #303133);
  font-size: var(--app-font-size-main);
}

.perm-api__path {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--app-font-size-main);
  color: #909399;
}

.role-perm__empty {
  margin: auto;
}
</style>
