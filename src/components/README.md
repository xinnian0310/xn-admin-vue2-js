# 通用组件

列表页常用组合：

```
xnPageLayout
├── #aside → xnTreePanel（可选）
├── #search → xnSearch
├── #toolbar → xnButton + xnExport
└── #table → xnTable
```

配置通常来自后端 page-ui（`usePageUi`）与路由权限。

按用途分组（文档仍见下表）：

- **布局导航**：xnPageLayout、xnSidebarMenu、xnTagsView、xnThemePicker、xnUiPreference、xnAppIcon、xnAppBrandLogo
- **列表页**：xnSearch、xnButton、xnTable、xnTreePanel、xnExport、xnImport
- **表单选择**：xnDictSelect、xnOrgSelect、xnRegion、xnCron、xnIconPicker、xnFilePicker、xnRichEditor
- **上传**：xnAvatarCrop、xnImageUpload、xnUpload
- **反馈展示**：xnDialog、xnPopconfirm、xnEmpty、xnErrorPage、xnCode、xnCopy、xnDesc、xnLongText、xnNoticeInbox、xnWatermark
- **校验安全**：xnCaptcha、xnSmsCode

| 组件           | 说明                                | 文档                                 |
| -------------- | ----------------------------------- | ------------------------------------ |
| xnAppIcon      | 统一图标（Element / Iconify / SVG） | [README](./xnAppIcon/README.md)      |
| xnAppBrandLogo | 品牌 Logo                           | [README](./xnAppBrandLogo/README.md) |
| xnAvatarCrop   | 头像裁剪上传                        | [README](./xnAvatarCrop/README.md)   |
| xnButton       | 工具栏 / 行操作按钮                 | [README](./xnButton/README.md)       |
| xnCaptcha      | 图形 / 滑块验证码                   | [README](./xnCaptcha/README.md)      |
| xnCode         | JSON / 代码查看                     | [README](./xnCode/README.md)         |
| xnCopy         | 一键复制                            | [README](./xnCopy/README.md)         |
| xnCron         | Quartz Cron 编辑器                  | [README](./xnCron/README.md)         |
| xnDesc         | 详情描述列表                        | [README](./xnDesc/README.md)         |
| xnDialog       | 业务弹窗壳（Vue 包 `el-dialog`）    | [README](./xnDialog/README.md)       |
| xnDictSelect   | 字典下拉                            | [README](./xnDictSelect/README.md)   |
| xnEmpty        | 无数据 / 无权限等空状态             | [README](./xnEmpty/README.md)        |
| xnErrorPage    | 403 / 404 / 503 错误页骨架          | [README](./xnErrorPage/README.md)    |
| xnExport       | 导出按钮                            | [README](./xnExport/README.md)       |
| xnFilePicker   | 从已上传文件中选择                  | [README](./xnFilePicker/README.md)   |
| xnIconPicker   | 图标选择器                          | [README](./xnIconPicker/README.md)   |
| xnImport       | Excel 导入对话框                    | [README](./xnImport/README.md)       |
| xnImageUpload  | 图片上传（单张 / 多张 + 预览）      | [README](./xnImageUpload/README.md)  |
| xnLongText     | 长文本截断 + 弹窗查看               | [README](./xnLongText/README.md)     |
| xnNoticeInbox  | 消息中心抽屉                        | [README](./xnNoticeInbox/README.md)  |
| xnOrgSelect    | 单位 / 用户 / 角色 / 岗位           | [README](./xnOrgSelect/README.md)    |
| xnPageLayout   | 列表页骨架                          | [README](./xnPageLayout/README.md)   |
| xnPopconfirm   | 行内确认气泡                        | [README](./xnPopconfirm/README.md)   |
| xnRegion       | 省市区级联                          | [README](./xnRegion/README.md)       |
| xnRichEditor   | 富文本（wangEditor）                | [README](./xnRichEditor/README.md)   |
| xnSearch       | 配置化搜索表单                      | [README](./xnSearch/README.md)       |
| xnSidebarMenu  | 多级菜单                            | [README](./xnSidebarMenu/README.md)  |
| xnSmsCode      | 短信验证码倒计时                    | [README](./xnSmsCode/README.md)      |
| xnTable        | 配置化表格                          | [README](./xnTable/README.md)        |
| xnTagsView     | 页面标签栏                          | [README](./xnTagsView/README.md)     |
| xnThemePicker  | 主题设置                            | [README](./xnThemePicker/README.md)  |
| xnTreePanel    | 左侧树面板                          | [README](./xnTreePanel/README.md)    |
| xnUiPreference | 个人界面偏好 FAB                    | [README](./xnUiPreference/README.md) |
| xnUpload       | 大文件分片上传                      | [README](./xnUpload/README.md)       |
| xnWatermark    | 页面水印                            | [README](./xnWatermark/README.md)    |
