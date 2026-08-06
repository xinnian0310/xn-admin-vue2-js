<template>
  <div class="xn-table">
    <div ref="bodyRef" class="xn-table__body">
      <el-table
        v-loading="displayLoading"
        v-bind="$attrs"
        :data="displayData"
        :height="tableHeight"
        @selection-change="onSelectionChange"
      >
        <template v-for="col in visibleColumns" :key="columnKey(col)">
          <el-table-column
            v-if="col.type === 'selection'"
            type="selection"
            :width="col.width ?? 50"
            :fixed="col.fixed"
            :align="col.align"
            :class-name="col.className"
          />

          <el-table-column
            v-else-if="col.type === 'index'"
            type="index"
            :label="col.label"
            :width="col.width ?? 60"
            :fixed="col.fixed"
            :align="col.align ?? 'center'"
            :index="col.index"
            :class-name="col.className"
          />

          <el-table-column
            v-else-if="col.type === 'slot'"
            :prop="col.prop"
            :label="col.label"
            :width="resolveColumnWidth(col)"
            :min-width="resolveColumnMinWidth(col)"
            :fixed="col.fixed"
            :align="resolveColumnAlign(col)"
            :sortable="col.sortable"
            :show-overflow-tooltip="col.showOverflowTooltip"
            :class-name="resolveColumnClassName(col)"
          >
            <template #default="scope">
              <slot :name="resolveSlotName(col)" v-bind="scope" />
            </template>
          </el-table-column>

          <el-table-column
            v-else-if="col.type === 'iconText'"
            :prop="col.prop"
            :label="col.label"
            :width="col.width"
            :min-width="col.minWidth"
            :fixed="col.fixed"
            :align="col.align"
            :sortable="col.sortable"
            :show-overflow-tooltip="col.showOverflowTooltip"
            :class-name="col.className"
          >
            <template #default="{ row }">
              <span class="xn-table__icon-text">
                <xnAppIcon v-if="resolveIconName(row, col)" :name="resolveIconName(row, col)" />
                <span>{{ formatText(row, col) }}</span>
              </span>
            </template>
          </el-table-column>

          <el-table-column
            v-else-if="col.type === 'longText'"
            :prop="col.prop"
            :label="col.label"
            :width="col.width"
            :min-width="col.minWidth"
            :fixed="col.fixed"
            :align="col.align"
            :sortable="col.sortable"
            :class-name="col.className"
          >
            <template #default="{ row }">
              <xnLongText
                :text="formatLongTextRaw(row, col)"
                :title="col.label || '详细内容'"
                :empty-text="emptyOf(col)"
                :max-length="col.longTextMaxLength ?? 48"
              />
            </template>
          </el-table-column>

          <el-table-column
            v-else-if="col.type === 'tag'"
            :prop="col.prop"
            :label="col.label"
            :width="col.width"
            :min-width="col.minWidth"
            :fixed="col.fixed"
            :align="col.align"
            :sortable="col.sortable"
            :class-name="col.className"
          >
            <template #default="{ row }">
              <el-tag v-if="resolveOption(row, col)" :type="resolveOption(row, col)?.type">
                {{ resolveOption(row, col)?.label }}
              </el-tag>
              <span v-else>{{ emptyOf(col) }}</span>
            </template>
          </el-table-column>

          <el-table-column
            v-else-if="col.type === 'switch'"
            :prop="col.prop"
            :label="col.label"
            :width="col.width"
            :min-width="col.minWidth"
            :fixed="col.fixed"
            :align="col.align"
            :class-name="col.className"
          >
            <template #default="{ row }">
              <el-switch
                :model-value="getCellValue(row, col.prop)"
                :active-value="col.activeValue ?? 1"
                :inactive-value="col.inactiveValue ?? 0"
                :disabled="isSwitchDisabled(row, col)"
                @change="(val) => emitSwitchChange(row, col, val)"
              />
            </template>
          </el-table-column>

          <el-table-column
            v-else
            :prop="col.prop"
            :label="col.label"
            :width="col.width"
            :min-width="col.minWidth"
            :fixed="col.fixed"
            :align="col.align"
            :sortable="col.sortable"
            :show-overflow-tooltip="col.showOverflowTooltip"
            :class-name="col.className"
          >
            <template #default="{ row }">
              {{ formatText(row, col) }}
            </template>
          </el-table-column>
        </template>

        <slot />
      </el-table>
    </div>

    <div v-if="showPagination" class="xn-table__pagination">
      <div class="xn-table__pagination-main">
        <slot name="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="currentPageSize"
            :total="displayTotal"
            :page-sizes="resolvedPageSizes"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handlePageChange"
            @current-change="handlePageChange"
          />
        </slot>
      </div>
      <div class="xn-table__pagination-actions">
        <el-tooltip content="刷新" placement="top">
          <el-button :icon="Refresh" circle @click="handleRefresh" />
        </el-tooltip>
        <el-tooltip v-if="tableKey" content="列设置" placement="top">
          <el-button :icon="Setting" circle @click="openColumnSetting" />
        </el-tooltip>
      </div>
    </div>

    <xnColumnSettingDialog
      v-if="tableKey"
      v-model="columnSettingVisible"
      :columns="settingRows"
      :saving="columnSaving"
      @save="handleSaveColumns"
      @reset="handleResetColumns"
    />

    <component
      :is="saveComponent"
      v-if="saveComponent"
      ref="saveRef"
      @success="handleSaveSuccess"
    />
  </div>
