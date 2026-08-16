<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="480px"
    destroy-on-close
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="88px"
      :disabled="mode === 'view'"
    >
      <el-form-item label="名称">
        <el-input :model-value="form.label" disabled />
        <div class="form-tip">名称固定，仅可更换二维码图片</div>
      </el-form-item>
      <el-form-item label="二维码" prop="src">
        <el-upload
          v-model:file-list="fileList"
          class="qr-uploader"
          :class="{ 'is-full': fileList.length >= 1 }"
          list-type="picture-card"
          accept="image/png,image/jpeg,image/webp"
          :limit="1"
          :disabled="mode === 'view' || uploading"
          :http-request="handleUpload"
          :on-exceed="onExceed"
          :on-remove="onRemove"
          :on-preview="onPreview"
        >
          <el-icon><Plus /></el-icon>
        </el-upload>
        <div class="form-tip">仅可上传 1 张，支持 png / jpg / webp，建议正方形清晰图</div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">{{ mode === 'view' ? '关闭' : '取消' }}</el-button>
      <el-button v-if="mode !== 'view'" type="primary" :loading="uploading" @click="handleSubmit">
        确定
      </el-button>
    </template>
  </el-dialog>

  <el-image-viewer
    v-if="previewVisible"
    :url-list="[form.src]"
    teleported
    @close="previewVisible = false"
  />
</template>

<script>
import { ElMessage } from 'element-plus'
import { markRaw } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { uploadDonationQrcode } from '@/api/site-contact'
import { showCaughtError } from '@/utils/request'
import { saveDialogTitle } from '@/types/save'

export default {
  name: 'SiteDonationQrSave',
  emits: ['success'],
  setup() {
    return { Plus: markRaw(Plus) }
  },
  data() {
    return {
      visible: false,
      previewVisible: false,
      mode: 'add',
      editingIndex: null,
      uploading: false,
      fileList: [],
      form: {
        label: '',
        src: '',
      },
      rules: {
        src: [{ required: true, message: '请上传二维码图片', trigger: 'change' }],
      },
    }
  },
  computed: {
    dialogTitle() {
      return saveDialogTitle(this.mode, '捐赠二维码')
    },
  },
  methods: {
    syncFileList(src) {
      if (!src) {
        this.fileList = []
        return
      }
      this.fileList = [
        {
          name: 'donation-qrcode',
          url: src,
          status: 'success',
          uid: Date.now(),
        },
      ]
    },
    resetForm() {
      this.form.label = ''
      this.form.src = ''
      this.editingIndex = null
      this.fileList = []
      this.previewVisible = false
      this.$refs.formRef?.clearValidate()
    },
    open(openMode, row, index) {
      this.mode = openMode
      this.resetForm()
      if (row) {
        this.form.label = row.label || ''
        this.form.src = row.src || ''
        this.editingIndex = index ?? null
        this.syncFileList(this.form.src)
      }
      this.visible = true
    },
    onExceed() {
      ElMessage.warning('仅允许上传一张二维码图片')
    },
    onRemove() {
      this.form.src = ''
      this.fileList = []
      this.$refs.formRef?.validateField('src')
    },
    onPreview() {
      if (this.form.src) {
        this.previewVisible = true
      }
    },
    async handleUpload(opt) {
      this.uploading = true
      try {
        const res = await uploadDonationQrcode(opt.file)
        this.form.src = res.data.url
        this.syncFileList(this.form.src)
        ElMessage.success('上传成功')
        this.$refs.formRef?.validateField('src')
        opt.onSuccess?.(res)
      } catch (e) {
        this.form.src = ''
        this.fileList = []
        showCaughtError(e, '上传失败')
        opt.onError?.(e)
      } finally {
        this.uploading = false
      }
    },
    async handleSubmit() {
      if (!this.$refs.formRef) return
      await this.$refs.formRef.validate((valid) => {
        if (!valid) return
        this.$emit('success', {
          mode: this.mode,
          index: this.editingIndex,
          data: {
            label: this.form.label.trim(),
            src: this.form.src.trim(),
          },
        })
        this.visible = false
      })
    },
    handleClosed() {
      this.resetForm()
    },
  },
}
</script>

<style scoped>
.qr-uploader :deep(.el-upload--picture-card),
.qr-uploader :deep(.el-upload-list__item) {
  width: 120px;
  height: 120px;
}

/* 已有图片时隐藏加号上传框 */
.qr-uploader.is-full :deep(.el-upload--picture-card) {
  display: none;
}

.form-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
  width: 100%;
}
</style>
