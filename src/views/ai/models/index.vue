<template>
  <xnPageLayout :loading="loading">
    <template #aside>
      <xnTreePanel
        title="厂商目录"
        width="240px"
        :filterable="false"
        :data="treeData"
        node-key="id"
        :tree-props="{ label: 'name', children: 'children' }"
        :current-key="currentKey || undefined"
        @node-click="onProviderClick"
      >
        <template #node="{ data }">
          <span class="provider-node">
            <i class="status-dot" :class="providerDotClass(data)" :title="providerDotTitle(data)" />
            <img v-if="isImageSrc(data.icon)" :src="data.icon" class="provider-logo" alt="" />
            <span v-else class="provider-fallback">{{ data.name.slice(0, 1) }}</span>
            <span class="provider-name">{{ data.name }}</span>
          </span>
        </template>
      </xnTreePanel>
    </template>

    <template #search>
      <el-alert
        v-if="modelList.available === false"
        class="models-tip"
        :title="modelList.unavailableMessage || '暂无可用模型，请先添加我的模型'"
        type="info"
        show-icon
        :closable="false"
      />
      <xnSearch :search-item="searchItems" @query-form="inquires" @reset="reset" />
    </template>

    <template #toolbar>
      <xnButton :list-item="buttonItems" :selected="selected" @button-click="buttonClick" />
    </template>

    <template #table>
      <xnTable
        :data="tableData"
        :total="tableData.length"
        :loading="loading"
        :show-pagination="false"
        table-key="ai:models"
        entity-name="模型"
        name-field="name"
        row-key="id"
        :columns="columns"
        :action-items="tableButtonItems"
        :empty-text="emptyText"
        stripe
        class="models-table"
        @selection-change="selectionChangeHandle"
        @switch-change="onSwitchChange"
      >
        <template #icon>
          <img
            v-if="isImageSrc(currentProvider?.icon)"
            :src="currentProvider?.icon"
            class="table-logo"
            alt=""
          />
          <span v-else class="table-logo-fallback">{{
            (currentProvider?.name || '?').slice(0, 1)
          }}</span>
        </template>
        <template #name="{ row }">{{ row.name || row.modelDisplayName }}</template>
        <template #conn="{ row }">
          <span class="key-status">
            <i
              class="status-dot"
              :class="
                probingModelIds.includes(row.id) ? 'is-checking' : connDotClass(row.lastCheckOk)
              "
            />
            <span>{{
              probingModelIds.includes(row.id) ? '检测中' : connText(row.lastCheckOk)
            }}</span>
          </span>
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
  </xnPageLayout>

  <ModelSave ref="saveRef" @success="reload" />
  <ModelPick ref="pickRef" @success="reload" />
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import { markRaw } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnTreePanel from '@/components/xnTreePanel/xnTreePanel.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import { usePageUi } from '@/composables/usePageUi'
import {
  deleteModel,
  listModels,
  listProviders,
  probeProviderCredentials,
  testModel,
  updateModelStatus,
} from '@/api/ai/model'
import { isImageSrc } from '@/utils/icons'
import { showCaughtError } from '@/utils/request'
import ModelSave from './save.vue'
import ModelPick from './pick.vue'

const FALLBACK_SEARCH = [
  {
    label: '关键词',
    prop: 'keyword',
    type: 'input',
    placeholder: '模型名称 / 模型 ID',
    width: 220,
    clearable: true,
  },
]
const FALLBACK_BUTTONS = [
  { name: '新增', action: 'add', type: 'button', icon: markRaw(Plus), typeColor: 'primary' },
]
const FALLBACK_TABLE_BUTTONS = [
  { name: '编辑', action: 'edit', type: 'button', typeColor: 'primary' },
  { name: '删除', action: 'delete', type: 'button', typeColor: 'danger' },
]

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { type: 'slot', slot: 'icon', label: '图标', width: 72, align: 'center' },
  { type: 'slot', slot: 'name', label: '模型名称', minWidth: 200, showOverflowTooltip: true },
  { prop: 'modelId', label: '模型 ID', minWidth: 180, showOverflowTooltip: true },
  { type: 'slot', slot: 'conn', label: '连接状态', width: 120 },
  { type: 'switch', prop: 'status', label: '启用', width: 90, align: 'center' },
  { type: 'slot', slot: 'actions', label: '操作', width: 140, fixed: 'right' },
]

