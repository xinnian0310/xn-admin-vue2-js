<template>
  <el-dialog v-model="visible" title="首页" width="480px" destroy-on-close>
    <el-result icon="info" title="首页无需编辑" sub-title="此弹窗为路由规范占位" />
    <template #footer>
      <el-button type="primary" @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script>
export default {
  name: 'DashboardSave',
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
