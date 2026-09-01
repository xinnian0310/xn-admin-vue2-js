<template>
  <xnPageLayout
    v-model:page="page"
    v-model:page-size="size"
    :total="total"
    :loading="loading"
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
        table-key="ai:providers"
        entity-name="厂商"
        name-field="name"
        row-key="id"
        :columns="columns"
        :action-items="tableButtonItems"
        @selection-change="selectionChangeHandle"
        @page-change="loadData"
      >
        <template #icon="{ row }">
          <img v-if="isImageSrc(row.icon)" :src="row.icon" class="provider-logo" alt="" />
          <span v-else class="provider-logo-fallback">{{ (row.name || '?').slice(0, 1) }}</span>
        </template>
        <template #keyMask="{ row }">
          <span>{{ row.keyMask || '未配置' }}</span>
        </template>
        <template #keyStatus="{ row }">
          <span class="key-status">
            <i class="status-dot" :class="keyDotClass(row)" />
            <span>{{ keyStatusText(row) }}</span>
          </span>
        </template>
        <template #actions="{ row }">
          <xnTableActions
            :items="tableActionsFor(row)"
            :row="row"
            :disabled="tableActionDisabled"
            @action-click="onTableAction"
          />
        </template>
      </xnTable>
    </template>
  </xnPageLayout>

  <ProviderSave ref="saveRef" @success="loadData" />
  <ProviderKeySave ref="keyRef" @success="loadData" />
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import { markRaw } from 'vue'
import { Delete, Edit, Key, Plus, View } from '@element-plus/icons-vue'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import { usePageUi } from '@/composables/usePageUi'
import { usePermission } from '@/directives/permission'
import { adminDeleteProvider, adminDisableProvider, adminPageProviders } from '@/api/ai/admin'
import { pageProviders, probeProviderCredentials } from '@/api/ai/model'
import { isImageSrc } from '@/utils/icons'
import ProviderSave from './save.vue'
import ProviderKeySave from './key-save.vue'

const FALLBACK_SEARCH = [
  {
    label: '名称',
    prop: 'name',
    type: 'input',
    placeholder: '厂商名称',
    width: 200,
    clearable: true,
  },
  {
    label: '标识',
    prop: 'code',
    type: 'input',
    placeholder: '如 deepseek',
    width: 160,
    clearable: true,
  },
  {
    label: '状态',
    prop: 'status',
    type: 'select',
    placeholder: '全部',
    width: 140,
    clearable: true,
    options: [
      { label: '启用', value: 1 },
      { label: '停用', value: 0 },
    ],
  },
]
const FALLBACK_ADMIN_BUTTONS = [
  { name: '新增', action: 'add', type: 'button', icon: markRaw(Plus), typeColor: 'primary' },
  {
    name: '查看',
    action: 'view',
    type: 'button',
    icon: markRaw(View),
    typeColor: 'primary',
    index: 0,
  },
  {
    name: '编辑',
    action: 'edit',
    type: 'button',
    icon: markRaw(Edit),
    typeColor: 'primary',
    index: 0,
  },
  {
    name: '配置密钥',
    action: 'credential',
    type: 'button',
    icon: markRaw(Key),
    typeColor: 'primary',
    index: 0,
  },
  { name: '删除', action: 'delete', type: 'button', icon: markRaw(Delete), typeColor: 'danger' },
]
const FALLBACK_USER_BUTTONS = [
  {
    name: '配置密钥',
    action: 'credential',
    type: 'button',
    icon: markRaw(Key),
    typeColor: 'primary',
    index: 0,
  },
]
const FALLBACK_ADMIN_TABLE = [
  { name: '查看', action: 'view', type: 'button', typeColor: 'primary' },
  { name: '编辑', action: 'edit', type: 'button', typeColor: 'primary' },
  { name: '配置密钥', action: 'credential', type: 'button', typeColor: 'primary' },
  { name: '停用', action: 'disable', type: 'button', typeColor: 'danger' },
  { name: '删除', action: 'delete', type: 'button', typeColor: 'danger' },
]
const FALLBACK_USER_TABLE = [
  { name: '配置密钥', action: 'credential', type: 'button', typeColor: 'primary' },
]

function mergeByAction(remote, fallback) {
  if (!remote.length) return fallback
  const actions = new Set(remote.map((item) => item.action))
  const missing = fallback.filter((item) => item.action && !actions.has(item.action))
  if (!missing.length) return remote
  const order = fallback.map((item) => item.action)
  return [...remote, ...missing].sort((a, b) => order.indexOf(a.action) - order.indexOf(b.action))
}

