# xnImageUpload

图片上传组件：卡片预览、点击放大。支持只传一张或多张。默认走 `/files/upload`（MinIO `yyyy/MM/dd/{uuid}.ext`），也可传入自定义 `request`。

## 介绍

与 `xnUpload`（大文件分片）分开：本组件只处理图片，交互是 `picture-card` + 预览。品牌图标、头像、二维码等都可以复用，把各自接口包成 `request` 即可。

## 文件

| 文件                | 说明     |
| ------------------- | -------- |
| `xnImageUpload.vue` | 图片上传 |

## Props

| 名称         | 类型                              | 默认值        | 说明                               |
| ------------ | --------------------------------- | ------------- | ---------------------------------- |
| `modelValue` | `string \| string[]`              | `''`          | 单张为 URL 字符串，多张为 URL 数组 |
| `limit`      | `number`                          | `1`           | 最多张数；`1` 表示单张             |
| `disabled`   | `boolean`                         | `false`       | 禁用                               |
| `accept`     | `string`                          | 常见图片 MIME | `png/jpeg/jpg/webp/gif/svg+xml`    |
| `maxSize`    | `number`                          | `5 * 1024²`   | 单张大小上限（字节），默认 5MB     |
| `tip`        | `string`                          | `''`          | 底部说明                           |
| `request`    | `(file: File) => Promise<string>` | 文件管理上传  | 自定义上传，须返回可访问 URL       |

`limit === 1` 时 `v-model` 为字符串，否则为数组。达上限或禁用时隐藏加号。

## Emits

| 事件                | 载荷                     |
| ------------------- | ------------------------ |
| `update:modelValue` | `string \| string[]`     |
| `change`            | `string \| string[]`     |
| `success`           | `string`（上传后的 URL） |
| `error`             | `string`                 |
| `exceed`            | —                        |
| `remove`            | `string`（被移除的 URL） |

## 用法

```vue
<xnImageUpload v-model="logo" :limit="1" tip="一张图同时用于 Logo 与 favicon" />
<xnImageUpload v-model="gallery" :limit="6" />
<xnImageUpload v-model="avatar" :request="uploadAvatarUrl" />
```
