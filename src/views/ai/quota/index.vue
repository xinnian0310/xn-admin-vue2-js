<template>
  <div class="page-card quota-page">
    <div class="page-header">
      <h2 class="page-title">配额</h2>
    </div>

    <el-tabs v-model="activeTab" tab-position="left" class="quota-tabs">
      <el-tab-pane label="配额" name="quota">
        <p class="lead">
          SuperAdmin
          把自己已添加、且已配置密钥的模型共享给其他角色试用。对话下拉里显示为「模型名（试用）」，调用走你的
          API Key。下面是全局默认额度，未单独配置的用户都走这里。
        </p>
        <el-form label-width="140px" class="trial-form">
          <el-form-item label="启用试用">
            <el-switch v-model="trial.enabled" />
          </el-form-item>
          <el-form-item label="共享模型" required>
            <el-cascader
              :model-value="sourceModelId || undefined"
              :options="shareableCascader"
              :props="cascaderProps"
              :disabled="!trial.enabled"
              filterable
              clearable
              placeholder="先选厂商，再选模型"
              style="width: 360px"
              @update:model-value="onPickShareModel"
            >
              <template #default="{ data }">
                <span class="cascader-opt">
                  <img v-if="isImageSrc(data.icon)" :src="data.icon" class="cascader-logo" alt="" />
                  <span>{{ data.label }}</span>
                </span>
              </template>
            </el-cascader>
            <div class="hint">没有可选模型时，请先在「厂商目录」配置密钥，再在「模型」中添加。</div>
          </el-form-item>
          <el-form-item label="每用户每月">
            <el-input-number
              v-model="trial.defaultQuota.monthlyAmount"
              :min="0.01"
              :step="0.1"
              :precision="4"
            />
            <span class="hint inline">元，可在「用户额度」单独覆盖</span>
          </el-form-item>
          <el-form-item label="每用户每日">
            <el-input-number
              v-model="trial.defaultQuota.dailyAmount"
              :min="0"
              :step="0.1"
              :precision="4"
            />
            <span class="hint inline">留空或不填表示不限</span>
          </el-form-item>
          <el-form-item label="每用户并发">
            <el-input-number v-model="trial.defaultQuota.maxConcurrency" :min="1" :max="20" />
          </el-form-item>
          <el-form-item label="超额提示">
            <el-input
              v-model="settings.quotaExceededTip"
              maxlength="255"
              style="max-width: 520px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="onSaveTrial"
              >保存试用设置</el-button
            >
            <el-button :loading="testing" :disabled="!sourceModelId" @click="onTest"
              >探测连通性</el-button
            >
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <el-tab-pane label="用户额度" name="users">
        <div class="quota-users">
          <p class="lead">
            为单个用户单独配置月额、日额、并发和试用开关，会覆盖「配额」里的默认值。取消覆盖后回落到全局默认。
          </p>
          <div class="overview">
            <el-statistic
              title="本月试用总花费"
              :value="Number(summary.totalCost || 0)"
              :precision="4"
              suffix="元"
            />
            <el-statistic title="产生费用人数" :value="summary.userCount || 0" suffix="人" />
            <el-statistic title="试用请求数" :value="summary.requestCount || 0" />
            <el-statistic
              title="估算占比"
              :value="Math.round((summary.estimatedRatio || 0) * 100)"
              suffix="%"
            />
          </div>
          <xnPageLayout class="quota-users-layout" :loading="loading">
            <template #search>
              <xnSearch :search-item="searchItems" @query-form="inquires" @reset="reset">
                <template #button>
                  <el-date-picker
                    v-model="month"
                    type="month"
                    value-format="YYYY-MM"
                    placeholder="导出月份"
                    style="width: 140px; margin-left: 8px"
                  />
                </template>
              </xnSearch>
            </template>
            <template #toolbar>
              <xnButton :list-item="buttonItems" @button-click="onToolbar" />
            </template>
            <template #table>
              <xnTable
                v-model:page="page"
                v-model:page-size="size"
                :data="rows"
                :total="total"
                :loading="loading"
                table-key="ai:quota-users"
                entity-name="用户"
                name-field="username"
                row-key="userId"
                :columns="columns"
                :action-items="tableButtonItems"
                @page-change="reload"
              >
                <template #usage="{ row }">
                  {{ formatMoney(row.monthlyUsed) }} / {{ formatMoney(row.monthlyLimit) }} 元
                </template>
                <template #tokens="{ row }">
                  入 {{ row.promptTokens }} / 出 {{ row.completionTokens }}
                </template>
                <template #ratio="{ row }">
                  {{ Math.round((row.estimatedRatio || 0) * 100) }}%
                </template>
                <template #actions="{ row }">
                  <xnTableActions
                    :items="tableActionsFor(row)"
                    :row="row"
                    @action-click="onTableAction"
                  />
                </template>
              </xnTable>
            </template>
          </xnPageLayout>
        </div>
      </el-tab-pane>

      <el-tab-pane label="限额与安全" name="safety">
        <el-form label-width="140px" style="max-width: 720px">
          <el-form-item label="系统提示词">
            <el-input
              v-model="settings.systemPrompt"
              type="textarea"
              :rows="3"
              placeholder="仅作用于试用通道，可留空"
            />
          </el-form-item>
          <el-form-item label="内容安全">
            <el-switch v-model="settings.contentSafetyEnabled" />
            <span class="hint inline">打开后才会检测敏感词</span>
          </el-form-item>
          <el-form-item label="单条消息上限">
            <el-input-number v-model="settings.maxMessageChars" :min="100" :max="32000" />
            <span class="hint inline">字</span>
          </el-form-item>
          <el-form-item label="单会话消息数">
            <el-input-number v-model="settings.maxMessagesPerConversation" :min="10" :max="5000" />
          </el-form-item>
          <el-form-item label="每人会话数">
            <el-input-number v-model="settings.maxConversationsPerUser" :min="10" :max="2000" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="savingExtra" @click="onSaveExtra"
              >保存限额</el-button
            >
          </el-form-item>
        </el-form>

        <div class="words">
          <div class="page-header">
            <h4 class="page-title">敏感词</h4>
            <el-button type="primary" @click="onAddWord">新增</el-button>
          </div>
          <el-table :data="words" border>
            <el-table-column prop="word" label="词" min-width="160" />
            <el-table-column prop="category" label="分类" width="120" />
            <el-table-column prop="action" label="动作" width="100" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160">
              <template #default="{ row }">
                <el-button type="primary" link @click="onToggleWord(row)">
                  {{ row.status === 1 ? '停用' : '启用' }}
                </el-button>
                <el-button type="danger" link @click="onDeleteWord(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="editVisible" title="覆盖该用户的配额" width="420px" destroy-on-close>
      <p class="lead">保存后仅对该用户生效，覆盖「配额」中的月额、日额和并发。</p>
      <el-form label-width="100px">
        <el-form-item label="每月额度">
          <el-input-number
            v-model="editForm.monthlyAmount"
            :min="0.0001"
            :precision="4"
            :step="0.1"
          />
        </el-form-item>
        <el-form-item label="每日额度">
          <el-input-number
            v-model="editForm.dailyAmount"
            :min="0"
            :precision="4"
            :step="0.1"
            placeholder="空=不限"
            :value-on-clear="null"
          />
        </el-form-item>
        <el-form-item label="最大并发">
          <el-input-number v-model="editForm.maxConcurrency" :min="1" :max="20" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import { markRaw } from 'vue'
