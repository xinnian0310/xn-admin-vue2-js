<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="620px"
    destroy-on-close
    @closed="onClosed"
  >
    <el-form label-width="120px" :disabled="isView">
      <el-form-item label="名称" required>
        <el-input v-model="form.name" maxlength="64" />
      </el-form-item>
      <el-form-item label="标识" required>
        <el-input
          v-model="form.code"
          maxlength="32"
          :disabled="isView || isEdit"
          placeholder="如 deepseek"
        />
      </el-form-item>
      <el-form-item label="图标">
        <el-upload
          v-model:file-list="iconList"
          class="logo-uploader"
          :class="{ 'is-full': iconList.length >= 1 }"
          list-type="picture-card"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          :limit="1"
          :disabled="uploading || isView"
          :http-request="onUploadIcon"
          :on-exceed="onIconExceed"
          :on-remove="onIconRemove"
          :on-preview="onIconPreview"
        >
          <el-icon v-if="!isView"><Plus /></el-icon>
        </el-upload>
        <div v-if="!isView" class="form-tip">
          上传厂商 Logo，仅 1 张，支持 png / jpg / webp / svg
        </div>
      </el-form-item>
      <el-form-item label="Base URL" required>
        <el-input v-model="form.baseUrl" placeholder="https://api.example.com" />
      </el-form-item>
      <el-form-item label="排序">
        <el-input-number v-model="form.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">启用</el-radio>
          <el-radio :value="0">停用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">{{ isView ? '关闭' : '取消' }}</el-button>
      <el-button v-if="!isView" type="primary" :loading="saving" @click="onSave">保存</el-button>
    </template>
  </el-dialog>

  <el-image-viewer
    v-if="iconPreviewVisible && form.icon"
    :url-list="[form.icon]"
    teleported
    @close="iconPreviewVisible = false"
  />
</template>

<script>
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { adminCreateProvider, adminListProviders, adminUpdateProvider } from '@/api/ai/admin'
import { uploadBrandAsset } from '@/api/system-config'
import { isImageSrc } from '@/utils/icons'
import { showCaughtError } from '@/utils/request'
import { saveDialogTitle } from '@/types/save'

export default {
  name: 'AiProviderSave',
  components: { Plus },
  emits: ['success'],
  data() {
    return {
      visible: false,
      mode: 'add',
      editingId: '',
      saving: false,
      uploading: false,
      iconList: [],
      iconPreviewVisible: false,
      form: {
        name: '',
        code: '',
        baseUrl: '',
        icon: '',
        sort: 0,
        status: 1,
      },
    }
  },
  computed: {
    isEdit() {
      return this.mode === 'edit' && !!this.editingId
    },
    isView() {
      return this.mode === 'view'
    },
    dialogTitle() {
      return saveDialogTitle(this.mode, '厂商')
    },
  },
  methods: {
    syncIconList(url = this.form.icon) {
      if (!isImageSrc(url)) {
        this.iconList = []
        return
      }
      this.iconList = [
        {
          name: 'provider-logo',
          url,
          status: 'success',
          uid: Date.now(),
        },
      ]
    },
    resetForm() {
      this.editingId = ''
      this.form.name = ''
      this.form.code = ''
      this.form.baseUrl = ''
      this.form.icon = ''
      this.form.sort = 0
      this.form.status = 1
      this.iconList = []
      this.iconPreviewVisible = false
    },
    onIconExceed() {
      ElMessage.warning('仅允许上传一张图标')
    },
    onIconRemove() {
      this.form.icon = ''
      this.iconList = []
    },
    onIconPreview(file) {
      const url = file.url || this.form.icon
      if (!url) return
      this.form.icon = url
      this.iconPreviewVisible = true
    },
    async onUploadIcon(opt) {
      this.uploading = true
      try {
        const res = await uploadBrandAsset(opt.file)
        const url = res.data?.url
        if (!url) throw new Error('上传失败')
        this.form.icon = url
        this.syncIconList(url)
        ElMessage.success('上传成功')
        opt.onSuccess?.(res)
      } catch (e) {
        this.form.icon = ''
        this.iconList = []
        showCaughtError(e, '上传失败')
        opt.onError?.(e)
      } finally {
        this.uploading = false
      }
    },
    onClosed() {
      this.resetForm()
    },
    async open(openMode, id) {
      this.mode = openMode
      this.resetForm()
      this.editingId = id || ''
      this.visible = true
      if (openMode !== 'add' && id) {
        await this.load()
      }
    },
    async load() {
      if (!this.editingId) return
      const res = await adminListProviders()
      const current = (res.data ?? []).find((p) => p.id === this.editingId)
      if (!current) {
        ElMessage.error('厂商不存在')
        this.visible = false
        return
      }
      this.form.name = current.name
      this.form.code = current.code
      this.form.baseUrl = current.baseUrl
      this.form.icon = current.icon || ''
      this.form.sort = current.sort
      this.form.status = current.status
      this.syncIconList(this.form.icon)
    },
    async onSave() {
      if (!this.form.name || !this.form.code || !this.form.baseUrl) {
        ElMessage.warning('请填写名称、标识和 Base URL')
        return
      }
      const payload = {
        name: this.form.name,
        code: this.form.code,
        baseUrl: this.form.baseUrl,
        icon: this.form.icon,
        sort: this.form.sort,
        status: this.form.status,
      }
      this.saving = true
      try {
        if (this.isEdit) {
          await adminUpdateProvider(this.editingId, payload)
          ElMessage.success('已保存')
        } else {
          await adminCreateProvider(payload)
          ElMessage.success('已创建')
        }
        this.visible = false
        this.$emit('success')
      } finally {
        this.saving = false
      }
    },
  },
}
</script>

<style scoped>
.form-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}
.logo-uploader :deep(.el-upload--picture-card),
.logo-uploader :deep(.el-upload-list__item) {
  width: 80px;
  height: 80px;
}
.logo-uploader.is-full :deep(.el-upload--picture-card) {
  display: none;
}
</style>
