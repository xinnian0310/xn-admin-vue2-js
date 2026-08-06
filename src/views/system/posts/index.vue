<template>
  <xnPageLayout
    v-model:view-mode="viewMode"
    v-model:page="page"
    v-model:page-size="size"
    :show-pagination="viewMode === 'card'"
    :total="total"
    :loading="viewMode === 'card' ? loading : false"
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
        table-key="system:posts"
        entity-name="岗位"
        name-field="name"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="loadData"
      >
        <template #code="{ row }">
          <code class="post-code">{{ row.code }}</code>
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
    <template #card>
      <div class="page-card-grid">
        <el-card v-for="row in tableData" :key="row.id" shadow="hover">
          <div class="post-card__name">{{ row.name }}</div>
          <code class="post-code">{{ row.code }}</code>
          <div class="post-card__meta">
            排序 {{ row.sort }} · {{ row.status === 1 ? '启用' : '停用' }}
          </div>
          <xnTableActions
            :items="tableButtonItems"
            :row="row"
            :disabled="tableActionDisabled"
            @action-click="onTableAction"
          />
        </el-card>
      </div>
    </template>
  </xnPageLayout>

  <PostSave ref="saveRef" @success="loadData" />
  <XnImportDialog
    ref="importRef"
    title="导入岗位"
    template-name="岗位导入模板"
    :columns="importColumns"
    :importer="handleImport"
    @success="loadData"
  />
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import XnImportDialog from '@/components/xnImport/xnImportDialog.vue'
import PostSave from './save.vue'
import { usePageUi } from '@/composables/usePageUi'
import { batchRemove, exportPosts, importPosts, list, remove } from '@/api/post'

const importColumns = [
  { key: 'code', title: '岗位编码', required: true, example: 'engineer', width: 14 },
  { key: 'name', title: '岗位名称', required: true, example: '工程师', width: 14 },
  { key: 'sort', title: '排序', example: '10', width: 10 },
  {
    key: 'status',
    title: '状态',
    example: '启用',
    width: 10,
    options: [
      { label: '启用', value: '1' },
      { label: '停用', value: '0' },
    ],
  },
  { key: 'remark', title: '备注', example: '', width: 20 },
]
const columns = [
  { type: 'selection', width: 50, fixed: true },
  { prop: 'name', label: '岗位名称', minWidth: 140 },
  { type: 'slot', slot: 'code', prop: 'code', label: '岗位编码', minWidth: 140 },
  { prop: 'sort', label: '排序', width: 90 },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    type: 'tag',
    options: [
      { value: 1, label: '启用', type: 'success' },
      { value: 0, label: '停用', type: 'info' },
    ],
  },
  {
    prop: 'builtIn',
    label: '类型',
    width: 100,
    type: 'tag',
    options: [
      { value: true, label: '内置', type: 'warning' },
      { value: false, label: '自定义', type: 'info' },
    ],
  },
  { prop: 'remark', label: '备注', minWidth: 160, showOverflowTooltip: true },
  { type: 'slot', slot: 'actions', label: '操作', width: 160, fixed: 'right' },
]

export default {
  name: 'SystemPosts',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
    XnImportDialog,
    PostSave,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/system/posts')
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
      viewMode: 'table',
      selected: [],
      importColumns,
      columns,
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    openSave(mode, id) {
      this.$refs.saveRef?.open(mode, id)
    },
    tableActionDisabled(action, row) {
      if (action === 'delete' && row.builtIn) return '内置岗位不可删除'
      return false
    },
    onTableAction(payload) {
      const row = payload.row
      if (payload.action === 'edit') this.openSave('edit', row.id)
      else if (payload.action === 'view') this.openSave('view', row.id)
      else if (payload.action === 'delete') this.handleDelete(row)
    },
    async buttonClick(action) {
      if (action === 'add') this.openSave('add')
      else if (action === 'import') this.$refs.importRef?.open()
      else if (action === 'export') {
        try {
          await exportPosts({
            keyword: String(this.queryForm.FuzzyWord ?? '').trim() || undefined,
            status: this.queryForm.status,
          })
          ElMessage.success('导出成功')
        } catch (e) {
          ElMessage.error(e instanceof Error ? e.message : '导出失败')
        }
      } else if (action === 'edit' && this.selected.length === 1)
        this.openSave('edit', this.selected[0].id)
      else if (action === 'view' && this.selected.length === 1)
        this.openSave('view', this.selected[0].id)
      else if (action === 'delete') this.handleBatchDelete()
    },
    async handleImport(rows) {
      const payload = rows.map((row) => ({
        code: row.code,
        name: row.name,
        sort: row.sort === '' || row.sort == null ? undefined : Number(row.sort),
        status: row.status === '' || row.status == null ? undefined : Number(row.status),
        remark: row.remark || undefined,
      }))
      const res = await importPosts(payload)
      return res.data
    },
    async loadData() {
      this.loading = true
      try {
        const res = await list({
          page: this.page - 1,
          size: this.size,
          keyword: String(this.queryForm.FuzzyWord ?? '').trim() || undefined,
          status: this.queryForm.status,
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
    selectionChangeHandle(rows) {
      this.selected = rows
    },
    async handleDelete(row) {
      if (row.builtIn) {
        ElMessage.warning('内置岗位不可删除')
        return
      }
      await ElMessageBox.confirm(`确定删除岗位「${row.name}」吗？`, '删除确认', { type: 'warning' })
      await remove(row.id)
      ElMessage.success('删除成功')
      this.loadData()
    },
    async handleBatchDelete() {
      if (!this.selected.length) {
        ElMessage.warning('请至少选择一项')
        return
      }
      await ElMessageBox.confirm(`确定删除选中的 ${this.selected.length} 个岗位吗？`, '删除确认', {
        type: 'warning',
      })
      await batchRemove(this.selected.map((r) => r.id))
      ElMessage.success('删除成功')
      this.loadData()
    },
  },
}
</script>

<style scoped>
.post-code {
  font-size: 12px;
  color: var(--el-color-primary);
}
.post-card__name {
  font-weight: 600;
  margin-bottom: 6px;
}
.post-card__meta {
  margin: 8px 0 12px;
  color: var(--app-text-muted, #909399);
  font-size: 13px;
}
</style>
