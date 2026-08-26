# xnWatermark

页面水印。不传 `content` 时固定展示「心念科技」。布局层已包一层，业务页也可局部再包。

## 文件

| 文件              | 说明 |
| ----------------- | ---- |
| `xnWatermark.vue` | 水印 |

内部用 Element Plus `el-watermark`。

## Props

| 名称       | 类型                 | 默认值       | 说明                           |
| ---------- | -------------------- | ------------ | ------------------------------ |
| `content`  | `string \| string[]` | —            | 水印文案；不传则为「心念科技」 |
| `disabled` | `boolean`            | `false`      | 为真时不渲染水印文字           |
| `gap`      | `[number, number]`   | `[140, 120]` | 水印间距                       |

字号与颜色写死：`14px`、`rgba(0, 0, 0, 0.08)`。

## Slots

| 插槽    | 说明             |
| ------- | ---------------- |
| default | 被水印覆盖的内容 |

## 用法

```vue
<xnWatermark content="心念科技">
  <div>页面内容</div>
</xnWatermark>
```