</template>

<script>
import { provide, shallowRef, markRaw } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Setting } from '@element-plus/icons-vue'
import xnAppIcon from '@/components/xnAppIcon/xnAppIcon.vue'
import xnLongText from '@/components/xnLongText/xnLongText.vue'
import xnColumnSettingDialog from '@/components/xnTable/xnColumnSettingDialog.vue'
import { getTableColumns, saveTableColumns } from '@/api/table-column'
import { CRUD_API_KEY } from '@/composables/useCrudApi'
import { loadCrudApi } from '@/utils/api-loader'
import { formatDateTime, isIsoDateTimeLike } from '@/utils/datetime'
import { estimateTableActionsWidth } from '@/utils/table-actions'
import { usePermission } from '@/directives/permission'

const DEFAULT_HEADER_HEIGHT = 40
const DEFAULT_ROW_HEIGHT = 48

function columnIdentity(col) {
  if (col.prop) return col.prop
  if (col.slot) return `slot:${col.slot}`
  if (col.type) return `type:${col.type}`
  return `label:${col.label ?? ''}`
}

function toSettingRow(col, index) {
  const widthNum = col.width == null || col.width === '' ? undefined : Number(col.width)
  const locked = col.type === 'selection'
  return {
    key: columnIdentity(col),
    prop: col.prop,
    label: locked ? '选择框' : col.label,
    width: Number.isFinite(widthNum) ? widthNum : undefined,
    visible: col.visible !== false,
    sort: index,
    locked,
  }
}

function applyColumnSettings(defaults, settings) {
  if (!settings.length) {
    return defaults.map((col) => ({ ...col }))
  }
  const defaultMap = new Map(defaults.map((col) => [columnIdentity(col), col]))
  const used = new Set()
  const result = []
  const sorted = [...settings].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
  for (const setting of sorted) {
    const base = defaultMap.get(setting.key)
    if (!base) continue
    used.add(setting.key)
    result.push({
      ...base,
      label: base.type === 'selection' ? '选择框' : (setting.label ?? base.label),
      width: setting.width ?? base.width,
      visible: setting.visible !== false,
    })
  }
  for (const col of defaults) {
    const key = columnIdentity(col)
    if (!used.has(key)) {
      result.push({ ...col })
    }
  }
  return result
}

