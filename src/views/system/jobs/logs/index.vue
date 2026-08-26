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
        table-key="system:jobs:logs"
        entity-name="任务日志"
        name-field="jobName"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="loadData"
      >
        <template #status="{ row }">
          <el-tag :type="jobStatusType(row.status)" size="small">{{
            jobStatusLabel(row.status)
          }}</el-tag>
        </template>
        <template #actions="{ row }">
          <xnTableActions :items="tableButtonItems" :row="row" @action-click="onTableAction" />
        </template>
      </xnTable>
    </template>
  </xnPageLayout>

  <xnDialog
    v-model="detailVisible"
    title="任务日志详情"
    width="820px"
    :show-confirm="false"
    cancel-text="关闭"
  >
    <xnDesc v-if="current" :column="2" :items="detailItems" />
    <xnCode
      v-if="current && current.message"
      title="信息"
      language="text"
      :value="current.message"
      style="margin-top: 12px"
    />
    <xnCode
      v-if="current && current.exceptionInfo"
      title="异常"
      language="text"
      :value="current.exceptionInfo"
      max-height="320px"
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
import {
  batchRemoveJobLogs,
  cleanJobLogs,
  exportJobLogs,
  getJobLog,
  listJobLogs,
  removeJobLog,
} from '@/api/job-log'
import { rangeToBeginEnd } from '@/utils/download'

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { prop: 'jobName', label: '任务名称', minWidth: 140 },
  { prop: 'jobKey', label: '标识', minWidth: 140 },
  { type: 'slot', slot: 'status', prop: 'status', label: '状态', width: 90 },
  { prop: 'message', label: '信息', minWidth: 180, showOverflowTooltip: true },
  { prop: 'startTime', label: '开始时间', minWidth: 170, type: 'datetime' },
  { prop: 'costMs', label: '耗时(ms)', width: 100 },
  { type: 'slot', slot: 'actions', label: '操作', width: 140, fixed: 'right' },
]

export default {
  name: 'SystemJobLogs',
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
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/system/jobs/logs')
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
      return [
        { label: '任务', value: row.jobName },
        { label: '状态', value: this.jobStatusLabel(row.status) },
        { label: '标识', value: row.jobKey, type: 'copy' },
        { label: '耗时(ms)', value: row.costMs },
        { label: '调用目标', value: row.invokeTarget, span: 2, type: 'copy' },
        { label: '开始', value: row.startTime },
        { label: '结束', value: row.endTime },
      ]
    },
  },
  watch: {
    '$route.query.jobId'() {
      this.page = 1
      this.loadData()
    },
  },
  mounted() {
    this.loadData()
  },
  methods: {
    jobStatusLabel(status) {
      if (status === 'SUCCESS') return '成功'
      if (status === 'FAIL') return '失败'
      if (status === 'SKIP') return '跳过'
      return status || '—'
    },
    jobStatusType(status) {
      if (status === 'SUCCESS') return 'success'
      if (status === 'FAIL') return 'danger'
      if (status === 'SKIP') return 'info'
      return 'info'
    },
    jobIdFromQuery() {
      const raw = this.$route.query.jobId
      const n = Number(Array.isArray(raw) ? raw[0] : raw)
      return Number.isFinite(n) && n > 0 ? n : undefined
    },
    listParams() {
      return {
        page: this.page - 1,
        size: this.size,
        keyword: String(this.queryForm.FuzzyWord ?? '').trim() || undefined,
        jobId: this.jobIdFromQuery(),
        status: String(this.queryForm.status ?? '').trim() || undefined,
        ...rangeToBeginEnd(this.queryForm.range),
      }
    },
    selectionChangeHandle(rows) {
      this.selected = rows
    },
    async openDetail(row) {
      const res = await getJobLog(row.id)
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
      await removeJobLog(row.id)
      ElMessage.success('已删除')
      this.loadData()
    },
    async handleBatchDelete() {
      if (!this.selected.length) {
        ElMessage.warning('请至少选择一条日志')
        return
      }
      await ElMessageBox.confirm(
        `确定删除选中的 ${this.selected.length} 条任务日志吗？`,
        '删除确认',
        { type: 'warning' },
      )
      await batchRemoveJobLogs(this.selected.map((r) => r.id))
      ElMessage.success('已删除')
      this.selected = []
      this.loadData()
    },
    async handleClean() {
      await ElMessageBox.confirm('确定清空全部任务日志吗？此操作不可恢复。', '清空确认', {
        type: 'warning',
      })
      await cleanJobLogs()
      ElMessage.success('已清空')
      this.selected = []
      this.loadData()
    },
    async handleExport() {
      await exportJobLogs(this.listParams())
    },
    async loadData() {
      this.loading = true
      try {
        const res = await listJobLogs(this.listParams())
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
