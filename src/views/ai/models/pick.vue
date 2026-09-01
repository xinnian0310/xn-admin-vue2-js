<template>
  <el-dialog
    v-model="visible"
    :title="provider ? `添加模型 · ${provider.name}` : '添加模型'"
    width="720px"
    destroy-on-close
    @closed="reset"
  >
    <el-input
      v-model="keyword"
      clearable
      placeholder="搜索模型名称 / 模型 ID"
      class="pick-search"
    />
    <el-table
      :data="filtered"
      v-loading="loading"
      stripe
      max-height="420"
      row-key="modelId"
      empty-text="该厂商暂无待添加模型"
      @selection-change="onSelectionChange"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column label="模型名称" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ row.name || row.displayName }}</template>
      </el-table-column>
      <el-table-column prop="modelId" label="模型 ID" min-width="180" show-overflow-tooltip />
    </el-table>
    <p v-if="message" class="pick-msg">{{ message }}</p>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="adding"
        :disabled="!selected.length"
        @click="onAddSelected"
      >
        添加{{ selected.length ? `（${selected.length}）` : '' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import { createModel, listRemoteModels } from '@/api/ai/model'
import { showCaughtError } from '@/utils/request'

export default {
  name: 'AiModelPick',
  emits: ['success'],
  data() {
    return {
      visible: false,
      loading: false,
      adding: false,
      keyword: '',
      message: '',
      provider: null,
      rows: [],
      selected: [],
    }
  },
  computed: {
    filtered() {
      const q = this.keyword.trim().toLowerCase()
      const pending = this.rows.filter((row) => !row.boundId)
      if (!q) return pending
      return pending.filter((row) => {
        const name = (row.name || row.displayName || row.modelId).toLowerCase()
        return name.includes(q) || row.modelId.toLowerCase().includes(q)
      })
    },
  },
  methods: {
    reset() {
      this.keyword = ''
      this.message = ''
      this.provider = null
      this.rows = []
      this.selected = []
    },
    onSelectionChange(rows) {
      this.selected = rows
    },
    async open(target) {
      this.reset()
      this.provider = target
      this.visible = true
      this.loading = true
      try {
        const res = await listRemoteModels(target.id)
        this.rows = res.data?.models ?? []
        this.message = res.data?.message || ''
      } catch (e) {
        this.rows = []
        showCaughtError(e, '拉取模型失败')
      } finally {
        this.loading = false
      }
    },
    async onAddSelected() {
      if (!this.provider || !this.selected.length) {
        ElMessage.warning('请选择要添加的模型')
        return
      }
      this.adding = true
      let ok = 0
      try {
        for (const row of this.selected) {
          if (row.boundId) continue
          await createModel({
            providerId: this.provider.id,
            modelId: row.modelId,
          })
          row.boundId = 'pending'
          ok += 1
        }
        if (ok) {
          ElMessage.success(`已添加 ${ok} 个模型`)
          this.$emit('success')
          this.visible = false
          return
        }
        this.selected = []
      } catch (e) {
        if (ok) {
          this.$emit('success')
          this.visible = false
        }
        showCaughtError(e, ok ? `已添加 ${ok} 个，其余添加失败` : '添加失败')
      } finally {
        this.adding = false
      }
    },
  },
}
</script>

<style scoped>
.pick-search {
  margin-bottom: 12px;
}
.pick-msg {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
