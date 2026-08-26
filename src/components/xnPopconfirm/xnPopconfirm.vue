<template>
  <el-popconfirm
    :title="title"
    :width="width"
    :confirm-button-text="confirmText"
    :cancel-button-text="cancelText"
    :confirm-button-type="confirmButtonType"
    :hide-after="0"
    :disabled="disabled"
    @confirm="onConfirm"
    @cancel="$emit('cancel')"
  >
    <template #reference>
      <slot />
    </template>
  </el-popconfirm>
</template>

<script>
export default {
  name: 'XnPopconfirm',
  props: {
    title: { type: String, default: '确定执行该操作吗？' },
    width: { type: Number, default: 200 },
    confirmText: { type: String, default: '确定' },
    cancelText: { type: String, default: '取消' },
    confirmButtonType: { type: String, default: 'danger' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['confirm', 'cancel'],
  methods: {
    onConfirm() {
      if (this.disabled) return
      this.$emit('confirm')
    },
  },
}
</script>
