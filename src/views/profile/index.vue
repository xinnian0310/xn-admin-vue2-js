<template>
  <div class="page-card profile-page" v-loading="loading">
    <div class="page-header">
      <h2 class="page-title">个人信息</h2>
      <div class="profile-page__actions">
        <el-button :icon="Refresh" @click="loadProfile">刷新</el-button>
        <el-button
          type="primary"
          :disabled="!canEdit || saving"
          :loading="saving"
          @click="handleSave"
        >
          保存资料
        </el-button>
      </div>
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
      <div class="profile-page__avatar">
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
      </div>

      <div class="profile-page__panels">
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="88px"
          class="profile-page__form"
          :disabled="!canEdit"
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
          <el-form-item label="创建时间">
            <span>{{ formatTime(user?.createdAt) }}</span>
          </el-form-item>
          <el-form-item label="更新时间">
            <span>{{ formatTime(user?.updatedAt) }}</span>
          </el-form-item>
        </el-form>

        <el-form
          ref="pwdFormRef"
          :model="pwdForm"
          :rules="pwdRules"
          label-width="88px"
          class="profile-page__form profile-page__pwd"
          :disabled="!canEdit"
        >
          <div class="profile-page__section-title">修改密码</div>
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
          <el-form-item>
            <el-button
              type="warning"
              :disabled="!canEdit || pwdSaving"
              :loading="pwdSaving"
              @click="handleChangePassword"
            >
              确认修改密码
            </el-button>
          </el-form-item>
        </el-form>
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
import { formatDateTime } from '@/utils/datetime'

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
      pwdSaving: false,
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
        nickname: [{ max: 50, message: '昵称不能超过50个字符', trigger: 'blur' }],
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
  },
  mounted() {
    this.loadProfile()
    this.loadPasswordRules()
  },
  methods: {
    formatTime(value) {
      return formatDateTime(value)
    },
    syncForm() {
      this.form.username = this.user?.username || ''
      this.form.nickname = this.user?.nickname || ''
      this.form.email = this.user?.email || ''
      this.form.phone = this.user?.phone || ''
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
      this.saving = true
      try {
        await this.userStore.updateProfile({
          nickname: this.form.nickname,
          email: this.form.email,
          phone: this.form.phone,
        })
        ElMessage.success('保存成功')
      } catch (e) {
        const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : '保存失败'
        ElMessage.error(msg || '保存失败')
      } finally {
        this.saving = false
      }
    },
    async handleChangePassword() {
      if (!this.canEdit) {
        ElMessage.warning('超级管理员禁止修改密码')
        return
      }
      const valid = await this.$refs.pwdFormRef?.validate().catch(() => false)
      if (!valid) return
      this.pwdSaving = true
      try {
        await changePassword({
          oldPassword: this.pwdForm.oldPassword,
          newPassword: this.pwdForm.newPassword,
        })
        this.pwdForm.oldPassword = ''
        this.pwdForm.newPassword = ''
        this.pwdForm.confirmPassword = ''
        this.$refs.pwdFormRef?.clearValidate()
        await this.userStore.fetchProfile()
        ElMessage.success('密码已修改')
        if (this.$route.query.forcePwd === '1') {
          this.$router.replace('/dashboard')
        }
      } catch (e) {
        const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : '修改失败'
        ElMessage.error(msg || '修改失败')
      } finally {
        this.pwdSaving = false
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
.profile-page__actions {
  display: flex;
  gap: 8px;
}

.profile-page__alert {
  margin-bottom: 16px;
}

.profile-page__body {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 24px;
  align-items: start;
}

.profile-page__avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 16px;
  background: var(--app-fill-color, #f8fafc);
  border: 1px solid var(--app-border-color);
  border-radius: 12px;
}

.profile-page__name {
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text-primary, #303133);
}

.profile-page__role {
  font-size: 13px;
  color: var(--app-text-muted, #909399);
  text-align: center;
}

.profile-page__panels {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 560px;
}

.profile-page__section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--app-text-primary, #303133);
}

.profile-page__pwd {
  padding-top: 8px;
  border-top: 1px solid var(--app-border-color, #ebeef5);
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--app-text-muted, #909399);
}

@media (max-width: 768px) {
  .profile-page__body {
    grid-template-columns: 1fr;
  }
}
</style>
