# xnDictSelect

按字典类型拉启用项。传入 `options` 时不请求接口（演示 / 离线）。

## 文件

| 文件               | 说明     |
| ------------------ | -------- |
| `xnDictSelect.vue` | 字典下拉 |

## Props

| 名称          | 类型                                                  | 默认值     | 说明                          |
| ------------- | ----------------------------------------------------- | ---------- | ----------------------------- |
| `modelValue`  | `string \| number \| Array<string \| number> \| null` | `''`       | 选中值                        |
| `dictType`    | `string`                                              | `''`       | 字典类型；有 `options` 可不传 |
| `options`     | `DictOption[]`                                        | —          | 本地选项，传入后不再请求      |
| `multiple`    | `boolean`                                             | `false`    | 多选                          |
| `clearable`   | `boolean`                                             | `true`     | 可清空                        |
| `disabled`    | `boolean`                                             | `false`    | 禁用                          |
| `filterable`  | `boolean`                                             | `true`     | 可搜索                        |
| `placeholder` | `string`                                              | `'请选择'` | 占位文案                      |

`DictOption`：`{ label: string; value: string | number | boolean | null }`。

## Emits

| 事件                | 载荷                                                               |
| ------------------- | ------------------------------------------------------------------ |
| `update:modelValue` | `string \| number \| Array<string \| number> \| null \| undefined` |
| `change`            | 同上                                                               |

## 行为说明

- 远程按 `dictType` 缓存；只展示 `status !== 0`，按 `sort` 排序
- `dictType` / `options` 变化会重新加载（有 `options` 则跳过请求）

## 用法

```vue
<xnDictSelect v-model="status" dict-type="sys_user_status" />
<xnDictSelect v-model="status" :options="[{ label: '启用', value: '1' }]" />
```
