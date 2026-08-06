<template>
  <xnPageLayout
    v-model:page="page"
    v-model:page-size="size"
    :total="total"
    @page-change="applyLocalPage"
  >
    <template #search>
      <xnSearch :search-item="searchItems" @query-form="inquires" @reset="reset" />
    </template>
    <template #toolbar>
      <xnButton :list-item="toolbarButtons" :selected="selected" @button-click="buttonClick" />
    </template>
    <template #toolbar-extra>
      <el-tag :type="statusTag" effect="light" round>{{ statusLabel }}</el-tag>
      <el-tag v-if="monitor" effect="plain" round>
        {{ monitor.host }}:{{ monitor.port }} · Key {{ monitor.keyCount ?? 0 }}
      </el-tag>
    </template>
    <template #table>
      <xnTable
        v-model:page="page"
        v-model:page-size="size"
        :data="tableData"
        :total="total"
        :loading="loading"
        table-key="monitor:redis"
        entity-name="缓存键"
        name-field="key"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="applyLocalPage"
      >
        <template #actions="{ row }">
          <xnTableActions :items="tableButtonItems" :row="row" @action-click="onTableAction" />
        </template>
      </xnTable>
    </template>
  </xnPageLayout>

  <el-dialog v-model="detailVisible" :title="detailTitle" width="640px" destroy-on-close>
    <el-descriptions v-if="currentKey" :column="1" border>
      <el-descriptions-item label="Key">
        <code class="redis-key">{{ currentKey }}</code>
      </el-descriptions-item>
      <el-descriptions-item label="状态">{{ monitor?.status || '—' }}</el-descriptions-item>
      <el-descriptions-item label="地址">
        {{ monitor ? `${monitor.host}:${monitor.port}` : '—' }}
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
import { deleteRedisKey, flushRedis, getRedisMonitor } from '@/api/monitor'

/** 权限内容：redis:view/update/delete；table-view/table-edit/table-delete */
const columns = [
  { type: 'selection', width: 50, fixed: true },
  { prop: 'key', label: 'Key', minWidth: 280, showOverflowTooltip: true },
  { type: 'slot', slot: 'actions', label: '操作', width: 140, fixed: 'right' },
]

export default {
  name: 'MonitorRedis',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/monitor/redis')
    return { searchItems, buttonItems, tableButtonItems }
  },
  data() {
    return {
      loading: false,
      monitor: null,
      allData: [],
      tableData: [],
      total: 0,
      page: 1,
      size: 10,
      queryForm: {},
      selected: [],
      detailVisible: false,
      currentKey: '',
      detailTitle: '缓存详情',
      columns,
    }
  },
  computed: {
    toolbarButtons() {
      return this.buttonItems.map((item) => {
        if (item.action === 'delete' && this.monitor?.status !== 'ENABLED') {
          return { ...item, disabled: true }
        }
        return item
      })
    },
    statusLabel() {
      if (this.monitor?.status === 'ENABLED') return '已连接'
      if (this.monitor?.status === 'ERROR') return '连接失败'
      return '未启用'
    },
    statusTag() {
      if (this.monitor?.status === 'ENABLED') return 'success'
      if (this.monitor?.status === 'ERROR') return 'danger'
      return 'info'
    },
  },
  mounted() {
    this.loadData()
  },
  methods: {
    selectionChangeHandle(rows) {
      this.selected = rows
    },
    applyLocalPage() {
      const kw = String(this.queryForm.FuzzyWord ?? '')
        .trim()
        .toLowerCase()
      let rows = this.allData
      if (kw) {
        rows = rows.filter((r) => r.key.toLowerCase().includes(kw))
      }
      this.total = rows.length
      const start = (this.page - 1) * this.size
      this.tableData = rows.slice(start, start + this.size)
    },
    async loadData() {
      this.loading = true
      try {
        const res = await getRedisMonitor()
        this.monitor = res.data
        this.allData = (res.data.sampleKeys || []).map((key) => ({ key }))
        if (res.data.message && res.data.status !== 'ENABLED') {
          ElMessage[res.data.status === 'ERROR' ? 'error' : 'info'](res.data.message)
        }
        this.applyLocalPage()
      } finally {
        this.loading = false
      }
    },
    openDetail(key, editable) {
      this.currentKey = key
      this.detailTitle = editable ? '编辑缓存键' : '查看缓存键'
      this.detailVisible = true
    },
    async buttonClick(action) {
      if (action === 'view' || action === 'edit') {
        if (this.selected.length !== 1) {
          ElMessage.warning('请选择一个 Key')
          return
        }
        this.openDetail(this.selected[0].key, action === 'edit')
      } else if (action === 'delete') {
        if (this.selected.length) {
          await ElMessageBox.confirm(
            `确定删除选中的 ${this.selected.length} 个 Key 吗？`,
            '删除确认',
            { type: 'warning' },
          )
          for (const row of this.selected) {
            await deleteRedisKey(row.key)
          }
          ElMessage.success('删除成功')
          this.loadData()
        } else {
          await this.handleFlush()
        }
      }
    },
    onTableAction(payload) {
      const key = String(payload.row.key ?? '')
      if (payload.action === 'view') this.openDetail(key, false)
      else if (payload.action === 'edit') this.openDetail(key, true)
      else if (payload.action === 'delete') this.handleDeleteKey(key)
    },
    async handleDeleteKey(key) {
      if (!key) return
      await ElMessageBox.confirm(`确定删除 Key「${key}」吗？`, '删除确认', { type: 'warning' })
      await deleteRedisKey(key)
      ElMessage.success('删除成功')
      this.loadData()
    },
    async handleFlush() {
      await ElMessageBox.confirm('确定清空当前 Redis 数据库吗？此操作不可恢复！', '危险操作', {
        type: 'error',
      })
      await flushRedis()
      ElMessage.success('已清空')
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
.redis-key {
  font-family: monospace;
  word-break: break-all;
}
</style>
