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
      <el-tag v-if="unread > 0" type="danger" effect="light" round>未读 {{ unread }}</el-tag>
    </template>
    <template #table>
      <xnTable
        v-model:page="page"
        v-model:page-size="size"
        :data="tableData"
        :total="total"
        :loading="loading"
        table-key="messages:mine"
        entity-name="消息"
        name-field="title"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="applyLocalPage"
        @refresh="loadData"
      >
        <template #sentAt="{ row }">
          {{ formatDateTime(row.sentAt) }}
        </template>
        <template #read="{ row }">
          <el-tag :type="row.read ? 'info' : 'danger'" size="small">
            {{ row.read ? '已读' : '未读' }}
          </el-tag>
        </template>
        <template #actions="{ row }">
          <xnTableActions :items="tableButtonItems" :row="row" @action-click="onTableAction" />
        </template>
      </xnTable>
    </template>
  </xnPageLayout>

  <el-dialog
    v-model="detailVisible"
    :title="current?.title || '消息详情'"
    width="720px"
    destroy-on-close
  >
    <div v-if="current" class="message-detail">
      <div class="message-detail__meta">
        <span>发送人：{{ current.senderName || '—' }}</span>
        <span>发送时间：{{ formatDateTime(current.sentAt) }}</span>
      </div>
      <div v-if="currentAttachments.length" class="message-detail__attachment">
        <span>附件：</span>
        <div class="message-detail__attachment-list">
          <div
            v-for="item in currentAttachments"
            :key="item.path"
            class="message-detail__attachment-row"
          >
            <el-link
              type="primary"
              :href="resolveAttachmentUrl(item.path)"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ item.name }}
            </el-link>
            <el-button link type="primary" @click="openKkFileViewPreview(item.path, item.name)">
              查看
            </el-button>
          </div>
        </div>
      </div>
      <div class="message-detail__content xn-rich-html" v-html="contentHtml" />
    </div>
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
import { batchRemoveMine, listMine, markRead, removeMine, unreadCount } from '@/api/message'
import { resolveAttachmentUrl } from '@/config/app'
import { openKkFileViewPreview } from '@/utils/kk-file-view'
import { formatDateTime } from '@/utils/datetime'
import { resolveAttachments } from '@/utils/attachment'
import { decorateRichHtml } from '@/utils/rich-editor'

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { prop: 'title', label: '标题', minWidth: 200, showOverflowTooltip: true },
  { prop: 'senderName', label: '发送人', width: 120 },
  { type: 'slot', slot: 'sentAt', prop: 'sentAt', label: '发送时间', minWidth: 170 },
  { type: 'slot', slot: 'read', prop: 'read', label: '状态', width: 90 },
  { type: 'slot', slot: 'actions', label: '操作', width: 120, fixed: 'right' },
]

export default {
  name: 'MessagesMine',
  components: { xnPageLayout, xnSearch, xnButton, xnTableActions, xnTable },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/messages/mine')
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
      queryForm: {},
      selected: [],
      unread: 0,
      detailVisible: false,
      current: null,
      columns,
    }
  },
  computed: {
    currentAttachments() {
      return resolveAttachments(this.current)
    },
    contentHtml() {
      return decorateRichHtml(this.current?.content)
    },
  },
  mounted() {
    this.loadData()
  },
  methods: {
    formatDateTime,
    resolveAttachmentUrl,
    openKkFileViewPreview,
    selectionChangeHandle(rows) {
      this.selected = rows
    },
    applyLocalPage() {
      const kw = String(this.queryForm.FuzzyWord ?? '')
        .trim()
        .toLowerCase()
      const readFilter = this.queryForm.read
      let rows = this.allData
      if (kw) {
        rows = rows.filter((r) =>
          [r.title, r.senderName].filter(Boolean).some((v) => String(v).toLowerCase().includes(kw)),
        )
      }
      if (
        readFilter === true ||
        readFilter === false ||
        readFilter === 'true' ||
        readFilter === 'false'
      ) {
        const wantRead = readFilter === true || readFilter === 'true'
        rows = rows.filter((r) => r.read === wantRead)
      }
      this.total = rows.length
      const start = (this.page - 1) * this.size
      this.tableData = rows.slice(start, start + this.size)
    },
    async loadUnread() {
      const res = await unreadCount()
      this.unread = res.data.count
    },
    async loadData() {
      this.loading = true
      try {
        const res = await listMine()
        this.allData = res.data
        await this.loadUnread()
        this.applyLocalPage()
      } finally {
        this.loading = false
      }
    },
    async buttonClick(action) {
      if (action === 'view') {
        if (this.selected.length !== 1) {
          ElMessage.warning('请选择一条消息')
          return
        }
        await this.openDetail(this.selected[0])
      } else if (action === 'delete') {
        await this.handleBatchDelete()
      }
    },
    onTableAction(payload) {
      const row = payload.row
      if (payload.action === 'view') this.openDetail(row)
      else if (payload.action === 'delete') this.handleDelete(row)
    },
    async openDetail(row) {
      this.current = row
      this.detailVisible = true
      if (!row.read) {
        await markRead(row.id)
        row.read = true
        this.unread = Math.max(0, this.unread - 1)
        this.applyLocalPage()
      }
    },
    async handleDelete(row) {
      await ElMessageBox.confirm(`确定删除消息「${row.title}」吗？`, '删除确认', { type: 'warning' })
      await removeMine(row.id)
      ElMessage.success('删除成功')
      this.loadData()
    },
    async handleBatchDelete() {
      if (!this.selected.length) {
        ElMessage.warning('请至少选择一项')
        return
      }
      await ElMessageBox.confirm(`确定删除选中的 ${this.selected.length} 条消息吗？`, '删除确认', {
        type: 'warning',
      })
      await batchRemoveMine(this.selected.map((r) => r.id))
      ElMessage.success('删除成功')
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
.message-detail__meta {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.message-detail__attachment {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 13px;
}

.message-detail__attachment-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.message-detail__attachment-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.message-detail__content {
  line-height: 1.7;
  min-height: 120px;
}
</style>
