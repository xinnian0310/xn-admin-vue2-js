<template>
  <el-watermark class="xn-watermark" :content="resolved" :gap="gap" :font="font">
    <slot />
  </el-watermark>
</template>

<script>
export default {
  name: 'XnWatermark',
  props: {
    /** 不传则展示「心念科技」 */
    content: { type: [String, Array], default: undefined },
    disabled: { type: Boolean, default: false },
    gap: { type: Array, default: () => [140, 120] },
  },
  data() {
    return {
      font: {
        color: 'rgba(0, 0, 0, 0.08)',
        fontSize: 14,
      },
    }
  },
  computed: {
    resolved() {
      if (this.disabled) return []
      if (this.content != null) {
        return Array.isArray(this.content) ? this.content : [this.content]
      }
      return ['心念科技']
    },
  },
}
</script>

<style scoped>
.xn-watermark {
  display: block;
  width: 100%;
  height: 100%;
  min-height: inherit;
}
</style>
