<template>
  <xnPageLayout
    v-model:page="page"
    v-model:page-size="size"
    :total="total"
    @page-change="applyLocalPage"
    @refresh="loadData"
  >
    <template #aside>
      <xnTreePanel
        ref="menuTreeRef"
        title="菜单"
        v-model:filter="menuKeyword"
        filter-placeholder="搜索菜单名称"
        :data="menuTree"
        :tree-props="{ label: 'name', children: 'children', disabled: 'disabled' }"
        :current-key="selectedRouteId ?? undefined"
        @node-click="onMenuClick"
      >
        <template #node="{ data }">
          <span class="menu-node" :class="{ 'is-disabled': data.disabled }">
            <span class="menu-node__name">{{ data.name }}</span>
            <el-tag
              v-if="!data.permissionControl && data.type === 'MENU'"
              type="info"
              effect="plain"
            >
              未控权
            </el-tag>
            <el-tag v-else-if="data.childCount" type="info" effect="plain">
              {{ data.childCount }}
            </el-tag>
          </span>
        </template>
      </xnTreePanel>
    </template>

    <template #search>
      <xnSearch :search-item="searchItems" @query-form="inquires" @reset="reset" />
    </template>

    <template #toolbar>
      <xnButton :list-item="toolbarButtons" :selected="selected" @button-click="buttonClick" />
    </template>

    <template #toolbar-extra>
      <el-radio-group v-if="selectedMenu" v-model="activeType">
        <el-radio-button v-for="tab in tabs" :key="tab.type" :value="tab.type">
          {{ tab.label }}
          <el-badge
            v-if="groups[tab.type].length"
            :value="groups[tab.type].length"
            type="info"
            class="perm-content__tab-badge"
          />
        </el-radio-button>
      </el-radio-group>
    </template>

    <template #table>
      <el-alert
        v-if="selectedRoute && !selectedMenu"
        type="warning"
        :closable="false"
        show-icon
        title="该路由尚未关联权限标识，请先在路由管理中保存以自动生成后再配置子权限。"
        class="perm-content__alert"
      />
      <el-empty
        v-else-if="!selectedRoute"
        class="perm-content__empty"
        description="请从左侧选择一个菜单，管理其接口 / 按钮权限"
        :image-size="120"
      />
      <xnTable
        v-else
        v-model:page="page"
        v-model:page-size="size"
        :data="tableData"
        :total="total"
        :loading="loading"
        table-key="system:permissions-content"
        entity-name="权限"
        name-field="name"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="applyLocalPage"
        @refresh="loadData"
      >
        <template #icon="{ row }">
          <xnAppIcon v-if="row.icon" :name="row.icon" />
          <span v-else>-</span>
        </template>
        <template #action="{ row }">
          <code v-if="row.action" class="perm-content__mono">{{ row.action }}</code>
          <span v-else>-</span>
        </template>
        <template #buttonColor="{ row }">
          <el-button v-if="row.buttonColor" :type="buttonTypeOf(row.buttonColor)">
            {{ row.name || '示例' }}
          </el-button>
          <span v-else>-</span>
        </template>
        <template #code="{ row }">
          <code class="perm-content__mono">{{ row.code }}</code>
        </template>
        <template #method="{ row }">
          <el-tag :type="methodTagType(row.method)">{{ row.method || '-' }}</el-tag>
        </template>
        <template #path="{ row }">
          <code class="perm-content__mono">{{ row.path }}</code>
        </template>
        <template #builtIn="{ row }">
          <el-tag v-if="row.builtIn" type="warning">内置</el-tag>
          <span v-else>-</span>
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
  </xnPageLayout>

  <xnDialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="520px"
    :confirm-loading="submitting"
    confirm-text="确定"
    @confirm="handleSubmit"
    @closed="resetForm"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="归属菜单">
        <el-input :model-value="selectedRoute?.title" disabled />
      </el-form-item>
      <el-form-item label="权限类型">
        <el-radio-group v-if="!isEdit" v-model="form.type" @change="onTypeChange">
          <el-radio-button v-for="tab in tabs" :key="tab.type" :value="tab.type">
            {{ tab.label }}
          </el-radio-button>
        </el-radio-group>
        <el-tag v-else :type="typeTagType(form.type)">{{ typeLabel(form.type) }}</el-tag>
      </el-form-item>
      <el-form-item label="名称" prop="name">
        <el-input
          v-model="form.name"
          placeholder="如：新增、导出、用户列表接口"
          @change="onNameChange"
        />
      </el-form-item>
      <template v-if="isButtonType">
        <el-form-item label="动作标识" prop="action">
          <el-input
            v-model="form.action"
            placeholder="英文，如：add / edit / view / delete / assign"
            @input="syncCodeFromForm"
          />
          <div class="perm-content__form-tip">
            用英文动作生成权限编码，并匹配前端处理函数（如 buttonClick('edit')）
          </div>
        </el-form-item>
        <el-form-item label="图标">
          <xnIconPicker v-model="form.icon" placeholder="选择按钮图标(可留空)" />
        </el-form-item>
        <el-form-item label="按钮颜色">
          <el-select v-model="form.buttonColor" placeholder="选择颜色" style="width: 160px">
            <template #label>
              <el-button v-if="form.buttonColor" :type="buttonTypeOf(form.buttonColor)">
                {{ form.name || '示例' }}
              </el-button>
            </template>
            <el-option v-for="c in buttonColors" :key="c.value" :label="c.label" :value="c.value">
              <el-button :type="buttonTypeOf(c.value)">
                {{ form.name || '示例' }}
              </el-button>
            </el-option>
          </el-select>
        </el-form-item>
      </template>
      <template v-if="form.type === 'API'">
        <el-form-item label="请求方法" prop="method">
          <el-select
            v-model="form.method"
            placeholder="选择方法"
            :disabled="editingBuiltIn"
            @change="syncCodeFromForm"
          >
            <el-option v-for="m in methods" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="接口路径" prop="path">
          <el-input
            v-model="form.path"
            placeholder="如：/api/users/{id}"
            :disabled="editingBuiltIn"
            @input="syncCodeFromForm"
          />
        </el-form-item>
      </template>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="form.sort" :min="0" :max="9999" />
      </el-form-item>
      <div v-if="editingBuiltIn" class="perm-content__form-tip perm-content__form-tip--warn">
        内置权限的路径 / 方法不可修改，仅可调整名称与排序。
      </div>
    </el-form>
  </xnDialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import xnTreePanel from '@/components/xnTreePanel/xnTreePanel.vue'
