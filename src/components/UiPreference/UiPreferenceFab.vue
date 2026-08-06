<template>
  <button
    type="button"
    class="ui-pref-fab"
    :class="{ 'is-dragging': dragging, 'is-open': drawerVisible }"
    :style="{ top: `${topPx}px` }"
    title="布局与字号（可上下拖动）"
    aria-label="布局与字号"
    @pointerdown="onPointerDown"
  >
    <el-icon :size="16"><Setting /></el-icon>
  </button>

  <el-drawer
    v-model="drawerVisible"
    title="界面偏好"
    direction="rtl"
    size="420px"
    append-to-body
    destroy-on-close
    @closed="closeDrawer"
  >
    <p class="ui-pref-hint">
      自定义本账号的布局模式、系统字号与标签栏高度；未设置的项沿用管理员通用配置。
    </p>
    <el-form label-width="100px" class="ui-pref-form" @submit.prevent>
      <el-form-item label="布局模式">
        <el-radio-group v-model="form.layoutMode">
          <el-radio-button value="side">左侧</el-radio-button>
          <el-radio-button value="top">顶部</el-radio-button>
          <el-radio-button value="mix">混合</el-radio-button>
          <el-radio-button value="columns">双列</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="弹窗最大高度">
        <el-input v-model="form.dialogMaxHeight" placeholder="如 95vh" />
      </el-form-item>
      <el-form-item label="标签栏高度">
        <div class="px-field">
          <el-input-number
            v-model="form.tagsViewHeight"
            :min="1"
            :max="120"
            :step="1"
            controls-position="right"
          />
          <span class="px-field__unit">px</span>
        </div>
      </el-form-item>
      <el-form-item label="侧栏字号">
        <div class="px-field">
          <el-input-number
            v-model="form.sidebar"
            :min="1"
            :max="48"
            :step="1"
            controls-position="right"
          />
          <span class="px-field__unit">px</span>
        </div>
      </el-form-item>
      <el-form-item label="顶栏字号">
        <div class="px-field">
          <el-input-number
            v-model="form.header"
            :min="1"
            :max="48"
            :step="1"
            controls-position="right"
          />
          <span class="px-field__unit">px</span>
        </div>
      </el-form-item>
      <el-form-item label="标签栏字号">
        <div class="px-field">
          <el-input-number
            v-model="form.tagsView"
            :min="1"
            :max="48"
            :step="1"
            controls-position="right"
          />
          <span class="px-field__unit">px</span>
        </div>
      </el-form-item>
      <el-form-item label="正文字号">
        <div class="px-field">
          <el-input-number
            v-model="form.main"
            :min="1"
            :max="48"
            :step="1"
            controls-position="right"
          />
          <span class="px-field__unit">px</span>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="ui-pref-footer">
        <el-button :loading="resetting" @click="onReset">恢复通用</el-button>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script>
import { ElMessage } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
import { appConfig } from '@/config/app'
import { useUiPreferenceStore } from '@/stores/uiPreference'
import { parsePxInt, toPx } from '@/utils/px'

const STORAGE_KEY = 'xn-ui-pref-fab-top'
const FAB_HEIGHT = 48
const DRAG_THRESHOLD = 4

function loadTop() {
  const raw = localStorage.getItem(STORAGE_KEY)
  const n = raw ? Number(raw) : NaN
  if (Number.isFinite(n)) return clampTop(n)
  return Math.round(window.innerHeight * 0.62)
}

function clampTop(value) {
  const max = Math.max(8, window.innerHeight - FAB_HEIGHT - 8)
  return Math.min(max, Math.max(8, Math.round(value)))
}

