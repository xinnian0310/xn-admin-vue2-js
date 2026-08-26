<template>
  <xnDialog v-model="visible" title="首页" width="480px" :show-confirm="false" cancel-text="关闭">
    <el-result icon="info" title="首页无需编辑" sub-title="此弹窗为路由规范占位" />
  </xnDialog>
</template>

<script>
import xnDialog from '@/components/xnDialog/xnDialog.vue'

export default {
  name: 'DashboardSave',
  components: { xnDialog },
  data() {
    return {
      visible: false,
    }
  },
  methods: {
    open(_mode = 'view') {
      this.visible = true
    },
  },
}
</script>
