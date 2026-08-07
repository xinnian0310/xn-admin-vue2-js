<template>
  <div class="page-card profile-page" v-loading="loading">
    <div class="page-header">
      <h2 class="page-title">个人信息</h2>
      <el-button :icon="Refresh" @click="loadProfile">刷新</el-button>
    </div>

    <el-alert
      v-if="forcePwd"
      type="warning"
      :closable="false"
      show-icon
      class="profile-page__alert"
      title="按安全策略要求，请先修改密码后再继续使用系统"
    />

    <el-alert
      v-if="!canEdit"
      type="warning"
      :closable="false"
      show-icon
      class="profile-page__alert"
      title="超级管理员账号禁止编辑个人信息"
    />

    <div class="profile-page__body">
      <aside class="profile-page__avatar">
        <el-avatar :size="88" :src="avatarUrl">{{ avatarText }}</el-avatar>
        <div class="profile-page__name">{{ form.nickname || form.username || '-' }}</div>
        <div class="profile-page__role">{{ roleText }}</div>
        <el-upload
          v-if="canEdit"
          :show-file-list="false"
          :http-request="handleAvatarUpload"
          accept="image/jpeg,image/png,image/gif,image/webp"
        >
          <el-button size="small" :loading="avatarUploading">更换头像</el-button>
        </el-upload>
      </aside>

      <div class="profile-page__main">
        <div class="profile-page__panels">
          <div class="profile-page__panel">
            <div class="profile-page__section-title">基本信息</div>
            <el-form
              ref="formRef"
              :model="form"
              :rules="rules"
              label-width="88px"
              :disabled="formDisabled"
            >
              <el-form-item label="用户名">
                <el-input v-model="form.username" disabled />
              </el-form-item>
              <el-form-item label="昵称" prop="nickname">
                <el-input v-model="form.nickname" maxlength="50" placeholder="请输入昵称" />
              </el-form-item>
              <el-form-item label="邮箱" prop="email">
                <el-input v-model="form.email" maxlength="100" placeholder="请输入邮箱" />
              </el-form-item>
              <el-form-item label="手机" prop="phone">
                <el-input v-model="form.phone" maxlength="20" placeholder="请输入手机号" />
              </el-form-item>
              <div class="profile-page__meta-grid">
                <el-form-item label="单位">
                  <span>{{ user?.unitName || '—' }}</span>
                </el-form-item>
                <el-form-item label="岗位">
                  <span>{{ user?.postName || '—' }}</span>
                </el-form-item>
                <el-form-item label="状态">
                  <el-tag :type="user?.status === 1 ? 'success' : 'info'" size="small">
                    {{ user?.status === 1 ? '启用' : '停用' }}
                  </el-tag>
                </el-form-item>
                <el-form-item label="角色">
                  <span>{{ roleText }}</span>
                </el-form-item>
              </div>
            </el-form>
          </div>

          <div class="profile-page__panel">
            <div class="profile-page__section-title">修改密码</div>
            <el-form
              ref="pwdFormRef"
              :model="pwdForm"
              :rules="pwdRules"
              label-width="88px"
              :disabled="formDisabled"
            >
              <el-form-item label="原密码" prop="oldPassword">
                <el-input
                  v-model="pwdForm.oldPassword"
                  type="password"
                  show-password
                  autocomplete="current-password"
                  placeholder="请输入原密码"
                />
              </el-form-item>
              <el-form-item label="新密码" prop="newPassword">
                <el-input
                  v-model="pwdForm.newPassword"
                  type="password"
                  show-password
                  autocomplete="new-password"
                  :placeholder="pwdPlaceholder"
                />
                <div v-if="pwdRulesTip" class="form-tip">{{ pwdRulesTip }}</div>
              </el-form-item>
              <el-form-item label="确认密码" prop="confirmPassword">
                <el-input
                  v-model="pwdForm.confirmPassword"
                  type="password"
                  show-password
                  autocomplete="new-password"
                  placeholder="再次输入新密码"
                />
              </el-form-item>
            </el-form>
          </div>
        </div>

        <div class="profile-page__footer">
          <template v-if="canEdit">
            <template v-if="editing">
              <el-button :disabled="saving" @click="cancelEdit">取消</el-button>
              <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
            </template>
            <el-button v-else type="primary" @click="startEdit">修改</el-button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { storeToRefs } from 'pinia'
