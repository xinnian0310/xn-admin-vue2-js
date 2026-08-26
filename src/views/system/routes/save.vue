<template>
  <xnDialog
    v-model="visible"
    :title="dialogTitle"
    width="640px"
    show-fullscreen
    :show-confirm="mode !== 'view'"
    :confirm-loading="submitting"
    confirm-text="保存"
    :cancel-text="mode === 'view' ? '关闭' : '取消'"
    @confirm="handleSubmit"
    @closed="handleClosed"
  >
    <el-alert
      class="route-tip"
      type="info"
      :closable="false"
      show-icon
      :title="tipTitle"
      :description="tipDescription"
    />

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      :disabled="mode === 'view'"
    >
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" />
      </el-form-item>
      <el-form-item label="类型" prop="type">
        <el-cascader
          v-model="typePath"
          :options="typeOptions"
          :disabled="mode === 'view' || editingBuiltIn"
          :props="{ expandTrigger: 'hover' }"
          placeholder="请选择类型"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="父节点" prop="parentId">
        <el-tree-select
          v-model="form.parentId"
          :data="parentOptions"
          :props="{ label: 'title', value: 'id', children: 'children' }"
          check-strictly
          clearable
          placeholder="无（顶级）"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item v-if="form.type === 'MENU'" label="访问路径" prop="path">
        <el-input
          v-model="form.path"
          placeholder="system/roles"
          @blur="normalizePathInput"
          @input="syncViewPath"
        >
          <template #prepend>/</template>
        </el-input>
      </el-form-item>
      <el-form-item v-if="form.type === 'MENU'" label="视图目录" prop="viewPath">
        <el-input :model-value="form.viewPath" disabled placeholder="system/roles">
          <template #prepend>views/</template>
          <template #append>/index.vue</template>
        </el-input>
      </el-form-item>
      <el-form-item v-if="form.type === 'LINK'" label="外部链接" prop="linkUrl">
        <el-input v-model="form.linkUrl" placeholder="www.baidu.com 或 https://example.com" />
      </el-form-item>
      <el-form-item label="图标" prop="icon">
        <xnIconPicker
          v-model="form.icon"
          :disabled="mode === 'view'"
          placeholder="选择 Element / Iconify / SVG 图标"
        />
      </el-form-item>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="排序" prop="sort">
            <el-input-number v-model="form.sort" :min="0" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio :value="1">启用</el-radio>
              <el-radio :value="0">禁用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="隐藏菜单" prop="hidden">
            <el-switch v-model="form.hidden" />
          </el-form-item>
        </el-col>
        <el-col v-if="form.type === 'MENU'" :span="12">
          <el-form-item label="权限控制" prop="permissionControl">
            <el-switch v-model="form.permissionControl" />
            <span class="form-tip-inline">开启后需分配菜单权限</span>
          </el-form-item>
        </el-col>
        <el-col v-if="form.type === 'MENU' || form.type === 'LINK'" :span="12">
          <el-form-item label="固定标签" prop="affix">
            <el-switch v-model="form.affix" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </xnDialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import { useCrudApi } from '@/composables/useCrudApi'
import xnIconPicker from '@/components/xnIconPicker/xnIconPicker.vue'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import { autoViewPath, normalizeRoutePath } from '@/utils/route-path'
import { hasIndexView } from '@/utils/view-loader'
import { saveDialogTitle } from '@/types/save'

/** 一级：本地页面 / 外部链接；二级仅本地页面下有目录、菜单 */
const typeOptions = [
  {
    value: 'local',
    label: '本地页面',
    children: [
      { value: 'DIR', label: '目录' },
      { value: 'MENU', label: '菜单' },
    ],
  },
  { value: 'LINK', label: '外部链接' },
]

