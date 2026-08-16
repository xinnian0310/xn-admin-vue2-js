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
        <el-input
          v-model="form.title"
          maxlength="200"
          show-word-limit
          placeholder="请输入公告标题"
        />
      </el-form-item>
      <el-form-item label="内容" prop="content">
        <xnRichEditor v-model="form.content" :disabled="readonly" height="360px" />
      </el-form-item>
      <el-form-item label="附件">
        <div class="attachment-field">
          <xnUpload
            v-if="!readonly"
            ref="uploaderRef"
            :limit="remainingSlots"
            :disabled="remainingSlots <= 0"
            :max-size="maxAttachmentSize"
            @success="handleUploaded"
          />
          <div v-if="form.attachments.length" class="attachment-field__list">
            <div
              v-for="(item, index) in form.attachments"
              :key="item.path"
              class="attachment-field__row"
            >
              <el-link
                type="primary"
                :href="resolveAttachmentUrl(item.path)"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ item.name }}
              </el-link>
              <span class="attachment-field__meta">
                {{ item.size != null ? formatBytes(item.size) : '—' }} ·
                {{ formatDateTime(item.uploadedAt) }}
              </span>
              <button
                type="button"
                class="attachment-field__action"
                @click="openKkFileViewPreview(item.path, item.name)"
              >
                查看
              </button>
              <el-button v-if="!readonly" link type="danger" @click="removeAttachment(index)">
                移除
              </el-button>
            </div>
          </div>
          <div v-else-if="readonly" class="attachment-field__empty">无附件</div>
        </div>
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
import xnUpload from '@/components/xnUpload/xnUpload.vue'
import { create, get, update } from '@/api/notice'
import { resolveAttachmentUrl } from '@/config/app'
import { openKkFileViewPreview } from '@/utils/kk-file-view'
import { saveDialogTitle } from '@/types/save'
import {
  MAX_ATTACHMENT_COUNT,
  MAX_ATTACHMENT_SIZE,
  insertAttachmentByOrder,
  resolveAttachments,
  seedAttachmentOrders,
  toAttachmentItem,
  toAttachmentPayload,
} from '@/utils/attachment'
import { formatBytes } from '@/utils/upload/format'
import { formatDateTime } from '@/utils/datetime'

export default {
  name: 'NoticesSave',
  components: {
    xnRichEditor,
    xnUpload,
  },
  emits: ['success'],
  data() {
    return {
      visible: false,
      mode: 'add',
      editingId: null,
      submitting: false,
      maxAttachmentSize: MAX_ATTACHMENT_SIZE,
      pathOrder: new Map(),
      orderBase: 0,
      form: {
        title: '',
        content: '',
        attachments: [],
      },
      rules: {
        title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
        content: [
          {
            validator: (_rule, value, callback) => {
              const text = String(value || '')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .trim()
              if (!text) callback(new Error('请输入内容'))
              else callback()
            },
            trigger: 'blur',
          },
        ],
      },
    }
  },
  computed: {
    readonly() {
      return this.mode === 'view'
    },
    dialogTitle() {
      return saveDialogTitle(this.mode, '公告')
    },
    remainingSlots() {
      return Math.max(0, MAX_ATTACHMENT_COUNT - this.form.attachments.length)
    },
  },
  methods: {
    resolveAttachmentUrl,
    openKkFileViewPreview,
    formatBytes,
    formatDateTime,
    resetForm() {
      this.form.title = ''
      this.form.content = ''
      this.form.attachments = []
      this.editingId = null
      seedAttachmentOrders([], this.pathOrder)
      this.orderBase = 0
    },
    removeAttachment(index) {
      this.form.attachments.splice(index, 1)
    },
    handleUploaded(file, task) {
      if (this.form.attachments.some((item) => item.path === file.path)) {
        this.$refs.uploaderRef?.clearSettled()
        return
      }
      if (this.form.attachments.length >= MAX_ATTACHMENT_COUNT) {
        ElMessage.warning(`最多上传 ${MAX_ATTACHMENT_COUNT} 个附件`)
        this.$refs.uploaderRef?.clearSettled()
        return
      }
      const order = this.orderBase + (task?.queueIndex ?? this.form.attachments.length + 1)
      this.form.attachments = insertAttachmentByOrder(
        this.form.attachments,
        toAttachmentItem(file),
        order,
        this.pathOrder,
      )
      this.$refs.uploaderRef?.clearSettled()
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
        this.form.attachments = resolveAttachments(res.data)
        seedAttachmentOrders(this.form.attachments, this.pathOrder)
        this.orderBase = this.form.attachments.length
      }
    },
    async handleSubmit() {
      await this.$refs.formRef?.validate()
      this.submitting = true
      try {
        const payload = {
          title: this.form.title.trim(),
          content: this.form.content,
          ...toAttachmentPayload(this.form.attachments),
        }
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
      this.resetForm()
    },
  },
}
</script>

<style scoped>
.attachment-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.attachment-field__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: calc(32px * 4 + 6px * 3);
  overflow-y: auto;
}

.attachment-field__row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 32px;
  flex-shrink: 0;
}

.attachment-field__meta {
  color: var(--app-text-muted, #909399);
  font-size: 12px;
  flex-shrink: 0;
}

.attachment-field__action {
  border: 0;
  background: none;
  padding: 0;
  color: var(--el-color-primary);
  cursor: pointer;
  font-size: inherit;
  line-height: inherit;
  flex-shrink: 0;
}

.attachment-field__action:hover {
  color: var(--el-color-primary-light-3);
}

.attachment-field__empty {
  color: var(--app-text-muted, #909399);
  font-size: 13px;
}
</style>
