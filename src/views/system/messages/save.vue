<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="820px"
    destroy-on-close
    @closed="handleClosed"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" :disabled="readonly">
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" maxlength="200" show-word-limit placeholder="请输入标题" />
      </el-form-item>
      <el-form-item label="内容" prop="content">
        <xnRichEditor v-model="form.content" :disabled="readonly" height="360px" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ readonly ? '关闭' : '取消' }}</el-button>
      <el-button v-if="!readonly" type="primary" :loading="submitting" @click="handleSubmit">
        保存草稿
      </el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import xnRichEditor from '@/components/xnRichEditor/xnRichEditor.vue'
import { create, get, update } from '@/api/message'
import { saveDialogTitle } from '@/types/save'

export default {
  name: 'MessagesSave',
  components: {
    xnRichEditor,
  },
  emits: ['success'],
  data() {
    return {
      visible: false,
      mode: 'add',
      editingId: null,
      submitting: false,
      form: { title: '', content: '' },
      rules: {
        title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
        content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
      },
    }
  },
  computed: {
    readonly() {
      return this.mode === 'view'
    },
    dialogTitle() {
      return saveDialogTitle(this.mode, '站内信')
    },
  },
  methods: {
    resetForm() {
      this.form.title = ''
      this.form.content = ''
      this.editingId = null
    },
    async open(nextMode, id) {
      this.mode = nextMode
      this.resetForm()
      this.visible = true
      if (id) {
        this.editingId = id
        const res = await get(id)
        this.form.title = res.data.title
        this.form.content = res.data.content
      }
    },
    async handleSubmit() {
      await this.$refs.formRef?.validate()
      this.submitting = true
      try {
        const payload = { title: this.form.title.trim(), content: this.form.content }
        if (this.editingId) {
          await update(this.editingId, payload)
          ElMessage.success('更新成功')
        } else {
          await create(payload)
          ElMessage.success('保存成功')
        }
        this.visible = false
        this.$emit('success')
      } finally {
        this.submitting = false
      }
    },
    handleClosed() {
      this.$refs.formRef?.resetFields()
    },
  },
}
</script>
