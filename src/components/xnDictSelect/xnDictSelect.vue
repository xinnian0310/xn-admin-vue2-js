<template>
  <el-select
    :model-value="modelValue"
    :multiple="multiple"
    :clearable="clearable"
    :disabled="disabled"
    :filterable="filterable"
    :placeholder="placeholder"
    :loading="loading"
    style="width: 100%"
    @update:model-value="onChange"
  >
    <el-option
      v-for="item in resolved"
      :key="String(item.value)"
      :label="item.label"
      :value="item.value"
    />
  </el-select>
</template>

<script>
import { getByType } from '@/api/dict-data'

const cache = new Map()

export default {
  name: 'XnDictSelect',
  props: {
    modelValue: { type: [String, Number, Array], default: '' },
    /** 字典类型；传入 options 时可不传 */
    dictType: { type: String, default: '' },
    /** 本地选项，传入后不再请求接口（演示 / 离线） */
    options: { type: Array, default: undefined },
    multiple: { type: Boolean, default: false },
    clearable: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    filterable: { type: Boolean, default: true },
    placeholder: { type: String, default: '请选择' },
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      loading: false,
      remote: [],
    }
  },
  computed: {
    resolved() {
      return this.options ?? this.remote
    },
  },
  watch: {
    dictType() {
      if (!this.options) void this.load()
    },
    options() {
      if (!this.options) void this.load()
    },
  },
  mounted() {
    if (!this.options) void this.load()
  },
  methods: {
    mapRows(rows) {
      return rows
        .filter((row) => row.status !== 0)
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
        .map((row) => ({ label: row.label, value: row.value }))
    },
    async load() {
      const type = (this.dictType || '').trim()
      if (!type) {
        this.remote = []
        return
      }
      if (!cache.has(type)) {
        cache.set(
          type,
          getByType(type)
            .then((res) => this.mapRows(res.data || []))
            .catch((error) => {
              cache.delete(type)
              throw error
            }),
        )
      }
      this.loading = true
      try {
        this.remote = await cache.get(type)
      } catch {
        this.remote = []
      } finally {
        this.loading = false
      }
    },
    onChange(value) {
      this.$emit('update:modelValue', value)
      this.$emit('change', value)
    },
  },
}
</script>
