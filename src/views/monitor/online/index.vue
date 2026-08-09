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
      <el-tag type="success" effect="light" round>当前在线 {{ allData.length }} 人</el-tag>
    </template>
    <template #table>
      <xnTable
        v-model:page="page"
        v-model:page-size="size"
        :data="tableData"
        :total="total"
        :loading="loading"
        table-key="monitor:online"
        entity-name="在线用户"
        name-field="username"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="applyLocalPage"
        @refresh="loadData"
      >
        <template #sessionCount="{ row }">
          <el-tag size="small" effect="plain">{{ row.sessionCount }}</el-tag>
        </template>
        <template #onlineSeconds="{ row }">
          {{ formatDuration(row.onlineSeconds) }}
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
import { getOnlineUsers, kickUser } from '@/api/monitor'

/** 权限内容：online:offline（工具栏下线）；online:table-offline（表格下线） */
const columns = [
  { type: 'selection', width: 50, fixed: true },
  { prop: 'username', label: '用户名', minWidth: 120 },
  { prop: 'nickname', label: '昵称', minWidth: 120 },
  { prop: 'unitName', label: '所属单位', minWidth: 140, showOverflowTooltip: true },
  { prop: 'roles', label: '角色', minWidth: 140, showOverflowTooltip: true },
  { prop: 'ip', label: '客户端 IP', minWidth: 130 },
  { type: 'slot', slot: 'sessionCount', prop: 'sessionCount', label: '连接数', width: 90 },
  { prop: 'loginTime', label: '登录时间', minWidth: 170, type: 'datetime' },
  { type: 'slot', slot: 'onlineSeconds', prop: 'onlineSeconds', label: '在线时长', minWidth: 120 },
  { type: 'slot', slot: 'actions', label: '操作', width: 90, fixed: 'right' },
]

let timer = null

export default {
  name: 'MonitorOnline',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/monitor/online')
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
      columns,
    }
  },
  mounted() {
    this.loadData()
    timer = setInterval(() => this.loadData(), 15000)
  },
  beforeUnmount() {
    if (timer) clearInterval(timer)
  },
  methods: {
    formatDuration(seconds) {
      if (!seconds || seconds < 0) return '—'
      const h = Math.floor(seconds / 3600)
      const m = Math.floor((seconds % 3600) / 60)
      const s = Math.floor(seconds % 60)
      if (h > 0) return `${h} 时 ${m} 分`
      if (m > 0) return `${m} 分 ${s} 秒`
      return `${s} 秒`
    },
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
          [r.username, r.nickname, r.ip, r.unitName, r.roles]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(kw)),
        )
      }
      this.total = rows.length
      const start = (this.page - 1) * this.size
      this.tableData = rows.slice(start, start + this.size)
    },
    async loadData() {
      this.loading = true
      try {
        const res = await getOnlineUsers()
        this.allData = res.data
        this.applyLocalPage()
      } finally {
        this.loading = false
      }
    },
    async buttonClick(action) {
      if (action === 'offline' || action === 'kick') {
        if (this.selected.length !== 1) {
          ElMessage.warning('请选择一名在线用户')
          return
        }
        await this.handleOffline(this.selected[0])
      }
    },
    onTableAction(payload) {
      if (payload.action === 'offline' || payload.action === 'kick') {
        this.handleOffline(payload.row)
      }
    },
    async handleOffline(row) {
      try {
        await ElMessageBox.confirm(
          `确定将用户「${row.nickname || row.username || row.userId}」强制下线吗？`,
          '下线确认',
          { type: 'warning', confirmButtonText: '下线', cancelButtonText: '取消' },
        )
      } catch {
        return
      }
      await kickUser(row.userId)
      ElMessage.success('已下线')
      await this.loadData()
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
