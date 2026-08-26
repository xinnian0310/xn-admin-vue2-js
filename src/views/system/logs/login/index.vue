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
        table-key="system:logs:login"
        entity-name="登录日志"
        name-field="username"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="loadData"
      >
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
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import { usePageUi } from '@/composables/usePageUi'
import { batchRemove, clean, exportLoginLogs, list, remove } from '@/api/login-log'
import { rangeToBeginEnd } from '@/utils/download'

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { prop: 'username', label: '用户名', minWidth: 120 },
  { prop: 'ip', label: 'IP', minWidth: 130 },
  { type: 'slot', slot: 'status', prop: 'status', label: '状态', width: 90 },
  { prop: 'message', label: '说明', minWidth: 180, showOverflowTooltip: true },
  { prop: 'userAgent', label: 'User-Agent', minWidth: 220, showOverflowTooltip: true },
  { prop: 'loginTime', label: '登录时间', minWidth: 170, type: 'datetime' },
  { type: 'slot', slot: 'actions', label: '操作', width: 100, fixed: 'right' },
]

export default {
  name: 'SystemLoginLogs',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/system/logs/login')
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
    listParams() {
      const statusRaw = this.queryForm.status
      return {
        page: this.page - 1,
        size: this.size,
        keyword: String(this.queryForm.FuzzyWord ?? '').trim() || undefined,
        status: statusRaw === '' || statusRaw == null ? undefined : Number(statusRaw),
        ...rangeToBeginEnd(this.queryForm.loginTime),
      }
    },
    selectionChangeHandle(rows) {
      this.selected = rows
    },
    onTableAction(payload) {
      if (payload.action === 'delete') this.handleDelete(payload.row)
    },
    async buttonClick(action) {
      if (action === 'delete') await this.handleBatchDelete()
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
        `确定删除选中的 ${this.selected.length} 条登录日志吗？`,
        '删除确认',
        { type: 'warning' },
      )
      await batchRemove(this.selected.map((r) => r.id))
      ElMessage.success('已删除')
      this.selected = []
      this.loadData()
    },
    async handleClean() {
      await ElMessageBox.confirm('确定清空全部登录日志吗？此操作不可恢复。', '清空确认', {
        type: 'warning',
      })
      await clean()
      ElMessage.success('已清空')
      this.selected = []
      this.loadData()
    },
    async handleExport() {
      await exportLoginLogs(this.listParams())
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
