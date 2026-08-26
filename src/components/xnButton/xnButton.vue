<template>
  <div v-if="visibleList.length" class="xn-button">
    <template v-for="item in visibleList" :key="item.name">
      <el-dropdown
        v-if="item.type === 'down'"
        trigger="click"
        @command="(cmd) => handleDropdownCommand(item, cmd)"
      >
        <el-button
          :type="item.typeColor || 'primary'"
          :icon="resolveBtnIcon(item.icon)"
          :disabled="isDisabled(item)"
        >
          {{ item.name }}
          <el-icon class="xn-button__arrow"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="sub in visibleDropdownItems(item)"
              :key="sub.name"
              :command="sub.name"
            >
              {{ sub.name }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <xnExport
        v-else-if="item.action === 'export' && exportRequest"
        :request="exportRequest"
        :text="item.name || '导出'"
        :type="item.typeColor && item.typeColor !== 'default' ? item.typeColor : 'primary'"
        :plain="
          item.typeColor !== 'success' &&
          item.typeColor !== 'warning' &&
          item.typeColor !== 'danger'
        "
        :disabled="isDisabled(item)"
      />

      <el-button
        v-else
        :type="item.typeColor || 'default'"
        :icon="resolveBtnIcon(item.icon)"
        :disabled="isDisabled(item)"
        @click="emitAction(item)"
      >
        {{ item.name }}
      </el-button>
    </template>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import { usePermission } from '@/directives/permission'
import { createDefaultButtonList } from '@/components/xnButton/defaultButtons'
import xnExport from '@/components/xnExport/xnExport.vue'
import { resolveIcon } from '@/utils/icons'

export default {
  name: 'xnButton',
  components: { ArrowDown, xnExport },
  props: {
    listItem: { required: false },
    selected: { type: Array, required: false, default: () => [] },
    createPermission: { required: false },
    updatePermission: { required: false },
    viewPermission: { required: false },
    deletePermission: { required: false },
    /** 传入后工具栏「导出」直接走 xnExport，不再 buttonClick */
    exportRequest: { type: Function, default: undefined },
  },
  emits: ['buttonClick'],
  setup() {
    const { hasPermission } = usePermission()
    return { hasPermission }
  },
  computed: {
    resolvedList() {
      if (this.listItem !== undefined) {
        return this.listItem
      }
      return createDefaultButtonList({
        create: this.createPermission,
        update: this.updatePermission,
        view: this.viewPermission,
        delete: this.deletePermission,
      })
    },
    visibleList() {
      return this.resolvedList.filter(
        (item) => !item.permission || this.hasPermission(item.permission),
      )
    },
  },
  methods: {
    resolveBtnIcon(icon) {
      if (!icon) return undefined
      if (typeof icon === 'string') return resolveIcon(icon)
      return markRaw(icon)
    },
    visibleDropdownItems(item) {
      return (item.searchItem ?? []).filter(
        (sub) => !sub.permission || this.hasPermission(sub.permission),
      )
    },
    isDisabled(item) {
      if (item.disabled) return true
      // index 表示「需要选中的行数 - 1」；后端未配置时可能下发 null，不能当成 0
      if (item.index != null) {
        return this.selected.length !== item.index + 1
      }
      // 删除 / 下发 / 撤回：至少选中 1 条
      if (item.action === 'delete' || item.action === 'publish' || item.action === 'revoke') {
        return this.selected.length < 1
      }
      return false
    },
    emitAction(item) {
      this.$emit('buttonClick', item.action || item.name)
    },
    handleDropdownCommand(item, cmd) {
      const sub = item.searchItem?.find((s) => s.name === cmd)
      this.$emit('buttonClick', sub?.action || cmd)
    },
  },
}
</script>

<style scoped>
.xn-button {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.xn-button__arrow {
  margin-left: 4px;
}
</style>
