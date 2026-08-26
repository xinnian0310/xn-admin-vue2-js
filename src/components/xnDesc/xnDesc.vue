<template>
  <el-descriptions class="xn-desc" :title="title" :column="column" :border="border" :size="size">
    <el-descriptions-item
      v-for="(item, index) in items"
      :key="item.prop || `${item.label}-${index}`"
      :label="item.label"
      :span="item.span"
    >
      <pre v-if="item.type === 'pre'" class="xn-desc__pre">{{ displayValue(item) }}</pre>
      <span v-else-if="item.type === 'copy'" class="xn-desc__copy">
        <span>{{ displayValue(item) }}</span>
        <xnCopy v-if="hasCopyValue(item)" :text="String(item.value)" />
      </span>
      <slot v-else :name="item.prop" :item="item">{{ displayValue(item) }}</slot>
    </el-descriptions-item>
  </el-descriptions>
</template>

<script>
import xnCopy from '@/components/xnCopy/xnCopy.vue'

export default {
  name: 'XnDesc',
  components: { xnCopy },
  props: {
    items: { type: Array, default: () => [] },
    title: { type: String, default: '' },
    column: { type: Number, default: 1 },
    border: { type: Boolean, default: true },
    size: { type: String, default: 'default' },
  },
  methods: {
    displayValue(item) {
      const text = item.value
      if (text === null || text === undefined || text === '') return item.emptyText ?? '—'
      return String(text)
    },
    hasCopyValue(item) {
      return item.value != null && item.value !== ''
    },
  },
}
</script>

<style scoped>
.xn-desc__pre {
  margin: 0;
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
}

.xn-desc__copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}
</style>