export default {
  name: 'xnTable',
  inheritAttrs: false,
  components: { xnAppIcon, xnLongText, xnColumnSettingDialog },
  props: {
    data: { required: false },
    columns: { type: Array, required: false, default: () => [] },
    loading: { type: Boolean, required: false, default: false },
    tableHeight: { type: String, required: false, default: '100%' },
    showPagination: { type: Boolean, required: false, default: true },
    page: { type: Number, required: false, default: 1 },
    pageSize: { type: Number, required: false, default: 10 },
    total: { type: Number, required: false, default: 0 },
    pageSizes: { type: Array, required: false, default: () => [10, 20, 50, 100] },
    api: { required: false },
    queryParams: { type: Object, required: false, default: () => ({}) },
    listFilter: { required: false },
    saveComponent: { required: false },
    entityName: { type: String, required: false, default: '数据' },
    nameField: { type: String, required: false, default: 'title' },
    idField: { type: String, required: false, default: 'id' },
    deleteCheck: { required: false },
    immediate: { type: Boolean, required: false, default: true },
    tableKey: { required: false },
    actionItems: { type: Array, required: false, default: () => [] },
    autoPageSize: { type: Boolean, required: false, default: true },
    autoPageSizeMin: { type: Number, required: false, default: 5 },
    autoPageSizeMax: { type: Number, required: false, default: 200 },
  },
  emits: [
    'update:page',
    'update:pageSize',
    'page-change',
    'selection-change',
    'switch-change',
    'data-change',
    'success',
  ],
  setup() {
    const crudApi = shallowRef(null)
    const { hasPermission } = usePermission()
    provide(CRUD_API_KEY, crudApi)
    return {
      crudApi,
      hasPermission,
      Refresh: markRaw(Refresh),
      Setting: markRaw(Setting),
    }
  },
  data() {
    return {
      selected: [],
      innerLoading: false,
      innerAllData: [],
      innerRecords: [],
      innerTotal: 0,
      serverPaging: false,
      savedColumnSettings: [],
      columnSettingVisible: false,
      columnSaving: false,
      fittedPageSize: 0,
      autoPageSizeReady: false,
      resizeObserver: null,
      resizeTimer: null,
      didRefineByRealRow: false,
    }
  },
  computed: {
    visibleActionItems() {
      return (this.actionItems ?? []).filter(
        (item) => !item.permission || this.hasPermission(item.permission),
      )
    },
    isApiMode() {
      return Boolean(this.api)
    },
    isDataMode() {
      return this.data !== undefined
    },
    resolvedColumns() {
      return applyColumnSettings(this.columns ?? [], this.savedColumnSettings)
    },
    visibleColumns() {
      return this.resolvedColumns.filter((col) => col.visible !== false)
    },
    settingRows() {
      return this.resolvedColumns.map((col, index) => toSettingRow(col, index))
    },
    currentPage: {
      get() {
        return this.page
      },
      set(val) {
        this.$emit('update:page', val)
      },
    },
    currentPageSize: {
      get() {
        return this.pageSize
      },
      set(val) {
        this.$emit('update:pageSize', val)
      },
    },
    resolvedPageSizes() {
      const set = new Set(this.pageSizes)
      if (this.autoPageSize && this.fittedPageSize > 0) {
        set.add(this.fittedPageSize)
      }
      return [...set].sort((a, b) => a - b)
    },
    filteredAllData() {
      const rows = this.innerAllData
      return this.listFilter ? this.listFilter(rows) : rows
    },
    displayData() {
      if (this.isDataMode) return this.data ?? []
      if (this.serverPaging) return this.innerRecords
      const start = (this.currentPage - 1) * this.currentPageSize
      return this.filteredAllData.slice(start, start + this.currentPageSize)
    },
    displayTotal() {
      if (this.isDataMode) return this.total
      if (this.serverPaging) return this.innerTotal
      return this.filteredAllData.length
    },
    displayLoading() {
      return this.isApiMode ? this.innerLoading : this.loading
    },
    actionsColumnWidth() {
      return estimateTableActionsWidth(this.visibleActionItems)
    },
  },
  watch: {
    api: {
      handler() {
        this.assertMode()
        this.crudApi = this.api ? loadCrudApi(this.api) : null
      },
      immediate: true,
    },
    data: {
      handler() {
        this.assertMode()
        this.crudApi = this.api ? loadCrudApi(this.api) : null
      },
      immediate: true,
    },
    displayData: {
      handler() {
        this.emitDataChange()
      },
      immediate: true,
    },
    displayTotal: {
      handler() {
        this.emitDataChange()
      },
      immediate: true,
    },
    displayLoading: {
      handler() {
        this.emitDataChange()
      },
      immediate: true,
    },
    queryParams: {
      handler() {
        if (!this.isApiMode) return
        if (this.currentPage !== 1) {
          this.currentPage = 1
        }
      },
      deep: true,
    },
    'displayData.length': {
      async handler(len) {
        if (!this.autoPageSize || !this.autoPageSizeReady || this.didRefineByRealRow || len <= 0)
          return
        this.didRefineByRealRow = true
        await this.$nextTick()
        this.updateAutoPageSize({ emitReload: true })
      },
    },
  },
  async mounted() {
    if (this.tableKey) {
      await this.loadColumnSettings()
    }
    await this.$nextTick()
    this.updateAutoPageSize({ emitReload: false })
    await this.$nextTick()
    this.setupAutoPageSizeObserver()
    this.autoPageSizeReady = true
    if (this.isApiMode && this.immediate) {
      this.loadData()
    }
  },
  beforeUnmount() {
    if (this.resizeTimer) clearTimeout(this.resizeTimer)
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
  },
  methods: {
    assertMode() {
      if (this.isApiMode && this.isDataMode) {
        throw new Error('[xnTable] api 与 data 只能传其中一个')
      }
      if (!this.isApiMode && !this.isDataMode) {
        throw new Error('[xnTable] 必须传 api 或 data 其中一个')
      }
    },
    emitDataChange() {
      this.$emit('data-change', {
        records: this.displayData,
        total: this.displayTotal,
        loading: this.displayLoading,
      })
    },
    measureRowMetrics(bodyEl) {
      const header = bodyEl.querySelector('.el-table__header-wrapper')
      const row = bodyEl.querySelector('.el-table__body tr.el-table__row')
      return {
        headerH: header?.offsetHeight || DEFAULT_HEADER_HEIGHT,
        rowH: row?.offsetHeight || DEFAULT_ROW_HEIGHT,
      }
    },
    calcFittedPageSize(bodyEl) {
      const bodyH = bodyEl.clientHeight
      if (bodyH <= 0) return this.autoPageSizeMin
      const { headerH, rowH } = this.measureRowMetrics(bodyEl)
      const usable = bodyH - headerH
      if (usable <= 0 || rowH <= 0) return this.autoPageSizeMin
      const raw = Math.floor(usable / rowH)
      return Math.min(this.autoPageSizeMax, Math.max(this.autoPageSizeMin, raw))
    },
    applyFittedPageSize(next, opts) {
      this.fittedPageSize = next
      const sizeChanged = next !== this.pageSize
      if (sizeChanged) {
        this.$emit('update:pageSize', next)
      }
      if (sizeChanged && this.page !== 1) {
        this.$emit('update:page', 1)
      }
      if (opts?.emitReload && sizeChanged) {
        this.$nextTick(() => {
          this.$emit('page-change')
          if (this.isApiMode && this.serverPaging) {
            this.loadData()
          }
        })
      }
    },
    updateAutoPageSize(opts) {
      if (!this.autoPageSize) return
      const el = this.$refs.bodyRef
      if (!el) return
      const next = this.calcFittedPageSize(el)
      this.applyFittedPageSize(next, opts)
    },
    setupAutoPageSizeObserver() {
      const el = this.$refs.bodyRef
      if (!el || typeof ResizeObserver === 'undefined') return
      this.resizeObserver?.disconnect()
      this.resizeObserver = new ResizeObserver(() => {
        if (this.resizeTimer) clearTimeout(this.resizeTimer)
        this.resizeTimer = setTimeout(() => {
          this.updateAutoPageSize({ emitReload: this.autoPageSizeReady })
        }, 80)
      })
      this.resizeObserver.observe(el)
    },
    isPageResult(payload) {
      return (
        !!payload &&
        typeof payload === 'object' &&
        Array.isArray(payload.records) &&
        typeof payload.total === 'number'
      )
    },
    /** api 模式：请求列表 */
    async loadData(extraParams) {
      this.assertMode()
      if (!this.isApiMode) return
      const api = this.requireApi()
      this.innerLoading = true
      this.selected = []
      this.$emit('selection-change', [])
      try {
        const params = this.sanitizeParams({
          ...this.queryParams,
          ...extraParams,
          page: this.currentPage - 1,
          size: this.currentPageSize,
        })
        const res = await api.list(params)
        const payload = res.data
        if (this.isPageResult(payload)) {
          this.serverPaging = true
          this.innerRecords = payload.records
          this.innerTotal = payload.total
          this.innerAllData = []
        } else if (Array.isArray(payload)) {
          this.serverPaging = false
          this.innerAllData = payload
          this.innerRecords = []
          this.innerTotal = payload.length
        } else {
          this.serverPaging = false
          this.innerAllData = []
          this.innerRecords = []
          this.innerTotal = 0
        }
      } finally {
        this.innerLoading = false
      }
    },
    /** 去掉空值，避免把空字符串传给后端导致绑定失败 */
    sanitizeParams(raw) {
      const result = {}
      for (const [key, value] of Object.entries(raw)) {
        if (value === '' || value === undefined || value === null) continue
        if (Array.isArray(value) && value.length === 0) continue
        result[key] = value
      }
      return result
    },
    handlePageChange() {
      this.$emit('page-change')
      if (this.isApiMode && this.serverPaging) {
        this.loadData()
      }
    },
    onSelectionChange(rows) {
      this.selected = rows
      this.$emit('selection-change', rows)
    },
    requireApi() {
      if (!this.crudApi) {
        throw new Error('[xnTable] 当前为 data 模式或未配置 api，无法调用接口方法')
      }
      return this.crudApi
    },
    getApi() {
      return this.crudApi
    },
    rowId(row) {
      return Number(row[this.idField])
    },
    rowName(row) {
      const name = row[this.nameField]
      return name == null || name === '' ? `#${this.rowId(row)}` : String(name)
    },
    ensureSingleSelected() {
      if (this.selected.length !== 1) {
        ElMessage.warning('请选择一项操作')
        return null
      }
      return this.selected[0]
    },
    openSave(mode, id, options) {
      if (!this.saveComponent) {
        ElMessage.warning('未配置 saveComponent，无法打开表单')
        return
      }
      if (!this.isApiMode) {
        ElMessage.warning('data 模式下请自行处理表单接口，或改用 api 模式')
        return
      }
      this.$refs.saveRef?.open(mode, id, options)
    },
    async handleDelete(row) {
      const targets = row != null ? [row] : this.selected
      if (!targets.length) {
        ElMessage.warning('请至少选择一项')
        return
      }
      for (const target of targets) {
        if (!this.deleteCheck) continue
        const check = this.deleteCheck(target)
        if (check === false) {
          ElMessage.warning(`${this.entityName}不可删除：${this.rowName(target)}`)
          return
        }
        if (typeof check === 'string') {
          ElMessage.warning(check)
          return
        }
      }
      const api = this.requireApi()
      const message =
        targets.length === 1
          ? `确定删除${this.entityName}「${this.rowName(targets[0])}」吗？`
          : `确定删除选中的 ${targets.length} 条${this.entityName}吗？`
      await ElMessageBox.confirm(message, '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
      const ids = targets.map((t) => this.rowId(t))
      if (ids.length > 1 && typeof api.batchRemove === 'function') {
        await api.batchRemove(ids)
      } else if (ids.length > 1) {
        for (const id of ids) {
          await api.remove(id)
        }
      } else {
        await api.remove(ids[0])
      }
      ElMessage.success('删除成功')
      this.$emit('success')
      if (this.isApiMode) await this.loadData()
    },
    handleAction(action) {
      if (action === 'add') {
        this.openSave('add')
        return
      }
      if (action === 'edit' || action === 'view') {
        const row = this.ensureSingleSelected()
        if (!row) return
        this.openSave(action, this.rowId(row))
        return
      }
      if (action === 'delete') {
        this.handleDelete()
      }
    },
    async handleSaveSuccess() {
      this.$emit('success')
      if (this.isApiMode) await this.loadData()
    },
    async loadColumnSettings() {
      if (!this.tableKey) return
      try {
        const res = await getTableColumns(this.tableKey)
        this.savedColumnSettings = res.data.columns ?? []
      } catch {
        this.savedColumnSettings = []
      }
    },
    handleRefresh() {
      if (this.isApiMode) {
        this.loadData()
        return
      }
      this.$emit('page-change')
    },
    openColumnSetting() {
      if (!this.tableKey) {
        ElMessage.warning('未配置 tableKey，无法使用列设置')
        return
      }
      this.columnSettingVisible = true
    },
    async handleSaveColumns(columns) {
      if (!this.tableKey) return
      this.columnSaving = true
      try {
        const res = await saveTableColumns({
          tableKey: this.tableKey,
          columns,
        })
        this.savedColumnSettings = res.data.columns ?? columns
        this.columnSettingVisible = false
        ElMessage.success('列设置已保存')
      } finally {
        this.columnSaving = false
      }
    },
    async handleResetColumns() {
      if (!this.tableKey) return
      const defaults = (this.columns ?? []).map((col, index) => toSettingRow(col, index))
      this.columnSaving = true
      try {
        const res = await saveTableColumns({
          tableKey: this.tableKey,
          columns: defaults,
        })
        this.savedColumnSettings = res.data.columns ?? defaults
        this.columnSettingVisible = false
        ElMessage.success('已恢复默认列设置')
      } finally {
        this.columnSaving = false
      }
    },
    columnKey(col) {
      return `${col.type ?? 'text'}-${col.prop ?? ''}-${col.slot ?? ''}-${col.label ?? ''}`
    },
    resolveSlotName(col) {
      return col.slot || col.prop || 'default'
    },
    /** 操作列：按全部按钮估算宽度，避免换行 */
    isActionsColumn(col) {
      return col.slot === 'actions' || col.label === '操作'
    },
    resolveColumnWidth(col) {
      if (this.isActionsColumn(col) && this.visibleActionItems.length) {
        return this.actionsColumnWidth
      }
      if (col.width != null && col.width !== '') return col.width
      return undefined
    },
    resolveColumnMinWidth(col) {
      if (this.isActionsColumn(col) && this.visibleActionItems.length) {
        return this.actionsColumnWidth
      }
      if (col.minWidth != null && col.minWidth !== '') return col.minWidth
      if (this.isActionsColumn(col)) return 100
      return undefined
    },
    resolveColumnClassName(col) {
      const parts = [col.className, this.isActionsColumn(col) ? 'xn-table-col-actions' : ''].filter(
        Boolean,
      )
      return parts.join(' ') || undefined
    },
    resolveColumnAlign(col) {
      if (col.align) return col.align
      if (this.isActionsColumn(col)) return 'center'
      return undefined
    },
    emptyOf(col) {
      return col.emptyText ?? '—'
    },
    getCellValue(row, prop) {
      if (!row || typeof row !== 'object' || !prop) return undefined
      return row[prop]
    },
    resolveOption(row, col) {
      if (!col.options?.length) return undefined
      const raw = this.getCellValue(row, col.prop)
      return col.options.find((opt) => String(opt.value) === String(raw))
    },
    resolveIconName(row, col) {
      const name = this.getCellValue(row, col.iconProp ?? 'icon')
      return typeof name === 'string' && name ? name : undefined
    },
    formatText(row, col) {
      const mapped = this.resolveOption(row, col)
      if (mapped) return `${col.prefix ?? ''}${mapped.label}${col.suffix ?? ''}`
      const raw = this.getCellValue(row, col.prop)
      if (raw === null || raw === undefined || raw === '') {
        return this.emptyOf(col)
      }
      if (col.type === 'datetime' || isIsoDateTimeLike(raw)) {
        return `${col.prefix ?? ''}${formatDateTime(raw)}${col.suffix ?? ''}`
      }
      return `${col.prefix ?? ''}${String(raw)}${col.suffix ?? ''}`
    },
    /** longText 列传给弹窗组件的原始字符串（空则交给 emptyText） */
    formatLongTextRaw(row, col) {
      const raw = this.getCellValue(row, col.prop)
      if (raw === null || raw === undefined || raw === '') return ''
      return String(raw)
    },
    isSwitchDisabled(row, col) {
      if (!col.disabledProp) return false
      return Boolean(this.getCellValue(row, col.disabledProp))
    },
    emitSwitchChange(row, col, value) {
      if (!col.prop || !row || typeof row !== 'object') return
      this.$emit('switch-change', {
        row: row,
        prop: col.prop,
        value,
      })
    },
  },
}
</script>

<style scoped>
.xn-table {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
}

.xn-table__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.xn-table__body :deep(.el-table) {
  height: 100% !important;
}

/* 操作列：单行展示、居中，宽度由全部按钮估算 */
.xn-table__body :deep(.xn-table-col-actions .cell) {
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
}

.xn-table__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  flex-shrink: 0;
  background: var(--app-card-bg, #fff);
  border-top: 1px solid var(--app-border-color);
}

.xn-table__pagination-main {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: flex-start;
}

.xn-table__pagination-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.xn-table__icon-text {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>
