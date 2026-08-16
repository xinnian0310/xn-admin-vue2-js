<template>
  <xnPageLayout
    v-model:view-mode="viewMode"
    v-model:page="page"
    v-model:page-size="size"
    :show-pagination="viewMode === 'card'"
    :total="total"
    :loading="viewMode === 'card' ? loading : false"
    @page-change="loadData"
  >
    <template #aside>
      <xnTreePanel
        title="单位"
        width="240px"
        v-model:filter="unitKeyword"
        filter-placeholder="搜索单位"
        :data="unitTree"
        :tree-props="{ label: 'name', children: 'children' }"
        :current-key="selectedUnitKey"
        @node-click="onUnitNodeClick"
      />
    </template>

    <template #search>
      <xnSearch :search-item="searchItems" @query-form="inquires" @reset="reset" />
    </template>

    <template #toolbar>
      <xnButton :list-item="buttonItems" :selected="selected" @button-click="buttonClick" />
    </template>

    <template #table>
      <xnTable
        v-model:page="page"
        v-model:page-size="size"
        :data="tableData"
        :total="total"
        :loading="loading"
        table-key="system:users"
        entity-name="用户"
        name-field="username"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="loadData"
      >
        <template #roles="{ row }">
          <template v-if="(row.effectiveRoleList || row.roleList || []).length">
            <el-tag
              v-for="r in row.roleList || []"
              :key="'d-' + r.id"
              style="margin-right: 4px; margin-bottom: 2px"
              :type="r.code === 'SUPER_ADMIN' ? 'danger' : 'info'"
            >
              {{ r.name }}
            </el-tag>
            <el-tag
              v-for="r in inheritedRoles(row)"
              :key="'u-' + r.id"
              style="margin-right: 4px; margin-bottom: 2px"
              type="success"
              effect="plain"
            >
              {{ r.name }}（单位）
            </el-tag>
          </template>
          <span v-else>—</span>
        </template>
        <template #status="{ row }">
          <el-switch
            v-permission="'user:update'"
            :model-value="row.status === 1"
            @change="(val) => handleStatusChange(row, val)"
          />
        </template>
        <template #actions="{ row }">
          <xnTableActions
            :items="tableButtonItems"
            :row="row"
            :disabled="tableActionDisabled"
            @action-click="onTableAction"
          />
        </template>
      </xnTable>
    </template>

    <template #card>
      <div class="page-card-grid">
        <el-card v-for="row in tableData" :key="row.id" shadow="hover" class="user-card">
          <div class="user-card__header">
            <el-avatar>{{ (row.nickname || row.username).charAt(0).toUpperCase() }}</el-avatar>
            <div class="user-card__info">
              <div class="user-card__name">{{ row.nickname || row.username }}</div>
              <div class="user-card__username">@{{ row.username }}</div>
            </div>
          </div>
          <div class="user-card__body">
            <div class="user-card__row">
              <span class="label">单位</span>
              <span>{{ row.unitName || '—' }}</span>
            </div>
            <div class="user-card__row">
              <span class="label">角色</span>
              <span>{{ displayRoles(row) }}</span>
            </div>
            <div class="user-card__row">
              <span class="label">邮箱</span>
              <span>{{ row.email || '—' }}</span>
            </div>
            <div class="user-card__row">
              <span class="label">状态</span>
              <el-switch
                v-permission="'user:update'"
                :model-value="row.status === 1"
                @change="(val) => handleStatusChange(row, val)"
              />
            </div>
          </div>
          <div class="user-card__footer">
            <xnTableActions
              :items="tableButtonItems"
              :row="row"
              :disabled="tableActionDisabled"
              @action-click="onTableAction"
            />
          </div>
        </el-card>
      </div>
    </template>
  </xnPageLayout>

  <UserSave ref="saveRef" @success="loadData" />
  <XnImportDialog
    ref="importRef"
    title="导入用户"
    template-name="用户导入模板"
    :columns="userImportColumns"
    :importer="handleImportUsers"
    @success="loadData"
  />
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnTreePanel from '@/components/xnTreePanel/xnTreePanel.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import XnImportDialog from '@/components/xnImport/xnImportDialog.vue'
import UserSave from './save.vue'
import { usePageUi } from '@/composables/usePageUi'
import { list, batchRemove, remove, updateStatus, importUsers, exportUsers } from '@/api/user'
import { showCaughtError } from '@/utils/request'
import { getOptions as getRoleOptions } from '@/api/role'
import { getTree as getUnitTree } from '@/api/unit'
import { getOptions as getPostOptions } from '@/api/post'

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { prop: 'username', label: '用户名', minWidth: 120 },
  { prop: 'nickname', label: '昵称', minWidth: 120 },
  { prop: 'unitName', label: '单位', minWidth: 140 },
  { prop: 'postName', label: '岗位', minWidth: 120 },
  { prop: 'email', label: '邮箱', minWidth: 180 },
  { prop: 'phone', label: '手机号', minWidth: 130 },
  { type: 'slot', slot: 'roles', prop: 'roleList', label: '角色', minWidth: 160 },
  { type: 'slot', slot: 'status', prop: 'status', label: '状态', width: 100 },
  { prop: 'createdAt', label: '创建时间', minWidth: 170, type: 'datetime' },
  { type: 'slot', slot: 'actions', label: '操作', fixed: 'right' },
]

