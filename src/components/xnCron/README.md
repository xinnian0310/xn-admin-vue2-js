# xnCron

Quartz 六段 Cron 编辑器（秒 分 时 日 月 周）。输入框可手改，也可打开可视化面板。

## 文件

| 文件         | 说明        |
| ------------ | ----------- |
| `xnCron.vue` | Cron 编辑器 |

逻辑在 `@/utils/cron`（`parseCron` / `stringifyCron`）。

## Props

| 名称          | 类型      | 默认值                            | 说明        |
| ------------- | --------- | --------------------------------- | ----------- |
| `modelValue`  | `string`  | `'0 */5 * * * ?'`                 | Cron 表达式 |
| `disabled`    | `boolean` | `false`                           | 禁用        |
| `placeholder` | `string`  | `'Quartz Cron，如 0 */5 * * * ?'` | 占位文案    |

## Emits

| 事件                | 载荷     |
| ------------------- | -------- |
| `update:modelValue` | `string` |
| `change`            | `string` |

## 行为说明

- 弹窗按字段切换：每 / 周期 / 区间 / 指定；底部预览，点「应用」才回写
- 弹窗打开期间不跟外部 `modelValue` 同步，关闭后再跟

## 用法

```vue
<xnCron v-model="form.cron" />
```
