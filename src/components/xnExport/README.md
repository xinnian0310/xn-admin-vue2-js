# xnExport

导出按钮：自带 loading 与成功/失败提示。可走自定义 `request`，或带鉴权下载 `url`。

## 文件

| 文件           | 说明     |
| -------------- | -------- |
| `xnExport.vue` | 导出按钮 |

## Props

| 名称             | 类型                                                                     | 默认值                   | 说明                                     |
| ---------------- | ------------------------------------------------------------------------ | ------------------------ | ---------------------------------------- |
| `request`        | `() => Promise<void>`                                                    | —                        | 自定义导出；传入后忽略 `url`             |
| `url`            | `string`                                                                 | `''`                     | 带鉴权的下载地址，如 `/api/users/export` |
| `filename`       | `string`                                                                 | `'export.xlsx'`          | 下载文件名                               |
| `params`         | `Record<string, unknown>`                                                | `{}`                     | 拼到 `url` 的查询参数                    |
| `text`           | `string`                                                                 | `'导出'`                 | 按钮文案                                 |
| `type`           | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'default'` | `'primary'`              | 按钮类型                                 |
| `plain`          | `boolean`                                                                | `true`                   | 朴素按钮                                 |
| `disabled`       | `boolean`                                                                | `false`                  | 禁用                                     |
| `size`           | `'large' \| 'default' \| 'small'`                                        | `'default'`              | 按钮尺寸                                 |
| `showMessage`    | `boolean`                                                                | `true`                   | 成功 toast；页面自己提示时关掉           |
| `successMessage` | `string`                                                                 | `'导出成功'`             | 成功文案                                 |
| `confirm`        | `boolean`                                                                | `false`                  | 导出前气泡确认                           |
| `confirmTitle`   | `string`                                                                 | `'确定导出当前数据吗？'` | 确认文案                                 |

`request` 与 `url` 至少配一个，否则抛「未配置导出请求」。

## Emits

| 事件      | 载荷     |
| --------- | -------- |
| `success` | —        |
| `error`   | `string` |

## Slots

| 插槽    | 说明         |
| ------- | ------------ |
| default | 覆盖按钮文案 |

## Expose

| 名称       | 说明     |
| ---------- | -------- |
| `export()` | 触发导出 |

## 用法

```vue
<xnExport :request="() => exportUsers(params)" />
<xnExport url="/api/users/export" filename="users.xlsx" :params="params" />
<xnExport :request="exportUsers" :show-message="false" confirm />
```
