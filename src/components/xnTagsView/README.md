# xnTagsView

已访问路由的页签栏：横向滚动、关闭、右键菜单（刷新 / 关闭当前 / 关闭左侧 / 关闭右侧 / 关闭全部 / 全屏当前标签 / 在新窗口打开）。

## 介绍

状态来自 `useTagsViewStore` + 当前路由，无 Props。Affix 页签（如首页）不可关闭。刷新走 `/redirect{path}` 以重建页面。全屏由 `tagsViewStore.setFullscreen(true)` 控制，布局会隐藏侧栏/顶栏。

## 文件

| 文件             | 说明   |
| ---------------- | ------ |
| `xnTagsView.vue` | 页签栏 |

## Props / Emits / Slots

无（状态来自 `useTagsViewStore` + 路由）。

## 依赖

- `@/stores/tagsView`
- `@/types/menu`（`TagView`）

## 行为说明

- 右键菜单：**刷新 / 关闭当前 / 关闭左侧 / 关闭右侧 / 关闭全部 / 全屏当前标签 / 在新窗口打开**。没有「关闭其它」
- Affix 页签不可关闭；「关闭当前」在 affix 上禁用；左右/全部关闭只作用于非 affix
- 标签溢出时两端出现左右箭头；当前标签变化时会滚入可视区
- 垂直滚轮在溢出时转为横向滚动，并 `preventDefault`
- 刷新：先切到该页签，再 `router.replace({ path: '/redirect' + path, query })`
- 关闭当前页签后跳到相邻标签，没有则回 `/dashboard`
- 全屏通过 `tagsViewStore.setFullscreen(true)`

## 用法

挂载于后台布局内容区上方即可，一般无需传参：

```vue
<xnTagsView />
```
