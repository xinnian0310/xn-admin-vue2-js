<template>
  <div class="xn-empty" :data-type="type" :data-size="size">
    <div class="xn-empty__visual" aria-hidden="true">
      <svg class="xn-empty__icon" viewBox="0 0 64 64" fill="none">
        <rect
          v-if="type === 'data' || type === 'search'"
          x="12"
          y="18"
          width="40"
          height="28"
          rx="4"
        />
        <path
          v-if="type === 'data' || type === 'search'"
          d="M20 28h24M20 36h16"
          stroke-linecap="round"
        />
        <circle v-if="type === 'search'" cx="42" cy="40" r="7" />
        <path v-if="type === 'search'" d="M47 45l6 6" stroke-linecap="round" />
        <rect v-if="type === 'permission'" x="20" y="26" width="24" height="18" rx="3" />
        <path v-if="type === 'permission'" d="M26 26v-5a6 6 0 0 1 12 0v5" stroke-linecap="round" />
        <circle v-if="type === 'error'" cx="32" cy="32" r="14" />
        <path v-if="type === 'error'" d="M32 24v12M32 42v.5" stroke-linecap="round" />
      </svg>
    </div>
    <p class="xn-empty__title">{{ resolvedTitle }}</p>
    <p v-if="resolvedDescription" class="xn-empty__desc">{{ resolvedDescription }}</p>
    <div v-if="$slots.default" class="xn-empty__extra">
      <slot />
    </div>
  </div>
</template>

<script>
const PRESETS = {
  data: { title: '暂无数据', description: '没有符合条件的记录' },
  permission: { title: '暂无权限', description: '你没有查看该内容的权限' },
  search: { title: '无匹配结果', description: '试试调整筛选条件' },
  error: { title: '加载失败', description: '请稍后重试' },
}

export default {
  name: 'XnEmpty',
  props: {
    type: { type: String, default: 'data' },
    title: { type: String, default: undefined },
    description: { type: String, default: undefined },
    size: { type: String, default: 'default' },
  },
  computed: {
    resolvedTitle() {
      return this.title || PRESETS[this.type].title
    },
    resolvedDescription() {
      return this.description === '' ? '' : (this.description ?? PRESETS[this.type].description)
    },
  },
}
</script>

<style scoped>
.xn-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 16px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

.xn-empty__visual {
  display: grid;
  place-items: center;
  margin-bottom: 8px;
}

.xn-empty__icon {
  width: 56px;
  height: 56px;
  color: var(--el-color-info);
  stroke: currentColor;
  stroke-width: 1.75;
}

.xn-empty[data-type='permission'] .xn-empty__icon {
  color: var(--el-color-warning);
}

.xn-empty[data-type='error'] .xn-empty__icon {
  color: var(--el-color-danger);
}

.xn-empty__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.xn-empty__desc {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.6;
}

.xn-empty__extra {
  margin-top: 12px;
}

.xn-empty[data-size='small'] {
  padding: 16px 8px;
}

.xn-empty[data-size='small'] .xn-empty__icon {
  width: 40px;
  height: 40px;
}

.xn-empty[data-size='small'] .xn-empty__title {
  font-size: 13px;
}
</style>
