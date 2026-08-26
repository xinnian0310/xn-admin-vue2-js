<template>
  <xnDialog
    v-model="visible"
    :title="dialogTitle"
    width="560px"
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
      <el-form-item label="字典标签" prop="label">
        <el-input v-model="form.label" :disabled="mode === 'view'" />
      </el-form-item>
      <el-form-item label="字典键值" prop="value">
        <el-input v-model="form.value" :disabled="mode === 'view'" />
      </el-form-item>
      <el-form-item label="标签样式" prop="listClass">
        <el-select v-model="form.listClass" clearable placeholder="默认" style="width: 100%">
          <el-option
            v-for="opt in DICT_LIST_CLASS_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <div class="preview-tip">
          预览：
          <el-tag :type="previewType">{{ form.label || '示例' }}</el-tag>
        </div>
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="form.sort" :min="0" />
      </el-form-item>
      <el-form-item label="默认项" prop="isDefault">
        <el-switch v-model="form.isDefault" />
        <span class="form-tip">同一字典下仅一项可设为默认</span>
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
import { get, create, update } from '@/api/dict-data'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import { DICT_LIST_CLASS_OPTIONS } from '@/types'
import { saveDialogTitle } from '@/types/save'

export default {
  name: 'DictDataSave',
  components: { xnDialog },
  props: {
    dictType: { required: true },
  },
  emits: ['success'],
  data() {
    return {
      DICT_LIST_CLASS_OPTIONS,
      visible: false,
      mode: 'add',
      editingId: null,
      submitting: false,
      form: {
        dictType: '',
        label: '',
        value: '',
        sort: 0,
        status: 1,
        isDefault: false,
        listClass: '',
        remark: '',
      },
      rules: {
        label: [{ required: true, message: '请输入字典标签', trigger: 'blur' }],
        value: [{ required: true, message: '请输入字典键值', trigger: 'blur' }],
      },
    }
  },
  computed: {
    dialogTitle() {
      return saveDialogTitle(this.mode, '字典数据')
    },
    previewType() {
      const allowed = ['primary', 'success', 'info', 'warning', 'danger']
      return allowed.includes(this.form.listClass || '') ? this.form.listClass : ''
    },
  },
  methods: {
    resetForm() {
      this.form.dictType = this.dictType
      this.form.label = ''
      this.form.value = ''
      this.form.sort = 0
      this.form.status = 1
      this.form.isDefault = false
      this.form.listClass = ''
      this.form.remark = ''
      this.editingId = null
      this.$refs.formRef?.clearValidate()
    },
    async loadDetail(id) {
      const res = await get(id)
      const data = res.data
      this.form.dictType = data.dictType
      this.form.label = data.label
      this.form.value = data.value
      this.form.sort = data.sort ?? 0
      this.form.status = data.status ?? 1
      this.form.isDefault = !!data.isDefault
      this.form.listClass = data.listClass ?? ''
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
          const payload = { ...this.form, dictType: this.dictType }
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
  margin-left: 12px;
  font-size: 12px;
  color: var(--app-text-muted);
}

.preview-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--app-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
