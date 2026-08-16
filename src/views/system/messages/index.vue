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
        table-key="system:messages"
        entity-name="站内信"
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
  </xnPageLayout>

  <MessageSave ref="saveRef" @success="loadData" />

  <el-dialog v-model="sendVisible" title="发送站内信" width="520px" destroy-on-close>
    <el-form label-width="100px">
      <el-form-item label="发送范围">
        <el-checkbox v-model="sendForm.sendToAll">全部启用用户</el-checkbox>
      </el-form-item>
      <el-form-item v-if="!sendForm.sendToAll" label="接收用户">
        <el-select
          v-model="sendForm.userIds"
          multiple
          filterable
          placeholder="选择用户"
          style="width: 100%"
        >
          <el-option
            v-for="u in userOptions"
            :key="u.id"
            :label="`${u.nickname || u.username} (${u.username})`"
            :value="u.id"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="sendVisible = false">取消</el-button>
      <el-button type="primary" :loading="sendLoading" @click="confirmSend">确定发送</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="readersVisible" title="已读明细" width="640px" destroy-on-close>
    <el-table :data="readerRows" stripe max-height="420" v-loading="readersLoading">
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="nickname" label="昵称" min-width="120" />
      <el-table-column prop="readAt" label="阅读时间" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.readAt) }}</template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import MessageSave from './save.vue'
import { usePageUi } from '@/composables/usePageUi'
import { batchRemove, list, readers, remove, send } from '@/api/message'
import { list as listUsers } from '@/api/user'
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
      { value: 'SENT', label: '已发送', type: 'success' },
    ],
  },
  { type: 'slot', slot: 'readCount', prop: 'readCount', label: '已读', width: 120 },
  { prop: 'senderName', label: '发送人', width: 120 },
  { prop: 'sentAt', label: '发送时间', minWidth: 170, type: 'datetime' },
  { prop: 'createdAt', label: '创建时间', minWidth: 170, type: 'datetime' },
  { type: 'slot', slot: 'actions', label: '操作', fixed: 'right' },
]

export default {
  name: 'SystemMessages',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
    MessageSave,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/system/messages')
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
      selected: [],
      sendVisible: false,
      sendLoading: false,
      sendTargetId: null,
      sendForm: { sendToAll: true, userIds: [] },
      userOptions: [],
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
    tableActionsFor(row) {
      return (this.tableButtonItems || []).filter((item) => {
        if (item.action === 'edit' || item.action === 'delete' || item.action === 'send') {
          return row.status === 'DRAFT'
        }
        if (item.action === 'readers') return row.status === 'SENT'
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
        case 'send':
          this.openSend(row.id)
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
      if (action === 'edit' && this.selected.length === 1 && this.selected[0].status === 'DRAFT') {
        this.openSave('edit', this.selected[0].id)
        return
      }
      if (action === 'view' && this.selected.length === 1) {
        this.openSave('view', this.selected[0].id)
        return
      }
      if (action === 'delete') {
        this.handleBatchDelete()
        return
      }
      if (action === 'send' && this.selected.length === 1 && this.selected[0].status === 'DRAFT') {
        this.openSend(this.selected[0].id)
      }
    },
    async loadData() {
      this.loading = true
      try {
        const res = await list({
          page: this.page - 1,
          size: this.size,
          keyword: String(this.queryForm.FuzzyWord ?? '').trim() || undefined,
          status: String(this.queryForm.status ?? '').trim() || undefined,
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
      await ElMessageBox.confirm(`确定删除「${row.title}」吗？`, '删除确认', { type: 'warning' })
      await remove(row.id)
      ElMessage.success('删除成功')
      this.loadData()
    },
    async handleBatchDelete() {
      if (!this.selected.length) {
        ElMessage.warning('请至少选择一项')
        return
      }
      if (this.selected.some((r) => r.status !== 'DRAFT')) {
        ElMessage.warning('仅草稿可删除')
        return
      }
      await ElMessageBox.confirm(`确定删除选中的 ${this.selected.length} 条消息吗？`, '删除确认', {
        type: 'warning',
      })
      await batchRemove(this.selected.map((r) => r.id))
      ElMessage.success('删除成功')
      this.loadData()
    },
    async openSend(id) {
      this.sendTargetId = id
      this.sendForm.sendToAll = true
      this.sendForm.userIds = []
      if (!this.userOptions.length) {
        const res = await listUsers({ page: 0, size: 500 })
        this.userOptions = res.data.records.filter((u) => u.status === 1)
      }
      this.sendVisible = true
    },
    async confirmSend() {
      if (!this.sendTargetId) return
      if (!this.sendForm.sendToAll && !this.sendForm.userIds.length) {
        ElMessage.warning('请选择接收用户或勾选全部启用用户')
        return
      }
      this.sendLoading = true
      try {
        await send(this.sendTargetId, {
          sendToAll: this.sendForm.sendToAll,
          userIds: this.sendForm.sendToAll ? undefined : this.sendForm.userIds,
        })
        ElMessage.success('发送成功')
        this.sendVisible = false
        this.loadData()
      } finally {
        this.sendLoading = false
      }
    },
    async openReaders(row) {
      this.readersVisible = true
      this.readersLoading = true
      try {
        const res = await readers(row.id)
        this.readerRows = res.data
      } finally {
        this.readersLoading = false
      }
    },
  },
}
</script>
