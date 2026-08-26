# xnCode

JSON / 代码查看：行号、复制、JSON 着色与格式化。解析失败时按原文展示。

## 文件

| 文件         | 说明     |
| ------------ | -------- |
| `xnCode.vue` | 代码查看 |

## Props

| 名称        | 类型                                         | 默认值    | 说明                       |
| ----------- | -------------------------------------------- | --------- | -------------------------- |
| `value`     | `unknown`                                    | —         | 源内容（对象会格式化）     |
| `language`  | `'json' \| 'text' \| 'java' \| 'js' \| 'ts'` | `'text'`  | 语言；`json` 会着色        |
| `title`     | `string`                                     | `''`      | 顶栏标题；空则显示语言大写 |
| `maxHeight` | `string`                                     | `'280px'` | 内容区最大高度             |
| `showCopy`  | `boolean`                                    | `true`    | 顶栏复制按钮               |

无 Emits。顶栏在 `title` 或 `showCopy` 为真时显示，复制走 `xnCopy`。

## 用法

```vue
<xnCode title="请求参数" language="json" :value="row.params" />
<xnCode title="堆栈" language="text" :value="row.stackTrace" />
```
