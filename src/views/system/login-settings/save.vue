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
      label-width="100px"
      :disabled="mode === 'view'"
    >
      <el-form-item label="配置名称" prop="name">
        <el-input v-model="form.name" maxlength="50" placeholder="如：默认登录页" />
      </el-form-item>

      <el-form-item label="启用状态" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">启用</el-radio>
          <el-radio :value="0">未启用</el-radio>
        </el-radio-group>
        <div class="form-tip">同时仅允许启用一套配置；启用时会自动停用其它配置</div>
      </el-form-item>

      <el-form-item label="开启验证" prop="captchaEnabled">
        <el-switch v-model="form.captchaEnabled" />
      </el-form-item>

      <el-form-item v-if="form.captchaEnabled" label="验证类型" prop="captchaType">
        <el-select v-model="form.captchaType" placeholder="请选择" style="width: 100%">
          <el-option label="图形验证码" value="IMAGE" />
          <el-option label="滑块验证" value="SLIDER" />
        </el-select>
      </el-form-item>

      <el-form-item label="备注" prop="remark">
        <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" />
      </el-form-item>
    </el-form>
  </xnDialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import { get, create, update } from '@/api/login-page'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import { saveDialogTitle } from '@/types/save'

export default {
  name: 'LoginPageSave',
  components: { xnDialog },
  emits: ['success'],
  data() {
    return {
      visible: false,
      mode: 'add',
      editingId: null,
      submitting: false,
      form: {
        name: '',
        captchaEnabled: false,
        captchaType: 'IMAGE',
        status: 0,
        remark: '',
      },
    }
  },
  computed: {
    dialogTitle() {
      return saveDialogTitle(this.mode, '登录页配置')
    },
    rules() {
      return {
        name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
        captchaType: [
          {
            validator: (_rule, value, callback) => {
              if (this.form.captchaEnabled && !value) {
                callback(new Error('请选择验证类型'))
                return
              }
              callback()
            },
            trigger: 'change',
          },
        ],
      }
    },
  },
  methods: {
    resetForm() {
      this.form.name = ''
      this.form.captchaEnabled = false
      this.form.captchaType = 'IMAGE'
      this.form.status = 0
      this.form.remark = ''
      this.editingId = null
      this.$refs.formRef?.clearValidate()
    },
    async loadDetail(id) {
      const res = await get(id)
      const data = res.data
      this.form.name = data.name
      this.form.captchaEnabled = !!data.captchaEnabled
      this.form.captchaType = data.captchaType || 'IMAGE'
      this.form.status = data.status ?? 0
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
          const payload = {
            name: this.form.name.trim(),
            captchaEnabled: this.form.captchaEnabled,
            captchaType: this.form.captchaEnabled ? this.form.captchaType || 'IMAGE' : undefined,
            status: this.form.status,
            remark: this.form.remark?.trim() || undefined,
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
  color: var(--el-text-color-secondary);
  line-height: 1.4;
  width: 100%;
}
</style>
