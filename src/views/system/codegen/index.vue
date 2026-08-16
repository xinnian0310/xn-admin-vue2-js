<template>
  <xnPageLayout>
    <template #search>
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
        table-key="system:codegen"
        entity-name="数据表"
        name-field="tableName"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
      >
        <template #actions="{ row }">
          <xnTableActions :items="tableButtonItems" :row="row" @action-click="onTableAction" />
        </template>
      </xnTable>
      <el-empty
        v-if="!loading && tableData.length === 0"
        class="codegen-empty"
        description="暂无数据表。默认已包含 sys_*；若仍为空请检查数据源，或先建业务表再生成。"
      />
    </template>
  </xnPageLayout>

  <el-dialog
    v-model="wizardVisible"
    :title="`代码生成 — ${form.tableName || ''}`"
    width="960px"
    destroy-on-close
    align-center
    class="codegen-wizard-dialog"
    @closed="onWizardClosed"
  >
    <el-steps :active="step" finish-status="success" align-center class="mb-4">
      <el-step title="基本信息" />
      <el-step title="字段配置" />
      <el-step title="生成选项" />
    </el-steps>

    <div v-loading="wizardLoading" class="wizard-body">
      <el-form v-show="step === 0" :model="form" label-width="100px" class="px-2">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="表名">
              <el-input :model-value="form.tableName" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="表备注">
              <el-input :model-value="tableRemarks" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="模块前缀" required>
              <el-input
                v-model="form.modulePrefix"
                placeholder="如 order、product"
                @blur="syncDerived"
              />
              <div class="form-tip">权限码前缀，如 order:create、order:table-edit</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类名">
              <el-input v-model="form.className" placeholder="如 Order（空则由前缀推导）" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="API 路径" required>
              <el-input v-model="form.apiBasePath" placeholder="/api/orders" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="菜单标题" required>
              <el-input v-model="form.menuTitle" placeholder="侧边栏显示名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="菜单路径" required>
              <el-input v-model="form.menuPath" placeholder="/biz/orders" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="视图目录" required>
              <el-input v-model="form.viewPath" placeholder="biz/orders" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div v-show="step === 1" class="col-step">
        <div class="tip text-secondary mb-2">勾选列表/查询/表单字段，并调整 Java 类型与控件</div>
        <el-table :data="form.columns" border size="small" max-height="420" row-key="columnName">
          <el-table-column label="列名" prop="columnName" min-width="120" fixed />
          <el-table-column label="显示名" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.label" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="Java 类型" width="130">
            <template #default="{ row }">
              <el-select v-model="row.javaType" size="small" style="width: 100%">
                <el-option v-for="t in javaTypes" :key="t" :label="t" :value="t" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="列表" width="70" align="center">
            <template #default="{ row }">
              <el-checkbox v-model="row.listShow" />
            </template>
          </el-table-column>
          <el-table-column label="查询" width="70" align="center">
            <template #default="{ row }">
              <el-checkbox v-model="row.queryable" />
            </template>
          </el-table-column>
          <el-table-column label="表单" width="70" align="center">
            <template #default="{ row }">
              <el-checkbox v-model="row.formShow" :disabled="row.pk" />
            </template>
          </el-table-column>
          <el-table-column label="必填" width="70" align="center">
            <template #default="{ row }">
              <el-checkbox v-model="row.required" :disabled="row.pk || !row.formShow" />
            </template>
          </el-table-column>
          <el-table-column label="控件" width="120">
            <template #default="{ row }">
              <el-select v-model="row.formType" size="small" style="width: 100%">
                <el-option label="输入框" value="input" />
                <el-option label="数字" value="number" />
                <el-option label="下拉" value="select" />
                <el-option label="日期" value="datetime" />
                <el-option label="文本域" value="textarea" />
              </el-select>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <el-form v-show="step === 2" :model="form" label-width="120px" class="px-2">
        <el-form-item label="同步选项">
          <el-checkbox v-model="form.persistPermissions">写入权限并授予超管</el-checkbox>
          <el-checkbox v-model="form.generatePageUi" class="ml-4">写入 PageUi 配置</el-checkbox>
          <el-checkbox v-model="form.createMenu" class="ml-4">创建菜单路由</el-checkbox>
        </el-form-item>
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="将生成后端 CRUD + 本工程（vue2-js Options）前端标准列表页，打包 ZIP 下载；按包内 README 拷贝到本仓库后重启。"
        />
      </el-form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="wizardVisible = false">取消</el-button>
        <el-button v-if="step > 0" @click="step--">上一步</el-button>
        <el-button v-if="step < 2" type="primary" :disabled="!canNext" @click="step++"
          >下一步</el-button
        >
        <el-button
          v-else
          type="success"
          :loading="generating"
          :disabled="!canGenerate"
          @click="doGenerate"
        >
          生成并下载
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import { usePageUi } from '@/composables/usePageUi'
import { generate, listColumns, listTables } from '@/api/codegen'

