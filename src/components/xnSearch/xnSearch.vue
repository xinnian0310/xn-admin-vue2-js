<template>
  <el-header ref="searchRef" class="xn-search" :height="height">
    <el-form :inline="true" :model="form" class="xn-search__form" @submit.prevent="handleQuery">
      <div
        v-for="(item, index) in searchItem"
        :key="item.prop"
        ref="formItemRefs"
        class="xn-search__field"
        :style="{ display: fieldDisplay(index) }"
      >
        <el-form-item :label="item.label">
          <div class="xn-search__control" :style="fieldStyle(item)">
            <el-input
              v-if="item.type === 'input'"
              v-model="form[item.prop]"
              :placeholder="item.placeholder ?? `请输入${item.label}`"
              :clearable="item.clearable !== false"
              @keydown.enter.stop="handleQuery"
            />

            <el-input-number
              v-else-if="item.type === 'number'"
              v-model="form[item.prop]"
              :placeholder="item.placeholder ?? `请输入${item.label}`"
              :controls="false"
            />

            <el-select
              v-else-if="item.type === 'select'"
              v-model="form[item.prop]"
              :placeholder="item.placeholder ?? `请选择${item.label}`"
              :clearable="item.clearable !== false"
              :multiple="item.multiple"
            >
              <el-option
                v-for="opt in item.options ?? []"
                :key="String(opt.value)"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>

            <xnDictSelect
              v-else-if="item.type === 'dict'"
              v-model="form[item.prop]"
              :dict-type="item.dictType"
              :options="item.options"
              :clearable="item.clearable !== false"
              :multiple="item.multiple"
              :placeholder="item.placeholder ?? `请选择${item.label}`"
            />

            <xnRegion
              v-else-if="item.type === 'region'"
              v-model="form[item.prop]"
              :level="item.level || 3"
              :clearable="item.clearable !== false"
              :placeholder="item.placeholder ?? `请选择${item.label}`"
            />

            <el-date-picker
              v-else-if="item.type === 'date'"
              v-model="form[item.prop]"
              type="date"
              value-format="YYYY-MM-DD"
              :placeholder="item.placeholder ?? `请选择${item.label}`"
              :clearable="item.clearable !== false"
            />

            <el-date-picker
              v-else-if="item.type === 'datetime'"
              v-model="form[item.prop]"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              :placeholder="item.placeholder ?? `请选择${item.label}`"
              :clearable="item.clearable !== false"
            />

            <el-date-picker
              v-else-if="item.type === 'daterange'"
              v-model="form[item.prop]"
              type="daterange"
              value-format="YYYY-MM-DD"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              :clearable="item.clearable !== false"
            />
          </div>
        </el-form-item>
      </div>

      <div v-if="$slots.default" ref="slotRef" class="xn-search__field">
        <slot />
      </div>

      <div ref="btnRef" class="xn-search__btn-wrap">
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
          <el-button type="warning" :icon="Refresh" @click="handleReset">重置</el-button>
          <el-button
            v-if="hasOverflow"
            type="primary"
            :icon="collapsed ? CaretBottom : CaretTop"
            @click="toggleAdvanced"
          />
          <slot name="button" />
        </el-form-item>
      </div>
    </el-form>
  </el-header>
</template>

<script>
import { markRaw } from 'vue'
import { CaretBottom, CaretTop, Refresh, Search } from '@element-plus/icons-vue'
import { SEARCH_FIELD_DEFAULT_WIDTH } from '@/types/search'
import xnDictSelect from '@/components/xnDictSelect/xnDictSelect.vue'
import xnRegion from '@/components/xnRegion/xnRegion.vue'

