<template>
  <xnDialog
    v-model="visible"
    :title="dialogTitle"
    width="580px"
    :show-confirm="mode !== 'view'"
    confirm-text="确定"
    :cancel-text="mode === 'view' ? '关闭' : '取消'"
    @confirm="handleSubmit"
    @closed="handleClosed"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
      :disabled="mode === 'view'"
    >
      <el-form-item label="图标">
        <div class="locked-field">
          <xnAppIcon v-if="form.icon" :name="form.icon" />
          <span>{{ form.icon || '—' }}</span>
          <span class="locked-tip">固定项，不可修改</span>
        </div>
      </el-form-item>
      <el-form-item label="标签">
        <el-input :model-value="form.label" disabled />
      </el-form-item>
      <el-form-item label="分类" prop="type">
        <el-select v-model="form.type" placeholder="选择内容分类" style="width: 100%">
          <el-option
            v-for="opt in SITE_CONTACT_TYPE_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <!-- 文本：仅内容 -->
      <template v-if="form.type === 'text'">
        <el-form-item label="内容" prop="value">
          <el-input v-model="form.value" maxlength="200" placeholder="展示文案" />
        </el-form-item>
      </template>

      <!-- 链接：展示文案 + URL -->
      <template v-else-if="form.type === 'link'">
        <el-form-item label="文案" prop="value">
          <el-input v-model="form.value" maxlength="200" placeholder="链接展示文字" />
        </el-form-item>
        <el-form-item label="链接" prop="link">
          <el-input v-model="form.link" maxlength="300" placeholder="https://..." />
          <div class="form-tip">前台点击文案后跳转到该地址</div>
        </el-form-item>
      </template>

      <!-- 邮箱：地址，自动生成 mailto -->
      <template v-else-if="form.type === 'email'">
        <el-form-item label="邮箱" prop="value">
          <el-input v-model="form.value" maxlength="200" placeholder="name@example.com" />
          <div class="form-tip">保存后自动生成 mailto: 链接，前台可点击发信</div>
        </el-form-item>
      </template>

      <!-- QQ群：多群号 + 已满 -->
      <template v-else-if="form.type === 'qq'">
        <el-form-item label="群号" required>
          <div class="group-list">
            <div v-for="(g, idx) in form.groups" :key="idx" class="group-row">
              <xnAppIcon name="ri:qq-fill" :size="18" class="qq-icon" />
              <el-input
                v-model="g.value"
                maxlength="30"
                placeholder="QQ 群号"
                :disabled="mode === 'view'"
              />
              <el-switch
                v-model="g.full"
                inline-prompt
                active-text="已满"
                inactive-text="可加"
                :disabled="mode === 'view'"
              />
              <el-button
                v-if="mode !== 'view'"
                type="danger"
                link
                :disabled="form.groups.length <= 1"
                @click="removeGroup(idx)"
              >
                删除
              </el-button>
            </div>
            <el-button v-if="mode !== 'view'" type="primary" link @click="addGroup">
              + 添加群号
            </el-button>
            <div class="form-tip">打开「已满」后，前台对该群号显示删除线并标注已满</div>
          </div>
        </el-form-item>
      </template>
    </el-form>
  </xnDialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import xnAppIcon from '@/components/xnAppIcon/xnAppIcon.vue'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import { saveDialogTitle } from '@/types/save'
import { SITE_CONTACT_TYPE_OPTIONS, resolveContactType } from '@/types/site-contact'