const fallbackSearchItems = [
  { label: '综合查询', prop: 'FuzzyWord', type: 'input', placeholder: '搜索表名/备注' },
  {
    label: '系统表',
    prop: 'includeSys',
    type: 'select',
    placeholder: '是否包含',
    options: [
      { label: '是', value: 'true' },
      { label: '否', value: 'false' },
    ],
  },
]

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { prop: 'tableName', label: '表名', minWidth: 220 },
  { prop: 'remarks', label: '备注', minWidth: 220, showOverflowTooltip: true },
  { type: 'slot', slot: 'actions', label: '操作', width: 100, fixed: 'right' },
]

const javaTypes = [
  'String',
  'Integer',
  'Long',
  'Double',
  'BigDecimal',
  'Boolean',
  'LocalDateTime',
  'LocalDate',
]

export default {
  name: 'SystemCodegen',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
  },
  setup() {
    const pageUi = usePageUi('/system/codegen')
    return {
      buttonItems: pageUi.buttonItems,
      tableButtonItems: pageUi.tableButtonItems,
      pageUiSearchItems: pageUi.searchItems,
    }
  },
  data() {
    return {
      loading: false,
      allTables: [],
      tableData: [],
      selected: [],
      queryForm: { includeSys: 'true' },
      wizardVisible: false,
      wizardLoading: false,
      generating: false,
      step: 0,
      tableRemarks: '',
      javaTypes,
      form: {
        tableName: '',
        modulePrefix: '',
        className: '',
        apiBasePath: '',
        menuTitle: '',
        menuPath: '',
        viewPath: '',
        persistPermissions: true,
        generatePageUi: true,
        createMenu: true,
        columns: [],
      },
      columns,
    }
  },
  computed: {
    searchItems() {
      return this.pageUiSearchItems.length ? this.pageUiSearchItems : fallbackSearchItems
    },
    canNext() {
      if (this.step === 0) {
        return (
          !!this.form.modulePrefix?.trim() &&
          !!this.form.apiBasePath?.trim() &&
          !!this.form.menuTitle?.trim() &&
          !!this.form.menuPath?.trim() &&
          !!this.form.viewPath?.trim()
        )
      }
      if (this.step === 1) {
        return (this.form.columns || []).length > 0
      }
      return true
    },
    canGenerate() {
      return this.canNext && !!this.form.tableName
    },
  },
  mounted() {
    this.loadData()
  },
  methods: {
    selectionChangeHandle(rows) {
      this.selected = rows
    },
    applyFilter() {
      const kw = String(this.queryForm.FuzzyWord ?? '')
        .trim()
        .toLowerCase()
      this.tableData = kw
        ? this.allTables.filter(
            (t) =>
              (t.tableName || '').toLowerCase().includes(kw) ||
              (t.remarks || '').toLowerCase().includes(kw),
          )
        : [...this.allTables]
    },
    async loadData() {
      this.loading = true
      try {
        const includeSys = String(this.queryForm.includeSys ?? 'true') === 'true'
        const res = await listTables(includeSys)
        this.allTables = res.data ?? []
        this.applyFilter()
      } catch (e) {
        ElMessage.error(e instanceof Error ? e.message : '加载库表失败')
      } finally {
        this.loading = false
      }
    },
    inquires(formData) {
      this.queryForm = { ...formData }
      this.loadData()
    },
    reset() {
      this.queryForm = { includeSys: 'true' }
      this.loadData()
    },
    buttonClick(action) {
      if (action === 'refresh' || action === 'view') {
        this.loadData()
        return
      }
      if (action === 'generate') {
        if (this.selected.length !== 1) {
          ElMessage.warning('请选择一张表进行生成')
          return
        }
        this.openWizard(this.selected[0])
      }
    },
    onTableAction(payload) {
      if (payload.action === 'generate') {
        this.openWizard(payload.row)
      }
    },
    toModulePrefix(table) {
      const parts = table.split('_').filter(Boolean)
      if (parts.length <= 1) return table.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()
      return parts
        .slice(1)
        .join('-')
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .toLowerCase()
    },
    toClassName(prefix) {
      return prefix
        .split(/[-_]/)
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join('')
    },
    syncDerived() {
      const prefix = (this.form.modulePrefix || '').trim()
      if (!prefix) return
      if (!this.form.className) this.form.className = this.toClassName(prefix)
      if (!this.form.apiBasePath) this.form.apiBasePath = `/api/${prefix.replace(/-/g, '')}`
      if (!this.form.menuPath) this.form.menuPath = `/${prefix.replace(/-/g, '/')}`
      if (!this.form.viewPath) this.form.viewPath = prefix.replace(/-/g, '/')
    },
    async openWizard(row) {
      this.step = 0
      this.wizardVisible = true
      this.wizardLoading = true
      this.tableRemarks = row.remarks || ''
      const prefix = this.toModulePrefix(row.tableName)
      this.form.tableName = row.tableName
      this.form.modulePrefix = prefix
      this.form.className = this.toClassName(prefix)
      this.form.apiBasePath = `/api/${prefix.replace(/-/g, '')}`
      this.form.menuTitle = row.remarks || this.form.className || prefix
      this.form.menuPath = `/${prefix.replace(/-/g, '/')}`
      this.form.viewPath = prefix.replace(/-/g, '/')
      this.form.persistPermissions = true
      this.form.generatePageUi = true
      this.form.createMenu = true
      this.form.columns = []
      try {
        const res = await listColumns(row.tableName)
        this.form.columns = (res.data ?? []).map((c) => ({
          columnName: c.columnName,
          label: c.label || c.remarks || c.columnName,
          javaType: c.javaType,
          javaField: c.javaField,
          formType: c.formType || 'input',
          pk: c.pk,
          nullable: c.nullable,
          columnSize: c.columnSize,
          listShow: c.listShow,
          queryable: c.queryable,
          formShow: c.formShow,
          required: c.required,
        }))
      } catch (e) {
        ElMessage.error(e instanceof Error ? e.message : '加载表结构失败')
        this.wizardVisible = false
      } finally {
        this.wizardLoading = false
      }
    },
    onWizardClosed() {
      this.step = 0
      this.form.columns = []
    },
    downloadZipBase64(base64, filename) {
      const bin = atob(base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    },
    async doGenerate() {
      if (!this.canGenerate) return
      this.generating = true
      try {
        const res = await generate({ ...this.form, columns: [...this.form.columns] })
        const data = res.data
        if (data?.zipBase64) {
          this.downloadZipBase64(
            data.zipBase64,
            `${data.className || this.form.modulePrefix || this.form.tableName}-codegen.zip`,
          )
        }
        ElMessage.success(
          `生成完成：新写入 ${data?.persistedPermissionCount ?? 0} 条权限${data?.pageUiPersisted ? '，已写入 PageUi' : ''}`,
        )
        this.wizardVisible = false
      } catch (e) {
        ElMessage.error(e instanceof Error ? e.message : '生成失败')
      } finally {
        this.generating = false
      }
    },
  },
}
</script>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}
.mb-2 {
  margin-bottom: 8px;
}
.ml-4 {
  margin-left: 16px;
}
.px-2 {
  padding: 0 8px;
}
.wizard-body {
  min-height: 280px;
}
.col-step .tip,
.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}
.form-tip {
  margin-top: 4px;
}
.text-secondary {
  color: var(--el-text-color-secondary);
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.codegen-empty {
  margin-top: 24px;
}
</style>