import { Download } from '@element-plus/icons-vue'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTableActions from '@/components/xnButton/xnTableActions.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import {
  adminCreateSensitiveWord,
  adminDeleteQuotaOverride,
  adminDeleteSensitiveWord,
  adminExportUsage,
  adminGetQuotaSummary,
  adminGetSettings,
  adminGetTrial,
  adminListQuota,
  adminListSensitiveWords,
  adminResetQuota,
  adminTestTrial,
  adminUpdateQuota,
  adminUpdateSensitiveWord,
  adminUpdateSettings,
  adminUpdateTrial,
} from '@/api/ai/admin'
import { listModels, listProviders } from '@/api/ai/model'
import { groupModelsByProvider } from '@/utils/ai-model-cascader'
import { isImageSrc } from '@/utils/icons'

const searchItems = [
  {
    label: '用户',
    prop: 'keyword',
    type: 'input',
    placeholder: '用户名 / 昵称',
    width: 220,
    clearable: true,
  },
  {
    label: '覆盖',
    prop: 'onlyOverride',
    type: 'select',
    placeholder: '全部',
    width: 140,
    clearable: true,
    options: [
      { label: '全部', value: 0 },
      { label: '只看覆盖', value: 1 },
    ],
  },
]
const buttonItems = [
  {
    name: '导出 CSV',
    action: 'export',
    type: 'button',
    icon: markRaw(Download),
    typeColor: 'primary',
  },
]
const tableButtonItems = [
  { name: '覆盖配额', action: 'override', type: 'button', typeColor: 'primary' },
  { name: '停用试用', action: 'toggleTrial', type: 'button', typeColor: 'primary' },
  { name: '清零本月', action: 'reset', type: 'button', typeColor: 'primary' },
  { name: '取消覆盖', action: 'clearOverride', type: 'button', typeColor: 'danger' },
]
const columns = [
  { prop: 'username', label: '账号', width: 120, showOverflowTooltip: true },
  { prop: 'nickname', label: '昵称', width: 120, showOverflowTooltip: true },
  { prop: 'unitName', label: '单位', minWidth: 140, showOverflowTooltip: true },
  { type: 'slot', slot: 'usage', label: '本月已用 / 额度', width: 180 },
  { prop: 'requestCount', label: '请求', width: 80 },
  { type: 'slot', slot: 'tokens', label: 'Token', minWidth: 160 },
  { type: 'slot', slot: 'ratio', label: '估算占比', width: 100 },
  { prop: 'maxConcurrency', label: '并发', width: 70 },
  {
    prop: 'trialEnabled',
    label: '试用',
    type: 'tag',
    width: 80,
    tagSize: 'small',
    options: [
      { value: true, label: '开', type: 'success' },
      { value: false, label: '关', type: 'info' },
    ],
  },
  {
    prop: 'hasOverride',
    label: '覆盖',
    type: 'tag',
    width: 80,
    tagSize: 'small',
    options: [
      { value: true, label: '是', type: 'warning' },
      { value: false, label: '默认', type: 'info' },
    ],
  },
  { type: 'slot', slot: 'actions', label: '操作', width: 280, fixed: 'right' },
]