export default {
  name: 'AiModels',
  components: {
    xnPageLayout,
    xnTreePanel,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
    ModelSave,
    ModelPick,
  },
  setup() {
    const {
      searchItems: remoteSearch,
      buttonItems: remoteButtons,
      tableButtonItems: remoteTableButtons,
    } = usePageUi('/ai/models')
    return { remoteSearch, remoteButtons, remoteTableButtons }
  },
  data() {
    return {
      columns,
      loading: false,
      probingIds: [],
      probingModelIds: [],
      currentKey: '',
      providers: [],
      modelList: { trial: null, mine: [] },
      queryForm: {},
      selected: [],
      probeSeq: 0,
      modelProbeSeq: 0,
    }
  },
  computed: {
    searchItems() {
      return this.remoteSearch.length ? this.remoteSearch : FALLBACK_SEARCH
    },
    buttonItems() {
      return this.remoteButtons.length ? this.remoteButtons : FALLBACK_BUTTONS
    },
    tableButtonItems() {
      const items = this.remoteTableButtons.length
        ? this.remoteTableButtons
        : FALLBACK_TABLE_BUTTONS
      return items.filter((item) => {
        if (item.action === 'add' || item.action === 'test') return false
        const name = String(item.name || '')
        return !name.includes('探测') && !name.includes('检测')
      })
    },
    treeData() {
      return this.providers.map((p) => ({
        id: p.id,
        name: p.name,
        icon: p.icon,
        keyConfigured: !!p.keyConfigured,
        lastCheckOk: p.lastCheckOk ?? null,
      }))
    },
    currentProvider() {
      return this.providers.find((p) => p.id === this.currentKey)
    },
    hasKey() {
      return !!this.currentProvider?.keyConfigured
    },
    emptyText() {
      if (!this.providers.length) return '暂无厂商目录，请联系管理员添加'
      if (!this.currentProvider) return '请选择厂商'
      if (!this.hasKey) return '请先在「厂商目录」配置密钥后，再添加该厂商的模型'
      return '尚未添加模型，点击「新增」从该厂商选择'
    },
    tableData() {
      const keyword = String(this.queryForm.keyword ?? '')
        .trim()
        .toLowerCase()
      return this.modelList.mine.filter((row) => {
        if (this.currentKey && row.providerId !== this.currentKey) return false
        if (!keyword) return true
        return [row.name, row.modelDisplayName, row.modelId]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(keyword))
      })
    },
  },
  watch: {
    treeData: {
      immediate: true,
      handler(nodes) {
        if (!nodes.length) {
          this.currentKey = ''
          return
        }
        if (!nodes.some((n) => n.id === this.currentKey)) {
          this.currentKey = nodes[0].id
        }
      },
    },
    currentKey() {
      this.selected = []
      void this.probeCurrentModels()
    },
  },
  mounted() {
    this.reload()
  },
  methods: {
    isImageSrc,
    providerDotClass(node) {
      if (this.probingIds.includes(node.id)) return 'is-checking'
      if (!node.keyConfigured) return 'is-none'
      if (node.lastCheckOk === true) return 'is-ok'
      if (node.lastCheckOk === false) return 'is-fail'
      return 'is-unknown'
    },
    providerDotTitle(node) {
      if (this.probingIds.includes(node.id)) return '正在检测密钥'
      if (!node.keyConfigured) return '未配置密钥'
      if (node.lastCheckOk === true) return '密钥正常'
      if (node.lastCheckOk === false) return '密钥异常'
      return '已配置，未检测'
    },
    connDotClass(ok) {
      if (ok === true) return 'is-ok'
      if (ok === false) return 'is-fail'
      return 'is-none'
    },
    connText(ok) {
      if (ok === true) return '正常'
      if (ok === false) return '失败'
      return '未探测'
    },
    tableActionDisabled() {
      return false
    },
    onProviderClick(node) {
      this.currentKey = node.id
      this.selected = []
    },
    inquires(form) {
      this.queryForm = form
    },
    reset() {
      this.queryForm = {}
    },
    selectionChangeHandle(rows) {
      this.selected = rows
    },
    buttonClick(action) {
      if (action === 'add') {
        if (!this.currentProvider) {
          ElMessage.warning('请选择厂商')
          return
        }
        if (!this.hasKey) {
          ElMessage.warning('请先在「厂商目录」配置密钥')
          return
        }
        this.$refs.pickRef?.open(this.currentProvider)
        return
      }
      if (action === 'edit' && this.selected.length === 1) {
        this.$refs.saveRef?.open('edit', this.selected[0].id)
        return
      }
      if (action === 'delete') this.onBatchDelete()
    },
    onTableAction(payload) {
      const row = payload.row
      if (payload.action === 'edit') this.$refs.saveRef?.open('edit', row.id)
      else if (payload.action === 'delete') this.onDelete([row.id])
    },
    async onSwitchChange(payload) {
      if (payload.prop !== 'status') return
      const row = payload.row
      const next = Number(payload.value)
      const prev = row.status
      try {
        await updateModelStatus(row.id, next)
        row.status = next
        ElMessage.success(next === 1 ? '已启用' : '已停用')
      } catch (e) {
        row.status = prev
        showCaughtError(e, '更新失败')
      }
    },
    async onDelete(ids) {
      await ElMessageBox.confirm(
        '删除后历史会话仍可打开，但需要重新选择模型才能续聊。',
        '删除模型',
        {
          type: 'warning',
        },
      )
      await Promise.all(ids.map((id) => deleteModel(id)))
      ElMessage.success('已删除')
      await this.reload()
    },
    async onBatchDelete() {
      const ids = this.selected.map((row) => row.id)
      if (!ids.length) {
        ElMessage.warning('请选择要删除的模型')
        return
      }
      await this.onDelete(ids)
    },
    async reload() {
      this.loading = true
      try {
        const [modelRes, provRes] = await Promise.all([listModels(), listProviders()])
        Object.assign(this.modelList, modelRes.data)
        this.providers = provRes.data ?? []
      } finally {
        this.loading = false
      }
      void this.probeConfiguredKeys()
      void this.probeCurrentModels()
    },
    applyKeyChecks(checks) {
      const map = Object.fromEntries(checks.map((item) => [item.id, item]))
      this.providers = this.providers.map((provider) => {
        const check = map[provider.id]
        if (!check) return provider
        return {
          ...provider,
          keyConfigured: !!check.keyConfigured,
          keyMask: check.keyMask ?? provider.keyMask,
          lastCheckOk: check.lastCheckOk ?? null,
          lastCheckAt: check.lastCheckAt ?? null,
        }
      })
    },
    async probeConfiguredKeys() {
      const seq = ++this.probeSeq
      const ids = this.providers.filter((p) => p.keyConfigured).map((p) => p.id)
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
    async probeCurrentModels() {
      const seq = ++this.modelProbeSeq
      const providerId = this.currentKey
      if (!providerId || !this.hasKey) {
        this.probingModelIds = []
        return
      }
      const rows = this.modelList.mine.filter((row) => row.providerId === providerId)
      if (!rows.length) {
        this.probingModelIds = []
        return
      }
      this.probingModelIds = rows.map((row) => row.id)
      try {
        await Promise.all(
          rows.map(async (row) => {
            try {
              const res = await testModel(row.id, true)
              if (seq !== this.modelProbeSeq) return
              row.lastCheckOk = !!res.data?.ok
            } catch {
              if (seq !== this.modelProbeSeq) return
              row.lastCheckOk = false
            }
          }),
        )
      } finally {
        if (seq === this.modelProbeSeq) this.probingModelIds = []
      }
    },
  },
}
</script>

<style scoped>
.models-tip {
  margin-bottom: 12px;
}
.provider-node {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
  padding-right: 4px;
}
.provider-logo,
.provider-fallback {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
}
.provider-logo {
  object-fit: contain;
  background: var(--el-fill-color-light);
}
.provider-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.provider-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.table-logo,
.table-logo-fallback {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.table-logo {
  object-fit: contain;
  background: var(--el-fill-color-light);
}
.table-logo-fallback {
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
.models-table :deep(.el-table__body-wrapper) {
  scrollbar-gutter: stable;
}
.models-table :deep(.el-table__body-wrapper::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}
.models-table :deep(.el-table__body-wrapper::-webkit-scrollbar-thumb) {
  border-radius: 8px;
  background: color-mix(in srgb, var(--el-text-color-secondary) 45%, transparent);
  border: 2px solid transparent;
  background-clip: padding-box;
}
</style>
