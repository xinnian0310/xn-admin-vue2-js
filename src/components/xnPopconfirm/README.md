# xnPopconfirm

行内确认气泡。删除、撤回等轻操作优先用它，避免整页 `ElMessageBox`。

批量删除、清空、不可恢复的危险操作仍用 MessageBox。

## 文件

| 文件               | 说明     |
| ------------------ | -------- |
| `xnPopconfirm.vue` | 确认气泡 |

## Props

| 名称                | 类型                                                                  | 默认值                 | 说明         |
| ------------------- | --------------------------------------------------------------------- | ---------------------- | ------------ |
| `title`             | `string`                                                              | `'确定执行该操作吗？'` | 确认文案     |
| `width`             | `number`                                                              | `200`                  | 气泡宽度     |
| `confirmText`       | `string`                                                              | `'确定'`               | 确定按钮     |
| `cancelText`        | `string`                                                              | `'取消'`               | 取消按钮     |
| `confirmButtonType` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'text'` | `'danger'`             | 确定按钮类型 |
| `disabled`          | `boolean`                                                             | `false`                | 禁用         |

## Emits

| 事件      | 载荷 |
| --------- | ---- |
| `confirm` | —    |
| `cancel`  | —    |

## Slots

| 插槽    | 说明                  |
| ------- | --------------------- |
| default | 触发元素（reference） |

`xnTableActions` 的 `delete` 行操作已默认包一层本组件，页面 `handleDelete` 不再弹 MessageBox。

## 用法

```vue
<xnPopconfirm title="确定删除「张三」吗？" @confirm="remove(row)">
  <el-button link type="danger">删除</el-button>
</xnPopconfirm>
```
