<template>
  <xnPageLayout v-model:page="page" v-model:page-size="size" :total="total" @page-change="loadData">
    <template #search>
      <xnSearch :search-item="searchItems" @query-form="inquires" @reset="reset" />
    </template>
    <template #toolbar>
      <xnButton
        :list-item="buttonItems"
        :selected="selected"
        :export-request="handleExport"
        @button-click="buttonClick"
      />
    </template>
    <template #table>
      <xnTable
        v-model:page="page"
        v-model:page-size="size"
        :data="tableData"
        :total="total"
        :loading="loading"
        table-key="system:logs:oper"
        entity-name="操作日志"
        name-field="title"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="loadData"
      >
        <template #businessType="{ row }">
          {{ businessTypeLabel(row.businessType) }}
        </template>
        <template #status="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
            {{ row.status === 1 ? '成功' : '失败' }}
          </el-tag>
        </template>
        <template #actions="{ row }">
          <xnTableActions :items="tableButtonItems" :row="row" @action-click="onTableAction" />
        </template>
      </xnTable>
    </template>
  </xnPageLayout>

  <xnDialog
    v-model="detailVisible"
    title="操作日志详情"
    width="820px"
    :show-confirm="false"
    cancel-text="关闭"
  >
    <xnDesc v-if="current" :column="2" :items="detailItems" />
    <xnCode
      v-if="current?.params"
      title="参数"
      language="json"
      :value="current.params"
      style="margin-top: 12px"
    />
    <xnCode
      v-if="current?.errorMsg"
      title="错误"
      language="text"
      :value="current.errorMsg"
      style="margin-top: 12px"
    />
  </xnDialog>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import xnDesc from '@/components/xnDesc/xnDesc.vue'
import xnCode from '@/components/xnCode/xnCode.vue'
import { usePageUi } from '@/composables/usePageUi'
import { batchRemove, clean, exportOperLogs, get, list, remove } from '@/api/oper-log'
import { rangeToBeginEnd } from '@/utils/download'

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { prop: 'title', label: '模块', minWidth: 140 },
  { type: 'slot', slot: 'businessType', prop: 'businessType', label: '业务类型', width: 100 },
  { prop: 'operatorName', label: '操作人', minWidth: 110 },
  { prop: 'requestUrl', label: 'URL', minWidth: 180, showOverflowTooltip: true },
  { type: 'slot', slot: 'status', prop: 'status', label: '状态', width: 90 },
  { prop: 'costTime', label: '耗时(ms)', width: 100 },
  { prop: 'ip', label: 'IP', minWidth: 120 },
  { prop: 'operTime', label: '操作时间', minWidth: 170, type: 'datetime' },
  { type: 'slot', slot: 'actions', label: '操作', width: 140, fixed: 'right' },
]

export default {
  name: 'SystemOperLogs',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
    xnDialog,
    xnDesc,
    xnCode,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/system/logs/oper')
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
      selected: [],
      detailVisible: false,
      current: null,
      columns,
    }
  },
  computed: {
    detailItems() {
      const row = this.current
      if (!row) return []
      const request = [row.requestMethod, row.requestUrl].filter(Boolean).join(' ')
      return [
        { label: '模块', value: row.title },
        { label: '业务类型', value: this.businessTypeLabel(row.businessType) },
        { label: '操作人', value: row.operatorName },
        { label: '状态', value: row.status === 1 ? '成功' : '失败' },
        { label: '请求', value: request, span: 2, type: 'copy' },
        { label: '方法', value: row.method, span: 2, type: 'copy' },
        { label: 'IP', value: row.ip, type: 'copy' },
        { label: '耗时(ms)', value: row.costTime },
        { label: '时间', value: row.operTime, span: 2 },
      ]
    },
  },
  mounted() {
    this.loadData()
  },
  methods: {
    businessTypeLabel(type) {
      const map = {
        INSERT: '新增',
        UPDATE: '修改',
        DELETE: '删除',
        GRANT: '授权',
        IMPORT: '导入',
        EXPORT: '导出',
        CLEAN: '清空',
        OTHER: '其他',
      }
      return map[String(type || '')] || type || '—'
    },
    listParams() {
      const statusRaw = this.queryForm.status
      return {
        page: this.page - 1,
        size: this.size,
        keyword: String(this.queryForm.FuzzyWord ?? '').trim() || undefined,
        businessType: String(this.queryForm.businessType ?? '').trim() || undefined,
        status: statusRaw === '' || statusRaw == null ? undefined : Number(statusRaw),
        ...rangeToBeginEnd(this.queryForm.operTime),
      }
    },
    selectionChangeHandle(rows) {
      this.selected = rows
    },
    async openDetail(row) {
      const res = await get(row.id)
      this.current = res.data
      this.detailVisible = true
    },
    onTableAction(payload) {
      const row = payload.row
      if (payload.action === 'view') this.openDetail(row)
      else if (payload.action === 'delete') this.handleDelete(row)
    },
    async buttonClick(action) {
      if (action === 'view') {
        if (this.selected.length !== 1) {
          ElMessage.warning('请选择一条日志')
          return
        }
        await this.openDetail(this.selected[0])
      } else if (action === 'delete') await this.handleBatchDelete()
      else if (action === 'clean') await this.handleClean()
    },
    async handleDelete(row) {
      await remove(row.id)
      ElMessage.success('已删除')
      this.loadData()
    },
    async handleBatchDelete() {
      if (!this.selected.length) {
        ElMessage.warning('请至少选择一条日志')
        return
      }
      await ElMessageBox.confirm(
        `确定删除选中的 ${this.selected.length} 条操作日志吗？`,
        '删除确认',
        { type: 'warning' },
      )
      await batchRemove(this.selected.map((r) => r.id))
      ElMessage.success('已删除')
      this.selected = []
      this.loadData()
    },
    async handleClean() {
      await ElMessageBox.confirm('确定清空全部操作日志吗？此操作不可恢复。', '清空确认', {
        type: 'warning',
      })
      await clean()
      ElMessage.success('已清空')
      this.selected = []
      this.loadData()
    },
    async handleExport() {
      await exportOperLogs(this.listParams())
    },
    async loadData() {
      this.loading = true
      try {
        const res = await list(this.listParams())
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
  },
}
</script>
