<template>
  <div v-if="visibleList.length" class="xn-table-actions">
    <template v-for="item in visibleList" :key="item.action || item.name">
      <xnPopconfirm
        v-if="needConfirm(item)"
        :title="confirmTitle(item)"
        :disabled="isDisabled(item)"
        @confirm="emitAction(item)"
      >
        <el-button
          link
          :type="item.typeColor && item.typeColor !== 'default' ? item.typeColor : 'primary'"
          :disabled="isDisabled(item)"
        >
          {{ item.name }}
        </el-button>
      </xnPopconfirm>
      <el-button
        v-else
        link
        :type="item.typeColor && item.typeColor !== 'default' ? item.typeColor : 'primary'"
        :disabled="isDisabled(item)"
        @click="emitAction(item)"
      >
        {{ item.name }}
      </el-button>
    </template>
  </div>
</template>

<script>
import { usePermission } from '@/directives/permission'
import xnPopconfirm from '@/components/xnPopconfirm/xnPopconfirm.vue'

export default {
  name: 'xnTableActions',
  components: { xnPopconfirm },
  props: {
    items: { type: Array, required: false, default: () => [] },
    row: { type: Object, required: false, default: () => ({}) },
    disabled: { required: false },
    /** 需要气泡确认的动作，默认 delete */
    confirmActions: { type: Array, required: false, default: () => ['delete'] },
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
    needConfirm(item) {
      return this.confirmActions.includes(this.actionOf(item))
    },
    confirmTitle(item) {
      const row = this.row || {}
      const name = row.name || row.title || row.username || row.label || row.path || row.key
      if (name) return `确定${item.name}「${name}」吗？`
      return `确定${item.name}吗？`
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
