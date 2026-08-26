# xnDialog

业务弹窗壳：统一页脚、销毁、限高。Vue 端包的是 Element Plus `el-dialog`。

React 端对应 **XnDialog**（内部用已有的 `XnModal`，因为 Ant Design 没有 `el-dialog`，拖拽/限高已经在 Modal 封装里）。

## 文件

| 文件           | 说明     |
| -------------- | -------- |
| `xnDialog.vue` | 弹窗封装 |

## Props

| 名称                 | 类型                              | 默认值                               | 说明                     |
| -------------------- | --------------------------------- | ------------------------------------ | ------------------------ |
| `modelValue`         | `boolean`                         | —（必填）                            | 显隐                     |
| `title`              | `string`                          | `''`                                 | 标题                     |
| `size`               | `'small' \| 'default' \| 'large'` | `'default'`                          | 宽度预设 420 / 560 / 720 |
| `width`              | `string \| number`                | 随 size                              | 传入则覆盖 size          |
| `loading`            | `boolean`                         | `false`                              | 内容区遮罩，拉详情时用   |
| `showFullscreen`     | `boolean`                         | `false`                              | 标题栏全屏切换           |
| `fullscreen`         | `boolean`                         | `false`                              | 受控全屏初值；关闭后恢复 |
| `alignCenter`        | `boolean`                         | 读 `appConfig.ui.elementPlus.dialog` | 垂直居中                 |
| `draggable`          | `boolean`                         | 读 `appConfig.ui.elementPlus.dialog` | 拖标题栏；全屏时不拖     |
| `destroyOnClose`     | `boolean`                         | `true`                               | 关闭销毁                 |
| `closeOnClickModal`  | `boolean`                         | `false`                              | 点遮罩关闭               |
| `closeOnPressEscape` | `boolean`                         | `true`                               | Esc 关闭                 |
| `appendToBody`       | `boolean`                         | `true`                               | 挂到 body                |
| `showClose`          | `boolean`                         | `true`                               | 右上角关闭               |
| `showFooter`         | `boolean`                         | `true`                               | 默认取消 / 确定          |
| `showCancel`         | `boolean`                         | `true`                               | 显示取消                 |
| `showConfirm`        | `boolean`                         | `true`                               | 显示确定                 |
| `cancelText`         | `string`                          | `'取消'`                             | 取消文案                 |
| `confirmText`        | `string`                          | `'确定'`                             | 确定文案                 |
| `confirmLoading`     | `boolean`                         | `false`                              | 确定按钮 loading         |
| `confirmDisabled`    | `boolean`                         | `false`                              | 确定按钮禁用             |
| `beforeClose`        | `(done) => void`                  | —                                    | 透传 `el-dialog`         |

## Emits

| 事件                | 载荷        |
| ------------------- | ----------- |
| `update:modelValue` | `boolean`   |
| `confirm`           | —           |
| `cancel`            | —（并关闭） |
| `closed`            | —           |

## Slots

| 插槽     | 说明                       |
| -------- | -------------------------- |
| default  | 内容区                     |
| `header` | 自定义标题（或全屏按钮旁） |
| `footer` | 自定义页脚                 |

## Expose

| 名称                 | 说明     |
| -------------------- | -------- |
| `close()`            | 关闭     |
| `toggleFullscreen()` | 切换全屏 |

`showFullscreen` 或传入 `#header` 时使用自定义标题栏。

## 用法

```vue
<xnDialog v-model="open" title="编辑用户" :confirm-loading="saving" @confirm="submit">
  <el-form>...</el-form>
</xnDialog>
```