import { changePassword, getPasswordRules, uploadAvatar } from '@/api/auth'
import { usePermissionStore } from '@/stores/permission'
import { useUserStore } from '@/stores/user'

export default {
  name: 'Profile',
  setup() {
    const userStore = useUserStore()
    const permissionStore = usePermissionStore()
    const { isSuperAdmin } = storeToRefs(permissionStore)
    return { userStore, isSuperAdmin, Refresh: markRaw(Refresh) }
  },
  data() {
    return {
      loading: false,
      saving: false,
      editing: false,
      avatarUploading: false,
      passwordRules: null,
      form: {
        username: '',
        nickname: '',
        email: '',
        phone: '',
      },
      pwdForm: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      },
      rules: {
        nickname: [
          { required: true, message: '请输入昵称', trigger: 'blur' },
          { max: 50, message: '昵称不能超过50个字符', trigger: 'blur' },
        ],
        email: [
          { type: 'email', message: '请输入正确的邮箱', trigger: 'blur' },
          { max: 100, message: '邮箱不能超过100个字符', trigger: 'blur' },
        ],
        phone: [{ max: 20, message: '手机号不能超过20个字符', trigger: 'blur' }],
      },
    }
  },
  computed: {
    canEdit() {
      return !this.isSuperAdmin
    },
    formDisabled() {
      return !this.canEdit || !this.editing
    },
    user() {
      return this.userStore.user
    },
    forcePwd() {
      return this.$route.query.forcePwd === '1' || !!this.user?.mustChangePassword
    },
    pwdRulesTip() {
      return this.passwordRules?.tip || ''
    },
    pwdPlaceholder() {
      const min = this.passwordRules?.minLength ?? 6
      const max = this.passwordRules?.maxLength ?? 50
      return `${min}-${max} 位新密码`
    },
    pwdRules() {
      return {
        oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          {
            validator: (_rule, value, callback) => {
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
        confirmPassword: [
          { required: true, message: '请确认新密码', trigger: 'blur' },
          {
            validator: (_rule, value, callback) => {
              if (value !== this.pwdForm.newPassword) {
                callback(new Error('两次输入的密码不一致'))
                return
              }
              callback()
            },
            trigger: 'blur',
          },
        ],
      }
    },
    avatarText() {
      const name = this.form.nickname || this.form.username || 'U'
      return name.charAt(0).toUpperCase()
    },
    avatarUrl() {
      return this.user?.avatar || undefined
    },
    roleText() {
      if (this.user?.roleList?.length) {
        return this.user.roleList.map((r) => r.name || r.code).join('、')
      }
      if (this.user?.roles?.length) return this.user.roles.join('、')
      return this.user?.role || '-'
    },
  },
  watch: {
    user: {
      handler() {
        this.syncForm()
      },
      immediate: true,
    },
    forcePwd: {
      handler(v) {
        if (v && this.canEdit) this.editing = true
      },
      immediate: true,
    },
  },
  mounted() {
    this.loadProfile()
    this.loadPasswordRules()
  },
  methods: {
    syncForm() {
      this.form.username = this.user?.username || ''
      this.form.nickname = this.user?.nickname || ''
      this.form.email = this.user?.email || ''
      this.form.phone = this.user?.phone || ''
    },
    resetPwdForm() {
      this.pwdForm.oldPassword = ''
      this.pwdForm.newPassword = ''
      this.pwdForm.confirmPassword = ''
      this.$refs.pwdFormRef?.clearValidate()
    },
    startEdit() {
      if (!this.canEdit) {
        ElMessage.warning('超级管理员禁止编辑个人信息')
        return
      }
      this.syncForm()
      this.resetPwdForm()
      this.editing = true
    },
    cancelEdit() {
      this.syncForm()
      this.resetPwdForm()
      this.editing = false
    },
    async loadProfile() {
      this.loading = true
      try {
        await this.userStore.fetchProfile()
        this.syncForm()
      } catch {
        ElMessage.error('获取个人信息失败')
      } finally {
        this.loading = false
      }
    },
    async handleSave() {
      if (!this.canEdit) {
        ElMessage.warning('超级管理员禁止编辑个人信息')
        return
      }
      const valid = await this.$refs.formRef?.validate().catch(() => false)
      if (!valid) return

      const hasPwdInput = Boolean(
        this.pwdForm.oldPassword || this.pwdForm.newPassword || this.pwdForm.confirmPassword,
      )
      if (this.forcePwd || hasPwdInput) {
        const pwdValid = await this.$refs.pwdFormRef?.validate().catch(() => false)
        if (!pwdValid) return
      }

      this.saving = true
      try {
        await this.userStore.updateProfile({
          nickname: this.form.nickname,
          email: this.form.email,
          phone: this.form.phone,
        })
        if (this.forcePwd || hasPwdInput) {
          await changePassword({
            oldPassword: this.pwdForm.oldPassword,
            newPassword: this.pwdForm.newPassword,
          })
          this.resetPwdForm()
          await this.userStore.fetchProfile()
          ElMessage.success(this.forcePwd ? '密码已修改' : '资料与密码已保存')
          if (this.$route.query.forcePwd === '1') {
            this.editing = false
            this.$router.replace('/dashboard')
            return
          }
        } else {
          ElMessage.success('保存成功')
        }
        this.editing = false
      } catch (e) {
        const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : '保存失败'
        ElMessage.error(msg || '保存失败')
      } finally {
        this.saving = false
      }
    },
    async handleAvatarUpload(options) {
      this.avatarUploading = true
      try {
        const res = await uploadAvatar(options.file)
        await this.userStore.fetchProfile()
        ElMessage.success('头像已更新')
        options.onSuccess?.(res)
      } catch (e) {
        const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : '上传失败'
        ElMessage.error(msg || '上传失败')
        options.onError?.(e)
      } finally {
        this.avatarUploading = false
      }
    },
    async loadPasswordRules() {
      try {
        const res = await getPasswordRules()
        this.passwordRules = res.data
      } catch {
        this.passwordRules = null
      }
    },
  },
}
</script>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.profile-page__alert {
  margin-bottom: 16px;
  flex-shrink: 0;
}

.profile-page__body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 24px;
  overflow: hidden;
}

.profile-page__avatar {
  flex-shrink: 0;
  width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 16px;
  background: var(--app-fill-color, #f8fafc);
  border: 1px solid var(--app-border-color);
  border-radius: 12px;
  align-self: flex-start;
}

.profile-page__name {
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text-primary, #303133);
  text-align: center;
  word-break: break-all;
}

.profile-page__role {
  font-size: 13px;
  color: var(--app-text-muted, #909399);
  text-align: center;
}

.profile-page__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.profile-page__panels {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}

.profile-page__panel {
  min-width: 0;
}

.profile-page__section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--app-text-primary, #303133);
}

.profile-page__meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 12px;
}

.profile-page__footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid var(--app-border-color, #ebeef5);
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--app-text-muted, #909399);
}

@media (max-width: 900px) {
  .profile-page__body {
    flex-direction: column;
    overflow: auto;
  }

  .profile-page__avatar {
    width: 100%;
    align-self: stretch;
  }

  .profile-page__main {
    overflow: visible;
  }

  .profile-page__panels {
    grid-template-columns: 1fr;
    overflow: visible;
  }
}
</style>
