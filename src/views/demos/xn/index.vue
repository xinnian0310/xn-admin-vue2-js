<template>
  <div class="demo-page">
    <div class="demo-page__header">
      <div>
        <h2 class="demo-page__title">系统组件</h2>
        <p class="demo-page__desc">
          展示本项目封装的 xn* 业务组件。说明文案为静态介绍，示例数据均为本地写死，不请求后端。
        </p>
      </div>
      <el-tag type="warning" effect="plain">xn*</el-tag>
    </div>

    <el-tabs v-model="activeTab" tab-position="left" class="demo-page__tabs">
      <el-tab-pane label="页面布局" name="layout">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>页面布局</span>
              <el-tag size="small" type="primary" effect="plain">xnPageLayout</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="列表页标准壳：左侧树 / 搜索区 / 工具栏 / 表格或卡片 / 分页。业务页应优先使用该布局保持风格一致。"
            class="demo-intro"
          />
          <div class="demo-layout-box">
            <xnPageLayout
              v-model:page="page"
              v-model:page-size="pageSize"
              :show-pagination="true"
              :total="tableRows.length"
            >
              <template #aside>
                <xnTreePanel
                  title="组织树"
                  :data="treeData"
                  :current-key="treeKey"
                  @node-click="onTreeClick"
                />
              </template>
              <template #search>
                <xnSearch :search-item="searchItems" @query-form="onQueryForm" @reset="onReset" />
              </template>
              <template #toolbar>
                <xnButton
                  :list-item="buttonItems"
                  :selected="selected"
                  @button-click="onToolbarClick"
                />
              </template>
              <template #table>
                <xnTable
                  :data="tableRows"
                  :columns="tableColumns"
                  :show-pagination="false"
                  @selection-change="onSelectionChange"
                />
              </template>
            </xnPageLayout>
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="搜索表单" name="search">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>搜索表单</span>
              <el-tag size="small" type="primary" effect="plain">xnSearch</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="根据 SearchItem[] 配置驱动的查询表单，支持 input / number / select / date / daterange / datetime / dict / region，字段过多时可折叠。"
            class="demo-intro"
          />
          <xnSearch :search-item="searchItems" :collapse-count="2" @query-form="onQueryForm" />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="工具栏" name="button">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>工具栏按钮</span>
              <el-tag size="small" type="primary" effect="plain">xnButton</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="配置化工具栏：支持权限过滤、按选中行数禁用、下拉分组。动作通过 buttonClick 回调交给页面处理。"
            class="demo-intro"
          />
          <xnButton :list-item="buttonItems" :selected="selected" @button-click="onButtonClick" />
          <p class="demo-hint">当前选中 {{ selected.length }} 项（可在「页面布局」表格中勾选）。</p>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="数据表格" name="table">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>数据表格</span>
              <el-tag size="small" type="primary" effect="plain">xnTable</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="统一列表表格：内置序号/多选/标签/开关/长文本等列类型，可对接 CRUD API 或直接传入本地 data。"
            class="demo-intro"
          />
          <xnTable :data="tableRows" :columns="tableColumns" :show-pagination="false" />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="树面板" name="tree">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>左侧树面板</span>
              <el-tag size="small" type="primary" effect="plain">xnTreePanel</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="带标题与关键字过滤的树面板，常与 xnPageLayout 的 aside 插槽搭配，用于单位/菜单等树形筛选。"
            class="demo-intro"
          />
          <xnTreePanel
            title="示例树"
            :width="280"
            :data="treeData"
            :current-key="treeKey"
            @node-click="onTreeClick"
          />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="图标选择" name="icon">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>图标选择器</span>
              <el-tag size="small" type="primary" effect="plain">xnIconPicker</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="支持 Element / Iconify / SVG 图标选择，用于路由、菜单、按钮等图标配置。"
            class="demo-intro"
          />
          <div style="max-width: 420px">
            <xnIconPicker v-model="icon" />
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="富文本" name="rich">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>富文本编辑器</span>
              <el-tag size="small" type="primary" effect="plain">xnRichEditor</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="富文本编辑器，图片/视频/附件走 XnUpload；支持公式、@提及、Markdown、链接卡片。"
            class="demo-intro"
          />
          <xnRichEditor v-model="richHtml" height="220px" />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="长文本" name="longText">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>长文本</span>
              <el-tag size="small" type="primary" effect="plain">xnLongText</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="表格或详情中展示长文本：超出时可点击弹窗查看全文，并支持复制。"
            class="demo-intro"
          />
          <xnLongText
            text="这是一段用于演示的超长文本内容，点击后可以在弹窗中查看完整信息，并便于复制或阅读。"
            :max-length="20"
            title="备注详情"
          />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="大文件上传" name="upload">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>大文件分片上传</span>
              <el-tag size="small" type="primary" effect="plain">xnUpload</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="小文件单请求直传，大文件自动分片：Worker 算指纹 → 秒传探测 → 并发上传（失败指数退避重试）→ 服务端合并。可暂停 / 继续 / 取消；刷新页面后重新选择同一文件即可续传。"
            class="demo-intro"
          />
          <el-form :inline="true" size="small" class="demo-upload__form">
            <el-form-item label="分片大小">
              <el-select v-model="uploadChunkSize" style="width: 100px">
                <el-option label="5 MB" :value="5 * 1024 * 1024" />
                <el-option label="8 MB" :value="8 * 1024 * 1024" />
                <el-option label="10 MB" :value="10 * 1024 * 1024" />
                <el-option label="20 MB" :value="20 * 1024 * 1024" />
                <el-option label="50 MB" :value="50 * 1024 * 1024" />
              </el-select>
            </el-form-item>
            <el-form-item label="并发数">
              <el-input-number v-model="uploadConcurrency" :min="1" :max="8" style="width: 110px" />
            </el-form-item>
            <el-form-item label="重试次数">
              <el-input-number v-model="uploadMaxRetries" :min="0" :max="6" style="width: 110px" />
            </el-form-item>
            <el-form-item label="指纹算法">
              <el-select v-model="uploadHashAlgo" style="width: 170px">
                <el-option label="分片树摘要（原生，快）" value="sha256-tree" />
                <el-option label="全量 SHA-256（较慢）" value="sha256" />
              </el-select>
            </el-form-item>
            <el-form-item label="秒传">
              <el-switch v-model="uploadInstant" />
            </el-form-item>
            <el-form-item label="断点续传">
              <el-switch v-model="uploadResume" />
            </el-form-item>
            <el-form-item label="计算指纹">
              <el-switch v-model="uploadHash" />
            </el-form-item>
          </el-form>
          <xnUpload
            :chunk-size="uploadChunkSize"
            :concurrency="uploadConcurrency"
            :max-retries="uploadMaxRetries"
            :hash-algo="uploadHashAlgo"
            :enable-instant="uploadInstant"
            :enable-resume="uploadResume"
            :enable-hash="uploadHash"
            :max-size="10 * 1024 * 1024 * 1024"
            @success="onUploadSuccess"
            @error="onUploadError"
          />
          <div v-if="uploadLogs.length" class="demo-upload__logs">
            <div v-for="(log, index) in uploadLogs" :key="index">{{ log }}</div>
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="图片上传" name="image">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>图片上传</span>
              <el-tag size="small" type="primary" effect="plain">xnImageUpload</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="卡片预览、点击放大。limit=1 只传一张，大于 1 可多张。默认写入 MinIO（/files/upload），也可传入自定义 request。"
            class="demo-intro"
          />
          <el-form label-width="72px">
            <el-form-item label="单张">
              <xnImageUpload
                v-model="singleImage"
                :limit="1"
                tip="用于 Logo / 头像这类只要一张的场景"
              />
            </el-form-item>
            <el-form-item label="多张">
              <xnImageUpload v-model="multiImages" :limit="6" tip="最多 6 张，点击缩略图可预览" />
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="图标品牌" name="brand">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>图标 / 品牌</span>
              <el-tag size="small" type="primary" effect="plain">xnAppIcon · xnAppBrandLogo</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="xnAppIcon 统一解析 Element / Iconify / SVG；xnAppBrandLogo 展示系统品牌 Logo。"
            class="demo-intro"
          />
          <el-space :size="24" wrap>
            <el-space>
              <xnAppIcon name="HomeFilled" :size="20" />
              <xnAppIcon name="Setting" :size="20" />
              <xnAppIcon :name="icon" :size="20" />
              <el-text type="info">{{ icon }}</el-text>
            </el-space>
            <xnAppBrandLogo />
          </el-space>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="弹窗" name="dialog">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>业务弹窗</span>
              <el-tag size="small" type="primary" effect="plain">xnDialog</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="统一页脚、限高、可拖拽。支持 size 预设、内容区 loading、标题栏全屏。"
            class="demo-intro"
          />
          <el-space wrap>
            <el-button type="primary" @click="dialogOpen = true">打开弹窗</el-button>
            <el-button @click="dialogLoadingOpen = true">内容 loading</el-button>
          </el-space>
          <xnDialog
            v-model="dialogOpen"
            title="示例弹窗"
            size="large"
            show-fullscreen
            @confirm="dialogOpen = false"
          >
            <p>
              这里放表单或详情。右上角可切换全屏。确定 / 取消由组件提供，也可自定义 footer 插槽。
            </p>
          </xnDialog>
          <xnDialog
            v-model="dialogLoadingOpen"
            title="拉取详情"
            :loading="true"
            @confirm="dialogLoadingOpen = false"
          >
            <p>打开后内容区会有遮罩，适合 getDetail 未返回时。</p>
          </xnDialog>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="导出" name="export">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>导出</span>
              <el-tag size="small" type="primary" effect="plain">xnExport</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="演示走本地生成 CSV，不打后端。业务页把 request 换成 exportUsers 一类接口即可。"
            class="demo-intro"
          />
          <el-space wrap>
            <xnExport :request="demoExport" text="导出示例 CSV" />
            <xnExport :request="demoExport" confirm text="确认后导出" />
            <xnExport
              :request="demoExport"
              :show-message="false"
              text="静默导出"
              @success="onSilentExport"
            />
          </el-space>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="字典" name="dict">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>字典下拉</span>
              <el-tag size="small" type="primary" effect="plain">xnDictSelect</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="演示传入本地 options。业务页写 dict-type 即可按类型拉启用项。"
            class="demo-intro"
          />
          <xnDictSelect v-model="dictValue" :options="dictOptions" style="max-width: 280px" />
          <p class="demo-hint">当前值：{{ dictValue || '—' }}</p>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="Cron" name="cron">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>Cron 编辑器</span>
              <el-tag size="small" type="primary" effect="plain">xnCron</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="Quartz 六段：秒 分 时 日 月 周。定时任务页已接入。"
            class="demo-intro"
          />
          <xnCron v-model="cronValue" />
          <p class="demo-hint">{{ cronValue }}</p>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="描述" name="desc">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>详情描述</span>
              <el-tag size="small" type="primary" effect="plain">xnDesc</el-tag>
            </div>
          </template>
          <xnDesc :column="2" :items="descItems" />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="组织" name="org">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>组织选择器</span>
              <el-tag size="small" type="primary" effect="plain">xnOrgSelect</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="演示用本地数据。type 支持 unit / user / role / post。"
            class="demo-intro"
          />
          <el-form label-width="72px" style="max-width: 420px">
            <el-form-item label="单位">
              <xnOrgSelect v-model="orgUnit" type="unit" :tree-data="orgTree" />
            </el-form-item>
            <el-form-item label="用户">
              <xnOrgSelect v-model="orgUser" type="user" :options="orgUsers" />
            </el-form-item>
            <el-form-item label="角色">
              <xnOrgSelect v-model="orgRole" type="role" :options="orgRoles" />
            </el-form-item>
          </el-form>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="文件选择" name="file">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>文件选择器</span>
              <el-tag size="small" type="primary" effect="plain">xnFilePicker</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="演示用本地文件列表。业务页不传 data 则浏览 MinIO。"
            class="demo-intro"
          />
          <xnFilePicker v-model="pickedFile" :data="mockFiles" />
          <p class="demo-hint">{{ pickedFile || '—' }}</p>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="验证码" name="captcha">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>验证码</span>
              <el-tag size="small" type="primary" effect="plain">xnCaptcha</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="演示用本地图形码 / 滑块，不打登录接口。"
            class="demo-intro"
          />
          <el-space direction="vertical" fill style="max-width: 360px">
            <xnCaptcha v-model="captchaCode" mode="local" type="IMAGE" />
            <xnCaptcha mode="local" type="SLIDER" />
          </el-space>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="头像裁剪" name="avatar">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>头像裁剪</span>
              <el-tag size="small" type="primary" effect="plain">xnAvatarCrop</el-tag>
            </div>
          </template>
          <xnAvatarCrop v-model="avatarDemo" />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="水印" name="watermark">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>页面水印</span>
              <el-tag size="small" type="primary" effect="plain">xnWatermark</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="后台布局已套一层全局水印。这里是局部示例。"
            class="demo-intro"
          />
          <xnWatermark content="心念科技">
            <div class="demo-watermark-box">被水印覆盖的内容区</div>
          </xnWatermark>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="省市区" name="region">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>省市区级联</span>
              <el-tag size="small" type="primary" effect="plain">xnRegion</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="内置中国行政区划。演示不打接口。含非省会区县。value-type 可切 codes / labels / text。"
            class="demo-intro"
          />
          <el-form label-width="72px" style="max-width: 420px">
            <el-form-item label="省市区">
              <xnRegion v-model="regionCodes" @change="onRegionChange" />
            </el-form-item>
            <el-form-item label="省市">
              <xnRegion v-model="regionCity" :level="2" />
            </el-form-item>
            <el-form-item label="文案">
              <xnRegion v-model="regionTextModel" value-type="text" />
            </el-form-item>
          </el-form>
          <p class="demo-hint">{{ regionText || '—' }} {{ regionCodes.join(' / ') || '' }}</p>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="复制" name="copy">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>复制按钮</span>
              <el-tag size="small" type="primary" effect="plain">xnCopy</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="用于密钥、ID、日志等需要一键复制的场景。"
            class="demo-intro"
          />
          <el-space wrap>
            <xnCopy text="sk-demo-8f3a2c" show-text label="复制密钥" />
            <xnCopy text="1024" show-text />
            <xnCopy text="192.168.1.8" label="复制 IP" />
          </el-space>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="代码查看" name="code">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>JSON / 代码查看</span>
              <el-tag size="small" type="primary" effect="plain">xnCode</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="异常日志、接口文档常用。JSON 会格式化并着色。"
            class="demo-intro"
          />
          <xnCode title="请求参数" language="json" :value="demoJson" />
          <div style="height: 12px" />
          <xnCode title="堆栈" language="text" :value="demoStack" />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="短信验证码" name="sms">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>短信倒计时</span>
              <el-tag size="small" type="primary" effect="plain">xnSmsCode</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="手机登录 / 绑定用。演示 mode=local，不打短信接口。业务页传入 request 即可。"
            class="demo-intro"
          />
          <el-form label-width="72px" style="max-width: 420px">
            <el-form-item label="手机号">
              <el-input v-model="smsPhone" maxlength="11" placeholder="请输入手机号" />
            </el-form-item>
            <el-form-item label="验证码">
              <xnSmsCode v-model="smsCode" :phone="smsPhone" mode="local" />
            </el-form-item>
          </el-form>
          <p class="demo-hint">验证码：{{ smsCode || '—' }}</p>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="空状态" name="empty">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>空状态</span>
              <el-tag size="small" type="primary" effect="plain">xnEmpty</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="无数据 / 无权限 / 无搜索结果 / 失败。表格空槽已默认使用本组件。"
            class="demo-intro"
          />
          <el-space alignment="start" wrap :size="24">
            <xnEmpty type="data" size="small" />
            <xnEmpty type="permission" size="small" />
            <xnEmpty type="search" size="small" />
            <xnEmpty type="error" size="small" />
          </el-space>
          <xnTable
            :data="[]"
            :columns="tableColumns"
            :show-pagination="false"
            style="margin-top: 16px"
          />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="确认气泡" name="popconfirm">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>行内确认</span>
              <el-tag size="small" type="primary" effect="plain">xnPopconfirm</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="行内删除比整页 MessageBox 轻。表格操作列的 delete 已默认接入。"
            class="demo-intro"
          />
          <xnPopconfirm title="确定删除「示例用户 A」吗？" @confirm="onDemoDelete">
            <el-button type="danger" link>删除</el-button>
          </xnPopconfirm>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="权限指令" name="auth">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>权限指令</span>
              <el-tag size="small" type="primary" effect="plain">v-permission</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="无权限时移除 DOM 节点。按钮级权限控制的标准写法。"
            class="demo-intro"
          />
          <el-space>
            <el-tag v-permission="'menu:dashboard'" type="success">你拥有 menu:dashboard</el-tag>
            <el-tag v-permission="'demo:never-exist-permission'" type="danger">不应出现</el-tag>
            <el-text type="info">第二条使用不存在的权限码，无权限时会被指令隐藏。</el-text>
          </el-space>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="其它说明" name="other">
        <el-card shadow="never" class="demo-section">
          <template #header>
            <div class="demo-section__head">
              <span>其它组件说明</span>
              <el-tag size="small" type="info" effect="plain">xnImport / xnTagsView / …</el-tag>
            </div>
          </template>
          <el-alert
            type="info"
            show-icon
            :closable="false"
            title="部分组件依赖布局或业务流程，此处仅作说明，不单独挂载。"
            class="demo-intro"
          />
          <ul class="demo-note-list">
            <li>
              <strong>xnImport</strong>：Excel
              模板下载、预览与导入对话框，多用于用户/字典等批量导入。
            </li>
            <li><strong>xnTagsView</strong>：多标签页访问记录，位于顶栏布局中。</li>
            <li><strong>xnNoticeInbox</strong>：公告/消息铃铛与抽屉，位于顶栏。</li>
            <li><strong>xnThemePicker / xnUiPreferenceFab</strong>：主题与界面偏好设置入口。</li>
            <li><strong>xnErrorPage</strong>：403 / 404 / 503 错误页壳。</li>
            <li><strong>xnSidebarMenu</strong>：侧栏菜单（含搜索高亮），由布局使用。</li>
          </ul>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import { markRaw } from 'vue'
