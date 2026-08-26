<template>
  <div class="remote-storage-page">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="remote-storage-page__alert"
      title="可新增多条「名字 / 路径」，新增 / 编辑 / 删除即时落库。保存结果覆盖前端 appConfig.storage。推荐同源相对路径（minio → /minio/，kkFileView → /kkFileView/），由 Vite / Nginx 反代，勿写 127.0.0.1。云端为空时使用本地 app.js 兜底。密钥勿写入前端。"
    />
    <xnPageLayout :show-pagination="false" :loading="loading || saving">
      <template #search>
        <xnSearch :search-item="resolvedSearchItems" @query-form="onQuery" @reset="onReset" />
      </template>
      <template #toolbar>
        <xnButton :list-item="resolvedButtons" :selected="selected" @button-click="onButton" />
      </template>
      <template #table>
        <xnTable
          :data="filteredItems"
          :total="filteredItems.length"
          :loading="loading || saving"
          :show-pagination="false"
          table-key="system:remote-storage"
          entity-name="远程连接"
          name-field="name"
          row-key="key"
          :columns="columns"
          :action-items="resolvedTableButtons"
          stripe
          @selection-change="onSelectionChange"
        >
          <template #actions="{ row }">
            <xnTableActions
              :items="resolvedTableButtons"
              :row="row"
              @action-click="onTableAction"
            />
          </template>
        </xnTable>
      </template>
    </xnPageLayout>

    <xnDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="520px"
      :show-confirm="dialogMode !== 'view'"
      :confirm-loading="saving"
      confirm-text="确定"
      :cancel-text="dialogMode === 'view' ? '关闭' : '取消'"
      @confirm="submitDialog"
      @closed="onDialogClosed"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名字" prop="name">
          <el-input
            v-model="form.name"
            :disabled="dialogMode === 'view'"
            maxlength="64"
            placeholder="如 minio"
          />
        </el-form-item>
        <el-form-item label="路径" prop="path">
          <el-input
            v-model="form.path"
            :disabled="dialogMode === 'view'"
            maxlength="1000"
            placeholder="如 /minio/"
          />
        </el-form-item>
      </el-form>
    </xnDialog>
  </div>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import { usePageUi } from '@/composables/usePageUi'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import { applyRemoteAppConfig, defaultAppConfig } from '@/config/app'
import { getSystemConfigSection, updateSystemConfigSection } from '@/api/system-config'
import { APP_CLIENT_ID } from '@/config/client'
import { showCaughtError } from '@/utils/request'

const SEARCH_FALLBACK = [
  { label: '综合查询', prop: 'FuzzyWord', type: 'input', placeholder: '名字 / 路径' },
]

const BUTTON_FALLBACK = [
  {
    name: '新增',
    type: 'button',
    action: 'add',
    icon: 'Plus',
    typeColor: 'primary',
    permission: 'remote-storage:create',
  },
  {
    name: '编辑',
    type: 'button',
    action: 'edit',
    icon: 'Edit',
    typeColor: 'primary',
    index: 0,
    permission: 'remote-storage:update',
  },
  {
    name: '查看',
    type: 'button',
    action: 'view',
    icon: 'View',
    typeColor: 'primary',
    index: 0,
    permission: 'remote-storage:view',
  },
  {
    name: '删除',
    type: 'button',
    action: 'delete',
    icon: 'Delete',
    typeColor: 'danger',
    permission: 'remote-storage:delete',
  },
]

const TABLE_BUTTON_FALLBACK = [
  {
    name: '编辑',
    type: 'button',
    action: 'edit',
    typeColor: 'primary',
    permission: 'remote-storage:update',
  },
  {
    name: '查看',
    type: 'button',
    action: 'view',
    typeColor: 'primary',
    permission: 'remote-storage:view',
  },
  {
    name: '删除',
    type: 'button',
    action: 'delete',
    typeColor: 'danger',
    permission: 'remote-storage:delete',
  },
]

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { type: 'index', label: '#', width: 55 },
  { prop: 'name', label: '名字', width: 200, showOverflowTooltip: true },
  { prop: 'path', label: '路径', minWidth: 320, showOverflowTooltip: true },
  { type: 'slot', slot: 'actions', label: '操作', width: 180, fixed: 'right' },
]

const DIALOG_TITLE = {
  add: '新增远程连接',
  edit: '编辑远程连接',
  view: '查看远程连接',
}