export default {
  name: 'AiProviders',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
    ProviderSave,
    ProviderKeySave,
  },
  setup() {
    const { isSuperAdmin } = usePermission()
    const {
      searchItems: remoteSearch,
      buttonItems: remoteButtons,
      tableButtonItems: remoteTableButtons,
    } = usePageUi('/ai/providers')
    return { isSuperAdmin, remoteSearch, remoteButtons, remoteTableButtons }
  },
  data() {
    return {
      loading: false,
      probingIds: [],
      tableData: [],
      total: 0,
      page: 1,
      size: 10,
      queryForm: {},
      selected: [],
      probeSeq: 0,
    }
  },
  computed: {
    searchItems() {
      const items = this.remoteSearch.length ? this.remoteSearch : FALLBACK_SEARCH
      if (this.isSuperAdmin) return items
      return items.filter((item) => item.prop !== 'status')
    },
    buttonItems() {
      return mergeByAction(
        this.remoteButtons,
        this.isSuperAdmin ? FALLBACK_ADMIN_BUTTONS : FALLBACK_USER_BUTTONS,
      ).map((item) => (item.action === 'add' ? { ...item, name: '新增' } : item))
    },
    tableButtonItems() {
      return mergeByAction(
        this.remoteTableButtons,
        this.isSuperAdmin ? FALLBACK_ADMIN_TABLE : FALLBACK_USER_TABLE,
      )
    },
    columns() {
      const cols = [
        { type: 'selection', width: 50, fixed: true },
        { type: 'slot', slot: 'icon', label: '图标', width: 72, align: 'center' },
        { prop: 'name', label: '厂商', minWidth: 140 },
        { type: 'slot', slot: 'keyMask', label: '我的密钥', width: 160 },
        { prop: 'baseUrl', label: 'Base URL', minWidth: 220, showOverflowTooltip: true },
        { type: 'slot', slot: 'keyStatus', label: '密钥状态', width: 110 },
      ]
      if (this.isSuperAdmin) {
        cols.push({
          prop: 'status',
          label: '状态',
          width: 90,
          type: 'tag',
          options: [
            { value: 1, label: '启用', type: 'success' },
            { value: 0, label: '停用', type: 'info' },
          ],
        })
      }
      cols.push({
        type: 'slot',
        slot: 'actions',
        label: '操作',
        width: this.isSuperAdmin ? 280 : 120,
        fixed: 'right',
      })
      return cols
    },
  },
  mounted() {
    this.loadData()
  },
  methods: {
    isImageSrc,
    fromCatalog(list) {
      return list.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        baseUrl: p.baseUrl || '',
        docUrl: p.docUrl,
        keyHint: p.keyHint,
        icon: p.icon,
        status: 1,
        sort: 0,
        models: [],
        keyConfigured: !!p.keyConfigured,
        keyMask: p.keyMask ?? null,
        lastCheckOk: p.lastCheckOk ?? null,
        lastCheckAt: p.lastCheckAt ?? null,
      }))
    },
    keyDotClass(row) {
      if (this.probingIds.includes(row.id)) return 'is-checking'
      if (!row.keyConfigured) return 'is-none'
      if (row.lastCheckOk === true) return 'is-ok'
      if (row.lastCheckOk === false) return 'is-fail'
      return 'is-unknown'
    },
    keyStatusText(row) {
      if (this.probingIds.includes(row.id)) return '检测中'
      if (!row.keyConfigured) return '未配置'
      if (row.lastCheckOk === true) return '正常'
      if (row.lastCheckOk === false) return '异常'
      return '未检测'
    },
    applyKeyChecks(checks) {
      const map = Object.fromEntries(checks.map((item) => [item.id, item]))
      for (const row of this.tableData) {
        const check = map[row.id]
        if (!check) continue
        row.keyConfigured = !!check.keyConfigured
        row.keyMask = check.keyMask ?? row.keyMask
        row.lastCheckOk = check.lastCheckOk ?? null
        row.lastCheckAt = check.lastCheckAt ?? null
      }
    },
    async probeConfiguredKeys() {
      const seq = ++this.probeSeq
      const ids = this.tableData.filter((row) => row.keyConfigured).map((row) => row.id)
      if (!ids.length) {
        this.probingIds = []
        return
      }
      this.probingIds = ids
      try {
        const checks = await probeProviderCredentials(ids)
        if (seq !== this.probeSeq) return
        this.applyKeyChecks(checks)
      } catch {
        /* 保留上次状态 */
      } finally {
        if (seq === this.probeSeq) this.probingIds = []
      }
    },
    queryParams() {
      const params = {
        page: this.page,
        size: this.size,
      }
      const name = String(this.queryForm.name ?? '').trim()
      const code = String(this.queryForm.code ?? '').trim()
      if (name) params.name = name
      if (code) params.code = code
      const status = this.queryForm.status
      if (this.isSuperAdmin && status !== undefined && status !== null && status !== '') {
        params.status = Number(status)
      }
      return params
    },
    async loadData() {
      this.loading = true
      try {
        const params = this.queryParams()
        if (this.isSuperAdmin) {
          const res = await adminPageProviders(params)
          this.tableData = res.data?.records ?? []
          this.total = res.data?.total ?? 0
        } else {
          const res = await pageProviders(params)
          this.tableData = this.fromCatalog(res.data?.records ?? [])
          this.total = res.data?.total ?? 0
        }
      } finally {
        this.loading = false
      }
      void this.probeConfiguredKeys()
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
    openSave(mode, id) {
      this.$refs.saveRef?.open(mode, id)
    },
    openKey(row) {
      this.$refs.keyRef?.open(row)
    },
    ensureSingleSelected() {
      if (this.selected.length !== 1) {
        ElMessage.warning('请选择一项操作')
        return null
      }
      return this.selected[0]
    },
    buttonClick(action) {
      if (action === 'add') {
        this.openSave('add')
        return
      }
      if (action === 'view' || action === 'edit') {
        const row = this.ensureSingleSelected()
        if (!row) return
        this.openSave(action, row.id)
        return
      }
      if (action === 'credential') {
        const row = this.ensureSingleSelected()
        if (!row) return
        this.openKey(row)
        return
      }
      if (action === 'delete') {
        this.handleBatchDelete()
      }
    },
    tableActionsFor() {
      if (this.isSuperAdmin) return this.tableButtonItems
      return this.tableButtonItems.filter((item) => item.action === 'credential')
    },
    tableActionDisabled(action, row) {
      if (action === 'disable' && row.status !== 1) return '已停用'
      return false
    },
    onTableAction(payload) {
      const row = payload.row
      if (payload.action === 'view') this.openSave('view', row.id)
      else if (payload.action === 'edit') this.openSave('edit', row.id)
      else if (payload.action === 'credential') this.openKey(row)
      else if (payload.action === 'disable') this.onDisable(row)
      else if (payload.action === 'delete') this.onDelete(row)
    },
    async onDisable(row) {
      await ElMessageBox.confirm(
        `停用后员工不能再新建绑定，已绑定的模型仍可继续用。确定停用「${row.name}」？`,
        '停用厂商',
        { type: 'warning' },
      )
      await adminDisableProvider(row.id)
      ElMessage.success('已停用')
      await this.loadData()
    },
    async onDelete(row) {
      await ElMessageBox.confirm(
        `删除后目录及目录模型将移除，无法恢复。若仍有员工模型或试用通道绑定「${row.name}」，将无法删除。`,
        '删除厂商',
        { type: 'warning', confirmButtonText: '删除' },
      )
      await adminDeleteProvider(row.id)
      ElMessage.success('已删除')
      await this.loadData()
    },
    async handleBatchDelete() {
      if (!this.selected.length) {
        ElMessage.warning('请至少选择一项')
        return
      }
      const count = this.selected.length
      const names = this.selected.map((row) => `「${row.name}」`).join('、')
      await ElMessageBox.confirm(
        `删除后目录及目录模型将移除，无法恢复。若仍有员工模型或试用通道绑定，将无法删除。确定删除选中的 ${count} 个厂商：${names}？`,
        '删除厂商',
        { type: 'warning', confirmButtonText: '删除' },
      )
      for (const row of this.selected) {
        await adminDeleteProvider(row.id)
      }
      ElMessage.success('已删除')
      this.selected = []
      await this.loadData()
    },
  },
}
</script>

<style scoped>
.provider-logo,
.provider-logo-fallback {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.provider-logo {
  object-fit: contain;
  background: var(--el-fill-color-light);
}
.provider-logo-fallback {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.key-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.is-none {
  background: var(--el-color-info-light-3);
}
.status-dot.is-ok {
  background: var(--el-color-success);
}
.status-dot.is-fail {
  background: var(--el-color-danger);
}
.status-dot.is-unknown {
  background: var(--el-color-warning);
}
.status-dot.is-checking {
  background: var(--el-color-warning);
  animation: status-pulse 1s ease-in-out infinite;
}
@keyframes status-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
</style>
