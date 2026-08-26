<template>
  <div class="xn-file-picker">
    <el-input :model-value="displayText" readonly :disabled="disabled" :placeholder="placeholder">
      <template #append>
        <el-button :disabled="disabled" @click="open = true">选择</el-button>
      </template>
    </el-input>
    <el-button v-if="clearable && hasValue && !disabled" link type="danger" @click="clear">
      清除
    </el-button>

    <xnDialog
      v-model="open"
      title="选择文件"
      width="760px"
      confirm-text="确定"
      :confirm-disabled="!picked.length"
      @confirm="confirm"
    >
      <div class="xn-file-picker__bar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>
            <el-button link type="primary" @click="go('')">根目录</el-button>
          </el-breadcrumb-item>
          <el-breadcrumb-item v-for="seg in crumbs" :key="seg.path">
            <el-button link type="primary" @click="go(seg.path)">{{ seg.name }}</el-button>
          </el-breadcrumb-item>
        </el-breadcrumb>
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索当前目录"
          style="width: 200px"
          @keyup.enter="load"
        />
      </div>
      <el-table
        v-loading="loading"
        :data="rows"
        height="360"
        highlight-current-row
        @row-click="onRowClick"
        @row-dblclick="onRowDblclick"
      >
        <el-table-column width="48">
          <template #default="{ row }">
            <el-checkbox
              v-if="!row.directory"
              :model-value="isPicked(row)"
              @click.stop
              @change="(checked) => toggle(row, !!checked)"
            />
          </template>
        </el-table-column>
        <el-table-column label="名称" min-width="220">
          <template #default="{ row }">
            <el-button v-if="row.directory" link type="primary" @click.stop="go(row.path)">
              {{ row.name }}/
            </el-button>
            <span v-else>{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="110">
          <template #default="{ row }">
            {{ row.directory ? '—' : formatBytes(row.size) }}
          </template>
        </el-table-column>
        <el-table-column label="修改时间" width="170" prop="lastModified" />
      </el-table>
    </xnDialog>
  </div>
</template>

<script>
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import { browseFiles } from '@/api/file-job'
import { formatBytes } from '@/utils/upload/format'

export default {
  name: 'XnFilePicker',
  components: { xnDialog },
  props: {
    modelValue: { type: [String, Array], default: '' },
    /** 本地文件列表，传入后不请求接口 */
    data: { type: Array, default: undefined },
    multiple: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    clearable: { type: Boolean, default: true },
    placeholder: { type: String, default: '请选择文件' },
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      open: false,
      loading: false,
      prefix: '',
      keyword: '',
      rows: [],
      picked: [],
    }
  },
  computed: {
    hasValue() {
      return Array.isArray(this.modelValue) ? this.modelValue.length > 0 : !!this.modelValue
    },
    displayText() {
      if (Array.isArray(this.modelValue)) return this.modelValue.join(', ')
      return this.modelValue || ''
    },
    crumbs() {
      const parts = this.prefix.split('/').filter(Boolean)
      const list = []
      parts.forEach((name, index) => {
        list.push({ name, path: parts.slice(0, index + 1).join('/') })
      })
      return list
    },
  },
  watch: {
    open(value) {
      if (value) {
        this.prefix = ''
        this.keyword = ''
        this.picked = []
        void this.load()
      }
    },
  },
  methods: {
    formatBytes,
    async load() {
      if (this.data) {
        const q = this.keyword.trim().toLowerCase()
        this.rows = this.data.filter((item) => {
          const sameDir = (item.prefix || '') === this.prefix || item.path.startsWith(this.prefix)
          const nameOk = !q || item.name.toLowerCase().includes(q)
          return sameDir && nameOk
        })
        return
      }
      this.loading = true
      try {
        const res = await browseFiles(this.prefix, this.keyword.trim() || undefined)
        this.rows = [...(res.data?.dirs || []), ...(res.data?.files || [])]
      } catch {
        this.rows = []
      } finally {
        this.loading = false
      }
    },
    go(path) {
      this.prefix = path
      void this.load()
    },
    isPicked(row) {
      return this.picked.some((item) => item.path === row.path)
    },
    toggle(row, checked) {
      if (row.directory) return
      if (checked) {
        this.picked = this.multiple
          ? [...this.picked.filter((item) => item.path !== row.path), row]
          : [row]
      } else {
        this.picked = this.picked.filter((item) => item.path !== row.path)
      }
    },
    onRowClick(row) {
      if (row.directory) return
      this.toggle(row, !this.isPicked(row))
    },
    onRowDblclick(row) {
      if (row.directory) {
        this.go(row.path)
        return
      }
      this.toggle(row, true)
      this.confirm()
    },
    confirm() {
      const paths = this.picked.map((item) => item.url || item.path)
      const value = this.multiple ? paths : paths[0] || ''
      this.$emit('update:modelValue', value)
      this.$emit('change', value, this.picked)
      this.open = false
    },
    clear() {
      const value = this.multiple ? [] : ''
      this.$emit('update:modelValue', value)
      this.$emit('change', value, [])
    },
  },
}
</script>

<style scoped>
.xn-file-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.xn-file-picker__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
</style>
