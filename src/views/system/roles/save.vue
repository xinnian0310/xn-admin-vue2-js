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
      label-width="100px"
      :disabled="mode === 'view'"
    >
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" :disabled="mode === 'view' || editingBuiltIn" />
      </el-form-item>
      <el-form-item label="编码" prop="code">
        <el-input v-model="form.code" :disabled="mode === 'view' || editingBuiltIn" />
      </el-form-item>
      <el-form-item label="数据权限" prop="dataScope">
        <el-select
          v-model="form.dataScope"
          style="width: 100%"
          :disabled="mode === 'view' || isSuperAdminRole"
        >
          <el-option
            v-for="opt in dataScopeOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <div class="form-tip">
          {{ isSuperAdminRole ? '超级管理员固定为全部数据' : '多角色取最宽范围；默认本单位及下级' }}
        </div>
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
import { create, get, update } from '@/api/role'
import { saveDialogTitle } from '@/types/save'

const dataScopeOptions = [
  { value: 'ALL', label: '全部数据' },
  { value: 'UNIT_AND_CHILDREN', label: '本单位及下级' },
  { value: 'UNIT', label: '仅本单位' },
  { value: 'SELF', label: '仅本人' },
]

export default {
  name: 'RolesSave',
  emits: ['success'],
  data() {
    return {
      dataScopeOptions,
      visible: false,
      mode: 'add',
      editingId: null,
      submitting: false,
      editingBuiltIn: false,
      editingCode: '',
      form: {
        name: '',
        code: '',
        description: '',
        dataScope: 'UNIT_AND_CHILDREN',
      },
      rules: {
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
        dataScope: [{ required: true, message: '请选择数据权限', trigger: 'change' }],
      },
    }
  },
  computed: {
    dialogTitle() {
      return saveDialogTitle(this.mode, '角色')
    },
    isSuperAdminRole() {
      return this.editingCode === 'SUPER_ADMIN'
    },
  },
  methods: {
    resetForm() {
      this.form.code = ''
      this.form.name = ''
      this.form.description = ''
      this.form.dataScope = 'UNIT_AND_CHILDREN'
      this.editingBuiltIn = false
      this.editingCode = ''
      this.editingId = null
      this.$refs.formRef?.clearValidate()
    },
    async loadDetail(id) {
      const res = await get(id)
      this.editingBuiltIn = res.data.builtIn
      this.editingCode = res.data.code
      this.form.code = res.data.code
      this.form.name = res.data.name
      this.form.description = res.data.description ?? ''
      this.form.dataScope =
        res.data.dataScope || (res.data.code === 'SUPER_ADMIN' ? 'ALL' : 'UNIT_AND_CHILDREN')
    },
    async open(openMode, id) {
      this.mode = openMode
      this.resetForm()
      this.editingId = id ?? null
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
            dataScope: this.isSuperAdminRole ? 'ALL' : this.form.dataScope,
          }
          if (this.mode === 'edit' && this.editingId) {
            await update(this.editingId, payload)
            ElMessage.success('更新成功')
          } else {
            await create(payload)
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
  color: var(--app-text-muted, #909399);
  line-height: 1.4;
}
</style>