export default {
  name: 'UiPreferenceFab',
  components: { Setting },
  setup() {
    const uiPrefStore = useUiPreferenceStore()
    return { uiPrefStore }
  },
  data() {
    return {
      saving: false,
      resetting: false,
      dragging: false,
      topPx: loadTop(),
      form: {
        layoutMode: 'side',
        dialogMaxHeight: '95vh',
        tagsViewHeight: 40,
        sidebar: 14,
        header: 14,
        tagsView: 14,
        main: 14,
      },
      pointerId: null,
      startY: 0,
      startTop: 0,
      moved: false,
    }
  },
  computed: {
    drawerVisible: {
      get() {
        return this.uiPrefStore.drawerVisible
      },
      set(v) {
        if (v) this.uiPrefStore.openDrawer()
        else this.uiPrefStore.closeDrawer()
      },
    },
  },
  watch: {
    'uiPrefStore.drawerVisible'(open) {
      if (open) this.syncFormFromApp()
    },
  },
  mounted() {
    window.addEventListener('resize', this.onResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('pointercancel', this.onPointerUp)
  },
  methods: {
    persistTop() {
      localStorage.setItem(STORAGE_KEY, String(this.topPx))
    },
    syncFormFromApp() {
      this.form.layoutMode = appConfig.ui.layout.mode
      this.form.dialogMaxHeight = appConfig.ui.dialog.maxHeight
      this.form.tagsViewHeight = parsePxInt(appConfig.ui.tagsView.height, 40)
      this.form.sidebar = parsePxInt(appConfig.ui.fontSize.sidebar, 14)
      this.form.header = parsePxInt(appConfig.ui.fontSize.header, 14)
      this.form.tagsView = parsePxInt(appConfig.ui.fontSize.tagsView, 14)
      this.form.main = parsePxInt(appConfig.ui.fontSize.main, 14)
    },
    closeDrawer() {
      this.uiPrefStore.closeDrawer()
    },
    onPointerDown(e) {
      if (e.button !== 0) return
      this.pointerId = e.pointerId
      this.startY = e.clientY
      this.startTop = this.topPx
      this.moved = false
      this.dragging = true
      e.currentTarget.setPointerCapture(e.pointerId)
      window.addEventListener('pointermove', this.onPointerMove)
      window.addEventListener('pointerup', this.onPointerUp)
      window.addEventListener('pointercancel', this.onPointerUp)
    },
    onPointerMove(e) {
      if (this.pointerId !== e.pointerId) return
      const dy = e.clientY - this.startY
      if (Math.abs(dy) > DRAG_THRESHOLD) this.moved = true
      this.topPx = clampTop(this.startTop + dy)
    },
    onPointerUp(e) {
      if (this.pointerId !== e.pointerId) return
      this.pointerId = null
      this.dragging = false
      window.removeEventListener('pointermove', this.onPointerMove)
      window.removeEventListener('pointerup', this.onPointerUp)
      window.removeEventListener('pointercancel', this.onPointerUp)
      this.persistTop()
      if (!this.moved) this.uiPrefStore.openDrawer()
    },
    onResize() {
      this.topPx = clampTop(this.topPx)
    },
    async onSave() {
      this.saving = true
      try {
        await this.uiPrefStore.save({
          layout: { mode: this.form.layoutMode },
          dialog: { maxHeight: this.form.dialogMaxHeight.trim() || '95vh' },
          tagsView: { height: toPx(this.form.tagsViewHeight, 40) },
          fontSize: {
            sidebar: toPx(this.form.sidebar, 14),
            header: toPx(this.form.header, 14),
            tagsView: toPx(this.form.tagsView, 14),
            main: toPx(this.form.main, 14),
          },
        })
        ElMessage.success('个人布局已保存')
        this.closeDrawer()
      } catch (err) {
        ElMessage.error(err instanceof Error ? err.message : '保存失败')
      } finally {
        this.saving = false
      }
    },
    async onReset() {
      this.resetting = true
      try {
        await this.uiPrefStore.reset()
        this.syncFormFromApp()
        ElMessage.success('已恢复为通用配置')
      } catch (err) {
        ElMessage.error(err instanceof Error ? err.message : '重置失败')
      } finally {
        this.resetting = false
      }
    },
  },
}
</script>

<style scoped>
.ui-pref-fab {
  position: fixed;
  right: 0;
  z-index: 2800;
  width: 22px;
  height: 48px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 24px 0 0 24px;
  background: var(--el-color-primary);
  color: #fff;
  cursor: grab;
  box-shadow: -2px 2px 10px color-mix(in srgb, var(--el-color-primary) 40%, transparent);
  transition:
    width 0.18s ease,
    filter 0.15s ease;
  touch-action: none;
  user-select: none;
}

.ui-pref-fab:hover,
.ui-pref-fab.is-open {
  width: 36px;
  filter: brightness(1.05);
}

.ui-pref-fab.is-dragging {
  cursor: grabbing;
  transition: none;
  filter: brightness(1.08);
}

.ui-pref-hint {
  margin: 0 0 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.ui-pref-form :deep(.el-radio-group) {
  display: flex;
  flex-wrap: nowrap;
}

.ui-pref-form :deep(.el-input-number) {
  width: 140px;
}

.px-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.px-field__unit {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.ui-pref-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
