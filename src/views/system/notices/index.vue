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
        table-key="system:notices"
        entity-name="公告"
        name-field="title"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="loadData"
      >
        <template #readCount="{ row }">
          <span v-if="row.status === 'DRAFT'">—</span>
          <span v-else>{{ row.readCount ?? 0 }} / {{ row.totalCount ?? 0 }}</span>
        </template>
        <template #actions="{ row }">
          <xnTableActions :items="tableActionsFor(row)" :row="row" @action-click="onTableAction" />
        </template>
      </xnTable>
    </template>

    <template #card>
      <div class="page-card-grid">
        <el-card v-for="row in tableData" :key="row.id" shadow="hover" class="notice-card">
          <div class="notice-card__header">
            <div class="notice-card__title" :title="row.title">{{ row.title }}</div>
            <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </div>
          <div class="notice-card__body">
            <div class="notice-card__row">
              <span class="label">已读</span>
              <span v-if="row.status === 'DRAFT'">—</span>
              <span v-else>{{ row.readCount ?? 0 }} / {{ row.totalCount ?? 0 }}</span>
            </div>
            <div class="notice-card__row">
              <span class="label">发布人</span>
              <span>{{ row.publisherName || '—' }}</span>
            </div>
            <div class="notice-card__row">
              <span class="label">下发时间</span>
              <span>{{ formatDateTime(row.publishedAt) || '—' }}</span>
            </div>
          </div>
          <div class="notice-card__footer">
            <xnTableActions
              :items="tableActionsFor(row)"
              :row="row"
              @action-click="onTableAction"
            />
          </div>
        </el-card>
      </div>
    </template>
  </xnPageLayout>

  <NoticeSave ref="saveRef" @success="loadData" />

  <xnDialog
    v-model="readersVisible"
    title="已读明细"
    width="640px"
    :show-confirm="false"
    cancel-text="关闭"
  >
    <el-table :data="readerRows" stripe max-height="420" v-loading="readersLoading">
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="nickname" label="昵称" min-width="120" />
      <el-table-column prop="readAt" label="阅读时间" min-width="170">
        <template #default="{ row }">
          {{ formatDateTime(row.readAt) }}
        </template>
      </el-table-column>
    </el-table>
  </xnDialog>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import NoticeSave from './save.vue'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import { usePageUi } from '@/composables/usePageUi'
import {
  list,
  batchPublish,
  batchRemove,
  batchRevoke,
  publish,
  readers,
  remove,
  revoke,
} from '@/api/notice'
import { formatDateTime } from '@/utils/datetime'

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { prop: 'title', label: '标题', minWidth: 200, showOverflowTooltip: true },
  {
    prop: 'status',
    label: '状态',
    width: 110,
    type: 'tag',
    options: [
      { value: 'DRAFT', label: '草稿', type: 'warning' },
      { value: 'PUBLISHED', label: '已下发', type: 'success' },
      { value: 'REVOKED', label: '已撤回', type: 'info' },
    ],
  },
  { type: 'slot', slot: 'readCount', prop: 'readCount', label: '已读', width: 120 },
  { prop: 'publisherName', label: '发布人', width: 120 },
  { prop: 'publishedAt', label: '下发时间', minWidth: 170, type: 'datetime' },
  { prop: 'createdAt', label: '创建时间', minWidth: 170, type: 'datetime' },
  { type: 'slot', slot: 'actions', label: '操作', fixed: 'right' },
]