export default {
  name: 'SiteContactItemSave',
  components: { xnAppIcon, xnDialog },
  emits: ['success'],
  setup() {
    return { SITE_CONTACT_TYPE_OPTIONS }
  },
  data() {
    return {
      visible: false,
      mode: 'add',
      editingIndex: null,
      form: {
        icon: 'Link',
        label: '',
        type: 'text',
        value: '',
        link: '',
        groups: [{ value: '', full: false }],
      },
    }
  },
  computed: {
    dialogTitle() {
      return saveDialogTitle(this.mode, '联系项')
    },
    rules() {
      if (this.form.type === 'text') {
        return { value: [{ required: true, message: '请输入内容', trigger: 'blur' }] }
      }
      if (this.form.type === 'link') {
        return {
          value: [{ required: true, message: '请输入展示文案', trigger: 'blur' }],
          link: [
            { required: true, message: '请输入链接地址', trigger: 'blur' },
            {
              validator: (_r, v, cb) => {
                const s = String(v || '').trim()
                if (!/^https?:\/\//i.test(s)) cb(new Error('链接需以 http:// 或 https:// 开头'))
                else cb()
              },
              trigger: 'blur',
            },
          ],
        }
      }
      if (this.form.type === 'email') {
        return {
          value: [
            { required: true, message: '请输入邮箱', trigger: 'blur' },
            {
              type: 'email',
              message: '邮箱格式不正确',
              trigger: 'blur',
            },
          ],
        }
      }
      return { type: [{ required: true, message: '请选择分类', trigger: 'change' }] }
    },
  },
  methods: {
    resetForm() {
      this.form.icon = 'Link'
      this.form.label = ''
      this.form.type = 'text'
      this.form.value = ''
      this.form.link = ''
      this.form.groups = [{ value: '', full: false }]
      this.editingIndex = null
      this.$refs.formRef?.clearValidate()
    },
    open(openMode, row, index) {
      this.mode = openMode
      this.resetForm()
      if (row) {
        this.form.icon = row.icon || 'Link'
        this.form.label = row.label || ''
        this.form.type = resolveContactType(row)
        this.form.value = row.value || ''
        this.form.link = row.link || ''
        this.editingIndex = index ?? null
        if (this.form.type === 'qq') {
          const fromGroups = (row.groups ?? [])
            .filter((g) => g.value?.trim())
            .map((g) => ({ value: g.value.trim(), full: Boolean(g.full) }))
          this.form.groups = fromGroups.length
            ? fromGroups
            : row.value?.trim()
              ? [{ value: row.value.trim(), full: false }]
              : [{ value: '', full: false }]
        }
      }
      this.visible = true
    },
    addGroup() {
      this.form.groups.push({ value: '', full: false })
    },
    removeGroup(idx) {
      if (this.form.groups.length <= 1) return
      this.form.groups.splice(idx, 1)
    },
    buildData() {
      const type = this.form.type
      const base = {
        icon: this.form.icon || 'Link',
        label: this.form.label,
        type,
      }
      if (type === 'qq') {
        const cleaned = this.form.groups
          .map((g) => ({ value: g.value.trim(), full: Boolean(g.full) }))
          .filter((g) => g.value)
        if (!cleaned.length) {
          ElMessage.warning('请至少填写一个群号')
          return null
        }
        return {
          ...base,
          value: cleaned[0].value,
          link: null,
          groups: cleaned,
        }
      }
      if (type === 'email') {
        const email = this.form.value.trim()
        return {
          ...base,
          value: email,
          link: `mailto:${email}`,
          groups: undefined,
        }
      }
      if (type === 'link') {
        return {
          ...base,
          value: this.form.value.trim(),
          link: this.form.link.trim(),
          groups: undefined,
        }
      }
      return {
        ...base,
        value: this.form.value.trim(),
        link: null,
        groups: undefined,
      }
    },
    async handleSubmit() {
      if (this.form.type === 'qq') {
        const data = this.buildData()
        if (!data) return
        this.$emit('success', { mode: this.mode, index: this.editingIndex, data })
        this.visible = false
        return
      }
      if (!this.$refs.formRef) return
      await this.$refs.formRef.validate((valid) => {
        if (!valid) return
        const data = this.buildData()
        if (!data) return
        this.$emit('success', { mode: this.mode, index: this.editingIndex, data })
        this.visible = false
      })
    },
    handleClosed() {
      this.resetForm()
    },
  },
}
</script>

<style scoped>
.locked-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  color: var(--el-text-color-regular);
}

.locked-tip {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.group-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-row .el-input {
  flex: 1;
}

.qq-icon {
  flex-shrink: 0;
  color: #12b7f5;
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
  width: 100%;
}
</style>
