<template>
  <el-dialog v-model="visible" :title="dialogTitle" width="560px" destroy-on-close @closed="reset">
    <el-form label-width="110px">
      <el-form-item label="厂商" required>
        <el-select
          v-model="providerId"
          placeholder="选择厂商"
          style="width: 100%"
          :disabled="isEdit"
        >
          <el-option v-for="p in selectableProviders" :key="p.id" :label="p.name" :value="p.id">
            <span class="opt-with-icon">
              <img v-if="isImageSrc(p.icon)" :src="p.icon" class="provider-logo" alt="" />
              <span>{{ p.name }}</span>
            </span>
          </el-option>
        </el-select>
        <div v-if="current?.docUrl" class="hint">
          申请密钥：<a :href="current.docUrl" target="_blank" rel="noreferrer">{{
            current.docUrl
          }}</a>
        </div>
      </el-form-item>
      <el-form-item label="模型" required>
        <el-select
          v-model="form.providerModelId"
          placeholder="选择模型"
          style="width: 100%"
          :disabled="isEdit"
        >
          <el-option
            v-for="m in current?.models ?? []"
            :key="m.id"
            :label="m.displayName || m.modelId"
            :value="m.id"
          />
        </el-select>
        <div v-if="selectedModel" class="hint">
          上下文窗口 {{ selectedModel.contextTokens }} tokens（目录只读） · 默认预算
          {{ selectedModel.defaultBudgetTokens || 16000 }}
        </div>
      </el-form-item>
      <el-form-item label="别名">
        <el-input v-model="form.name" placeholder="可选，不填则用目录展示名" maxlength="64" />
      </el-form-item>
      <el-form-item label="最大输出">
        <el-input-number
          v-model="form.maxOutputTokens"
          :min="1"
          :max="selectedModel?.defaultMaxOutput || 4096"
        />
      </el-form-item>
      <el-form-item label="计费预算">
        <el-input-number v-model="form.budgetTokens" :min="1" :max="128000" />
      </el-form-item>
      <el-form-item label="超时（秒）">
        <el-input-number v-model="form.timeoutSeconds" :min="5" :max="300" />
      </el-form-item>
    </el-form>
    <el-alert type="info" :closable="false" show-icon>
      <template #title
        >目录里没有想用的厂商时，请联系超管在「厂商目录」中添加。员工侧不能填写任何地址。</template
      >
      <div v-if="contactLine" class="hint">{{ contactLine }}</div>
    </el-alert>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button v-if="isEdit" :loading="testing" @click="onTest">探测连通性</el-button>
      <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import { createModel, listModels, listProviders, testModel, updateModel } from '@/api/ai/model'
import { getPublicSiteContact } from '@/api/site-contact'
import { isImageSrc } from '@/utils/icons'
import { saveDialogTitle } from '@/types/save'

