# xnOrgSelect

组织选择器：`unit` 树 / `user` 远程搜 / `role` / `post` 下拉。传入 `options` 或 `tree-data` 时不请求接口。

## 文件

| 文件              | 说明     |
| ----------------- | -------- |
| `xnOrgSelect.vue` | 组织选择 |

## Props

| 名称          | 类型                                               | 默认值   | 说明                      |
| ------------- | -------------------------------------------------- | -------- | ------------------------- |
| `modelValue`  | `number \| number[] \| string \| string[] \| null` | —        | 选中值                    |
| `type`        | `'unit' \| 'user' \| 'role' \| 'post'`             | `'unit'` | 选择类型                  |
| `options`     | `OrgOption[]`                                      | —        | 本地选项（非 unit）       |
| `treeData`    | `OrgTreeNode[]`                                    | —        | 本地单位树（`type=unit`） |
| `multiple`    | `boolean`                                          | `false`  | 多选                      |
| `clearable`   | `boolean`                                          | `true`   | 可清空                    |
| `disabled`    | `boolean`                                          | `false`  | 禁用                      |
| `filterable`  | `boolean`                                          | `true`   | 可搜索                    |
| `placeholder` | `string`                                           | `''`     | 空则按类型给默认文案      |

`OrgOption`：`{ id: number; label: string }`。`OrgTreeNode`：`{ id, name, children? }`。

未传 `placeholder` 时：单位 / 用户 / 角色 / 岗位 分别为「请选择单位」等。

## Emits

| 事件                | 载荷                                                            |
| ------------------- | --------------------------------------------------------------- |
| `update:modelValue` | `number \| number[] \| string \| string[] \| null \| undefined` |
| `change`            | 同上                                                            |

## 行为说明

- `unit` 用 `el-tree-select`（`check-strictly`），默认拉单位树
- `user` 远程搜索（无 `options` 时 `page=1, size=50`）；`role` / `post` 拉选项接口
- `type` / `options` / `treeData` 变化会重新加载

## 用法

```vue
<xnOrgSelect v-model="form.unitId" type="unit" />
<xnOrgSelect v-model="form.userIds" type="user" multiple />
<xnOrgSelect v-model="form.roleId" type="role" />
<xnOrgSelect v-model="form.postId" type="post" />
```
