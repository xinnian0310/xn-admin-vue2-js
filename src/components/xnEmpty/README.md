# xnEmpty

列表 / 卡片的统一空状态：无数据、无权限、无搜索结果、加载失败。

表格默认空槽已接入本组件（`size="small"`）。页面级占位也可单独使用。

## 文件

| 文件          | 说明   |
| ------------- | ------ |
| `xnEmpty.vue` | 空状态 |

## Props

| 名称          | 类型                                            | 默认值      | 说明                                |
| ------------- | ----------------------------------------------- | ----------- | ----------------------------------- |
| `type`        | `'data' \| 'permission' \| 'search' \| 'error'` | `'data'`    | 预设文案与图标                      |
| `title`       | `string`                                        | 随 type     | 覆盖主文案                          |
| `description` | `string`                                        | 随 type     | 覆盖副文案；`description=""` 可隐藏 |
| `size`        | `'default' \| 'small'`                          | `'default'` | 表格内用 small                      |

预设：`data` 暂无数据 / `permission` 暂无权限 / `search` 无匹配结果 / `error` 加载失败。

## Slots

| 插槽    | 说明                     |
| ------- | ------------------------ |
| default | 操作区（如「重新加载」） |

## 用法

```vue
<xnEmpty type="search" />
<xnEmpty type="error">
  <el-button @click="reload">重新加载</el-button>
</xnEmpty>
```
