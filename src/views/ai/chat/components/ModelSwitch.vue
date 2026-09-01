<template>
  <header class="ai-chat__bar">
    <el-cascader
      :key="modelPick || 'none'"
      :model-value="modelPick || undefined"
      :options="cascaderOptions"
      :props="cascaderProps"
      :disabled="!hasModel || streaming"
      :show-all-levels="false"
      filterable
      placeholder="先选厂商，再选模型"
      class="ai-chat__model-pick"
      @update:model-value="onPick"
    >
      <template #default="{ data }">
        <span class="ai-chat__model-opt">
          <i v-if="!data.children" class="status-dot" :class="modelDotClass(data.lastCheckOk)" />
          <img v-if="isImageSrc(data.icon)" :src="data.icon" class="ai-chat__model-logo" alt="" />
          <span>{{ data.label }}</span>
        </span>
      </template>
    </el-cascader>
    <el-button v-if="quotaLow" type="primary" link @click="$router.push('/ai/models')"
      >去添加我的模型</el-button
    >
  </header>
</template>

<script>
import { groupModelsByProvider, modelDotClass } from '@/utils/ai-model-cascader'
import { isImageSrc } from '@/utils/icons'

export default {
  name: 'AiChatModelSwitch',
  emits: ['update:modelPick', 'change'],
  props: {
    models: { type: Object, required: true },
    modelPick: { type: String, required: true },
    streaming: { type: Boolean, required: true },
    hasModel: { type: Boolean, required: true },
    quotaLow: { type: Boolean, required: true },
  },
  data() {
    return {
      cascaderProps: { emitPath: false, expandTrigger: 'hover' },
    }
  },
  computed: {
    cascaderOptions() {
      const sources = []
      if (this.models.trial) {
        sources.push({
          id: this.models.trial.id,
          name: this.models.trial.name,
          modelId: this.models.trial.modelId,
          modelDisplayName: this.models.trial.modelDisplayName || this.models.trial.name,
          providerId: this.models.trial.providerId,
          providerName: this.models.trial.providerName,
          providerIcon: this.models.trial.providerIcon,
          lastCheckOk: this.models.trial.lastCheckOk ?? null,
          trial: true,
        })
      }
      for (const model of this.models.mine || []) {
        sources.push({
          id: model.id,
          name: model.name || model.modelDisplayName,
          modelId: model.modelId,
          modelDisplayName: model.modelDisplayName,
          providerId: model.providerId,
          providerName: model.providerName,
          providerIcon: model.providerIcon,
          lastCheckOk: model.lastCheckOk ?? null,
        })
      }
      return groupModelsByProvider(sources)
    },
  },
  methods: {
    isImageSrc,
    modelDotClass,
    onPick(value) {
      const next = value == null ? '' : String(value)
      const leaf = this.cascaderOptions
        .flatMap((group) => group.children)
        .find((item) => item.value === next)
      if (leaf?.disabled) return
      this.$emit('update:modelPick', next)
      if (next) this.$emit('change', next)
    },
  },
}
</script>

<style scoped>
.ai-chat__bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 8px 16px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}
.ai-chat__model-pick {
  width: 320px;
}
.ai-chat__model-opt {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.ai-chat__model-logo {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  object-fit: contain;
  background: var(--el-fill-color-light);
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.is-none,
.status-dot.is-unknown {
  background: var(--el-color-info-light-3);
}
.status-dot.is-ok {
  background: var(--el-color-success);
}
.status-dot.is-fail {
  background: var(--el-color-danger);
}
</style>
