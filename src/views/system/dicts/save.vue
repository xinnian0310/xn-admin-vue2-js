<template>
  <xnDialog
    v-model="visible"
    :title="dialogTitle"
    width="520px"
    :show-confirm="mode !== 'view'"
    :confirm-loading="submitting"
    confirm-text="保存"
    :cancel-text="mode === 'view' ? '关闭' : '取消'"
    @confirm="handleSubmit"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="90px"
      :disabled="mode === 'view'"
    >
      <el-form-item label="字典名称" prop="name">
        <el-input v-model="form.name" :disabled="mode === 'view'" />
      </el-form-item>
      <el-form-item label="字典编码" prop="type">
        <el-input
          v-model="form.type"
          :disabled="mode === 'view' || editingBuiltIn"
          placeholder="如 sys_common_status"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">启用</el-radio>
          <el-radio :value="0">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.remark" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
  </xnDialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import { get, create, update } from '@/api/dict-type'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import { saveDialogTitle } from '@/types/save'

export default {
  name: 'DictTypeSave',
  components: { xnDialog },
  emits: ['success'],
  data() {
    return {
      visible: false,
      mode: 'add',
      editingId: null,
      submitting: false,
      editingBuiltIn: false,
      form: {
        name: '',
        type: '',
        status: 1,
        remark: '',
      },
      rules: {
        name: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
        type: [
          { required: true, message: '请输入字典编码', trigger: 'blur' },
          {
            pattern: /^[a-z][a-z0-9_]*$/,
            message: '需以小写字母开头，只能包含小写字母、数字、下划线',
            trigger: 'blur',
          },
        ],
      },
    }
  },
  computed: {
    dialogTitle() {
      return saveDialogTitle(this.mode, '字典')
    },
  },
  methods: {
    resetForm() {
      this.form.name = ''
      this.form.type = ''
      this.form.status = 1
      this.form.remark = ''
      this.editingBuiltIn = false
      this.editingId = null
      this.$refs.formRef?.clearValidate()
    },
    async loadDetail(id) {
      const res = await get(id)
      const data = res.data
      this.editingBuiltIn = !!data.builtIn
      this.form.name = data.name
      this.form.type = data.type
      this.form.status = data.status ?? 1
      this.form.remark = data.remark ?? ''
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
      if (!this.$refs.formRef) return
      await this.$refs.formRef.validate(async (valid) => {
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
