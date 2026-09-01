<template>
  <el-dialog v-model="visible" title="配置密钥" width="480px" destroy-on-close @closed="reset">
    <p v-if="provider" class="key-save__hint">
      为「{{ provider.name }}」保存你自己的 API Key。密钥加密入库，页面只显示掩码，不会回显明文。
    </p>
    <el-form label-width="90px" @submit.prevent="onSave">
      <el-form-item label="当前密钥">
        <span class="key-save__mask">{{ provider?.keyMask || '未配置' }}</span>
      </el-form-item>
      <el-form-item label="API Key" required>
        <div class="key-save__field">
          <el-input
            v-model="apiKey"
            type="password"
            show-password
            autocomplete="new-password"
            :placeholder="provider?.keyHint || '填入该厂商的 API Key'"
            @keyup.enter="onSave"
          />
          <p v-if="provider?.docUrl" class="key-save__doc">
            <a :href="provider.docUrl" target="_blank" rel="noreferrer">申请密钥</a>
          </p>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import { saveProviderCredential } from '@/api/ai/model'
import { showCaughtError } from '@/utils/request'

export default {
  name: 'AiProviderKeySave',
  emits: ['success'],
  data() {
    return {
      visible: false,
      saving: false,
      apiKey: '',
      provider: null,
    }
  },
  methods: {
    reset() {
      this.apiKey = ''
      this.provider = null
    },
    open(row) {
      this.reset()
      this.provider = row
      this.visible = true
    },
    async onSave() {
      if (!this.provider) return
      const trimmed = this.apiKey.trim()
      if (!trimmed) {
        ElMessage.warning('请填写 API Key')
        return
      }
      this.saving = true
      try {
        await saveProviderCredential(this.provider.id, trimmed)
        ElMessage.success('密钥已保存')
        this.visible = false
        this.$emit('success')
      } catch (e) {
        showCaughtError(e, '保存失败')
      } finally {
        this.saving = false
      }
    },
  },
}
</script>

<style scoped>
.key-save__hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
.key-save__field {
  width: 100%;
}
.key-save__doc {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}
.key-save__mask {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.key-save__doc a {
  color: var(--el-color-primary);
  text-decoration: none;
}
.key-save__doc a:hover {
  text-decoration: underline;
}
</style>
