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
      <div class="dict-data__header">
        <el-button :icon="ArrowLeft" @click="goBack">返回</el-button>
        <span class="dict-data__title">
          字典数据：<strong>{{ dictName }}</strong>
          <code class="dict-code">{{ dictType }}</code>
        </span>
      </div>
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
        table-key="system:dicts:data"
        entity-name="字典数据"
        name-field="label"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
        @page-change="loadData"
      >
        <template #preview="{ row }">
          <el-tag :type="tagType(row.listClass)">{{ row.label }}</el-tag>
        </template>
        <template #isDefault="{ row }">
          <el-tag v-if="row.isDefault" type="success">默认</el-tag>
          <span v-else class="text-muted">—</span>
        </template>
        <template #actions="{ row }">
          <xnTableActions :items="tableButtonItems" :row="row" @action-click="onTableAction" />
        </template>
      </xnTable>
    </template>
  </xnPageLayout>

  <DictDataSave ref="saveRef" :dict-type="dictType" @success="loadData" />
</template>

<script>
import { markRaw } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import DictDataSave from './save.vue'
import { usePageUi } from '@/composables/usePageUi'
import { list, batchRemove, remove } from '@/api/dict-data'

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { type: 'slot', slot: 'preview', prop: 'label', label: '字典标签', minWidth: 140 },
  { prop: 'value', label: '字典键值', minWidth: 140 },
  { prop: 'sort', label: '排序', width: 80 },
  { type: 'slot', slot: 'isDefault', prop: 'isDefault', label: '默认', width: 90 },
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
  { prop: 'remark', label: '备注', minWidth: 160, showOverflowTooltip: true },
  { type: 'slot', slot: 'actions', label: '操作', fixed: 'right' },
]

export default {
  name: 'DictData',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
    DictDataSave,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/system/dicts/data')
    return {
      searchItems,
      buttonItems,
      tableButtonItems,
      columns,
      ArrowLeft: markRaw(ArrowLeft),
    }
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
  computed: {
    dictType() {
      return String(this.$route.query.dictType ?? '')
    },
    dictName() {
      return String(this.$route.query.dictName ?? this.dictType)
    },
  },
  mounted() {
    this.loadData()
  },
  methods: {
    tagType(listClass) {
      const allowed = ['primary', 'success', 'info', 'warning', 'danger']
      return allowed.includes(listClass || '') ? listClass : ''
    },
    goBack() {
      this.$router.push('/system/dicts')
    },
    openSave(mode, id) {
      this.$refs.saveRef?.open(mode, id)
    },
    async loadData() {
      if (!this.dictType) return
      this.loading = true
      try {
        const res = await list({
          dictType: this.dictType,
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
      await remove(row.id)
      ElMessage.success('删除成功')
      this.loadData()
    },
    async handleBatchDelete() {
      if (!this.selected.length) {
        ElMessage.warning('请至少选择一项')
        return
      }
      await ElMessageBox.confirm(
        `确定删除选中的 ${this.selected.length} 条字典数据吗？`,
        '删除确认',
        {
          type: 'warning',
          confirmButtonText: '删除',
          cancelButtonText: '取消',
        },
      )
      await batchRemove(this.selected.map((r) => r.id))
      ElMessage.success('删除成功')
      this.loadData()
    },
  },
}
</script>

<style scoped>
.dict-data__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.dict-data__title {
  font-size: var(--app-font-size-main);
}

.dict-code {
  font-size: 12px;
  color: var(--app-text-muted);
  background: var(--app-fill-color-light, rgba(0, 0, 0, 0.04));
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 6px;
}

.text-muted {
  color: var(--app-text-muted);
}
</style>
