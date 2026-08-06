<template>
  <xnPageLayout
    v-model:page="page"
    v-model:page-size="size"
    :total="total"
    @page-change="loadData"
  >
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
        table-key="system:jobs"
        entity-name="定时任务"
        name-field="name"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="loadData"
      >
        <template #misfirePolicy="{ row }">
          {{ misfireLabel(row.misfirePolicy) }}
        </template>
        <template #status="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
            {{ row.status === 1 ? '启用' : '停用' }}
          </el-tag>
        </template>
        <template #actions="{ row }">
          <xnTableActions :items="tableButtonItems" :row="row" @action-click="onTableAction" />
        </template>
      </xnTable>
    </template>
  </xnPageLayout>

  <JobSave ref="saveRef" @success="loadData" />
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import JobSave from './save.vue'
import { usePageUi } from '@/composables/usePageUi'
import { batchRemoveJobs, listJobs, removeJob, runJob } from '@/api/file-job'

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { prop: 'name', label: '任务名称', minWidth: 140 },
  { prop: 'jobKey', label: '任务标识', minWidth: 140 },
  { prop: 'cron', label: 'Cron', minWidth: 140 },
  { type: 'longText', prop: 'invokeTarget', label: '调用目标', minWidth: 180 },
  { type: 'slot', slot: 'misfirePolicy', prop: 'misfirePolicy', label: 'misfire', width: 120 },
  { type: 'slot', slot: 'status', prop: 'status', label: '状态', width: 90 },
  { prop: 'lastRunAt', label: '上次执行', minWidth: 170, type: 'datetime' },
  { prop: 'lastStatus', label: '执行结果', width: 100 },
  { type: 'slot', slot: 'actions', label: '操作', fixed: 'right' },
]

export default {
  name: 'SystemJobs',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
    JobSave,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/system/jobs')
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
      columns,
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    misfireLabel(policy) {
      switch (policy) {
        case '1':
          return '忽略补齐'
        case '2':
          return '补偿一次'
        case '3':
          return '不触发'
        default:
          return '默认'
      }
    },
    openSave(mode, id) {
      this.$refs.saveRef?.open(mode, id)
    },
    selectionChangeHandle(rows) {
      this.selected = rows
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
        case 'run':
          this.handleRun(row)
          break
        case 'logs':
          this.$router.push({ path: '/system/jobs/logs', query: { jobId: String(row.id) } })
          break
      }
    },
    buttonClick(action) {
      if (action === 'add') this.openSave('add')
      else if (action === 'edit' && this.selected.length === 1)
        this.openSave('edit', this.selected[0].id)
      else if (action === 'view' && this.selected.length === 1)
        this.openSave('view', this.selected[0].id)
      else if (action === 'delete') this.handleBatchDelete()
      else if (action === 'run' && this.selected.length === 1) this.handleRun(this.selected[0])
      else if (action === 'logs') {
        const query =
          this.selected.length === 1 ? { jobId: String(this.selected[0].id) } : undefined
        this.$router.push({ path: '/system/jobs/logs', query })
      }
    },
    async loadData() {
      this.loading = true
      try {
        const statusRaw = this.queryForm.status
        const res = await listJobs({
          page: this.page - 1,
          size: this.size,
          keyword: String(this.queryForm.FuzzyWord ?? '').trim() || undefined,
          status: statusRaw === '' || statusRaw == null ? undefined : Number(statusRaw),
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
      await ElMessageBox.confirm(`确定删除任务「${row.name}」吗？`, '删除确认', { type: 'warning' })
      await removeJob(row.id)
      ElMessage.success('删除成功')
      this.loadData()
    },
    async handleBatchDelete() {
      if (!this.selected.length) {
        ElMessage.warning('请至少选择一项')
        return
      }
      await ElMessageBox.confirm(`确定删除选中的 ${this.selected.length} 个任务吗？`, '删除确认', {
        type: 'warning',
      })
      await batchRemoveJobs(this.selected.map((r) => r.id))
      ElMessage.success('删除成功')
      this.loadData()
    },
    async handleRun(row) {
      await runJob(row.id)
      ElMessage.success('已触发执行')
      this.loadData()
    },
  },
}
</script>
