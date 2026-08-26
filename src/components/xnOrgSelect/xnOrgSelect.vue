<template>
  <el-tree-select
    v-if="type === 'unit'"
    :model-value="modelValue"
    :data="tree"
    :props="{ label: 'name', value: 'id', children: 'children' }"
    :multiple="multiple"
    :disabled="disabled"
    :clearable="clearable"
    :filterable="filterable"
    check-strictly
    :placeholder="placeholder || '请选择单位'"
    :loading="loading"
    style="width: 100%"
    @update:model-value="onChange"
  />
  <el-select
    v-else
    :model-value="modelValue"
    :multiple="multiple"
    :disabled="disabled"
    :clearable="clearable"
    :filterable="filterable"
    :remote="type === 'user' && !options"
    :remote-method="type === 'user' ? searchUsers : undefined"
    :placeholder="placeholder || defaultPlaceholder"
    :loading="loading"
    style="width: 100%"
    @update:model-value="onChange"
  >
    <el-option v-for="item in list" :key="item.id" :label="item.label" :value="item.id" />
  </el-select>
</template>

<script>
import { list as listUnits } from '@/api/unit'
import { list as listUsers } from '@/api/user'
import { getOptions as listRoles } from '@/api/role'
import { getOptions as listPosts } from '@/api/post'

export default {
  name: 'XnOrgSelect',
  props: {
    modelValue: { type: [Number, String, Array], default: undefined },
    type: { type: String, default: 'unit' },
    /** 本地选项，传入后不请求接口 */
    options: { type: Array, default: undefined },
    treeData: { type: Array, default: undefined },
    multiple: { type: Boolean, default: false },
    clearable: { type: Boolean, default: true },
    disabled: { type: Boolean, default: false },
    filterable: { type: Boolean, default: true },
    placeholder: { type: String, default: '' },
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      loading: false,
      remoteList: [],
      remoteTree: [],
    }
  },
  computed: {
    list() {
      return this.options ?? this.remoteList
    },
    tree() {
      return this.treeData ?? this.remoteTree
    },
    defaultPlaceholder() {
      if (this.type === 'user') return '请选择用户'
      if (this.type === 'role') return '请选择角色'
      if (this.type === 'post') return '请选择岗位'
      return '请选择'
    },
  },
  watch: {
    type() {
      void this.load()
    },
    options() {
      void this.load()
    },
    treeData() {
      void this.load()
    },
  },
  mounted() {
    void this.load()
  },
  methods: {
    async load() {
      if (this.type === 'unit') {
        if (this.treeData) return
        this.loading = true
        try {
          const res = await listUnits()
          this.remoteTree = res.data || []
        } catch {
          this.remoteTree = []
        } finally {
          this.loading = false
        }
        return
      }
      if (this.options) return
      this.loading = true
      try {
        if (this.type === 'role') {
          const res = await listRoles()
          this.remoteList = (res.data || []).map((item) => ({ id: item.id, label: item.name }))
        } else if (this.type === 'post') {
          const res = await listPosts()
          this.remoteList = (res.data || []).map((item) => ({ id: item.id, label: item.name }))
        } else {
          await this.searchUsers('')
        }
      } catch {
        this.remoteList = []
      } finally {
        this.loading = false
      }
    },
    async searchUsers(keyword) {
      if (this.options) return
      this.loading = true
      try {
        const res = await listUsers({ page: 1, size: 50, keyword: keyword.trim() || undefined })
        this.remoteList = (res.data?.records || []).map((item) => ({
          id: item.id,
          label: item.nickname ? `${item.nickname}（${item.username}）` : item.username,
        }))
      } catch {
        this.remoteList = []
      } finally {
        this.loading = false
      }
    },
    onChange(value) {
      this.$emit('update:modelValue', value)
      this.$emit('change', value)
    },
  },
}
</script>
