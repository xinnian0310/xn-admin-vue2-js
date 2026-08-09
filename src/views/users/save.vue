<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="560px"
    destroy-on-close
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
      :disabled="mode === 'view'"
    >
      <el-form-item label="用户名" prop="username">
        <el-input
          v-model="form.username"
          :disabled="mode === 'view' || (editingId !== null && (form.username === 'admin' || form.username === 'SuperAdmin'))"
        />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          show-password
          :placeholder="editingId ? '留空则不修改密码' : '请输入密码'"
        />
        <div class="form-tip">{{ editingId ? `修改时须符合策略：${pwdTip}` : pwdTip }}</div>
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="form.nickname" />
      </el-form-item>
      <el-form-item label="邮箱" prop="email">
        <el-input v-model="form.email" :disabled="sensitiveFieldsLocked" />
        <div v-if="sensitiveFieldsLocked" class="form-tip">
          无「查看敏感信息」权限，已脱敏且不可修改
        </div>
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.phone" :disabled="sensitiveFieldsLocked" />
      </el-form-item>
      <el-form-item label="角色" prop="roleIds">
        <el-select
          v-model="form.roleIds"
          multiple
          clearable
          style="width: 100%"
          placeholder="个人角色（可选，若单位已绑默认角色）"
        >
          <el-option v-for="r in availableRoles" :key="r.id" :label="r.name" :value="r.id" />
        </el-select>
        <div class="form-tip">可与单位默认角色叠加；二者至少其一有角色即可</div>
      </el-form-item>
      <el-form-item label="单位" prop="unitId">
        <el-tree-select
          v-model="form.unitId"
          :data="unitOptions"
          :props="{ label: 'name', value: 'id', children: 'children' }"
          check-strictly
          clearable
          placeholder="请选择单位"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="岗位" prop="postId">
        <el-select
          v-model="form.postId"
          clearable
          filterable
          placeholder="请选择岗位"
          style="width: 100%"
        >
          <el-option v-for="p in postOptions" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="form.status">
          <el-radio :value="1">启用</el-radio>
          <el-radio :value="0">禁用</el-radio>
        </el-radio-group>
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
import { getPasswordRules } from '@/api/auth'
import { getOptions as getRoleOptions } from '@/api/role'
import { getTree as getUnitTree } from '@/api/unit'
import { getOptions as getPostOptions } from '@/api/post'
import { create, get, update } from '@/api/user'
import { usePermission } from '@/directives/permission'
import { saveDialogTitle } from '@/types/save'

export default {
  name: 'UsersSave',
  emits: ['success'],
  setup() {
    const { isSuperAdmin, hasPermission } = usePermission()
    return { isSuperAdmin, hasPermission }
  },
  data() {
    return {
      visible: false,
      mode: 'add',
      editingId: null,
      submitting: false,
      roleOptions: [],
      unitOptions: [],
      postOptions: [],
      passwordRules: null,
      form: {
        username: '',
        password: '',
        nickname: '',
        email: '',
        phone: '',
        status: 1,
        roleIds: [],
        unitId: undefined,
        postId: undefined,
      },
    }
  },
  computed: {
    dialogTitle() {
      return saveDialogTitle(this.mode, '用户')
    },
    pwdTip() {
      return this.passwordRules?.tip || '不少于 6 位'
    },
    sensitiveFieldsLocked() {
      return this.mode !== 'add' && this.editingId != null && !this.hasPermission('user:sensitive:view')
    },
    availableRoles() {
      return this.isSuperAdmin
        ? this.roleOptions
        : this.roleOptions.filter((r) => r.code !== 'SUPER_ADMIN')
    },
    rules() {
      return {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [
          {
            validator: (_rule, value, callback) => {
              if (this.mode === 'add' && !value) {
                callback(new Error('请输入密码'))
                return
              }
              if (!value) {
                callback()
                return
              }
              const min = this.passwordRules?.minLength ?? 6
              const max = this.passwordRules?.maxLength ?? 50
              if (value.length < min || value.length > max) {
                callback(new Error(`密码长度需在${min}-${max}之间`))
                return
              }
              if (this.passwordRules?.requireUpper && !/[A-Z]/.test(value)) {
                callback(new Error('密码须包含大写字母'))
                return
              }
              if (this.passwordRules?.requireLower && !/[a-z]/.test(value)) {
                callback(new Error('密码须包含小写字母'))
                return
              }
              if (this.passwordRules?.requireDigit && !/\d/.test(value)) {
                callback(new Error('密码须包含数字'))
                return
              }
              if (this.passwordRules?.requireSpecial && !/[^A-Za-z0-9]/.test(value)) {
                callback(new Error('密码须包含特殊字符'))
                return
              }
              callback()
            },
            trigger: 'blur',
          },
        ],
      }
    },
  },
  methods: {
    resetForm() {
      this.form.username = ''
      this.form.password = ''
      this.form.nickname = ''
      this.form.email = ''
      this.form.phone = ''
      this.form.status = 1
      this.form.roleIds = []
      this.form.unitId = undefined
      this.form.postId = undefined
      this.editingId = null
      this.$refs.formRef?.clearValidate()
    },
    async loadDetail(id) {
      const res = await get(id)
      this.form.username = res.data.username
      this.form.nickname = res.data.nickname
      this.form.email = res.data.email
      this.form.phone = res.data.phone
      this.form.status = res.data.status
      this.form.roleIds = (res.data.roleList || []).map((r) => r.id)
      this.form.unitId = res.data.unitId ?? undefined
      this.form.postId = res.data.postId ?? undefined
    },
    async ensureOptions() {
      if (!this.roleOptions.length) {
        const res = await getRoleOptions()
        this.roleOptions = res.data
      }
      if (!this.unitOptions.length) {
        const res = await getUnitTree()
        this.unitOptions = res.data || []
      }
      if (!this.postOptions.length) {
        const res = await getPostOptions()
        this.postOptions = res.data || []
      }
      if (!this.passwordRules) {
        try {
          const res = await getPasswordRules()
          this.passwordRules = res.data
        } catch {
          this.passwordRules = null
        }
      }
    },
    async open(openMode, id) {
      this.mode = openMode
      this.resetForm()
      this.editingId = id ?? null
      await this.ensureOptions()
      this.visible = true
      if (openMode !== 'add' && id) {
        await this.loadDetail(id)
      }
    },
    async handleSubmit() {
      const formRef = this.$refs.formRef
      if (!formRef) return
      await formRef.validate(async (valid) => {
        if (!valid) return
        this.submitting = true
        try {
          const payload = { ...this.form }
          if (this.mode === 'edit' && this.editingId) {
            if (!payload.password) delete payload.password
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

<style scoped>
.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--app-text-muted);
  line-height: 1.4;
}
</style>