import xnAppIcon from '@/components/xnAppIcon/xnAppIcon.vue'
import xnIconPicker from '@/components/xnIconPicker/xnIconPicker.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import { usePageUi } from '@/composables/usePageUi'
import { create, list as listPermissions, remove, update } from '@/api/permission'
import { list as listRoutes } from '@/api/route'

const tabs = [
  { type: 'BUTTON', label: '按钮权限' },
  { type: 'TABLE_BUTTON', label: '表格按钮' },
  { type: 'API', label: '接口权限' },
]
const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
const buttonColors = [
  { label: '主要', value: 'primary' },
  { label: '成功', value: 'success' },
  { label: '警告', value: 'warning' },
  { label: '危险', value: 'danger' },
  { label: '信息', value: 'info' },
  { label: '默认', value: 'default' },
]
const typeLabels = {
  MENU: '菜单',
  BUTTON: '按钮',
  TABLE_BUTTON: '表格按钮',
  API: '接口',
}
const permissionById = new Map()
const permissionByCode = new Map()
const routeById = new Map()

function emptyForm() {
  return {
    code: '',
    name: '',
    type: 'BUTTON',
    parentId: null,
    path: '',
    method: 'GET',
    action: '',
    icon: '',
    buttonColor: 'primary',
    sort: 0,
  }
}

function buttonTypeOf(color) {
  if (!color || color === 'default') return undefined
  return color
}

