# xnSmsCode

短信验证码：输入框 + 发送按钮，默认 60 秒倒计时。用于手机登录 / 绑定。

业务页传入 `request` 对接 `POST /auth/sms/send`。log 通道会回传 `code` 并弹窗演示短信。无后端时用 `mode="local"` 只走倒计时。

## 文件

| 文件            | 说明       |
| --------------- | ---------- |
| `xnSmsCode.vue` | 短信验证码 |

## Props

| 名称          | 类型                                                            | 默认值               | 说明                                 |
| ------------- | --------------------------------------------------------------- | -------------------- | ------------------------------------ |
| `modelValue`  | `string`                                                        | `''`                 | 验证码                               |
| `phone`       | `string`                                                        | `''`                 | 目标手机号，需为大陆 11 位           |
| `countdown`   | `number`                                                        | `60`                 | 倒计时秒数                           |
| `request`     | `(phone: string) => Promise<void \| { code?: string \| null }>` | —                    | 发送接口；返回 `code` 时弹窗演示短信 |
| `mode`        | `'auto' \| 'local'`                                             | `'auto'`             | `local` 不打接口，只走倒计时         |
| `disabled`    | `boolean`                                                       | `false`              | 禁用                                 |
| `maxlength`   | `number`                                                        | `6`                  | 验证码最大位数（输入会去掉非数字）   |
| `placeholder` | `string`                                                        | `'请输入短信验证码'` | 占位文案                             |
| `sendText`    | `string`                                                        | `'获取验证码'`       | 发送按钮文案                         |

`auto` 模式必须传 `request`，否则报「未配置短信发送请求」。手机号不合法时按钮禁用。

## Emits

| 事件                | 载荷               |
| ------------------- | ------------------ |
| `update:modelValue` | `string`           |
| `sent`              | `string`（手机号） |
| `error`             | `string`           |

## Expose

| 名称     | 说明     |
| -------- | -------- |
| `send()` | 触发发送 |

## 用法

```vue
<el-form-item label="手机号">
  <el-input v-model="phone" />
</el-form-item>
<el-form-item label="验证码">
  <xnSmsCode v-model="code" :phone="phone" :request="sendSms" />
</el-form-item>
```
