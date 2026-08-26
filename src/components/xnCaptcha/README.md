# xnCaptcha

登录验证码：图形输入 / 滑块。`mode=auto` 请求后端验证码；`mode=local` 前端生成，供演示。

## 文件

| 文件            | 说明   |
| --------------- | ------ |
| `xnCaptcha.vue` | 验证码 |

## Props

| 名称         | 类型                  | 默认值   | 说明                                                 |
| ------------ | --------------------- | -------- | ---------------------------------------------------- |
| `modelValue` | `string`              | `''`     | 图形码输入（`v-model`）                              |
| `captchaId`  | `string`              | `''`     | 验证码 ID（`v-model:captcha-id`）                    |
| `mode`       | `'auto' \| 'local'`   | `'auto'` | `auto` 请求后端；`local` 前端生成不打接口            |
| `type`       | `'IMAGE' \| 'SLIDER'` | —        | 强制类型；不传则 `auto` 跟后端，`local` 默认 `IMAGE` |
| `disabled`   | `boolean`             | `false`  | 禁用                                                 |

## Emits

| 事件                | 载荷                                           |
| ------------------- | ---------------------------------------------- |
| `update:modelValue` | `string`                                       |
| `update:captchaId`  | `string`                                       |
| `change`            | `{ captchaId: string; captchaCode?: string }`  |
| `verified`          | `boolean`（刷新时 `false`；滑块通过为 `true`） |

## Expose

| 名称           | 说明                                                            |
| -------------- | --------------------------------------------------------------- |
| `refresh()`    | 刷新验证码                                                      |
| `getPayload()` | `{ captchaId, captchaCode }`（`captchaCode` 取自 `modelValue`） |
| `captchaId`    | 当前 ID（computed）                                             |

## 行为说明

- 挂载时自动 `refresh()`
- `refresh` 仅在当前 `modelValue` 非空时才回写空字符串，避免登录表单在空值时被触发校验
- `IMAGE`：输入框 + 点击图片刷新；`SLIDER`：拖动滑块完成验证
- 登录提交时带 `{ captchaId, captchaCode }`

## 用法

```vue
<xnCaptcha v-model="code" v-model:captcha-id="captchaId" />
<xnCaptcha v-model="code" mode="local" type="IMAGE" />
```
