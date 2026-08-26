# xnCopy

复制按钮：图标 + 可选原文，成功后短暂显示「已复制」。

## 文件

| 文件         | 说明     |
| ------------ | -------- |
| `xnCopy.vue` | 一键复制 |

## Props

| 名称          | 类型                                                                     | 默认值      | 说明                         |
| ------------- | ------------------------------------------------------------------------ | ----------- | ---------------------------- |
| `text`        | `string \| number \| null`                                               | `''`        | 要复制的内容                 |
| `label`       | `string`                                                                 | `''`        | 按钮文案；空则只显示图标     |
| `copiedLabel` | `string`                                                                 | `'已复制'`  | 复制成功后的短暂文案         |
| `showText`    | `boolean`                                                                | `false`     | 按钮前展示原文（空值显示 —） |
| `link`        | `boolean`                                                                | `true`      | 是否文字链按钮               |
| `type`        | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'default'` | `'primary'` | 按钮类型                     |
| `size`        | `'large' \| 'default' \| 'small'`                                        | `'small'`   | 按钮尺寸                     |
| `disabled`    | `boolean`                                                                | `false`     | 禁用；`text` 为空也会禁用    |
| `block`       | `boolean`                                                                | `false`     | 块级排列                     |
| `silent`      | `boolean`                                                                | `false`     | 成功/失败不弹 toast          |

## Emits

| 事件     | 载荷     |
| -------- | -------- |
| `copied` | `string` |
| `error`  | —        |

## 用法

```vue
<xnCopy :text="secret" />
<xnCopy :text="row.id" show-text label="复制" />
```
