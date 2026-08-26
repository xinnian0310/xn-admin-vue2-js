<template>
  <div class="xn-cron">
    <el-input
      :model-value="modelValue"
      :disabled="disabled"
      :placeholder="placeholder"
      @update:model-value="onInput"
    >
      <template #append>
        <el-button :disabled="disabled" @click="open = true">编辑</el-button>
      </template>
    </el-input>

    <xnDialog v-model="open" title="Cron 表达式" width="720px" confirm-text="应用" @confirm="apply">
      <el-tabs v-model="active">
        <el-tab-pane
          v-for="field in fields"
          :key="field.key"
          :label="field.label"
          :name="field.key"
        >
          <el-radio-group v-model="state[field.key].mode" class="xn-cron__modes">
            <el-radio value="every">每{{ field.label }}</el-radio>
            <el-radio value="interval">周期</el-radio>
            <el-radio value="range">区间</el-radio>
            <el-radio value="specific">指定</el-radio>
          </el-radio-group>

          <div v-if="state[field.key].mode === 'interval'" class="xn-cron__row">
            从
            <el-input-number
              v-model="state[field.key].intervalStart"
              :min="field.min"
              :max="field.max"
            />
            开始，每
            <el-input-number v-model="state[field.key].intervalStep" :min="1" :max="field.max" />
            {{ field.label }}
          </div>
          <div v-else-if="state[field.key].mode === 'range'" class="xn-cron__row">
            从
            <el-input-number
              v-model="state[field.key].rangeStart"
              :min="field.min"
              :max="field.max"
            />
            到
            <el-input-number
              v-model="state[field.key].rangeEnd"
              :min="field.min"
              :max="field.max"
            />
          </div>
          <div v-else-if="state[field.key].mode === 'specific'" class="xn-cron__chips">
            <el-checkbox-group v-model="state[field.key].specific">
              <el-checkbox
                v-for="n in field.max - field.min + 1"
                :key="n"
                :label="field.min + n - 1"
                :value="field.min + n - 1"
              >
                {{ field.key === 'week' ? weekLabel(field.min + n - 1) : field.min + n - 1 }}
              </el-checkbox>
            </el-checkbox-group>
          </div>
        </el-tab-pane>
      </el-tabs>
      <div class="xn-cron__preview">
        预览：<code>{{ preview }}</code>
      </div>
    </xnDialog>
  </div>
</template>

<script>
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import { CRON_FIELDS, WEEK_LABELS, parseCron, stringifyCron } from '@/utils/cron'

export default {
  name: 'XnCron',
  components: { xnDialog },
  props: {
    modelValue: { type: String, default: '0 */5 * * * ?' },
    disabled: { type: Boolean, default: false },
    placeholder: { type: String, default: 'Quartz Cron，如 0 */5 * * * ?' },
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      open: false,
      active: 'minute',
      fields: CRON_FIELDS,
      state: parseCron(this.modelValue || ''),
    }
  },
  computed: {
    preview() {
      return stringifyCron(this.state)
    },
  },
  watch: {
    modelValue(value) {
      if (this.open) return
      Object.assign(this.state, parseCron(value || ''))
    },
    open(value) {
      if (value) Object.assign(this.state, parseCron(this.modelValue || ''))
    },
  },
  methods: {
    weekLabel(value) {
      return WEEK_LABELS[(value - 1) % 7] || String(value)
    },
    onInput(value) {
      this.$emit('update:modelValue', value)
      this.$emit('change', value)
    },
    apply() {
      const next = this.preview
      this.$emit('update:modelValue', next)
      this.$emit('change', next)
      this.open = false
    },
  },
}
</script>

<style scoped>
.xn-cron__modes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 12px;
}

.xn-cron__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.xn-cron__chips :deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
}

.xn-cron__preview {
  margin-top: 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.xn-cron__preview code {
  color: var(--el-color-primary);
}
</style>
