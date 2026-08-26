<template>
  <div class="xn-code">
    <div v-if="title || showCopy" class="xn-code__bar">
      <span class="xn-code__title">{{ title || language.toUpperCase() }}</span>
      <xnCopy v-if="showCopy" :text="source" label="复制" />
    </div>
    <div class="xn-code__body" :style="{ maxHeight }">
      <div v-if="language === 'json'" class="xn-code__lines">
        <div v-for="(line, index) in jsonLines" :key="index" class="xn-code__line">
          <span class="xn-code__ln">{{ index + 1 }}</span>
          <code class="xn-code__content">
            <span v-for="(token, ti) in line" :key="ti" :class="`is-${token.type}`">{{
              token.text
            }}</span>
          </code>
        </div>
      </div>
      <div v-else class="xn-code__lines">
        <div v-for="(line, index) in textLines" :key="index" class="xn-code__line">
          <span class="xn-code__ln">{{ index + 1 }}</span>
          <code class="xn-code__content">{{ line || ' ' }}</code>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import xnCopy from '@/components/xnCopy/xnCopy.vue'
import { formatCode, splitLines, tokenizeJson } from '@/utils/code-format'

export default {
  name: 'XnCode',
  components: { xnCopy },
  props: {
    value: { default: '' },
    language: { type: String, default: 'text' },
    title: { type: String, default: '' },
    maxHeight: { type: String, default: '280px' },
    showCopy: { type: Boolean, default: true },
  },
  computed: {
    source() {
      return formatCode(this.value, this.language)
    },
    textLines() {
      return splitLines(this.source)
    },
    jsonLines() {
      return splitLines(this.source).map((line) => tokenizeJson(line))
    },
  },
}
</script>

<style scoped>
.xn-code {
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.xn-code__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-light);
}

.xn-code__title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.xn-code__body {
  overflow: auto;
  padding: 8px 0;
}

.xn-code__line {
  display: flex;
  min-width: max-content;
  padding: 0 12px 0 0;
  line-height: 1.6;
}

.xn-code__ln {
  flex: 0 0 40px;
  padding-right: 8px;
  text-align: right;
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  user-select: none;
}

.xn-code__content {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  white-space: pre;
  color: var(--el-text-color-primary);
}

.is-key {
  color: #9a3412;
}

.is-string {
  color: #166534;
}

.is-number {
  color: #1d4ed8;
}

.is-bool,
.is-null {
  color: #7c3aed;
}

.is-punct {
  color: var(--el-text-color-secondary);
}
</style>
