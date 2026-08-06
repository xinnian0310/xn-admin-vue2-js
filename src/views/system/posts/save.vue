<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="520px"
    destroy-on-close
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="90px"
      :disabled="mode === 'view'"
    >
      <el-form-item label="岗位名称" prop="name">
        <el-input v-model="form.name" maxlength="50" />
      </el-form-item>
      <el-form-item label="岗位编码" prop="code">
        <el-input
          v-model="form.code"
          :disabled="mode === 'view' || editingBuiltIn"
          maxlength="50"
          placeholder="如 manager"
        />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="form.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">启用</el-radio>
          <el-radio :value="0">停用</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="200" />
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
import { create, get, update } from '@/api/post'
import { saveDialogTitle } from '@/types/save'

export default {
  name: 'PostSave',
  emits: ['success'],
  data() {
    return {
      visible: false,
      mode: 'add',
      editingId: null,
      submitting: false,
      editingBuiltIn: false,
      form: {
        code: '',
        name: '',
        sort: 0,
        status: 1,
        remark: '',
      },
      rules: {
        name: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }],
        code: [
          { required: true, message: '请输入岗位编码', trigger: 'blur' },
          {
            pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
            message: '需以字母开头，只能包含字母、数字、下划线',
            trigger: 'blur',
          },
        ],
      },
    }
  },
  computed: {
    dialogTitle() {
      return saveDialogTitle(this.mode, '岗位')
    },
  },
  methods: {
    resetForm() {
      this.form.code = ''
      this.form.name = ''
      this.form.sort = 0
      this.form.status = 1
      this.form.remark = ''
      this.editingBuiltIn = false
      this.editingId = null
      this.$refs.formRef?.clearValidate()
    },
    async loadDetail(id) {
      const res = await get(id)
      this.editingBuiltIn = !!res.data.builtIn
      this.form.code = res.data.code
      this.form.name = res.data.name
      this.form.sort = res.data.sort ?? 0
      this.form.status = res.data.status ?? 1
      this.form.remark = res.data.remark ?? ''
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
          if (this.mode === 'edit' && this.editingId) {
            await update(this.editingId, this.form)
            ElMessage.success('更新成功')
          } else {
            await create(this.form)
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