export default {
  name: 'RemoteStorage',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTable,
    xnTableActions,
    xnDialog,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/system/remote-storage')
    return { searchItems, buttonItems, tableButtonItems }
  },
  data() {
    return {
      columns,
      loading: false,
      saving: false,
      items: [],
      keyword: '',
      selected: [],
      dialogVisible: false,
      dialogMode: 'add',
      editingKey: null,
      keySeed: 0,
      form: { name: '', path: '' },
      rules: {
        name: [{ required: true, message: '请输入名字', trigger: 'blur' }],
        path: [{ required: true, message: '请输入路径', trigger: 'blur' }],
      },
    }
  },
  computed: {
    dialogTitle() {
      return DIALOG_TITLE[this.dialogMode]
    },
    resolvedSearchItems() {
      return this.searchItems.length ? this.searchItems : SEARCH_FALLBACK
    },
    resolvedButtons() {
      return this.buttonItems.length ? this.buttonItems : BUTTON_FALLBACK
    },
    resolvedTableButtons() {
      return this.tableButtonItems.length ? this.tableButtonItems : TABLE_BUTTON_FALLBACK
    },
    filteredItems() {
      const kw = this.keyword.trim().toLowerCase()
      if (!kw) return this.items
      return this.items.filter(
        (item) => item.name.toLowerCase().includes(kw) || item.path.toLowerCase().includes(kw),
      )
    },
  },
  mounted() {
    this.loadData()
  },
  methods: {
    toRow(item) {
      this.keySeed += 1
      return {
        key: this.keySeed,
        name: String(item?.name || ''),
        path: String(item?.path || ''),
      }
    },
    mapToRows(map) {
      const src = map && Object.keys(map).length ? map : defaultAppConfig.storage
      return Object.entries(src).map(([name, path]) =>
        this.toRow({ name, path: String(path || '') }),
      )
    },
    applySection(data) {
      const sectionItems = data?.items
      this.items = Array.isArray(sectionItems)
        ? sectionItems.map((item) => this.toRow(item))
        : this.mapToRows(data)
      this.selected = []
    },
    withClientBrand(payload) {
      const clientName =
        payload.app?.clients?.[APP_CLIENT_ID]?.name ||
        payload.app?.name ||
        defaultAppConfig.app.name
      const clientIntro = payload.app?.clients?.[APP_CLIENT_ID]?.intro ?? payload.app?.intro ?? ''
      return { ...payload, app: { ...payload.app, name: clientName, intro: clientIntro } }
    },
    async loadData() {
      this.loading = true
      try {
        const res = await getSystemConfigSection('storage')
        this.applySection(res.data)
      } catch (e) {
        showCaughtError(e, '加载失败')
      } finally {
        this.loading = false
      }
    },
    onQuery(query) {
      this.keyword = String(query.FuzzyWord ?? '')
    },
    onReset() {
      this.keyword = ''
    },
    onSelectionChange(rows) {
      this.selected = rows
    },
    openDialog(mode, row) {
      this.dialogMode = mode
      this.editingKey = row ? row.key : null
      this.form.name = row?.name ?? ''
      this.form.path = row?.path ?? ''
      this.dialogVisible = true
    },
    onDialogClosed() {
      this.$refs.formRef?.clearValidate()
      this.editingKey = null
    },
    async persist(rows, successText) {
      const duplicated = rows.find(
        (row, idx) => rows.findIndex((it) => it.name.trim() === row.name.trim()) !== idx,
      )
      if (duplicated) {
        ElMessage.warning(`名字「${duplicated.name}」重复`)
        return false
      }
      this.saving = true
      try {
        const res = await updateSystemConfigSection('storage', {
          items: rows.map((row) => ({ name: row.name.trim(), path: row.path.trim() })),
        })
        if (res.data) {
          this.applySection(res.data.storage)
          applyRemoteAppConfig(this.withClientBrand(res.data))
        } else {
          this.items = rows
        }
        this.selected = []
        ElMessage.success(successText)
        return true
      } catch (e) {
        showCaughtError(e, '保存失败')
        return false
      } finally {
        this.saving = false
      }
    },
    async submitDialog() {
      const valid = await this.$refs.formRef?.validate().catch(() => false)
      if (!valid) return
      const name = this.form.name.trim()
      const path = this.form.path.trim()
      const key = this.editingKey
      const next = this.items.map((item) => ({ ...item }))
      if (key == null) {
        next.unshift(this.toRow({ name, path }))
      } else {
        const target = next.find((item) => item.key === key)
        if (!target) return
        target.name = name
        target.path = path
      }
      const ok = await this.persist(next, key == null ? '新增成功' : '修改成功')
      if (ok) this.dialogVisible = false
    },
    async confirmRemove(rows, skipConfirm = false) {
      if (!rows.length) {
        ElMessage.warning('请先选择要删除的数据')
        return
      }
      const label = rows.length === 1 ? rows[0].name || '该条' : `选中的 ${rows.length} 条`
      if (!skipConfirm) {
        try {
          await ElMessageBox.confirm(`确认删除${label}远程连接配置？删除后即时生效`, '提示', {
            type: 'warning',
          })
        } catch {
          return
        }
      }
      const keys = new Set(rows.map((row) => row.key))
      await this.persist(
        this.items.filter((item) => !keys.has(item.key)),
        '删除成功',
      )
    },
    onButton(action) {
      if (action === 'add') this.openDialog('add')
      else if (action === 'edit' || action === 'view') {
        const row = this.selected[0]
        if (!row) {
          ElMessage.warning('请先选择一条数据')
          return
        }
        this.openDialog(action, row)
      } else if (action === 'delete') this.confirmRemove(this.selected)
    },
    onTableAction(payload) {
      const row = payload.row
      if (payload.action === 'edit') this.openDialog('edit', row)
      else if (payload.action === 'view') this.openDialog('view', row)
      else if (payload.action === 'delete') this.confirmRemove([row], true)
    },
  },
}
</script>

<style scoped>
.remote-storage-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.remote-storage-page__alert {
  flex-shrink: 0;
}
</style>
