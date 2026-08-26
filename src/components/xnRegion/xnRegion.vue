<template>
  <el-cascader
    :model-value="codes"
    :options="tree"
    :props="cascaderProps"
    :clearable="clearable"
    :disabled="disabled"
    :filterable="filterable"
    :placeholder="resolvedPlaceholder"
    style="width: 100%"
    @update:model-value="onChange"
  />
</template>

<script>
import {
  CHINA_REGION,
  filterRegionByLevel,
  findRegionCodesByLabels,
  findRegionLabels,
  formatRegionText,
  parseRegionText,
} from '@/utils/region'

export default {
  name: 'XnRegion',
  props: {
    modelValue: { type: [Array, String], default: undefined },
    /** 传入后不再使用内置省市区 */
    options: { type: Array, default: undefined },
    /** 2=省市，3=省市区（无区县的地市仍为两级） */
    level: { type: Number, default: 3 },
    /** codes=区划代码；labels=名称数组；text=拼接文案 */
    valueType: { type: String, default: 'codes' },
    separator: { type: String, default: ' / ' },
    clearable: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    filterable: { type: Boolean, default: true },
    checkStrictly: { type: Boolean, default: false },
    placeholder: { type: String, default: undefined },
  },
  emits: ['update:modelValue', 'change'],
  computed: {
    tree() {
      return filterRegionByLevel(this.options?.length ? this.options : CHINA_REGION, this.level)
    },
    resolvedPlaceholder() {
      if (this.placeholder) return this.placeholder
      return this.level === 2 ? '请选择省 / 市' : '请选择省 / 市 / 区'
    },
    codes() {
      if (this.valueType === 'text') {
        return parseRegionText(
          typeof this.modelValue === 'string' ? this.modelValue : '',
          this.tree,
          this.separator,
        )
      }
      const list = Array.isArray(this.modelValue) ? this.modelValue : []
      if (this.valueType === 'labels') return findRegionCodesByLabels(list, this.tree)
      return list
    },
    cascaderProps() {
      return {
        checkStrictly: this.checkStrictly,
        expandTrigger: 'hover',
        value: 'value',
        label: 'label',
        children: 'children',
      }
    },
  },
  methods: {
    emitValue(next, labels, text) {
      if (this.valueType === 'text') this.$emit('update:modelValue', text)
      else if (this.valueType === 'labels') this.$emit('update:modelValue', labels)
      else this.$emit('update:modelValue', next)
    },
    onChange(value) {
      const next = value ?? []
      const labels = findRegionLabels(next, this.tree)
      const text = formatRegionText(next, this.tree, this.separator)
      this.emitValue(next, labels, text)
      this.$emit('change', { value: next, labels, text })
    },
  },
}
</script>
