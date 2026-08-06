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
        table-key="system:recycle"
        entity-name="回收站"
        name-field="title"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="loadData"
      >
        <template #bizType="{ row }">
          <el-tag size="small" :type="row.bizType === 'USER' ? 'warning' : 'primary'">
            {{ bizTypeLabel(row.bizType) }}
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
import {
  batchPurgeRecycle,
  cleanRecycle,
  listRecycle,
  purgeRecycle,
  restoreRecycle,
} from '@/api/recycle'

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { type: 'slot', slot: 'bizType', prop: 'bizType', label: '类型', width: 100 },
  { prop: 'title', label: '标题', minWidth: 160 },
  { prop: 'summary', label: '摘要', minWidth: 200, showOverflowTooltip: true },
  { prop: 'deletedBy', label: '删除人', minWidth: 110 },
  { prop: 'deletedAt', label: '删除时间', minWidth: 170, type: 'datetime' },
  { type: 'slot', slot: 'actions', label: '操作', width: 160, fixed: 'right' },
]

export default {
  name: 'SystemRecycle',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/system/recycle')
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
    bizTypeLabel(type) {
      if (type === 'USER') return '用户'
      if (type === 'FILE') return '文件'
      return type || '-'
    },
    selectionChangeHandle(rows) {
      this.selected = rows
    },
    onTableAction(payload) {
      const row = payload.row
      if (payload.action === 'restore') this.handleRestore(row)
      else if (payload.action === 'purge') this.handlePurge(row)
    },
    async buttonClick(action) {
      if (action === 'restore') {
        if (this.selected.length !== 1) {
          ElMessage.warning('请选择一项恢复')
          return
        }
        await this.handleRestore(this.selected[0])
      } else if (action === 'purge') {
        await this.handleBatchPurge()
      } else if (action === 'clean') {
        await ElMessageBox.confirm('确定清空回收站并彻底删除全部内容吗？此操作不可恢复。', '清空确认', {
          type: 'warning',
        })
        await cleanRecycle()
        ElMessage.success('回收站已清空')
        this.loadData()
      }
    },
    async handleRestore(row) {
      await ElMessageBox.confirm(`确定恢复「${row.title}」吗？`, '恢复确认', { type: 'info' })
      await restoreRecycle(row.id)
      ElMessage.success('已恢复')
      this.loadData()
    },
    async handlePurge(row) {
      await ElMessageBox.confirm(`确定彻底删除「${row.title}」吗？此操作不可恢复。`, '彻底删除', {
        type: 'warning',
      })
      await purgeRecycle(row.id)
      ElMessage.success('已彻底删除')
      this.loadData()
    },
    async handleBatchPurge() {
      if (!this.selected.length) {
        ElMessage.warning('请至少选择一项')
        return
      }
      await ElMessageBox.confirm(
        `确定彻底删除选中的 ${this.selected.length} 项吗？此操作不可恢复。`,
        '彻底删除',
        { type: 'warning' },
      )
      await batchPurgeRecycle(this.selected.map((r) => r.id))
      ElMessage.success('已彻底删除')
      this.loadData()
    },
    async loadData() {
      this.loading = true
      try {
        const res = await listRecycle({
          page: this.page - 1,
          size: this.size,
          keyword: String(this.queryForm.FuzzyWord ?? '').trim() || undefined,
          bizType: String(this.queryForm.bizType ?? '').trim() || undefined,
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
  },
}
</script>
