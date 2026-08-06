<template>
  <xnPageLayout>
    <template #aside>
      <xnTreePanel
        title="存储路径"
        width="240px"
        :data="treeData"
        node-key="id"
        :current-key="currentPrefix"
        :default-expand-all="true"
        filter-placeholder="筛选目录"
        @node-click="onTreeClick"
      >
        <template #title>
          <div class="tree-title-row">
            <span>存储路径</span>
            <el-tag size="small" effect="plain">{{ storageLabel }}</el-tag>
          </div>
        </template>
      </xnTreePanel>
    </template>

    <template #search>
      <xnSearch :search-item="searchItems" @query-form="inquires" @reset="reset" />
    </template>

    <template #toolbar>
      <xnButton :list-item="buttonItems" :selected="selected" @button-click="buttonClick" />
      <input ref="fileInputRef" type="file" class="file-input-hidden" @change="onFileSelected" />
    </template>

    <template #toolbar-extra>
      <span class="current-path">当前路径：{{ currentPrefix || '/' }}</span>
    </template>

    <template #table>
      <xnTable
        :data="tableData"
        :total="tableData.length"
        :loading="loading"
        :show-pagination="false"
        table-key="system:files"
        entity-name="文件"
        name-field="name"
        row-key="path"
        :columns="columns"
        :action-items="tableButtonItems"
        stripe
        @selection-change="selectionChangeHandle"
      >
        <template #name="{ row }">
          <el-button v-if="row.directory" type="primary" link @click="enterDir(row.path)">
            {{ row.name }}/
          </el-button>
          <span v-else>{{ row.name }}</span>
        </template>
        <template #contentType="{ row }">
          {{ row.directory ? '—' : row.contentType || row.extension || '—' }}
        </template>
        <template #size="{ row }">
          {{ row.directory ? '—' : formatSize(row.size) }}
        </template>
        <template #actions="{ row }">
          <xnTableActions :items="rowActionsFor(row)" :row="row" @action-click="onTableAction" />
        </template>
      </xnTable>
    </template>
  </xnPageLayout>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnTreePanel from '@/components/xnTreePanel/xnTreePanel.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import { usePageUi } from '@/composables/usePageUi'
import { browseFiles, createFileDir, fetchFileTree, removeFile, uploadFile } from '@/api/file-job'

const columns = [
  { type: 'selection', width: 50, fixed: true },
  { type: 'index', label: '#', width: 55 },
  { type: 'slot', slot: 'name', prop: 'name', label: '文件名', minWidth: 140 },
  { type: 'slot', slot: 'contentType', prop: 'contentType', label: '类型', minWidth: 120 },
  { type: 'longText', prop: 'path', label: '对象路径', minWidth: 200 },
  { type: 'longText', prop: 'url', label: '访问地址', minWidth: 200 },
  {
    prop: 'storage',
    label: '存储',
    width: 90,
    align: 'center',
    type: 'tag',
    options: [
      { value: 'minio', label: 'MinIO', type: 'success' },
      { value: 'local', label: '本地', type: 'info' },
    ],
  },
  { type: 'slot', slot: 'size', prop: 'size', label: '大小', width: 100 },
  { prop: 'uploader', label: '上传人', width: 100, showOverflowTooltip: true },
  { prop: 'lastModified', label: '上传时间', minWidth: 160, type: 'datetime' },
  { type: 'slot', slot: 'actions', label: '操作', width: 180, fixed: 'right' },
]

