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
        table-key="system:dicts"
        entity-name="字典类型"
        name-field="name"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="loadData"
      >
        <template #type="{ row }">
          <code class="dict-code">{{ row.type }}</code>
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
        <el-card v-for="row in tableData" :key="row.id" shadow="hover" class="dict-card">
          <div class="dict-card__header">
            <div>
              <div class="dict-card__name">{{ row.name }}</div>
              <code class="dict-code">{{ row.type }}</code>
            </div>
            <el-tag :type="row.builtIn ? 'warning' : 'info'">
              {{ row.builtIn ? '内置' : '自定义' }}
            </el-tag>
          </div>
          <div class="dict-card__body">
            <div class="dict-card__row">
              <span class="label">备注</span>
              <span>{{ row.remark || '—' }}</span>
            </div>
            <div class="dict-card__row">
              <span class="label">状态</span>
              <el-tag :type="row.status === 1 ? 'success' : 'danger'">
                {{ row.status === 1 ? '启用' : '禁用' }}
              </el-tag>
            </div>
          </div>
          <div class="dict-card__footer">
            <xnTableActions
              :items="tableButtonItems"
              :row="row"
              :disabled="tableActionDisabled"
              @action-click="onTableAction"
            />
          </div>
        </el-card>
      </div>
    </template>
  </xnPageLayout>

  <DictTypeSave ref="saveRef" @success="loadData" />
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import DictTypeSave from './save.vue'
import { usePageUi } from '@/composables/usePageUi'
import { list, batchRemove, remove } from '@/api/dict-type'

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { prop: 'name', label: '字典名称', minWidth: 160 },
  { type: 'slot', slot: 'type', prop: 'type', label: '字典编码', minWidth: 180 },
  { prop: 'remark', label: '备注', minWidth: 200, showOverflowTooltip: true },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    type: 'tag',
    options: [
      { value: 1, label: '启用', type: 'success' },
      { value: 0, label: '禁用', type: 'danger' },
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
  { type: 'slot', slot: 'actions', label: '操作', width: 200, fixed: 'right' },
]

export default {
  name: 'Dicts',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
    DictTypeSave,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/system/dicts')
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
    }
  },
  methods: {
    goDictData(row) {
      this.$router.push({
        path: '/system/dicts/data',
        query: { dictType: row.type, dictName: row.name },
      })
    },
    openSave(mode, id) {
      this.$refs.saveRef?.open(mode, id)
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
    tableActionDisabled(action, row) {
      if (action === 'delete' && row.builtIn) return '内置字典不可删除'
      return false
    },
    onTableAction(payload) {
      const row = payload.row
      switch (payload.action) {
        case 'data':
          this.goDictData(row)
          break
        case 'edit':
          this.openSave('edit', row.id)
          break
        case 'view':
          this.openSave('view', row.id)
          break
        case 'delete':
          this.handleDelete(row)
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
      }
    },
    async handleDelete(row) {
      if (row.builtIn) {
        ElMessage.warning('内置字典不可删除')
        return
      }
      await ElMessageBox.confirm(`确定删除字典「${row.name}」吗？`, '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
      await remove(row.id)
      ElMessage.success('删除成功')
      this.loadData()
    },
    async handleBatchDelete() {
      if (!this.selected.length) {
        ElMessage.warning('请至少选择一项')
        return
      }
      if (this.selected.some((r) => r.builtIn)) {
        ElMessage.warning('内置字典不可删除，请取消勾选')
        return
      }
      await ElMessageBox.confirm(`确定删除选中的 ${this.selected.length} 个字典吗？`, '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
      await batchRemove(this.selected.map((r) => r.id))
      ElMessage.success('删除成功')
      this.loadData()
    },
  },
  mounted() {
    this.loadData()
  },
}
</script>

<style scoped>
.dict-code {
  font-size: 12px;
  color: var(--app-text-muted);
  background: var(--app-fill-color-light, rgba(0, 0, 0, 0.04));
  padding: 2px 6px;
  border-radius: 4px;
}

.dict-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.dict-card__name {
  font-weight: 600;
  font-size: var(--app-font-size-main);
  margin-bottom: 4px;
}

.dict-card__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.dict-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: var(--app-font-size-main);
}

.dict-card__row .label {
  color: var(--app-text-muted);
  flex-shrink: 0;
}

.dict-card__footer {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 4px;
  border-top: 1px solid var(--app-border-color);
  padding-top: 12px;
}
</style>