export default {
  name: 'PermissionContent',
  components: {
    xnPageLayout,
    xnDialog,
    xnTreePanel,
    xnAppIcon,
    xnIconPicker,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/system/permissions-content')
    return { searchItems, buttonItems, tableButtonItems }
  },
  data() {
    return {
      tabs,
      methods,
      buttonColors,
      loading: false,
      menuKeyword: '',
      routeTree: [],
      selectedRouteId: null,
      activeType: 'BUTTON',
      tableData: [],
      total: 0,
      page: 1,
      size: 10,
      queryForm: {},
      selected: [],
      dialogVisible: false,
      isEdit: false,
      editingRow: null,
      submitting: false,
      form: emptyForm(),
    }
  },
  computed: {
    toolbarButtons() {
      return this.buttonItems.filter((item) => item.action === 'add' || item.action === 'create')
    },
    isButtonType() {
      return this.form.type === 'BUTTON' || this.form.type === 'TABLE_BUTTON'
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
    groups() {
      const result = {
        BUTTON: [],
        TABLE_BUTTON: [],
        API: [],
      }
      for (const child of this.selectedMenu?.children ?? []) {
        if (child.type === 'BUTTON') result.BUTTON.push(child)
        else if (child.type === 'TABLE_BUTTON') result.TABLE_BUTTON.push(child)
        else if (child.type === 'API') result.API.push(child)
      }
      Object.keys(result).forEach((key) => {
        result[key].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      })
      return result
    },
    columns() {
      const cols = [{ prop: 'name', label: '名称', minWidth: 150 }]
      if (this.activeType !== 'API') {
        cols.push(
          { type: 'slot', slot: 'icon', prop: 'icon', label: '图标', width: 70 },
          { type: 'slot', slot: 'action', prop: 'action', label: '动作', minWidth: 110 },
          {
            type: 'slot',
            slot: 'buttonColor',
            prop: 'buttonColor',
            label: '按钮颜色',
            minWidth: 100,
          },
        )
      }
      cols.push({ type: 'slot', slot: 'code', prop: 'code', label: '权限编码', minWidth: 240 })
      if (this.activeType === 'API') {
        cols.push(
          { type: 'slot', slot: 'method', prop: 'method', label: '方法', width: 90 },
          { type: 'slot', slot: 'path', prop: 'path', label: '接口路径', minWidth: 220 },
        )
      }
      cols.push(
        { prop: 'sort', label: '排序', width: 80 },
        { type: 'slot', slot: 'builtIn', prop: 'builtIn', label: '内置', width: 80 },
        { type: 'slot', slot: 'actions', label: '操作', width: 140, fixed: 'right' },
      )
      return cols
    },
    editingBuiltIn() {
      return this.isEdit && !!this.editingRow?.builtIn
    },
    dialogTitle() {
      return `${this.isEdit ? '编辑' : '新增'}${this.typeLabel(this.form.type)}`
    },
    menuPrefix() {
      const code = this.selectedMenu?.code
      if (!code) return ''
      const parts = code.split(':').filter(Boolean)
      return parts[parts.length - 1] || ''
    },
    rules() {
      return {
        name: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
        code: [{ required: true, message: '权限编码将自动生成', trigger: 'change' }],
        action:
          this.form.type === 'BUTTON' || this.form.type === 'TABLE_BUTTON'
            ? [{ required: true, message: '请输入动作标识', trigger: 'blur' }]
            : [],
        method:
          this.form.type === 'API'
            ? [{ required: true, message: '请选择请求方法', trigger: 'change' }]
            : [],
        path:
          this.form.type === 'API'
            ? [{ required: true, message: '请输入接口路径', trigger: 'blur' }]
            : [],
      }
    },
  },
  watch: {
    activeType() {
      this.page = 1
      this.applyLocalPage()
    },
    selectedMenu() {
      this.page = 1
      this.applyLocalPage()
    },
    'form.type'() {
      if (this.dialogVisible && !this.isEdit) this.syncCodeFromForm()
    },
    'form.action'() {
      if (this.dialogVisible && !this.isEdit) this.syncCodeFromForm()
    },
    'form.method'() {
      if (this.dialogVisible && !this.isEdit) this.syncCodeFromForm()
    },
    'form.path'() {
      if (this.dialogVisible && !this.isEdit) this.syncCodeFromForm()
    },
    menuPrefix() {
      if (this.dialogVisible && !this.isEdit) this.syncCodeFromForm()
    },
  },
  mounted() {
    this.loadData()
  },
  methods: {
    buttonTypeOf,
    selectionChangeHandle(rows) {
      this.selected = rows
    },
    applyLocalPage() {
      const kw = String(this.queryForm.FuzzyWord ?? '')
        .trim()
        .toLowerCase()
      let rows = this.groups[this.activeType] ?? []
      if (kw) {
        rows = rows.filter((r) =>
          [r.name, r.code, r.action, r.path]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(kw)),
        )
      }
      this.total = rows.length
      const start = (this.page - 1) * this.size
      this.tableData = rows.slice(start, start + this.size)
    },
    normalizeActionEnglish(action) {
      return action
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '')
    },
    normalizeApiPath(path) {
      const trimmed = path.trim()
      if (!trimmed) return ''
      return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    },
    buildAutoCode() {
      if (this.form.type === 'API') {
        const method = (this.form.method || 'GET').toUpperCase()
        const path = this.normalizeApiPath(this.form.path || '')
        if (!path) return ''
        return `api:${method}:${path}`
      }
      const prefix = this.menuPrefix
      let action = this.normalizeActionEnglish(this.form.action || '')
      if (!prefix || !action) return ''
      if (this.form.type === 'TABLE_BUTTON') {
        if (action === 'edit' || action === 'update') action = 'table-edit'
        else if (action === 'view') action = 'table-view'
        else if (action === 'delete') action = 'table-delete'
        else if (action === 'add' || action === 'create') action = 'table-add'
      }
      return `${prefix}:${action}`
    },
    syncCodeFromForm() {
      if (this.isEdit) return
      this.form.code = this.buildAutoCode()
    },
    /** 当前菜单下指定类型的下一个排序（max + 1，至少为 1） */
    nextSort(type) {
      const list = this.groups[type] ?? []
      if (!list.length) return 1
      return Math.max(...list.map((item) => item.sort ?? 0)) + 1
    },
    /** 切换类型后按钮/接口字段互斥，清掉上一类型残留的校验提示 */
    onTypeChange() {
      this.$refs.formRef?.clearValidate(['action', 'method', 'path'])
      if (!this.isEdit) this.form.sort = this.nextSort(this.form.type)
      this.syncCodeFromForm()
    },
    onNameChange() {
      if (this.isEdit || !this.isButtonType || this.form.action) return
      const name = this.form.name.trim()
      const nameActionMap = {
        新增: 'add',
        编辑: 'edit',
        查看: 'view',
        删除: 'delete',
        分配权限: 'assign',
        分配: 'assign',
        添加子级: 'add-child',
      }
      const action = nameActionMap[name]
      if (action) {
        this.form.action = action
        if (name === '删除') this.form.buttonColor = 'danger'
        this.syncCodeFromForm()
      }
    },
    toMenuNodes(nodes) {
      return [...nodes]
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
        .map((node) => {
          const code = node.permission || undefined
          const linked = code ? permissionByCode.get(code) : undefined
          const childCount = (linked?.children ?? []).filter((c) => c.type !== 'MENU').length
          const permissionControl = !!node.permissionControl
          const disabled = !(node.type === 'MENU' && permissionControl)
          return {
            id: node.id,
            name: node.title,
            code,
            type: node.type,
            permissionControl,
            disabled,
            childCount,
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
    typeLabel(type) {
      return typeLabels[type] ?? type
    },
    typeTagType(type) {
      switch (type) {
        case 'API':
          return 'success'
        case 'BUTTON':
          return 'primary'
        case 'TABLE_BUTTON':
          return 'warning'
        default:
          return 'info'
      }
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
    onMenuClick(data) {
      if (data.disabled) return
      this.selectedRouteId = Number(data.id)
      this.page = 1
      this.queryForm = {}
      this.$nextTick(() => this.applyLocalPage())
    },
    firstSelectableRouteId(nodes) {
      for (const node of nodes) {
        if (!node.disabled) return node.id
        const childMatch = this.firstSelectableRouteId(node.children)
        if (childMatch != null) return childMatch
      }
      return null
    },
    async loadData(preserveSelection = false) {
      this.loading = true
      try {
        const [routeRes, permRes] = await Promise.all([listRoutes(), listPermissions()])
        this.routeTree = routeRes.data
        routeById.clear()
        this.indexRoutes(routeRes.data)
        permissionById.clear()
        permissionByCode.clear()
        this.indexPermissions(permRes.data)
        if (
          !preserveSelection ||
          this.selectedRouteId == null ||
          !routeById.has(this.selectedRouteId) ||
          !routeById.get(this.selectedRouteId)?.permissionControl
        ) {
          this.selectedRouteId = this.firstSelectableRouteId(this.menuTree)
        }
        await this.$nextTick()
        if (this.selectedRouteId != null) {
          this.$refs.menuTreeRef?.setCurrentKey(this.selectedRouteId)
        }
        this.applyLocalPage()
      } finally {
        this.loading = false
      }
    },
    openCreate(type) {
      if (!this.selectedMenu) return
      this.isEdit = false
      this.editingRow = null
      this.form = {
        ...emptyForm(),
        type,
        parentId: this.selectedMenu.id,
        sort: this.nextSort(type),
      }
      this.dialogVisible = true
      this.$nextTick(() => this.syncCodeFromForm())
    },
    openEdit(row) {
      this.isEdit = true
      this.editingRow = row
      this.form = {
        code: row.code,
        name: row.name,
        type: row.type,
        parentId: row.parentId ?? this.selectedMenu?.id ?? null,
        path: row.path ?? '',
        method: row.method ?? 'GET',
        action: row.action ?? '',
        icon: row.icon ?? '',
        buttonColor: row.buttonColor ?? 'primary',
        sort: row.sort ?? 0,
      }
      this.dialogVisible = true
    },
    resetForm() {
      this.$refs.formRef?.clearValidate()
      this.form = emptyForm()
      this.isEdit = false
      this.editingRow = null
    },
    buttonClick(action) {
      if (action === 'add' || action === 'create') this.openCreate(this.activeType)
    },
    onTableAction(payload) {
      const row = payload.row
      if (payload.action === 'edit' || payload.action === 'view') this.openEdit(row)
      else if (payload.action === 'delete') this.handleDelete(row)
    },
    tableActionDisabled(action, row) {
      if (action === 'delete' && row.builtIn) return true
      return false
    },
    async handleSubmit() {
      const formRef = this.$refs.formRef
      if (!formRef) return
      if (!this.isEdit) {
        this.syncCodeFromForm()
        if (!this.form.code) {
          ElMessage.warning(
            this.form.type === 'API'
              ? '请填写接口路径以生成权限编码'
              : '请填写动作标识以生成权限编码',
          )
          return
        }
      }
      await formRef.validate()
      this.submitting = true
      try {
        const payload = { ...this.form }
        if (payload.type === 'API') {
          payload.path = this.normalizeApiPath(payload.path || '')
          payload.method = (payload.method || 'GET').toUpperCase()
        } else {
          payload.path = undefined
          payload.method = undefined
        }
        if (payload.type !== 'BUTTON' && payload.type !== 'TABLE_BUTTON') {
          payload.action = undefined
          payload.icon = undefined
          payload.buttonColor = undefined
        }
        if (this.isEdit && this.editingRow) {
          await update(this.editingRow.id, payload)
          ElMessage.success('更新成功')
        } else {
          await create(payload)
          ElMessage.success('新增成功')
          this.activeType = payload.type
        }
        this.dialogVisible = false
        await this.loadData(true)
      } finally {
        this.submitting = false
      }
    },
    async handleDelete(row) {
      await remove(row.id)
      ElMessage.success('删除成功')
      await this.loadData(true)
    },
    inquires(formData) {
      this.queryForm = formData
      this.page = 1
      this.applyLocalPage()
    },
    reset() {
      this.queryForm = {}
      this.page = 1
      this.applyLocalPage()
    },
  },
}
</script>

<style scoped>
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

.menu-node__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.perm-content__alert {
  margin: 16px;
}

.perm-content__tab-badge {
  margin-left: 4px;
}

.perm-content__mono {
  font-family: monospace;
  font-size: var(--app-font-size-main);
  color: #606266;
}

.perm-content__empty {
  margin: auto;
}

.perm-content__form-tip {
  font-size: var(--app-font-size-main);
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.perm-content__form-tip--warn {
  color: #e6a23c;
  padding-left: 90px;
}
</style>