export default {
  name: 'SystemFiles',
  components: {
    xnPageLayout,
    xnTreePanel,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
  },
  setup() {
    const { searchItems, buttonItems, tableButtonItems } = usePageUi('/system/files')
    return { searchItems, buttonItems, tableButtonItems }
  },
  data() {
    return {
      loading: false,
      queryForm: {},
      selected: [],
      currentPrefix: '',
      storage: '',
      dirs: [],
      files: [],
      treeRoot: null,
      columns,
    }
  },
  computed: {
    storageLabel() {
      return this.storage === 'minio' ? 'MinIO' : this.storage === 'local' ? '本地' : '-'
    },
    treeData() {
      return this.treeRoot ? [this.treeRoot] : []
    },
    tableData() {
      return [...this.dirs, ...this.files]
    },
  },
  mounted() {
    this.refreshAll()
  },
  methods: {
    formatSize(size) {
      if (size < 1024) return `${size} B`
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
      return `${(size / 1024 / 1024).toFixed(2)} MB`
    },
    rowActionsFor(row) {
      if (row.directory) {
        return this.tableButtonItems.filter((item) => (item.action || item.name) === 'enter')
      }
      return this.tableButtonItems.filter((item) => (item.action || item.name) !== 'enter')
    },
    async loadTree() {
      const res = await fetchFileTree()
      this.treeRoot = res.data
    },
    async loadData() {
      this.loading = true
      try {
        const keyword = String(this.queryForm.FuzzyWord ?? '').trim() || undefined
        const res = await browseFiles(this.currentPrefix, keyword)
        this.storage = res.data.storage
        this.dirs = res.data.dirs || []
        this.files = res.data.files || []
        this.selected = []
      } finally {
        this.loading = false
      }
    },
    async refreshAll() {
      await Promise.all([this.loadTree(), this.loadData()])
    },
    onTreeClick(data) {
      this.currentPrefix = data.path || ''
      this.loadData()
    },
    enterDir(path) {
      this.currentPrefix = path.endsWith('/') ? path : `${path}/`
      this.loadData()
    },
    inquires(form) {
      this.queryForm = form
      this.loadData()
    },
    reset() {
      this.queryForm = {}
      this.loadData()
    },
    selectionChangeHandle(rows) {
      this.selected = rows
    },
    buttonClick(action) {
      if (action === 'refresh') {
        this.refreshAll()
        return
      }
      if (action === 'mkdir') {
        this.openMkdir()
        return
      }
      if (action === 'upload') {
        this.$refs.fileInputRef?.click()
        return
      }
      if (action === 'delete') {
        this.handleBatchDelete()
      }
    },
    onTableAction(payload) {
      const row = payload.row
      switch (payload.action) {
        case 'enter':
          this.enterDir(row.path)
          break
        case 'view':
        case 'preview':
          this.handleView(row)
          break
        case 'delete':
          this.handleDelete(row)
          break
      }
    },
    async onFileSelected(event) {
      const input = event.target
      const file = input.files?.[0]
      input.value = ''
      if (!file) return
      await uploadFile(file, this.currentPrefix || '')
      ElMessage.success('上传成功')
      await this.refreshAll()
    },
    async openMkdir() {
      const { value } = await ElMessageBox.prompt('输入新目录名（相对当前路径）', '新建目录', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /^[^\\/:*?"<>|]+$/,
        inputErrorMessage: '目录名不合法',
      })
      const name = String(value || '').trim()
      if (!name) return
      const path = `${this.currentPrefix || ''}${name}/`
      await createFileDir(path)
      ElMessage.success('目录已创建')
      await this.refreshAll()
    },
    async handleDelete(row) {
      if (row.directory) {
        ElMessage.warning('不支持删除目录')
        return
      }
      await ElMessageBox.confirm(`确定删除文件「${row.path}」吗？`, '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
      await removeFile(row.path)
      ElMessage.success('删除成功')
      await this.refreshAll()
    },
    async handleBatchDelete() {
      const targets = this.selected.filter((row) => !row.directory)
      if (!targets.length) {
        ElMessage.warning('请至少选择一个文件')
        return
      }
      await ElMessageBox.confirm(`确定删除选中的 ${targets.length} 个文件吗？`, '删除确认', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
      for (const row of targets) {
        await removeFile(row.path)
      }
      ElMessage.success('删除成功')
      await this.refreshAll()
    },
    async handleView(row) {
      if (row.previewUrl) {
        window.open(row.previewUrl, '_blank')
        return
      }
      if (!row.url) {
        ElMessage.warning('文件地址不存在，无法下载')
        return
      }
      await ElMessageBox.confirm('该文件类型暂不支持在线预览，是否下载？', '提示', {
        type: 'info',
        confirmButtonText: '下载',
        cancelButtonText: '取消',
      })
      this.downloadFile(row)
    },
    downloadFile(row) {
      if (!row.url) return
      const link = document.createElement('a')
      link.href = row.url
      link.download = row.name || 'download'
      link.target = '_blank'
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },
  },
}
</script>

<style scoped>
.tree-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.current-path {
  font-size: var(--app-font-size-main);
  color: var(--app-text-muted);
}

.file-input-hidden {
  display: none;
}
</style>
