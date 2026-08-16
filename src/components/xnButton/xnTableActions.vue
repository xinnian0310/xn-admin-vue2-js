<template>
  <div v-if="visibleList.length" class="xn-table-actions">
    <el-button
      v-for="item in visibleList"
      :key="item.action || item.name"
      link
      :type="item.typeColor && item.typeColor !== 'default' ? item.typeColor : 'primary'"
      :disabled="isDisabled(item)"
      @click="emitAction(item)"
    >
      {{ item.name }}
    </el-button>
  </div>
</template>

<script>
import { usePermission } from '@/directives/permission'

export default {
  name: 'xnTableActions',
  props: {
    items: { type: Array, required: false, default: () => [] },
    row: { type: Object, required: false, default: () => ({}) },
    disabled: { required: false },
  },
  emits: ['actionClick'],
  setup() {
    const { hasPermission } = usePermission()
    return { hasPermission }
  },
  computed: {
    visibleList() {
      return this.items.filter((item) => !item.permission || this.hasPermission(item.permission))
    },
  },
  methods: {
    actionOf(item) {
      return item.action || item.name
    },
    isDisabled(item) {
      if (item.disabled) return true
      if (!this.disabled) return false
      const result = this.disabled(this.actionOf(item), this.row)
      return result === true || typeof result === 'string'
    },
    emitAction(item) {
      this.$emit('actionClick', { action: this.actionOf(item), row: this.row })
    },
  },
}
</script>

<style scoped>
.xn-table-actions {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
</style>