export default {
  name: 'AiQuota',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTableActions,
    xnTable,
  },
  data() {
    return {
      searchItems,
      buttonItems,
      tableButtonItems,
      columns,
      cascaderProps: { emitPath: false, expandTrigger: 'hover' },
      activeTab: 'quota',
      mineModels: [],
      providers: [],
      sourceModelId: '',
      saving: false,
      savingExtra: false,
      testing: false,
      trial: {
        enabled: true,
        name: '',
        sourceModelId: null,
        providerModelId: null,
        apiKey: null,
        defaultQuota: { monthlyAmount: 0.5, dailyAmount: null, currency: 'CNY', maxConcurrency: 2 },
      },
      settings: {
        trialEnabled: true,
        systemPrompt: '',
        quotaExceededTip: '本月试用额度已用完，请在「模型」中添加自己的模型继续使用',
        contentSafetyEnabled: false,
        maxMessageChars: 32000,
        maxMessagesPerConversation: 1000,
        maxConversationsPerUser: 500,
      },
      words: [],
      rows: [],
      summary: {},
      loading: false,
      queryForm: {},
      page: 1,
      size: 20,
      total: 0,
      month: new Date().toISOString().slice(0, 7),
      editVisible: false,
      editUserId: '',
      editForm: {
        monthlyAmount: 0.5,
        dailyAmount: null,
        maxConcurrency: 2,
      },
    }
  },
  computed: {
    keyedProviderIds() {
      return new Set(this.providers.filter((p) => p.keyConfigured).map((p) => p.id))
    },
    shareableModels() {
      return this.mineModels.filter(
        (m) => m.status === 1 && (!m.providerId || this.keyedProviderIds.has(m.providerId)),
      )
    },
    shareableCascader() {
      return groupModelsByProvider(this.shareableModels, { disableUnavailable: false })
    },
  },
  async mounted() {
    await Promise.all([this.loadTrial(), this.reload()])
  },
  methods: {
    isImageSrc,
    tableActionsFor(row) {
      return [
        { name: '覆盖配额', action: 'override', type: 'button', typeColor: 'primary' },
        {
          name: row.trialEnabled ? '停用试用' : '恢复试用',
          action: 'toggleTrial',
          type: 'button',
          typeColor: 'primary',
        },
        { name: '清零本月', action: 'reset', type: 'button', typeColor: 'primary' },
        ...(row.hasOverride
          ? [{ name: '取消覆盖', action: 'clearOverride', type: 'button', typeColor: 'danger' }]
          : []),
      ]
    },
    formatMoney(value) {
      return Number(value || 0).toFixed(4)
    },
    onPickShareModel(value) {
      this.sourceModelId = value == null ? '' : String(value)
    },
    async loadTrial() {
      const [modelRes, providerRes, trialRes, settingRes] = await Promise.all([
        listModels(),
        listProviders(),
        adminGetTrial(),
        adminGetSettings(),
        this.loadWords(),
      ])
      this.mineModels = modelRes.data?.mine ?? []
      this.providers = providerRes.data ?? []
      Object.assign(this.trial, trialRes.data)
      if (!this.trial.defaultQuota) {
        this.trial.defaultQuota = {
          monthlyAmount: 0.5,
          dailyAmount: null,
          currency: 'CNY',
          maxConcurrency: 2,
        }
      }
      Object.assign(this.settings, settingRes.data)
      this.sourceModelId = this.trial.sourceModelId || ''
    },
    async onSaveTrial() {
      if (this.trial.enabled && !this.sourceModelId) {
        ElMessage.warning('请选择要共享的模型')
        return
      }
      this.saving = true
      try {
        await adminUpdateTrial({
          enabled: this.trial.enabled,
          sourceModelId: this.sourceModelId || undefined,
          defaultQuota: {
            monthlyAmount: this.trial.defaultQuota.monthlyAmount,
            dailyAmount: this.trial.defaultQuota.dailyAmount || null,
            maxConcurrency: this.trial.defaultQuota.maxConcurrency,
          },
        })
        await adminUpdateSettings({
          trialEnabled: this.trial.enabled,
          quotaExceededTip: this.settings.quotaExceededTip,
        })
        ElMessage.success('已保存')
        await this.loadTrial()
      } finally {
        this.saving = false
      }
    },
    async onSaveExtra() {
      this.savingExtra = true
      try {
        await adminUpdateSettings({
          systemPrompt: this.settings.systemPrompt,
          contentSafetyEnabled: this.settings.contentSafetyEnabled,
          maxMessageChars: this.settings.maxMessageChars,
          maxMessagesPerConversation: this.settings.maxMessagesPerConversation,
          maxConversationsPerUser: this.settings.maxConversationsPerUser,
        })
        ElMessage.success('已保存')
      } finally {
        this.savingExtra = false
      }
    },
    async onTest() {
      this.testing = true
      try {
        const res = await adminTestTrial()
        if (res.data?.ok) {
          ElMessage.success(`连通正常，耗时 ${res.data.latencyMs} ms`)
        } else {
          ElMessage.error(res.data?.message || '探测失败')
        }
      } finally {
        this.testing = false
      }
    },
    async loadWords() {
      const res = await adminListSensitiveWords()
      this.words = res.data ?? []
    },
    async onAddWord() {
      const { value } = await ElMessageBox.prompt('输入要拦截的词', '新增敏感词')
      if (!value?.trim()) return
      await adminCreateSensitiveWord({ word: value.trim(), action: 'BLOCK', status: 1 })
      ElMessage.success('已添加')
      await this.loadWords()
    },
    async onToggleWord(row) {
      await adminUpdateSensitiveWord(row.id, { word: row.word, status: row.status === 1 ? 0 : 1 })
      await this.loadWords()
    },
    async onDeleteWord(row) {
      await ElMessageBox.confirm(`删除「${row.word}」？`, '删除敏感词', { type: 'warning' })
      await adminDeleteSensitiveWord(row.id)
      ElMessage.success('已删除')
      await this.loadWords()
    },
    async reload() {
      this.loading = true
      try {
        const keyword = String(this.queryForm.keyword ?? '').trim()
        const onlyOverride = Number(this.queryForm.onlyOverride) === 1
        const [res, summaryRes] = await Promise.all([
          adminListQuota({
            page: this.page,
            size: this.size,
            keyword: keyword || undefined,
            onlyOverride: onlyOverride || undefined,
          }),
          adminGetQuotaSummary(),
        ])
        this.rows = res.data?.records ?? []
        this.total = Number(res.data?.total || 0)
        Object.assign(this.summary, summaryRes.data)
      } finally {
        this.loading = false
      }
    },
    inquires(form) {
      this.queryForm = form
      this.page = 1
      this.reload()
    },
    reset() {
      this.queryForm = {}
      this.page = 1
      this.reload()
    },
    onToolbar(action) {
      if (action === 'export') this.onExport()
    },
    onTableAction(payload) {
      const row = payload.row
      if (payload.action === 'override') this.onEdit(row)
      else if (payload.action === 'toggleTrial') this.onToggleTrial(row)
      else if (payload.action === 'reset') this.onReset(row)
      else if (payload.action === 'clearOverride') this.onClearOverride(row)
    },
    onEdit(row) {
      this.editUserId = row.userId
      this.editForm.monthlyAmount = Number(row.monthlyLimit)
      this.editForm.dailyAmount = row.dailyLimit == null ? null : Number(row.dailyLimit)
      this.editForm.maxConcurrency = row.maxConcurrency
      this.editForm.trialEnabled = row.trialEnabled
      this.editVisible = true
    },
    async saveEdit() {
      const monthly = Number(this.editForm.monthlyAmount)
      if (!(monthly > 0)) {
        ElMessage.warning('月额度必须大于 0')
        return
      }
      await adminUpdateQuota(this.editUserId, {
        monthlyAmount: monthly,
        dailyAmount: this.editForm.dailyAmount ? Number(this.editForm.dailyAmount) : null,
        maxConcurrency: this.editForm.maxConcurrency,
        trialEnabled: this.editForm.trialEnabled,
      })
      this.editVisible = false
      ElMessage.success('已覆盖该用户配额')
      await this.reload()
    },
    async onToggleTrial(row) {
      const next = !row.trialEnabled
      await ElMessageBox.confirm(
        next ? `恢复 ${row.username} 的平台试用？` : `停用后 ${row.username} 只能用自己的模型。`,
        next ? '恢复试用' : '停用试用',
        { type: 'warning' },
      )
      await adminUpdateQuota(row.userId, {
        monthlyAmount: row.monthlyLimit,
        dailyAmount: row.dailyLimit,
        maxConcurrency: row.maxConcurrency,
        trialEnabled: next,
      })
      ElMessage.success(next ? '已恢复' : '已停用')
      await this.reload()
    },
    async onReset(row) {
      await ElMessageBox.confirm(`将清零 ${row.username} 本月试用计数，流水仍保留。`, '清零本月', {
        type: 'warning',
      })
      await adminResetQuota(row.userId)
      ElMessage.success('已清零')
      await this.reload()
    },
    async onClearOverride(row) {
      await ElMessageBox.confirm('取消后回落到「配额」里的全局默认额度。', '取消覆盖', {
        type: 'warning',
      })
      await adminDeleteQuotaOverride(row.userId)
      ElMessage.success('已取消覆盖')
      await this.reload()
    },
    async onExport() {
      await adminExportUsage(this.month)
    },
  },
}
</script>

<style scoped>
.quota-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
}
.quota-page > .page-header {
  flex-shrink: 0;
}
.quota-tabs {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.quota-tabs :deep(.el-tabs__header.is-left) {
  margin-right: 0;
  flex-shrink: 0;
}
.quota-tabs :deep(.el-tabs__nav-wrap.is-left) {
  width: 128px;
}
.quota-tabs :deep(.el-tabs__item.is-left) {
  justify-content: flex-start;
  padding: 0 16px;
  height: 44px;
}
.quota-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 4px 8px 8px 24px;
  overflow: hidden;
}
.quota-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow: auto;
}
.quota-users {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.quota-users-layout {
  flex: 1 !important;
  min-height: 0;
  height: auto !important;
  background: transparent;
}
.lead {
  margin: 0 0 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
  flex-shrink: 0;
}
.trial-form {
  max-width: 760px;
}
.cascader-opt {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.cascader-logo {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  object-fit: contain;
  background: var(--el-fill-color-light);
}
.hint {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.hint.inline {
  margin-left: 12px;
}
.overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.words {
  margin-top: 16px;
}
</style>