export default {
  name: 'Users',
  components: {
    xnPageLayout,
    xnTreePanel,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
    XnImportDialog,
    UserSave,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/users')
    return { searchItems, buttonItems, tableButtonItems }
  },
  data() {
    return {
      loading: false,
      tableData: [],
      total: 0,
      page: 1,
      size: 10,
      queryForm: {},
      viewMode: 'table',
      selected: [],
      roles: [],
      posts: [],
      unitNodes: [],
      unitKeyword: '',
      selectedUnitId: null,
      columns,
    }
  },
  computed: {
    selectedUnitKey() {
      return this.selectedUnitId ?? undefined
    },
    userImportColumns() {
      const roleOptions = this.roles
        .filter((r) => r.code !== 'SUPER_ADMIN')
        .map((r) => ({ label: r.name, value: r.code }))
      const unitOptions = this.flattenUnits(this.unitNodes).map((u) => ({
        label: u.label,
        value: u.code,
      }))
      const roleExample =
        roleOptions.find((o) => o.value === 'USER')?.label || roleOptions[0]?.label || '普通用户'
      const unitExample =
        unitOptions.find((o) => o.value === 'TECH_RD1')?.label ||
        unitOptions[0]?.label ||
        '研发一部'
      const postOptions = this.posts.map((p) => ({ label: p.name, value: p.code }))
      const postExample =
        postOptions.find((o) => o.value === 'staff')?.label || postOptions[0]?.label || '普通员工'
      return [
        { key: 'username', title: '用户名', required: true, example: 'zhangsan', width: 14 },
        { key: 'password', title: '密码', example: 'User123456', width: 14 },
        { key: 'nickname', title: '昵称', example: '张三', width: 12 },
        { key: 'email', title: '邮箱', example: 'zhangsan@example.com', width: 22 },
        { key: 'phone', title: '手机号', example: '13800138000', width: 14 },
        {
          key: 'roleCodes',
          title: '角色',
          example: roleExample,
          width: 16,
          options: roleOptions,
        },
        {
          key: 'unitCode',
          title: '单位',
          example: unitExample,
          width: 18,
          options: unitOptions,
        },
        {
          key: 'postCode',
          title: '岗位',
          example: postExample,
          width: 14,
          options: postOptions,
        },
        {
          key: 'status',
          title: '状态',
          example: '启用',
          width: 10,
          options: [
            { label: '启用', value: '1' },
            { label: '禁用', value: '0' },
          ],
        },
      ]
    },
    unitTree() {
      return this.mapUnitNodes(this.unitNodes)
    },
  },
  watch: {
    roles: {
      handler() {
        this.syncRoleSearchOptions()
      },
      immediate: true,
    },
    searchItems: {
      handler() {
        this.syncRoleSearchOptions()
      },
      immediate: true,
    },
  },
  mounted() {
    this.initPage()
  },
  methods: {
    async initPage() {
      await Promise.all([this.loadRoles(), this.loadUnits(), this.loadPosts()])
      await this.loadData()
    },
    flattenUnits(nodes, path = []) {
      const result = []
      for (const node of nodes) {
        const names = [...path, node.name]
        const label = names.length > 1 ? names.join(' / ') : node.name
        result.push({ code: node.code, label })
        if (node.children?.length) {
          result.push(...this.flattenUnits(node.children, names))
        }
      }
      return result
    },
    mapUnitNodes(nodes) {
      return nodes.map((n) => ({
        id: n.id,
        name: n.name,
        children: n.children?.length ? this.mapUnitNodes(n.children) : undefined,
      }))
    },
    syncRoleSearchOptions() {
      const roleItem = this.searchItems.find((item) => item.prop === 'roleId')
      if (!roleItem) return
      const next = this.roles.map((r) => ({ label: r.name, value: r.id }))
      const prev = roleItem.options
      if (
        Array.isArray(prev) &&
        prev.length === next.length &&
        prev.every((o, i) => o.value === next[i].value && o.label === next[i].label)
      ) {
        return
      }
      roleItem.options = next
    },
    openSave(mode, id) {
      this.$refs.saveRef?.open(mode, id)
    },
    selectionChangeHandle(rows) {
      this.selected = rows
    },
    tableActionDisabled(action, row) {
      if (action === 'delete' && row.username === 'admin') return 'admin 用户不可删除'
      return false
    },
    onTableAction(payload) {
      const row = payload.row
      switch (payload.action) {
        case 'edit':
          this.openSave('edit', row.id)
          break
        case 'view':
          this.openSave('view', row.id)
          break
        case 'delete':
          this.handleDelete(row)
          break
      }
    },
    buttonClick(action) {
      if (action === 'add') {
        this.openSave('add')
        return
      }
      if (action === 'import') {
        this.$refs.importRef?.open()
        return
      }
      if (action === 'export') {
        this.handleExport()
        return
      }
      if (action === 'edit') {
        if (this.selected.length !== 1) {
          ElMessage.warning('请选择一项操作')
          return
        }
        this.openSave('edit', this.selected[0].id)
        return
      }
      if (action === 'view') {
        if (this.selected.length !== 1) {
          ElMessage.warning('请选择一项操作')
          return
        }
        this.openSave('view', this.selected[0].id)
        return
      }
      if (action === 'delete') {
        this.handleBatchDelete()
      }
    },
    async handleExport() {
      try {
        await exportUsers({
          keyword: String(this.queryForm.FuzzyWord ?? '').trim() || undefined,
          roleId:
            this.queryForm.roleId === '' || this.queryForm.roleId == null
              ? undefined
              : Number(this.queryForm.roleId),
          unitId: this.selectedUnitId ?? undefined,
        })
        ElMessage.success('导出成功')
      } catch (e) {
        showCaughtError(e, '导出失败')
      }
    },
    inheritedRoles(row) {
      const directIds = new Set((row.roleList || []).map((r) => r.id))
      return (row.unitRoleList || []).filter((r) => !directIds.has(r.id))
    },
    displayRoles(row) {
      const names = (row.effectiveRoleList || row.roleList || []).map((r) => r.name)
      return names.length ? names.join('、') : '—'
    },
    async handleImportUsers(rows) {
      const payload = rows.map((row) => ({
        username: row.username,
        password: row.password || undefined,
        nickname: row.nickname || undefined,
        email: row.email || undefined,
        phone: row.phone || undefined,
        roleCodes: row.roleCodes || undefined,
        unitCode: row.unitCode || undefined,
        postCode: row.postCode || undefined,
        status: row.status === '' || row.status == null ? undefined : Number(row.status),
      }))
      const res = await importUsers(payload)
      return res.data
    },
    onUnitNodeClick(data) {
      if (this.selectedUnitId === data.id) return
      this.selectedUnitId = data.id
      this.page = 1
      this.loadData()
    },
    async loadRoles() {
      const res = await getRoleOptions()
      this.roles = res.data || []
    },
    async loadPosts() {
      const res = await getPostOptions()
      this.posts = res.data || []
    },
    async loadUnits() {
      const res = await getUnitTree()
      this.unitNodes = res.data || []
    },
    async loadData() {
      this.loading = true
      try {
        const roleIdRaw = this.queryForm.roleId
        const roleId =
          roleIdRaw === '' || roleIdRaw === undefined || roleIdRaw === null
            ? undefined
            : Number(roleIdRaw)
        const res = await list({
          page: this.page - 1,
          size: this.size,
          keyword: String(this.queryForm.FuzzyWord ?? '').trim() || undefined,
          roleId: Number.isFinite(roleId) ? roleId : undefined,
          unitId: this.selectedUnitId ?? undefined,
        })
        this.tableData = res.data.records
        this.total = res.data.total
      } finally {
        this.loading = false
      }
    },
    inquires(form) {
      this.queryForm = form
      this.page = 1
      this.loadData()
    },
    reset() {
      this.queryForm = {}
      this.page = 1
      this.loadData()
    },
    async handleDelete(row) {
      if (row.username === 'admin') {
        ElMessage.warning('admin 用户不可删除')
        return
      }
      await ElMessageBox.confirm(`确定删除用户「${row.username}」吗？`, '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
      await remove(row.id)
      ElMessage.success('删除成功')
      this.loadData()
    },
    async handleBatchDelete() {
      if (!this.selected.length) {
        ElMessage.warning('请至少选择一项')
        return
      }
      if (this.selected.some((r) => r.username === 'admin')) {
        ElMessage.warning('admin 用户不可删除，请取消勾选')
        return
      }
      await ElMessageBox.confirm(`确定删除选中的 ${this.selected.length} 个用户吗？`, '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
      await batchRemove(this.selected.map((r) => r.id))
      ElMessage.success('删除成功')
      this.loadData()
    },
    async handleStatusChange(row, enabled) {
      const status = enabled ? 1 : 0
      try {
        await updateStatus(row.id, status)
        row.status = status
        ElMessage.success('状态更新成功')
      } catch {
        row.status = enabled ? 0 : 1
      }
    },
  },
}
</script>

<style scoped>
.user-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.user-card__info {
  flex: 1;
  min-width: 0;
}

.user-card__name {
  font-weight: 600;
  font-size: var(--app-font-size-main);
}

.user-card__username {
  font-size: var(--app-font-size-main);
  color: var(--app-text-muted);
}

.user-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.user-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--app-font-size-main);
}

.user-card__row .label {
  color: var(--app-text-muted);
}

.user-card__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--app-border-color);
  padding-top: 12px;
}
</style>