import { Delete, Download, Edit, Plus, Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import xnPageLayout from '@/components/xnPageLayout/xnPageLayout.vue'
import xnSearch from '@/components/xnSearch/xnSearch.vue'
import xnButton from '@/components/xnButton/xnButton.vue'
import xnTable from '@/components/xnTable/xnTable.vue'
import xnTreePanel from '@/components/xnTreePanel/xnTreePanel.vue'
import xnIconPicker from '@/components/xnIconPicker/xnIconPicker.vue'
import xnRichEditor from '@/components/xnRichEditor/xnRichEditor.vue'
import xnLongText from '@/components/xnLongText/xnLongText.vue'
import xnAppIcon from '@/components/xnAppIcon/xnAppIcon.vue'
import xnAppBrandLogo from '@/components/xnAppBrandLogo/xnAppBrandLogo.vue'
import xnUpload from '@/components/xnUpload/xnUpload.vue'
import xnImageUpload from '@/components/xnImageUpload/xnImageUpload.vue'
import xnDialog from '@/components/xnDialog/xnDialog.vue'
import xnExport from '@/components/xnExport/xnExport.vue'
import xnDictSelect from '@/components/xnDictSelect/xnDictSelect.vue'
import xnCron from '@/components/xnCron/xnCron.vue'
import xnDesc from '@/components/xnDesc/xnDesc.vue'
import xnOrgSelect from '@/components/xnOrgSelect/xnOrgSelect.vue'
import xnFilePicker from '@/components/xnFilePicker/xnFilePicker.vue'
import xnCaptcha from '@/components/xnCaptcha/xnCaptcha.vue'
import xnAvatarCrop from '@/components/xnAvatarCrop/xnAvatarCrop.vue'
import xnWatermark from '@/components/xnWatermark/xnWatermark.vue'
import xnRegion from '@/components/xnRegion/xnRegion.vue'
import xnCopy from '@/components/xnCopy/xnCopy.vue'
import xnCode from '@/components/xnCode/xnCode.vue'
import xnSmsCode from '@/components/xnSmsCode/xnSmsCode.vue'
import xnEmpty from '@/components/xnEmpty/xnEmpty.vue'
import xnPopconfirm from '@/components/xnPopconfirm/xnPopconfirm.vue'
import { DEFAULT_UPLOADER_OPTIONS } from '@/utils/upload'

export default {
  name: 'DemoXnPage',
  components: {
    xnPageLayout,
    xnSearch,
    xnButton,
    xnTable,
    xnTreePanel,
    xnIconPicker,
    xnRichEditor,
    xnLongText,
    xnAppIcon,
    xnAppBrandLogo,
    xnUpload,
    xnImageUpload,
    xnDialog,
    xnExport,
    xnDictSelect,
    xnCron,
    xnDesc,
    xnOrgSelect,
    xnFilePicker,
    xnCaptcha,
    xnAvatarCrop,
    xnWatermark,
    xnRegion,
    xnCopy,
    xnCode,
    xnSmsCode,
    xnEmpty,
    xnPopconfirm,
  },
  data() {
    return {
      activeTab: 'layout',
      treeKey: '1',
      icon: 'HomeFilled',
      richHtml: '<p>欢迎使用 <strong>xnRichEditor</strong></p>',
      selected: [],
      uploadChunkSize: DEFAULT_UPLOADER_OPTIONS.chunkSize,
      uploadConcurrency: DEFAULT_UPLOADER_OPTIONS.concurrency,
      uploadMaxRetries: DEFAULT_UPLOADER_OPTIONS.maxRetries,
      uploadHashAlgo: DEFAULT_UPLOADER_OPTIONS.hashAlgo,
      uploadInstant: DEFAULT_UPLOADER_OPTIONS.enableInstant,
      uploadResume: DEFAULT_UPLOADER_OPTIONS.enableResume,
      uploadHash: DEFAULT_UPLOADER_OPTIONS.enableHash,
      uploadLogs: [],
      singleImage: '',
      multiImages: [],
      dialogOpen: false,
      dialogLoadingOpen: false,
      smsPhone: '18888888888',
      smsCode: '',
      regionTextModel: '浙江省 / 杭州市 / 西湖区',
      dictValue: '1',
      dictOptions: [
        { label: '启用', value: '1' },
        { label: '停用', value: '0' },
      ],
      cronValue: '0 */5 * * * ?',
      descItems: [
        { label: '模块', value: '用户管理' },
        { label: '操作人', value: 'admin' },
        { label: '状态', value: '成功' },
        { label: '请求 ID', value: '1024', type: 'copy' },
        { label: '参数', value: '{"id":1}', type: 'pre', span: 2 },
      ],
      regionCodes: ['33', '3301', '330106'],
      regionCity: [],
      regionText: '浙江省 / 杭州市 / 西湖区',
      demoJson: {
        id: 1024,
        title: '更新用户',
        params: { username: 'admin', status: 1 },
      },
      demoStack:
        'java.lang.IllegalArgumentException: token expired\n    at com.smartadmin.security.JwtService.parse(JwtService.java:88)\n    at com.smartadmin.security.AuthFilter.doFilter(AuthFilter.java:42)',
      orgUnit: 1,
      orgUser: 1,
      orgRole: 1,
      orgTree: [
        {
          id: 1,
          name: '总公司',
          children: [
            { id: 2, name: '研发中心' },
            { id: 3, name: '运营中心' },
          ],
        },
      ],
      orgUsers: [
        { id: 1, label: '管理员（admin）' },
        { id: 2, label: '演示用户（demo）' },
      ],
      orgRoles: [
        { id: 1, label: '超级管理员' },
        { id: 2, label: '普通角色' },
      ],
      pickedFile: '',
      mockFiles: [
        {
          path: 'docs/readme.md',
          name: 'readme.md',
          size: 1024,
          directory: false,
          lastModified: '2026-08-26',
        },
        {
          path: 'images/logo.png',
          name: 'logo.png',
          size: 20480,
          directory: false,
          lastModified: '2026-08-26',
        },
      ],
      captchaCode: '',
      avatarDemo: '',
      page: 1,
      pageSize: 10,
      treeData: [
        {
          id: '1',
          name: '总公司',
          children: [
            { id: '1-1', name: '研发中心', children: [{ id: '1-1-1', name: '前端组' }] },
            { id: '1-2', name: '运营中心' },
          ],
        },
      ],
      searchItems: [
        { label: '名称', prop: 'name', type: 'input', placeholder: '请输入名称' },
        {
          label: '状态',
          prop: 'status',
          type: 'dict',
          options: [
            { label: '启用', value: 1 },
            { label: '停用', value: 0 },
          ],
        },
        { label: '地区', prop: 'region', type: 'region', width: 260 },
        { label: '创建日期', prop: 'createdAt', type: 'daterange' },
        { label: '年龄', prop: 'age', type: 'number' },
      ],
      buttonItems: [
        {
          name: '新增',
          action: 'add',
          type: 'button',
          icon: markRaw(Plus),
          typeColor: 'primary',
        },
        {
          name: '编辑',
          action: 'edit',
          type: 'button',
          icon: markRaw(Edit),
          typeColor: 'primary',
          index: 0,
        },
        {
          name: '删除',
          action: 'delete',
          type: 'button',
          icon: markRaw(Delete),
          typeColor: 'danger',
          index: 1,
        },
        {
          name: '更多',
          type: 'down',
          icon: markRaw(Download),
          typeColor: 'default',
          searchItem: [
            { name: '导出', action: 'export', icon: markRaw(Download) },
            { name: '导入', action: 'import', icon: markRaw(Upload) },
          ],
        },
      ],
      tableColumns: [
        { type: 'selection', width: 48 },
        { type: 'index', label: '#', width: 56 },
        { label: '名称', prop: 'name', minWidth: 120 },
        {
          label: '状态',
          prop: 'status',
          type: 'tag',
          width: 100,
          options: [
            { label: '启用', value: 1, type: 'success' },
            { label: '停用', value: 0, type: 'info' },
          ],
        },
        { label: '备注', prop: 'remark', type: 'longText', minWidth: 160 },
      ],
      tableRows: [
        { id: 1, name: '示例用户 A', status: 1, remark: '这是一段较短的备注' },
        {
          id: 2,
          name: '示例用户 B',
          status: 0,
          remark: '这是一段很长很长的备注内容，用于演示 longText 列在表格中的截断与点击展开效果。',
        },
        { id: 3, name: '示例用户 C', status: 1, remark: '另一条备注' },
      ],
    }
  },
  methods: {
    onTreeClick(node) {
      this.treeKey = String(node.id)
      ElMessage.info(`选中：${String(node.name)}`)
    },
    pushUploadLog(text) {
      this.uploadLogs.unshift(`${new Date().toLocaleTimeString()} · ${text}`)
      if (this.uploadLogs.length > 8) this.uploadLogs.pop()
    },
    onUploadSuccess(file, task) {
      this.pushUploadLog(
        `${task.instant ? '秒传命中' : '上传成功'}：${file.name} → ${file.url || file.path}`,
      )
      ElMessage.success(`${file.name} ${task.instant ? '秒传完成' : '上传完成'}`)
    },
    onUploadError(message, task) {
      this.pushUploadLog(`失败：${task.name} — ${message}`)
      ElMessage.error(`${task.name} 上传失败：${message}`)
    },
    onQueryForm(form) {
      ElMessage.info(`查询：${JSON.stringify(form)}`)
    },
    onReset() {
      ElMessage.success('已重置')
    },
    onToolbarClick(action) {
      ElMessage.info(`工具栏：${action}`)
    },
    onButtonClick(action) {
      ElMessage.info(`点击：${action}`)
    },
    onSelectionChange(rows) {
      this.selected = rows
    },
    onRegionChange(payload) {
      this.regionText = payload.text
    },
    onSilentExport() {
      ElMessage.info('页面自己提示')
    },
    onDemoDelete() {
      ElMessage.success('已删除（演示）')
    },
    async demoExport() {
      const blob = new Blob(['name,status\n示例,启用\n'], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'demo.csv'
      a.click()
      URL.revokeObjectURL(url)
    },
  },
}
</script>

<style scoped>
.demo-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
  padding: 16px 20px 24px;
}

.demo-page__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.demo-page__title {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
}

.demo-page__desc {
  margin: 0;
  max-width: 720px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.demo-page__tabs {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 12px 8px 12px 0;
}

.demo-page__tabs :deep(.el-tabs__header.is-left) {
  margin-right: 0;
  flex-shrink: 0;
}

.demo-page__tabs :deep(.el-tabs__content) {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 0 8px 8px 16px;
}

.demo-section {
  margin-bottom: 12px;
}

.demo-section__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.demo-intro {
  margin-bottom: 14px;
}

.demo-layout-box {
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  min-height: 420px;
}

.demo-hint {
  margin: 8px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.demo-note-list {
  margin: 0;
  padding-left: 18px;
  line-height: 1.9;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.demo-upload__form {
  margin-bottom: 4px;
}

.demo-upload__form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.demo-watermark-box {
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  color: var(--el-text-color-secondary);
}

.demo-upload__logs {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--el-fill-color-light);
  font-size: 12px;
  line-height: 1.9;
  color: var(--el-text-color-secondary);
  word-break: break-all;
}
</style>
