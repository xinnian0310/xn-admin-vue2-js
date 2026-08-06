<template>
  <xnPageLayout
    class="api-docs-page"
    :show-view-switch="false"
  >
    <template #toolbar>
      <span class="api-docs-hint">{{ modeHint }}</span>
    </template>

    <template #toolbar-extra>
      <el-radio-group v-model="mode" size="default">
        <el-radio-button value="ui">UI</el-radio-button>
        <el-radio-button value="api">API</el-radio-button>
      </el-radio-group>
      <el-button
        v-if="mode === 'ui'"
        tag="a"
        href="/swagger-ui/index.html"
        target="_blank"
        rel="noopener noreferrer"
      >
        新窗口打开
      </el-button>
    </template>

    <template v-if="mode === 'api'" #search>
      <xnSearch :search-item="searchItems" @query-form="onQuery" @reset="onReset" />
    </template>

    <template v-if="mode === 'api'" #table>
      <xnTable
        v-model:page="page"
        v-model:page-size="size"
        :data="pagedApis"
        :total="filteredApis.length"
        :loading="loading"
        table-key="system:api-docs"
        entity-name="接口"
        name-field="path"
        :columns="columns"
        :action-items="[]"
        stripe
        @page-change="noop"
      >
        <template #method="{ row }">
          <el-tag :type="methodTag(row.method)" effect="plain" size="small">
            {{ row.method }}
          </el-tag>
        </template>
      </xnTable>
    </template>

    <div v-if="mode === 'ui'" class="swagger-wrap">
      <iframe class="swagger-frame" :src="swaggerSrc" title="Swagger UI" />
    </div>
  </xnPageLayout>
</template>

<script>
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import { getApiRegistry } from '@/api/auth'

const MODE_KEY = 'xn-api-docs-mode'

function readStoredMode() {
  return localStorage.getItem(MODE_KEY) === 'api' ? 'api' : 'ui'
}

const searchItems = [
  {
    label: '方法',
    prop: 'method',
    type: 'select',
    placeholder: '全部方法',
    clearable: true,
    width: 140,
    options: [
      { label: 'GET', value: 'GET' },
      { label: 'POST', value: 'POST' },
      { label: 'PUT', value: 'PUT' },
      { label: 'PATCH', value: 'PATCH' },
      { label: 'DELETE', value: 'DELETE' },
    ],
  },
  {
    label: '路径',
    prop: 'keyword',
    type: 'input',
    placeholder: '搜索路径关键字',
    width: 280,
  },
]

const columns = [
  { type: 'index', label: '#', width: 60, align: 'center' },
  { type: 'slot', slot: 'method', prop: 'method', label: '方法', width: 110 },
  { prop: 'path', label: '路径', minWidth: 360, showOverflowTooltip: true },
]

export default {
  name: 'SystemApiDocs',
  components: {
    xnPageLayout,
    xnSearch,
    xnTable,
  },
  data() {
    return {
      mode: readStoredMode(),
      loading: false,
      apis: [],
      page: 1,
      size: 20,
      queryForm: {},
      swaggerTick: 0,
      searchItems,
      columns,
    }
  },
  computed: {
    swaggerSrc() {
      return `/swagger-ui/index.html?t=${this.swaggerTick}`
    },
    modeHint() {
      return this.mode === 'ui'
        ? 'Swagger UI：在线查看与调试 OpenAPI 接口'
        : 'API 登记：权限系统扫描到的方法/路径（供角色权限对照）'
    },
    filteredApis() {
      const method = String(this.queryForm.method ?? '')
        .trim()
        .toUpperCase()
      const keyword = String(this.queryForm.keyword ?? '')
        .trim()
        .toLowerCase()
      return this.apis.filter((a) => {
        if (method && a.method.toUpperCase() !== method) return false
        if (!keyword) return true
        return a.path.toLowerCase().includes(keyword) || a.method.toLowerCase().includes(keyword)
      })
    },
    pagedApis() {
      const start = (this.page - 1) * this.size
      return this.filteredApis.slice(start, start + this.size)
    },
  },
  watch: {
    mode(val) {
      localStorage.setItem(MODE_KEY, val)
      if (val === 'api' && !this.apis.length) {
        this.loadApis()
      }
      if (val === 'ui') {
        this.swaggerTick = Date.now()
      }
    },
  },
  mounted() {
    if (this.mode === 'api') this.loadApis()
    else this.swaggerTick = Date.now()
  },
  methods: {
    noop() {},
    methodTag(method) {
      const m = (method || '').toUpperCase()
      if (m === 'GET') return 'success'
      if (m === 'POST') return 'primary'
      if (m === 'PUT' || m === 'PATCH') return 'warning'
      if (m === 'DELETE') return 'danger'
      return 'info'
    },
    onQuery(form) {
      this.queryForm = { ...form }
      this.page = 1
    },
    onReset() {
      this.queryForm = {}
      this.page = 1
    },
    async loadApis() {
      this.loading = true
      try {
        const res = await getApiRegistry()
        this.apis = [...(res.data?.apis || [])].sort((a, b) =>
          `${a.path}${a.method}`.localeCompare(`${b.path}${b.method}`),
        )
      } finally {
        this.loading = false
      }
    },
  },
}
</script>

<style scoped>
.api-docs-page {
  min-height: 0;
}

.api-docs-hint {
  font-size: 13px;
  color: var(--app-text-muted, #909399);
  line-height: 1.4;
}

.swagger-wrap {
  flex: 1;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.swagger-frame {
  flex: 1;
  width: 100%;
  min-height: 640px;
  height: 100%;
  border: 1px solid var(--app-border-color, var(--el-border-color));
  border-radius: 8px;
  background: var(--app-card-bg, #fff);
}
</style>
