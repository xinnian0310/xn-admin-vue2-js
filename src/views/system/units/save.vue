<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="560px"
    destroy-on-close
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
      :disabled="mode === 'view'"
    >
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" :disabled="mode === 'view' || editingBuiltIn" />
      </el-form-item>
      <el-form-item label="编码" prop="code">
        <el-input v-model="form.code" :disabled="mode === 'view' || editingBuiltIn" />
      </el-form-item>
      <el-form-item label="上级单位" prop="parentId">
        <el-tree-select
          v-model="form.parentId"
          :data="parentOptions"
          :props="{ label: 'name', value: 'id', children: 'children' }"
          check-strictly
          clearable
          placeholder="无（顶级）"
          style="width: 100%"
          :disabled="mode === 'view' || editingBuiltIn"
        />
      </el-form-item>
      <el-form-item label="默认角色" prop="roleIds">
        <el-select
          v-model="form.roleIds"
          multiple
          clearable
          filterable
          placeholder="单位下用户自动继承"
          style="width: 100%"
        >
          <el-option v-for="r in availableRoles" :key="r.id" :label="r.name" :value="r.id" />
        </el-select>
        <div class="form-tip">绑定后，该单位用户无需再单独分配这些角色</div>
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="form.sort" :min="0" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="form.status" :disabled="editingBuiltIn">
          <el-radio :value="1">启用</el-radio>
          <el-radio :value="0">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ mode === 'view' ? '关闭' : '取消' }}</el-button>
      <el-button v-if="mode !== 'view'" type="primary" :loading="submitting" @click="handleSubmit"
        >保存</el-button
      >
    </template>
  </el-dialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import { useCrudApi } from '@/composables/useCrudApi'
import { list as listUnits } from '@/api/unit'
import { getOptions as getRoleOptions } from '@/api/role'
import { usePermission } from '@/directives/permission'
import { saveDialogTitle } from '@/types/save'

export default {
  name: 'UnitsSave',
  emits: ['success'],
  setup() {
    const api = useCrudApi()
    const { isSuperAdmin } = usePermission()
    return { api, isSuperAdmin }
  },
  data() {
    return {
      visible: false,
      mode: 'add',
      editingId: null,
      submitting: false,
      editingBuiltIn: false,
      parentOptions: [],
      roleOptions: [],
      form: {
        code: '',
        name: '',
        parentId: undefined,
        description: '',
        sort: 0,
        status: 1,
        roleIds: [],
      },
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
      },
    }
  },
  computed: {
    dialogTitle() {
      return saveDialogTitle(this.mode, '单位')
    },
    availableRoles() {
      return this.isSuperAdmin
        ? this.roleOptions
        : this.roleOptions.filter((r) => r.code !== 'SUPER_ADMIN')
    },
  },
  methods: {
    resetForm() {
      this.form.code = ''
      this.form.name = ''
      this.form.parentId = undefined
      this.form.description = ''
      this.form.sort = 0
      this.form.status = 1
      this.form.roleIds = []
      this.editingBuiltIn = false
      this.editingId = null
      this.$refs.formRef?.clearValidate()
    },
    excludeSelf(nodes, selfId) {
      return nodes
        .filter((n) => n.id !== selfId)
        .map((n) => ({
          ...n,
          children: n.children?.length ? this.excludeSelf(n.children, selfId) : [],
        }))
    },
    async loadParents(selfId) {
      const res = await listUnits()
      this.parentOptions = this.excludeSelf(res.data || [], selfId)
    },
    async loadRoles() {
      if (this.roleOptions.length) return
      const res = await getRoleOptions()
      this.roleOptions = res.data || []
    },
    async loadDetail(id) {
      const res = await this.api.get(id)
      const data = res.data
      this.editingBuiltIn = !!data.builtIn
      this.form.code = data.code
      this.form.name = data.name
      this.form.parentId = data.parentId ?? undefined
      this.form.description = data.description ?? ''
      this.form.sort = data.sort ?? 0
      this.form.status = data.status ?? 1
      this.form.roleIds = data.roleIds?.length ? [...data.roleIds] : (data.roleList || []).map((r) => r.id)
    },
    async open(openMode, id, options) {
      this.mode = openMode
      this.resetForm()
      this.editingId = id ?? null
      await Promise.all([this.loadParents(id ?? null), this.loadRoles()])
      if (options?.parentId != null) {
        this.form.parentId = options.parentId
      }
      this.visible = true
      if (openMode !== 'add' && id) {
        await this.loadDetail(id)
      }
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
            parentId: this.form.parentId ?? null,
            roleIds: this.form.roleIds || [],
          }
          if (this.mode === 'edit' && this.editingId) {
            await this.api.update(this.editingId, payload)
            ElMessage.success('更新成功')
          } else {
            await this.api.create(payload)
            ElMessage.success('创建成功')
          }
          this.visible = false
          this.$emit('success')
        } finally {
          this.submitting = false
        }
      })
    },
    handleClosed() {
      this.resetForm()
    },
  },
}
</script>

<style scoped>
.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--app-text-muted);
  line-height: 1.4;
}
</style>
