# xnDesc

详情描述列表，包 Element Plus `el-descriptions`。`type: 'pre'` 用于长文本；`type: 'copy'` 在值旁显示复制按钮。

## 文件

| 文件         | 说明     |
| ------------ | -------- |
| `xnDesc.vue` | 描述列表 |

## Props

| 名称     | 类型                              | 默认值      | 说明   |
| -------- | --------------------------------- | ----------- | ------ |
| `items`  | `DescItem[]`                      | `[]`        | 描述项 |
| `title`  | `string`                          | `''`        | 标题   |
| `column` | `number`                          | `1`         | 列数   |
| `border` | `boolean`                         | `true`      | 边框   |
| `size`   | `'large' \| 'default' \| 'small'` | `'default'` | 尺寸   |

`DescItem`：`label`、`value`、`prop`、`span`、`type`（`'text' \| 'pre' \| 'copy'`）、`emptyText`。空值显示 `emptyText ?? '—'`。

## Slots

| 插槽        | 说明                                                      |
| ----------- | --------------------------------------------------------- |
| `item.prop` | 非 `pre` / `copy` 时按 `prop` 具名插槽，作用域 `{ item }` |

## 用法

```vue
<xnDesc
  :column="2"
  :items="[
    { label: '操作人', value: row.operatorName },
    { label: 'IP', value: row.ip, type: 'copy' },
    { label: '参数', value: row.params, type: 'pre', span: 2 },
  ]"
/>
```
