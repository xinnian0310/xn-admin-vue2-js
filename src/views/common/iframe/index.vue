<template>
  <div class="iframe-page">
    <iframe v-if="src" class="iframe-frame" :src="src" :title="title" />
    <el-empty v-else description="未配置外部链接" />
  </div>
</template>

<script>
export default {
  name: 'IframePage',
  computed: {
    src() {
      const url = String(this.$route.meta.linkUrl ?? '').trim()
      return url || ''
    },
    title() {
      return String(this.$route.meta.title ?? '外部链接')
    },
  },
}
</script>

<style scoped>
.iframe-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.iframe-frame {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 0;
  background: var(--app-card-bg, #fff);
}
</style>