export default {
  name: 'xnSearch',
  components: { xnDictSelect, xnRegion },
  props: {
    searchItem: { required: true },
    height: { type: String, required: false, default: 'auto' },
    fieldWidth: { required: false, default: SEARCH_FIELD_DEFAULT_WIDTH },
  },
  emits: ['queryForm', 'reset'],
  setup() {
    return {
      CaretBottom: markRaw(CaretBottom),
      CaretTop: markRaw(CaretTop),
      Refresh: markRaw(Refresh),
      Search: markRaw(Search),
    }
  },
  data() {
    return {
      form: {},
      formItemWidths: [],
      slotWidth: 0,
      btnWidth: 0,
      overflowIndices: [],
      slotOverflow: false,
      hasOverflow: false,
      collapsed: true,
      resizeTimer: null,
    }
  },
  watch: {
    searchItem: {
      handler() {
        this.resetForm()
        this.refreshLayout()
      },
      deep: true,
    },
  },
  mounted() {
    this.resetForm()
    this.refreshLayout()
    window.addEventListener('resize', this.debounceRefreshLayout)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.debounceRefreshLayout)
    if (this.resizeTimer) clearTimeout(this.resizeTimer)
  },
  methods: {
    createInitialForm() {
      const next = {}
      for (const item of this.searchItem) {
        if (item.type === 'daterange' || item.type === 'region') {
          next[item.prop] = []
        } else if (item.type === 'number') {
          next[item.prop] = undefined
        } else {
          next[item.prop] = ''
        }
      }
      return next
    },
    resetForm() {
      Object.assign(this.form, this.createInitialForm())
    },
    fieldStyle(item) {
      const width = item.width ?? this.fieldWidth
      return { width: typeof width === 'number' ? `${width}px` : width }
    },
    fieldDisplay(index) {
      if (!this.collapsed) return 'inline-block'
      return this.overflowIndices.includes(index) ? 'none' : 'inline-block'
    },
    buildQueryForm() {
      const result = { ...this.form }
      for (const key of Object.keys(result)) {
        const value = result[key]
        if (value !== 0 && (value === '' || value === null || value === undefined)) {
          delete result[key]
        }
        if (Array.isArray(value) && value.length === 0) {
          delete result[key]
        }
      }
      return result
    },
    handleQuery() {
      this.$emit('queryForm', this.buildQueryForm())
    },
    handleReset() {
      this.resetForm()
      this.$emit('reset', this.buildQueryForm())
    },
    toggleAdvanced() {
      this.collapsed = !this.collapsed
      this.applyCollapsedDisplay()
    },
    applyCollapsedDisplay() {
      const items = this.$refs.formItemRefs ?? []
      items.forEach((el, index) => {
        el.style.display = this.fieldDisplay(index)
      })
      if (this.$refs.slotRef) {
        this.$refs.slotRef.style.display =
          this.collapsed && this.slotOverflow ? 'none' : 'inline-block'
      }
    },
    async measureWidths() {
      await this.$nextTick()
      const items = this.$refs.formItemRefs ?? []
      items.forEach((el) => {
        el.style.display = 'inline-block'
      })
      if (this.$refs.slotRef) {
        this.$refs.slotRef.style.display = 'inline-block'
      }
      await this.$nextTick()
      this.formItemWidths = items.map((el) => el.offsetWidth)
      this.slotWidth = this.$refs.slotRef?.offsetWidth ?? 0
      this.btnWidth = this.$refs.btnRef?.offsetWidth ?? 0
    },
    updateLayout() {
      const root = this.$refs.searchRef
      const container = root && '$el' in root ? root.$el : root
      if (!container || !this.btnWidth) return
      const warpWidth = container.clientWidth - 28
      let itemAllWidth = this.btnWidth
      const hidden = []
      let slotHidden = false
      this.formItemWidths.forEach((width, index) => {
        itemAllWidth += width
        if (itemAllWidth >= warpWidth - 60) {
          hidden.push(index)
        }
      })
      if (this.$slots.default && this.slotWidth) {
        itemAllWidth += this.slotWidth
        if (itemAllWidth >= warpWidth - 60) {
          slotHidden = true
        }
      }
      this.overflowIndices = hidden
      this.slotOverflow = slotHidden
      this.hasOverflow = hidden.length > 0 || slotHidden
      if (!this.hasOverflow) {
        this.collapsed = true
      }
      this.applyCollapsedDisplay()
    },
    async refreshLayout() {
      await this.measureWidths()
      this.updateLayout()
    },
    debounceRefreshLayout() {
      if (this.resizeTimer) clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => {
        this.updateLayout()
      }, 120)
    },
  },
}
</script>

<style scoped>
.xn-search {
  padding: 0;
  height: auto !important;
  position: relative;
  --el-input-focus-border-color: var(--app-accent, var(--el-color-primary));
  --el-select-border-color-hover: var(--app-accent, var(--el-color-primary));
}

.xn-search__form {
  height: auto;
}

.xn-search__field,
.xn-search__btn-wrap {
  display: inline-block;
  vertical-align: top;
}

.xn-search__form :deep(.el-form-item) {
  margin-bottom: 13px;
  margin-right: 16px;
}

.xn-search__control {
  display: inline-block;
  vertical-align: top;
}

.xn-search__control :deep(.el-input),
.xn-search__control :deep(.el-select),
.xn-search__control :deep(.el-date-editor),
.xn-search__control :deep(.el-input-number) {
  width: 100%;
}
</style>
