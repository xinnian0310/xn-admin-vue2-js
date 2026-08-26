<template>
  <xnPopconfirm
    v-if="confirm"
    :title="confirmTitle"
    :disabled="disabled || loading"
    @confirm="handleExport"
  >
    <el-button
      :type="type"
      :plain="plain"
      :size="size"
      :disabled="disabled || loading"
      :loading="loading"
      :icon="Download"
    >
      <slot>{{ text }}</slot>
    </el-button>
  </xnPopconfirm>
  <el-button
    v-else
    :type="type"
    :plain="plain"
    :size="size"
    :disabled="disabled || loading"
    :loading="loading"
    :icon="Download"
    @click="handleExport"
  >
    <slot>{{ text }}</slot>
  </el-button>
</template>

<script>
import { Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import xnPopconfirm from '@/components/xnPopconfirm/xnPopconfirm.vue'
import { buildQueryString, downloadWithAuth } from '@/utils/download'
import { showCaughtError } from '@/utils/request'

export default {
  name: 'XnExport',
  components: { xnPopconfirm },
  props: {
    /** 自定义导出；传入后忽略 url */
    request: { type: Function, default: undefined },
    /** 带鉴权的下载地址，如 /api/users/export */
    url: { type: String, default: '' },
    filename: { type: String, default: 'export.xlsx' },
    params: { type: Object, default: () => ({}) },
    text: { type: String, default: '导出' },
    type: { type: String, default: 'primary' },
    plain: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    size: { type: String, default: 'default' },
    /** 成功后是否 toast；页面自己提示时关掉，避免双提示 */
    showMessage: { type: Boolean, default: true },
    successMessage: { type: String, default: '导出成功' },
    /** 导出前气泡确认 */
    confirm: { type: Boolean, default: false },
    confirmTitle: { type: String, default: '确定导出当前数据吗？' },
  },
  emits: ['success', 'error'],
  data() {
    return {
      loading: false,
      Download,
    }
  },
  methods: {
    async handleExport() {
      if (this.loading || this.disabled) return
      this.loading = true
      try {
        if (this.request) {
          await this.request()
        } else if (this.url) {
          const qs = buildQueryString(this.params || {})
          await downloadWithAuth(`${this.url}${qs}`, this.filename)
        } else {
          throw new Error('未配置导出请求')
        }
        if (this.showMessage) ElMessage.success(this.successMessage)
        this.$emit('success')
      } catch (error) {
        const message = error instanceof Error ? error.message : '导出失败'
        this.$emit('error', message)
        showCaughtError(error, '导出失败')
      } finally {
        this.loading = false
      }
    },
    export: function exportFn() {
      return this.handleExport()
    },
  },
}
</script>
