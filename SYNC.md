# SYNC：相对基准 / vue3-js

本工程为 PRD 目标 B：`xn-admin-vue3(2写法)-js`（Options API）。

| 项 | 说明 |
| --- | --- |
| 功能基准 | **xn-admin-vue3-ts**（独立仓库） |
| 代码来源 | 自独立仓库 **xn-admin-vue3-js** 复制后改写脚本写法 |
| 后端 | 仅 **xn-admin-cloud**（独立仓库） |
| `APP_CLIENT_ID` | `xn-admin-vue3-options-js` |
| 开发端口 | `1801` |

## 已知差异（非功能缩水）

- 页面/组件使用 Options API，禁止 `<script setup>`；`usePageUi` / Pinia 等可在 `setup()` 中调用并返回
- 外观与 vue3-js 一致（同 Element Plus）

## 联调验收（2026-08-06）

脚本：`docs/_acceptance-options.mjs` → 结果：`docs/_acceptance-options-result.json`

| 维度 | 结果 |
| --- | --- |
| 环境/代理/鉴权/菜单 | 18/18 PASS |
| 第 6 章页面（文件+API+Options 写法） | 37/37 PASS |
| WebSocket（网关 + :1801 代理） | 2/2 PASS |
| 写路径（公告/岗位/消息/单位角色/系统配置 clients/角色权限/用户导入） | 8/8 PASS |
| 总评 | **PASS** |

说明：本轮为 API smoke + 页面存在性 + Options 写法 + WS/写路径；完整浏览器逐点点击仍建议人工抽查。
