<template>
  <xnDialog
    v-model="visible"
    title="分配角色"
    width="480px"
    :confirm-loading="submitting"
    confirm-text="保存"
    @confirm="handleSubmit"
    @closed="handleClosed"
  >
    <div v-if="unitName" class="assign-tip">单位：{{ unitName }}</div>
    <el-select
      v-model="roleIds"
      multiple
      filterable
      clearable
      placeholder="选择默认角色"
      style="width: 100%"
    >
      <el-option v-for="r in availableRoles" :key="r.id" :label="r.name" :value="r.id" />
    </el-select>
    <div class="form-tip">单位下用户将自动继承所选角色，无需再逐个分配</div>
  </xnDialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import { assignRoles, get as getUnit } from '@/api/unit'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import { getOptions as getRoleOptions } from '@/api/role'
import { usePermission } from '@/directives/permission'

export default {
  name: 'UnitsAssignRoles',
  components: { xnDialog },
  emits: ['success'],
  setup() {
    const { isSuperAdmin } = usePermission()
    return { isSuperAdmin }
  },
  data() {
    return {
      visible: false,
      submitting: false,
      unitId: null,
      unitName: '',
      roleIds: [],
      roleOptions: [],
    }
  },
  computed: {
    availableRoles() {
      return this.isSuperAdmin
        ? this.roleOptions
        : this.roleOptions.filter((r) => r.code !== 'SUPER_ADMIN')
    },
  },
  methods: {
    async open(row) {
      this.unitId = row.id
      this.unitName = row.name
      if (!this.roleOptions.length) {
        const res = await getRoleOptions()
        this.roleOptions = res.data || []
      }
      const detail = await getUnit(row.id)
      this.roleIds = detail.data.roleIds?.length
        ? [...detail.data.roleIds]
        : (detail.data.roleList || []).map((r) => r.id)
      this.visible = true
    },
    async handleSubmit() {
      if (this.unitId == null) return
      this.submitting = true
      try {
        await assignRoles(this.unitId, this.roleIds)
        ElMessage.success('角色分配成功')
        this.visible = false
        this.$emit('success')
      } finally {
        this.submitting = false
      }
    },
    handleClosed() {
      this.unitId = null
      this.unitName = ''
      this.roleIds = []
    },
  },
}
</script>

<style scoped>
.assign-tip {
  margin-bottom: 12px;
  font-weight: 500;
}

.form-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--app-text-muted);
  line-height: 1.4;
}
</style>
