# xnRegion

省市区级联。内置中国行政区划（GB/T 2260，含非省会区县）。传入 `options` 可完全自定义。

## 文件

| 文件           | 说明   |
| -------------- | ------ |
| `xnRegion.vue` | 省市区 |

逻辑在 `@/utils/region`。

## Props

| 名称            | 类型                            | 默认值    | 说明                                       |
| --------------- | ------------------------------- | --------- | ------------------------------------------ |
| `modelValue`    | `string[] \| string`            | —         | 随 `valueType` 变化                        |
| `options`       | `RegionNode[]`                  | —         | 自定义树；传入后不用内置数据               |
| `level`         | `2 \| 3`                        | `3`       | `2`=省市，`3`=省市区（无区县的地市仍两级） |
| `valueType`     | `'codes' \| 'labels' \| 'text'` | `'codes'` | 回写代码数组 / 名称数组 / 拼接文案         |
| `separator`     | `string`                        | `' / '`   | `text` 模式分隔符                          |
| `clearable`     | `boolean`                       | `true`    | 可清空                                     |
| `disabled`      | `boolean`                       | `false`   | 禁用                                       |
| `filterable`    | `boolean`                       | `true`    | 可搜索                                     |
| `checkStrictly` | `boolean`                       | `false`   | 可选任意一级                               |
| `placeholder`   | `string`                        | 随 level  | 未传时：省市 或 省 / 市 / 区               |

## Emits

| 事件                | 载荷                                                  |
| ------------------- | ----------------------------------------------------- |
| `update:modelValue` | `string[] \| string`（随 `valueType`）                |
| `change`            | `{ value: string[]; labels: string[]; text: string }` |

`change` 始终给出代码数组、名称数组与拼接文案。

## 用法

```vue
<xnRegion v-model="codes" />
<xnRegion v-model="codes" :level="2" />
<xnRegion v-model="text" value-type="text" separator=" / " />
```
