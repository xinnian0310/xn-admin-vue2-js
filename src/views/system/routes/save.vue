<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="640px"
    destroy-on-close
    @closed="handleClosed"
  >
    <el-alert
      class="route-tip"
      type="info"
      :closable="false"
      show-icon
      title="路径与视图对应规则"
      description="访问路径可写 system/roles 或 /system/roles（缺省会自动补 /），对应 views/system/roles/index.vue。视图目录随路径自动生成，不可编辑。菜单类型可带下级；目录仅作分组。权限标识由系统自动生成。"
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
        <el-radio-group v-model="form.type" :disabled="mode === 'view' || editingBuiltIn">
          <el-radio value="DIR">目录</el-radio>
          <el-radio value="MENU">菜单</el-radio>
        </el-radio-group>
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
      <el-form-item label="图标" prop="icon">
        <xnIconPicker
          v-model="form.icon"
          :disabled="mode === 'view'"
          placeholder="选择 Element / Iconify / SVG 图标"
        />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="form.sort" :min="0" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">启用</el-radio>
          <el-radio :value="0">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="隐藏菜单" prop="hidden">
        <el-switch v-model="form.hidden" />
      </el-form-item>
      <el-form-item v-if="form.type === 'MENU'" label="权限控制" prop="permissionControl">
        <div>
          <el-switch v-model="form.permissionControl" />
          <div class="form-tip">开启后，仅拥有对应菜单权限的用户可访问；关闭则登录用户均可访问</div>
        </div>
      </el-form-item>
      <el-form-item v-if="form.type === 'MENU'" label="固定标签" prop="affix">
        <el-switch v-model="form.affix" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ mode === 'view' ? '关闭' : '取消' }}</el-button>
      <el-button v-if="mode !== 'view'" type="primary" :loading="submitting" @click="handleSubmit"
        >保存</el-button
      >
    </template>
  </el-dialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import { useCrudApi } from '@/composables/useCrudApi'
import xnIconPicker from '@/components/xnIconPicker/xnIconPicker.vue'
import { autoViewPath, normalizeRoutePath } from '@/utils/route-path'
import { hasIndexView } from '@/utils/view-loader'
import { saveDialogTitle } from '@/types/save'

export default {
  name: 'RoutesSave',
  components: { xnIconPicker },
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
      form: {
        title: '',
        path: '',
        viewPath: '',
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
      },
    }
  },
  computed: {
    dialogTitle() {
      return saveDialogTitle(this.mode, '路由')
    },
  },
  watch: {
    'form.path'() {
      if (this.form.type === 'MENU') {
        this.syncViewPath()
      }
    },
  },
  methods: {
    pathForInput(path) {
      return path.replace(/^\//, '')
    },
    syncViewPath() {
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
      this.form.viewPath = autoViewPath(normalized)
    },
    resetForm() {
      this.form.title = ''
      this.form.path = ''
      this.form.viewPath = ''
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
        const normalizedPath = this.form.type === 'MENU' ? normalizeRoutePath(this.form.path ?? '') : undefined
        const viewPath = normalizedPath ? autoViewPath(normalizedPath) : undefined
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
</style>