export default {
  name: 'AiModelSave',
  emits: ['success'],
  data() {
    return {
      visible: false,
      mode: 'add',
      editingId: '',
      providers: [],
      providerId: '',
      saving: false,
      testing: false,
      contactLine: '',
      form: {
        providerModelId: '',
        name: '',
        maxOutputTokens: 4096,
        budgetTokens: 16000,
        temperature: 0.7,
        timeoutSeconds: 120,
      },
    }
  },
  computed: {
    isEdit() {
      return this.mode === 'edit' && !!this.editingId
    },
    dialogTitle() {
      return saveDialogTitle(this.mode, '模型')
    },
    selectableProviders() {
      if (this.isEdit) return this.providers
      return this.providers.filter((p) => p.keyConfigured)
    },
    current() {
      return (
        this.selectableProviders.find((p) => p.id === this.providerId) ||
        this.providers.find((p) => p.id === this.providerId)
      )
    },
    selectedModel() {
      return this.current?.models.find((m) => m.id === this.form.providerModelId)
    },
  },
  watch: {
    providerId(next, prev) {
      if (prev && next !== prev && !this.isEdit) {
        this.form.providerModelId = ''
      }
    },
    selectedModel(m) {
      if (!m || this.isEdit) return
      this.form.maxOutputTokens = m.defaultMaxOutput
      this.form.budgetTokens = m.defaultBudgetTokens || 16000
    },
  },
  methods: {
    isImageSrc,
    reset() {
      this.editingId = ''
      this.providerId = ''
      this.form.providerModelId = ''
      this.form.name = ''
      this.form.maxOutputTokens = 4096
      this.form.budgetTokens = 16000
      this.form.temperature = 0.7
      this.form.timeoutSeconds = 120
    },
    async open(openMode, id, preset) {
      this.mode = openMode
      this.reset()
      this.editingId = id || ''
      const [provRes] = await Promise.all([listProviders(), this.loadContact()])
      this.providers = provRes.data ?? []
      this.visible = true
      if (openMode !== 'add' && id) {
        await this.loadDetail(id)
        return
      }
      if (preset?.providerId && this.providers.some((p) => p.id === preset.providerId)) {
        this.providerId = preset.providerId
      } else if (this.providers.length === 1) {
        this.providerId = this.providers[0].id
      }
      if (preset?.providerModelId) {
        this.form.providerModelId = preset.providerModelId
      }
    },
    async loadContact() {
      try {
        const contact = await getPublicSiteContact()
        this.contactLine = (contact.data?.contacts || [])
          .slice(0, 3)
          .map((c) => `${c.label} ${c.value || ''}`.trim())
          .filter(Boolean)
          .join(' · ')
      } catch {
        this.contactLine = ''
      }
    },
    async loadDetail(id) {
      const list = await listModels()
      const mine = list.data?.mine.find((m) => m.id === id)
      if (!mine) {
        ElMessage.error('模型不存在或无权查看')
        this.visible = false
        return
      }
      const provider = this.providers.find((p) =>
        p.models.some((m) => m.id === mine.providerModelId),
      )
      this.providerId = provider?.id || ''
      this.form.providerModelId = mine.providerModelId
      this.form.name = mine.name
      this.form.maxOutputTokens = mine.maxOutputTokens
      this.form.budgetTokens = mine.budgetTokens ?? undefined
      this.form.temperature = mine.temperature
      this.form.timeoutSeconds = mine.timeoutSeconds
    },
    async onSave() {
      if (!this.form.providerModelId) {
        ElMessage.warning('请选择模型')
        return
      }
      this.saving = true
      try {
        if (this.isEdit) {
          await updateModel(this.editingId, {
            providerModelId: this.form.providerModelId,
            name: this.form.name,
            maxOutputTokens: this.form.maxOutputTokens,
            budgetTokens: this.form.budgetTokens,
            temperature: this.form.temperature,
            timeoutSeconds: this.form.timeoutSeconds,
          })
          ElMessage.success('已保存')
        } else {
          const catalog = this.selectedModel
          if (!this.providerId || !catalog) {
            ElMessage.warning('请选择模型')
            return
          }
          await createModel({
            providerId: this.providerId,
            modelId: catalog.modelId,
            name: this.form.name,
            maxOutputTokens: this.form.maxOutputTokens,
            budgetTokens: this.form.budgetTokens,
            temperature: this.form.temperature,
            timeoutSeconds: this.form.timeoutSeconds,
          })
          ElMessage.success('已添加')
        }
        this.visible = false
        this.$emit('success')
      } finally {
        this.saving = false
      }
    },
    async onTest() {
      this.testing = true
      try {
        const res = await testModel(this.editingId)
        if (res.data?.ok) {
          ElMessage.success(`连通正常，耗时 ${res.data.latencyMs} ms`)
        } else {
          ElMessage.error(res.data?.message || '探测失败')
        }
      } finally {
        this.testing = false
      }
    },
  },
}
</script>

<style scoped>
.hint {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.opt-with-icon {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.provider-logo {
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 3px;
  flex-shrink: 0;
}
</style>