export default {
  name: 'RoutesSave',
  components: { xnIconPicker, xnDialog },
  emits: ['success'],
  setup() {
    const api = useCrudApi()
    return { api }
  },
  data() {
    return {
      visible: false,
      mode: 'add',
      editingId: null,
      submitting: false,
      editingBuiltIn: false,
      parentOptions: [],
      typeOptions,
      form: {
        title: '',
        path: '',
        viewPath: '',
        linkUrl: '',
        icon: '',
        permission: '',
        parentId: undefined,
        type: 'MENU',
        sort: 0,
        status: 1,
        hidden: false,
        affix: false,
        permissionControl: false,
      },
      rules: {
        title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
        type: [{ required: true, message: '请选择类型', trigger: 'change' }],
        path: [
          {
            validator: (_rule, value, callback) => {
              if (this.form.type === 'MENU' && !String(value ?? '').trim()) {
                callback(new Error('菜单必须填写访问路径'))
              } else {
                callback()
              }
            },
            trigger: 'blur',
          },
        ],
        linkUrl: [
          {
            validator: (_rule, value, callback) => {
              if (this.form.type === 'LINK' && !String(value ?? '').trim()) {
                callback(new Error('请填写外部链接'))
              } else {
                callback()
              }
            },
            trigger: 'blur',
          },
        ],
      },
    }
  },
  computed: {
    dialogTitle() {
      return saveDialogTitle(this.mode, '路由')
    },
    tipTitle() {
      return this.form.type === 'LINK' ? '外部链接内嵌规则' : '路径与视图对应规则'
    },
    tipDescription() {
      if (this.form.type === 'LINK') {
        return '填写外部网址后，将在主内容区以 iframe 内嵌打开。未写协议时默认补全为 https://。系统访问路径由后端自动生成。部分站点禁止被嵌套时页面可能空白。'
      }
      return '访问路径可写 system/roles 或 /system/roles（缺省会自动补 /），对应 views/system/roles/index.vue。视图目录随路径自动生成，不可编辑。菜单类型可带下级；目录仅作分组。权限标识由系统自动生成。'
    },
    typePath: {
      get() {
        if (this.form.type === 'LINK') return ['LINK']
        if (this.form.type === 'DIR' || this.form.type === 'MENU') return ['local', this.form.type]
        return []
      },
      set(val) {
        if (!val?.length) return
        const leaf = val[val.length - 1]
        if (leaf === 'DIR' || leaf === 'MENU' || leaf === 'LINK') {
          this.form.type = leaf
        }
      },
    },
  },
  watch: {
    'form.path'() {
      if (this.form.type === 'MENU') {
        this.syncViewPath()
      }
    },
    'form.type'(type) {
      if (type === 'DIR') {
        this.form.path = ''
        this.form.viewPath = ''
        this.form.linkUrl = ''
      } else if (type === 'LINK') {
        // 新建时不展示路径；编辑时保留已有 path 供提交
        if (this.mode === 'add') {
          this.form.path = ''
        }
        this.form.viewPath = ''
        this.form.permissionControl = false
      } else if (type === 'MENU') {
        this.form.linkUrl = ''
        this.syncViewPath()
      }
    },
  },
  methods: {
    pathForInput(path) {
      return path.replace(/^\//, '')
    },
    syncViewPath() {
      if (this.form.type !== 'MENU') return
      const normalized = normalizeRoutePath(this.form.path ?? '')
      this.form.viewPath = normalized ? autoViewPath(normalized) : ''
    },
    normalizePathInput() {
      if (!this.form.path?.trim()) {
        this.form.path = ''
        this.form.viewPath = ''
        return
      }
      const normalized = normalizeRoutePath(this.form.path)
      this.form.path = this.pathForInput(normalized)
      if (this.form.type === 'MENU') {
        this.form.viewPath = autoViewPath(normalized)
      }
    },
    normalizeLinkUrl(url) {
      const cleaned = url.trim()
      if (!cleaned) return ''
      if (cleaned.startsWith('//')) return `https:${cleaned}`
      if (!/^[a-z][a-z0-9+.-]*:/i.test(cleaned)) return `https://${cleaned}`
      return cleaned
    },
    resetForm() {
      this.form.title = ''
      this.form.path = ''
      this.form.viewPath = ''
      this.form.linkUrl = ''
      this.form.icon = ''
      this.form.permission = ''
      this.form.parentId = undefined
      this.form.type = 'MENU'
      this.form.sort = 0
      this.form.status = 1
      this.form.hidden = false
      this.form.affix = false
      this.form.permissionControl = false
      this.editingId = null
      this.editingBuiltIn = false
      this.$refs.formRef?.clearValidate()
    },
    async loadTree() {
      const res = await this.api.list()
      this.parentOptions = res.data
    },
    async loadDetail(id) {
      const res = await this.api.get(id)
      const data = res.data
      this.editingBuiltIn = data.builtIn
      this.form.title = data.title
      this.form.path = this.pathForInput(data.path ?? '')
      this.form.viewPath = data.viewPath || autoViewPath(data.path ?? '')
      this.form.linkUrl = data.linkUrl ?? ''
      this.form.icon = data.icon ?? ''
      this.form.permission = data.permission ?? ''
      this.form.parentId = data.parentId ?? undefined
      this.form.type = data.type
      this.form.sort = data.sort
      this.form.status = data.status
      this.form.hidden = data.hidden
      this.form.affix = data.affix
      this.form.permissionControl = !!data.permissionControl
    },
    async open(openMode, id, options) {
      this.mode = openMode
      this.resetForm()
      this.editingId = id ?? null
      await this.loadTree()
      this.visible = true
      if (openMode === 'add' && options?.parentId) {
        this.form.parentId = options.parentId
        this.form.type = 'MENU'
      } else if (openMode !== 'add' && id) {
        await this.loadDetail(id)
      }
    },
    async handleSubmit() {
      const formRef = this.$refs.formRef
      if (!formRef) return
      await formRef.validate(async (valid) => {
        if (!valid) return

        let normalizedPath
        if (this.form.type === 'MENU') {
          normalizedPath = normalizeRoutePath(this.form.path ?? '')
        } else if (this.form.type === 'LINK' && this.form.path?.trim()) {
          // 编辑时保留已有访问路径；新建由后端根据外链自动生成
          normalizedPath = normalizeRoutePath(this.form.path)
        }

        const viewPath =
          this.form.type === 'MENU' && normalizedPath ? autoViewPath(normalizedPath) : undefined
        const linkUrl =
          this.form.type === 'LINK' ? this.normalizeLinkUrl(this.form.linkUrl ?? '') : undefined

        if (this.form.type === 'MENU' && normalizedPath && !hasIndexView(normalizedPath)) {
          ElMessage.warning(`views/${viewPath}/index.vue 尚未创建，请先创建对应页面文件`)
        }

        this.submitting = true
        try {
          const payload = {
            ...this.form,
            parentId: this.form.parentId || undefined,
            path: normalizedPath,
            viewPath,
            linkUrl,
            permissionControl: this.form.type === 'MENU' ? this.form.permissionControl : false,
          }
          if (this.mode === 'edit' && this.editingId) {
            await this.api.update(this.editingId, payload)
            ElMessage.success('更新成功')
          } else {
            await this.api.create(payload)
            ElMessage.success('创建成功')
          }
          this.visible = false
          this.$emit('success')
        } finally {
          this.submitting = false
        }
      })
    },
    handleClosed() {
      this.resetForm()
    },
  },
}
</script>

<style scoped>
.route-tip {
  margin-bottom: 16px;
}

.form-tip {
  font-size: var(--app-font-size-main);
  color: #909399;
  line-height: 1.4;
  margin-top: 4px;
}

.form-tip-inline {
  margin-left: 8px;
  font-size: var(--app-font-size-main);
  color: #909399;
  white-space: nowrap;
}
</style>
