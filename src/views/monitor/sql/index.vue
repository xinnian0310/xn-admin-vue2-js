<template>
  <xnPageLayout
    v-model:page="page"
    v-model:page-size="size"
    :total="total"
    @page-change="applyLocalPage"
    @refresh="loadData"
  >
    <template #search>
      <xnSearch :search-item="searchItems" @query-form="inquires" @reset="reset" />
    </template>
    <template #toolbar>
      <xnButton :list-item="buttonItems" :selected="selected" @button-click="buttonClick" />
    </template>
    <template #toolbar-extra>
      <el-tag effect="light" round>累计 {{ queryCount }} 条</el-tag>
    </template>
    <template #table>
      <xnTable
        v-model:page="page"
        v-model:page-size="size"
        :data="tableData"
        :total="total"
        :loading="loading"
        table-key="monitor:sql"
        entity-name="SQL"
        name-field="sql"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="applyLocalPage"
        @refresh="loadData"
      >
        <template #executedAt="{ row }">
          {{ formatDateTime(row.executedAt) }}
        </template>
        <template #durationMs="{ row }">
          {{ row.durationMs ?? '—' }}
        </template>
        <template #actions="{ row }">
          <xnTableActions :items="tableButtonItems" :row="row" @action-click="onTableAction" />
        </template>
      </xnTable>
    </template>
  </xnPageLayout>

  <xnDialog
    v-model="detailVisible"
    title="SQL 详情"
    width="780px"
    :show-confirm="false"
    cancel-text="关闭"
  >
    <el-descriptions v-if="current" :column="1" border class="sql-desc">
      <el-descriptions-item label="执行时间">
        {{ formatDateTime(current.executedAt) }}
      </el-descriptions-item>
      <el-descriptions-item label="耗时(ms)">
        {{ current.durationMs ?? '—' }}
      </el-descriptions-item>
      <el-descriptions-item label="SQL">
        <pre class="sql-detail">{{ current.sql }}</pre>
      </el-descriptions-item>
    </el-descriptions>
  </xnDialog>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import { usePageUi } from '@/composables/usePageUi'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import { cleanSqlMonitor, getSqlMonitor, removeSqlRecord } from '@/api/monitor'
import { formatDateTime } from '@/utils/datetime'

/** 权限内容：sql:view/delete/clean；table-view/table-delete */
const columns = [
  { type: 'selection', width: 50, fixed: true },
  { type: 'slot', slot: 'executedAt', prop: 'executedAt', label: '执行时间', width: 170 },
  { type: 'slot', slot: 'durationMs', prop: 'durationMs', label: '耗时(ms)', width: 100 },
  { type: 'longText', prop: 'sql', label: 'SQL', minWidth: 420, longTextMaxLength: 64 },
  { type: 'slot', slot: 'actions', label: '操作', width: 140, fixed: 'right' },
]

let timer = null

export default {
  name: 'MonitorSql',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
    xnDialog,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/monitor/sql')
    return { searchItems, buttonItems, tableButtonItems }
  },
  data() {
    return {
      loading: false,
      allData: [],
      tableData: [],
      total: 0,
      page: 1,
      size: 10,
      queryCount: 0,
      queryForm: {},
      selected: [],
      detailVisible: false,
      current: null,
      columns,
    }
  },
  mounted() {
    this.loadData()
    timer = setInterval(() => this.loadData(), 10000)
  },
  beforeUnmount() {
    if (timer) clearInterval(timer)
  },
  methods: {
    formatDateTime,
    selectionChangeHandle(rows) {
      this.selected = rows
    },
    applyLocalPage() {
      const kw = String(this.queryForm.FuzzyWord ?? '')
        .trim()
        .toLowerCase()
      let rows = this.allData
      if (kw) {
        rows = rows.filter((r) =>
          String(r.sql || '')
            .toLowerCase()
            .includes(kw),
        )
      }
      this.total = rows.length
      const start = (this.page - 1) * this.size
      this.tableData = rows.slice(start, start + this.size)
    },
    async loadData() {
      this.loading = true
      try {
        const res = await getSqlMonitor()
        this.allData = res.data.records || []
        this.queryCount = res.data.queryCount ?? this.allData.length
        this.applyLocalPage()
      } finally {
        this.loading = false
      }
    },
    openDetail(row) {
      this.current = row
      this.detailVisible = true
    },
    async buttonClick(action) {
      if (action === 'view' || action === 'edit') {
        if (this.selected.length !== 1) {
          ElMessage.warning('请选择一条 SQL 记录')
          return
        }
        this.openDetail(this.selected[0])
      } else if (action === 'delete') {
        if (!this.selected.length) {
          ElMessage.warning('请至少选择一条 SQL 记录')
          return
        }
        await ElMessageBox.confirm(
          `确定删除选中的 ${this.selected.length} 条 SQL 记录吗？`,
          '删除确认',
          { type: 'warning' },
        )
        for (const row of this.selected) {
          if (row.id != null) await removeSqlRecord(row.id)
        }
        ElMessage.success('删除成功')
        this.selected = []
        this.loadData()
      } else if (action === 'clean') {
        await this.handleClean()
      }
    },
    onTableAction(payload) {
      const row = payload.row
      if (payload.action === 'view' || payload.action === 'edit') this.openDetail(row)
      else if (payload.action === 'delete') this.handleDelete(row)
    },
    async handleDelete(row) {
      if (row.id == null) {
        ElMessage.warning('无法删除该记录')
        return
      }
      await removeSqlRecord(row.id)
      ElMessage.success('删除成功')
      this.loadData()
    },
    async handleClean() {
      await ElMessageBox.confirm('确定清空全部 SQL 监控缓冲吗？', '清空确认', { type: 'warning' })
      await cleanSqlMonitor()
      ElMessage.success('已清空')
      this.selected = []
      this.loadData()
    },
    inquires(form) {
      this.queryForm = form
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
.sql-desc :deep(.el-descriptions__table) {
  table-layout: auto;
}

.sql-desc :deep(.el-descriptions__label) {
  width: auto;
  max-width: 200px;
  white-space: nowrap;
}

.sql-detail {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.6;
}
</style>
