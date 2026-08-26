# xnAvatarCrop

头像裁剪：选图 → 画布缩放拖拽 → 输出正方形 PNG。传入 `request` 则上传后回写 URL，否则用本地 blob。

## 文件

| 文件               | 说明     |
| ------------------ | -------- |
| `xnAvatarCrop.vue` | 头像裁剪 |

## Props

| 名称         | 类型                              | 默认值   | 说明                                            |
| ------------ | --------------------------------- | -------- | ----------------------------------------------- |
| `modelValue` | `string`                          | `''`     | 当前头像 URL                                    |
| `size`       | `number`                          | `88`     | 预览头像尺寸                                    |
| `fallback`   | `string`                          | `'头像'` | 无图时的文字回退                                |
| `disabled`   | `boolean`                         | `false`  | 禁用选择与清除                                  |
| `request`    | `(file: File) => Promise<string>` | —        | 自定义上传，须返回可访问 URL；不传则用本地 blob |

## Emits

| 事件                | 载荷     |
| ------------------- | -------- |
| `update:modelValue` | `string` |
| `change`            | `string` |

## 行为说明

- 仅接受 `png` / `jpeg` / `jpg` / `webp`
- 裁剪区 360×360，滚轮缩放、拖拽调整位置
- 确定后输出 `avatar.png`；有 `request` 则上传，否则 `URL.createObjectURL`

## 用法

```vue
<xnAvatarCrop v-model="avatar" :request="uploadAvatarFile" />
```