export default {
  name: 'SystemNotices',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
    NoticeSave,
    xnDialog,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/system/notices')
    return { searchItems, buttonItems, tableButtonItems, columns }
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
      readersVisible: false,
      readersLoading: false,
      readerRows: [],
    }
  },
  mounted() {
    this.loadData()
  },
  methods: {
    formatDateTime,
    statusLabel(status) {
      if (status === 'PUBLISHED') return '已下发'
      if (status === 'REVOKED') return '已撤回'
      return '草稿'
    },
    statusTagType(status) {
      if (status === 'PUBLISHED') return 'success'
      if (status === 'REVOKED') return 'info'
      return 'warning'
    },
    tableActionsFor(row) {
      return (this.tableButtonItems || []).filter((item) => {
        const action = item.action
        if (action === 'edit' || action === 'delete') return row.status === 'DRAFT'
        if (action === 'publish') return row.status === 'DRAFT' || row.status === 'REVOKED'
        if (action === 'revoke') return row.status === 'PUBLISHED'
        if (action === 'readers') return row.status === 'PUBLISHED' || row.status === 'REVOKED'
        return true
      })
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
        case 'publish':
          this.handlePublish(row)
          break
        case 'revoke':
          this.handleRevoke(row)
          break
        case 'readers':
          this.openReaders(row)
          break
      }
    },
    buttonClick(action) {
      if (action === 'add') {
        this.openSave('add')
        return
      }
      if (action === 'edit') {
        if (this.selected.length !== 1) {
          ElMessage.warning('请选择一项操作')
          return
        }
        if (this.selected[0].status !== 'DRAFT') {
          ElMessage.warning('仅草稿可编辑')
          return
        }
        this.openSave('edit', this.selected[0].id)
        return
      }
      if (action === 'view') {
        if (this.selected.length !== 1) {
          ElMessage.warning('请选择一项操作')
          return
        }
        this.openSave('view', this.selected[0].id)
        return
      }
      if (action === 'delete') {
        this.handleBatchDelete()
        return
      }
      if (action === 'publish') {
        this.handleBatchPublish()
        return
      }
      if (action === 'revoke') {
        this.handleBatchRevoke()
      }
    },
    async loadData() {
      this.loading = true
      try {
        const status = String(this.queryForm.status ?? '').trim()
        const res = await list({
          page: this.page - 1,
          size: this.size,
          keyword: String(this.queryForm.FuzzyWord ?? '').trim() || undefined,
          status: status || undefined,
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
      if (row.status !== 'DRAFT') {
        ElMessage.warning('仅草稿可删除')
        return
      }
      await remove(row.id)
      ElMessage.success('删除成功')
      this.loadData()
    },
    async handleBatchDelete() {
      if (!this.selected.length) {
        ElMessage.warning('请至少选择一项')
        return
      }
      const invalid = this.selected.filter((r) => r.status !== 'DRAFT')
      if (invalid.length) {
        ElMessage.warning('仅草稿可删除，请取消勾选非草稿项')
        return
      }
      await ElMessageBox.confirm(`确定删除选中的 ${this.selected.length} 条公告吗？`, '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
      await batchRemove(this.selected.map((r) => r.id))
      ElMessage.success('删除成功')
      this.loadData()
    },
    async handlePublish(row) {
      await ElMessageBox.confirm(`确定下发公告「${row.title}」给全体启用用户吗？`, '下发确认', {
        type: 'warning',
      })
      await publish(row.id)
      ElMessage.success('下发成功')
      this.loadData()
    },
    async handleBatchPublish() {
      if (!this.selected.length) {
        ElMessage.warning('请至少选择一项')
        return
      }
      const invalid = this.selected.filter((r) => r.status !== 'DRAFT' && r.status !== 'REVOKED')
      if (invalid.length) {
        ElMessage.warning('仅草稿或已撤回可下发，请取消勾选其他状态项')
        return
      }
      await ElMessageBox.confirm(
        `确定下发选中的 ${this.selected.length} 条公告给全体启用用户吗？`,
        '下发确认',
        { type: 'warning' },
      )
      await batchPublish(this.selected.map((r) => r.id))
      ElMessage.success('下发成功')
      this.loadData()
    },
    async handleRevoke(row) {
      await ElMessageBox.confirm(`确定撤回公告「${row.title}」吗？`, '撤回确认', {
        type: 'warning',
      })
      await revoke(row.id)
      ElMessage.success('撤回成功')
      this.loadData()
    },
    async handleBatchRevoke() {
      if (!this.selected.length) {
        ElMessage.warning('请至少选择一项')
        return
      }
      const invalid = this.selected.filter((r) => r.status !== 'PUBLISHED')
      if (invalid.length) {
        ElMessage.warning('仅已下发公告可撤回，请取消勾选其他状态项')
        return
      }
      await ElMessageBox.confirm(`确定撤回选中的 ${this.selected.length} 条公告吗？`, '撤回确认', {
        type: 'warning',
      })
      await batchRevoke(this.selected.map((r) => r.id))
      ElMessage.success('撤回成功')
      this.loadData()
    },
    async openReaders(row) {
      this.readersVisible = true
      this.readersLoading = true
      try {
        const res = await readers(row.id)
        this.readerRows = res.data || []
      } finally {
        this.readersLoading = false
      }
    },
  },
}
</script>

<style scoped>
.notice-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.notice-card__title {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  font-size: var(--app-font-size-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.notice-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: var(--app-font-size-main);
}

.notice-card__row .label {
  color: var(--app-text-muted);
  flex-shrink: 0;
}

.notice-card__footer {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 4px;
  border-top: 1px solid var(--app-border-color);
  padding-top: 12px;
}
</style>
