# xnFilePicker

从已上传文件目录里挑选文件。传入 `data` 时不请求接口。

`v-model` 为文件 URL 或 path；`change` 第二个参数是完整 `FileInfo[]`。

## 文件

| 文件               | 说明     |
| ------------------ | -------- |
| `xnFilePicker.vue` | 文件选择 |

## Props

| 名称          | 类型                 | 默认值         | 说明                       |
| ------------- | -------------------- | -------------- | -------------------------- |
| `modelValue`  | `string \| string[]` | `''`           | 选中路径 / URL             |
| `data`        | `FileInfo[]`         | —              | 本地列表，传入后不请求接口 |
| `multiple`    | `boolean`            | `false`        | 多选                       |
| `disabled`    | `boolean`            | `false`        | 禁用                       |
| `clearable`   | `boolean`            | `true`         | 显示清除                   |
| `placeholder` | `string`             | `'请选择文件'` | 占位文案                   |

## Emits

| 事件                | 载荷                       |
| ------------------- | -------------------------- |
| `update:modelValue` | `string \| string[]`       |
| `change`            | `value, files: FileInfo[]` |

## 行为说明

- 弹窗内可进目录、搜索当前目录；单击勾选，双击文件直接确定
- 确定值优先取 `file.url`，否则 `file.path`
- 无 `data` 时走 `browseFiles` 浏览服务端目录

## 用法

```vue
<xnFilePicker v-model="cover" />
<xnFilePicker v-model="files" multiple />
```
