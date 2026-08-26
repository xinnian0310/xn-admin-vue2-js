<template>
  <xnDialog
    v-model="visible"
    :title="dialogTitle"
    width="560px"
    :show-confirm="mode !== 'view'"
    :confirm-loading="submitting"
    confirm-text="保存"
    :cancel-text="mode === 'view' ? '关闭' : '取消'"
    @confirm="handleSubmit"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="90px"
      :disabled="mode === 'view'"
    >
      <el-form-item label="编码" prop="code">
        <el-input v-model="form.code" :disabled="mode === 'view' || mode === 'edit'" />
      </el-form-item>
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="类型" prop="type">
        <el-input model-value="菜单" disabled />
      </el-form-item>
      <el-form-item label="父节点" prop="parentId">
        <el-tree-select
          v-model="form.parentId"
          :data="parentOptions"
          :props="{ label: 'name', value: 'id', children: 'children' }"
          check-strictly
          clearable
          placeholder="无（顶级）"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="路径" prop="path">
        <el-input v-model="form.path" placeholder="菜单路由，如 /system/roles" />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="form.sort" :min="0" />
      </el-form-item>
    </el-form>
  </xnDialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import { create, list, update } from '@/api/permission'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import { saveDialogTitle } from '@/types/save'

export default {
  name: 'PermissionsSave',
  components: { xnDialog },
  emits: ['success'],
  data() {
    return {
      visible: false,
      mode: 'add',
      editingId: null,
      submitting: false,
      parentOptions: [],
      form: {
        code: '',
        name: '',
        type: 'MENU',
        parentId: undefined,
        path: '',
        sort: 0,
      },
      rules: {
        code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
        name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
        type: [{ required: true, message: '请选择类型', trigger: 'change' }],
      },
    }
  },
  computed: {
    dialogTitle() {
      return saveDialogTitle(this.mode, '权限')
    },
  },
  methods: {
    filterMenuTree(nodes) {
      return nodes
        .filter((node) => node.type === 'MENU')
        .map((node) => ({
          ...node,
          children: node.children?.length ? this.filterMenuTree(node.children) : undefined,
        }))
    },
    resetForm() {
      this.form.code = ''
      this.form.name = ''
      this.form.type = 'MENU'
      this.form.parentId = undefined
      this.form.path = ''
      this.form.sort = 0
      this.editingId = null
      this.$refs.formRef?.clearValidate()
    },
    findPermission(nodes, id) {
      for (const node of nodes) {
        if (node.id === id) return node
        if (node.children) {
          const found = this.findPermission(node.children, id)
          if (found) return found
        }
      }
      return undefined
    },
    async loadTree() {
      const res = await list()
      this.parentOptions = this.filterMenuTree(res.data)
      return res.data
    },
    async open(openMode, id) {
      this.mode = openMode
      this.resetForm()
      this.editingId = id ?? null
      const tree = await this.loadTree()
      this.visible = true
      if (openMode !== 'add' && id) {
        const row = this.findPermission(tree, id)
        if (row) {
          this.form.code = row.code
          this.form.name = row.name
          this.form.type = row.type
          this.form.parentId = row.parentId ?? undefined
          this.form.path = row.path ?? ''
          this.form.sort = row.sort ?? 0
        }
      }
    },
    async handleSubmit() {
      const formRef = this.$refs.formRef
      if (!formRef) return
      await formRef.validate(async (valid) => {
        if (!valid) return
        this.submitting = true
        try {
          const payload = { ...this.form, parentId: this.form.parentId || undefined }
          if (this.mode === 'edit' && this.editingId) {
            await update(this.editingId, payload)
            ElMessage.success('更新成功')
          } else {
            await create(payload)
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
