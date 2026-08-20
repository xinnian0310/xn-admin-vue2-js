<template>
  <xnPageLayout v-model:page="page" v-model:page-size="size" :total="total" @page-change="loadData">
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
        table-key="system:logs:exception"
        entity-name="异常日志"
        name-field="exceptionName"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="loadData"
      >
        <template #actions="{ row }">
          <xnTableActions :items="tableButtonItems" :row="row" @action-click="onTableAction" />
        </template>
      </xnTable>
    </template>
  </xnPageLayout>

  <el-dialog v-model="detailVisible" title="异常日志详情" width="780px" destroy-on-close>
    <el-descriptions v-if="current" :column="1" border>
      <el-descriptions-item label="请求">
        {{ current.requestMethod || '—' }} {{ current.requestUrl || '' }}
      </el-descriptions-item>
      <el-descriptions-item label="方法">{{ current.method || '—' }}</el-descriptions-item>
      <el-descriptions-item label="类名">{{ current.className || '—' }}</el-descriptions-item>
      <el-descriptions-item label="异常">{{ current.exceptionName || '—' }}</el-descriptions-item>
      <el-descriptions-item label="操作人">{{ current.operatorName || '—' }}</el-descriptions-item>
      <el-descriptions-item label="IP">{{ current.ip || '—' }}</el-descriptions-item>
      <el-descriptions-item label="时间">{{ current.createdAt }}</el-descriptions-item>
      <el-descriptions-item label="信息">
        <pre class="log-pre">{{ current.message || '—' }}</pre>
      </el-descriptions-item>
      <el-descriptions-item label="堆栈">
        <pre class="log-pre">{{ current.stackTrace || '—' }}</pre>
      </el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import { usePageUi } from '@/composables/usePageUi'
import { batchRemove, clean, exportExceptionLogs, get, list, remove } from '@/api/exception-log'
import { rangeToBeginEnd } from '@/utils/download'

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { prop: 'exceptionName', label: '异常', minWidth: 180, showOverflowTooltip: true },
  { prop: 'requestUrl', label: 'URL', minWidth: 180, showOverflowTooltip: true },
  { prop: 'message', label: '信息', minWidth: 200, showOverflowTooltip: true },
  { prop: 'operatorName', label: '操作人', minWidth: 110 },
  { prop: 'ip', label: 'IP', minWidth: 120 },
  { prop: 'createdAt', label: '发生时间', minWidth: 170, type: 'datetime' },
  { type: 'slot', slot: 'actions', label: '操作', width: 140, fixed: 'right' },
]

export default {
  name: 'SystemExceptionLogs',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/system/logs/exception')
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
  mounted() {
    this.loadData()
  },
  methods: {
    listParams() {
      return {
        page: this.page - 1,
        size: this.size,
        keyword: String(this.queryForm.FuzzyWord ?? '').trim() || undefined,
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
      else if (action === 'export') await this.handleExport()
    },
    async handleDelete(row) {
      await ElMessageBox.confirm('确定删除这条异常日志吗？', '删除确认', { type: 'warning' })
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
        `确定删除选中的 ${this.selected.length} 条异常日志吗？`,
        '删除确认',
        { type: 'warning' },
      )
      await batchRemove(this.selected.map((r) => r.id))
      ElMessage.success('已删除')
      this.selected = []
      this.loadData()
    },
    async handleClean() {
      await ElMessageBox.confirm('确定清空全部异常日志吗？此操作不可恢复。', '清空确认', {
        type: 'warning',
      })
      await clean()
      ElMessage.success('已清空')
      this.selected = []
      this.loadData()
    },
    async handleExport() {
      await exportExceptionLogs(this.listParams())
      ElMessage.success('导出成功')
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

<style scoped>
.log-pre {
  margin: 0;
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
}
</style>
