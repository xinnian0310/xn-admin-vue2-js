<template>
  <XnErrorPage
    code="503"
    tone="danger"
    title="服务暂时不可用"
    description="无法连接后端服务或菜单加载失败，请确认服务已启动后重试。"
  >
    <template #actions>
      <el-button :loading="retrying" @click="retry">重新加载</el-button>
      <el-button type="primary" @click="$router.push('/dashboard')">返回工作台</el-button>
    </template>
  </XnErrorPage>
</template>

<script>
import XnErrorPage from '@/components/xnErrorPage/xnErrorPage.vue'
import { resetDynamicRoutes } from '@/utils/route-register'

export default {
  name: 'ServiceUnavailable',
  components: {
    XnErrorPage,
  },
  data() {
    return {
      retrying: false,
    }
  },
  methods: {
    retry() {
      this.retrying = true
      resetDynamicRoutes()
      window.location.assign('/dashboard')
    },
  },
}
</script>
