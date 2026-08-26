<template>
  <div class="assign-panel">
    <div class="assign-panel__toolbar">
      <el-button v-permission="'permission-content:create'" type="primary" @click="openForm()">
        新增
      </el-button>
    </div>

    <el-table :data="items" stripe max-height="360">
      <el-table-column
        v-if="!isButtonLike"
        prop="code"
        label="编码"
        min-width="160"
        show-overflow-tooltip
      />
      <el-table-column prop="name" label="名称" min-width="120" />
      <el-table-column
        v-if="type === 'API'"
        prop="path"
        label="api"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column v-if="type === 'API'" prop="method" label="方法" width="80" />
      <el-table-column prop="sort" label="排序" width="70" />
      <el-table-column prop="builtIn" label="内置" width="70">
        <template #default="{ row }">
          <el-tag :type="row.builtIn ? 'warning' : 'info'">
            {{ row.builtIn ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="center" fixed="right">
        <template #default="{ row }">
          <el-button
            v-permission="'permission-content:table-edit'"
            link
            type="primary"
            @click="openForm(row)"
          >
            编辑
          </el-button>
          <el-button
            v-permission="'permission-content:table-delete'"
            link
            type="danger"
            :disabled="row.builtIn"
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <xnDialog
      v-model="formVisible"
      :title="editingId ? `编辑${typeLabel}` : `新增${typeLabel}`"
      width="520px"
      :confirm-loading="submitting"
      confirm-text="保存"
      @confirm="handleSubmit"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item v-if="!isButtonLike" label="编码" prop="code">
          <el-input v-model="form.code" :disabled="editingId !== null" />
        </el-form-item>
        <el-form-item v-if="isButtonLike && !editingId" label="按钮" prop="buttonAction">
          <el-select
            v-model="buttonAction"
            placeholder="请选择按钮"
            style="width: 100%"
            @change="handleButtonActionChange"
          >
            <el-option
              v-for="opt in availableStandardButtons"
              :key="opt.action"
              :label="opt.label"
              :value="opt.action"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-else-if="!isButtonLike" label="名称" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item v-else label="名称" prop="name">
          <el-input v-model="form.name" :disabled="isStandardButtonName(form.name)" />
        </el-form-item>
        <el-form-item v-if="type === 'API'" label="api" prop="path">
          <el-input v-model="form.path" placeholder="/api/roles" />
        </el-form-item>
        <el-form-item v-if="type === 'API'" label="方法" prop="method">
          <el-select v-model="form.method" style="width: 100%">
            <el-option label="GET" value="GET" />
            <el-option label="POST" value="POST" />
            <el-option label="PUT" value="PUT" />
            <el-option label="PATCH" value="PATCH" />
            <el-option label="DELETE" value="DELETE" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
      </el-form>
    </xnDialog>
  </div>
</template>

<script>
import { ElMessage } from 'element-plus'
import { create, remove, update } from '@/api/permission'
import xnDialog from '@/components/xnDialog/xnDialog.vue'

const TOOLBAR_STANDARD_BUTTONS = [
  { label: '新增', action: 'create', sort: 1 },
  { label: '编辑', action: 'update', sort: 2 },
  { label: '查看', action: 'view', sort: 3 },
  { label: '删除', action: 'delete', sort: 4 },
]

const TABLE_STANDARD_BUTTONS = [
  { label: '查看', action: 'table-view', sort: 1 },
  { label: '编辑', action: 'table-edit', sort: 2 },
  { label: '删除', action: 'table-delete', sort: 3 },
  { label: '分配权限', action: 'assign', sort: 4 },
  { label: '添加子级', action: 'add-child', sort: 5 },
]

const typeLabels = {
  MENU: '菜单',
  BUTTON: '按钮',
  API: '接口',
  TABLE_BUTTON: '表格操作列按钮',
}

export default {
  name: 'PermissionAssignPanel',
  components: { xnDialog },
  props: {
    items: { type: Array, required: true },
    type: { type: String, required: true },
    menuId: { type: [Number, String], required: true },
    buttonPrefix: { type: String, default: '' },
  },
  emits: ['changed'],
  data() {
    return {
      formVisible: false,
      submitting: false,
      editingId: null,
      form: {
        code: '',
        name: '',
        type: '',
        parentId: null,
        path: '',
        method: 'GET',
        sort: 0,
        buttonAction: '',
      },
    }
  },
  computed: {
    isButtonLike() {
      return this.type === 'BUTTON' || this.type === 'TABLE_BUTTON'
    },
    standardButtonPool() {
      return this.type === 'TABLE_BUTTON' ? TABLE_STANDARD_BUTTONS : TOOLBAR_STANDARD_BUTTONS
    },
    BUTTON_LABEL_ACTION() {
      return Object.fromEntries(this.standardButtonPool.map((item) => [item.label, item.action]))
    },
    buttonAction: {
      get() {
        return this.form.buttonAction ?? ''
      },
      set(value) {
        this.form.buttonAction = value
      },
    },
    typeLabel() {
      return typeLabels[this.type] ?? this.type
    },
    availableStandardButtons() {
      const existingActions = new Set(
        this.items.map((item) => item.code.split(':').pop()).filter(Boolean),
      )
      return this.standardButtonPool.filter((item) => !existingActions.has(item.action))
    },
    rules() {
      const base = {}
      if (this.type === 'API') {
        base.path = [{ required: true, message: '请输入 api', trigger: 'blur' }]
      } else if (this.isButtonLike && !this.editingId) {
        base.buttonAction = [{ required: true, message: '请选择按钮', trigger: 'change' }]
      } else if (!this.isButtonLike) {
        base.code = [{ required: true, message: '请输入编码', trigger: 'blur' }]
      }
      if (!this.isButtonLike || this.editingId) {
        base.name = [{ required: true, message: '请输入名称', trigger: 'blur' }]
      }
      return base
    },
  },
  methods: {
    buildApiCode(method, path) {
      return `api:${method}:${path}`
    },
    buildButtonCode(action) {
      return `${this.buttonPrefix}:${action}`
    },
    isStandardButtonName(name) {
      return name in this.BUTTON_LABEL_ACTION
    },
    handleButtonActionChange(action) {
      const option = this.standardButtonPool.find((item) => item.action === action)
      if (!option) return
      this.form.name = option.label
      this.form.sort = option.sort
      this.form.code = this.buildButtonCode(action)
    },
    resetForm() {
      this.form.code = ''
      this.form.name = ''
      this.form.type = this.type
      this.form.parentId = this.menuId
      this.form.path = ''
      this.form.method = 'GET'
      this.form.sort = 0
      this.form.buttonAction = ''
      this.editingId = null
      this.$refs.formRef?.clearValidate()
    },
    openForm(row) {
      this.resetForm()
      if (row) {
        this.editingId = row.id
        this.form.code = row.code
        this.form.name = row.name
        this.form.path = row.path ?? ''
        this.form.method = row.method ?? 'GET'
        this.form.sort = row.sort ?? 0
      }
      this.formVisible = true
    },
    async handleSubmit() {
      const formRef = this.$refs.formRef
      if (!formRef) return
      await formRef.validate(async (valid) => {
        if (!valid) return
        this.submitting = true
        try {
          const payload = {
            ...this.form,
            type: this.type,
            parentId: this.menuId,
          }
          if (this.type === 'API') {
            payload.code = this.buildApiCode(this.form.method ?? 'GET', this.form.path ?? '')
          }
          if (this.isButtonLike && this.buttonPrefix) {
            const action =
              this.form.buttonAction ||
              this.form.code.split(':').pop() ||
              this.BUTTON_LABEL_ACTION[this.form.name]
            if (action) {
              payload.code = this.buildButtonCode(action)
            }
          }
          if (this.type !== 'API') {
            delete payload.method
          }
          if (this.isButtonLike) {
            delete payload.path
            delete payload.method
          }
          if (this.editingId) {
            await update(this.editingId, payload)
            ElMessage.success('更新成功')
          } else {
            await create(payload)
            ElMessage.success('创建成功')
          }
          this.formVisible = false
          this.$emit('changed')
        } finally {
          this.submitting = false
        }
      })
    },
    async handleDelete(row) {
      await remove(row.id)
      ElMessage.success('删除成功')
      this.$emit('changed')
    },
  },
}
</script>

<style scoped>
.assign-panel__toolbar {
  margin-bottom: 12px;
}
</style>
