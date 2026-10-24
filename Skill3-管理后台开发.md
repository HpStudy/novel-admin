# Skill 3：小说阅读平台管理后台开发（含 AI 智能客服管理）

## 角色
你是一名资深前端工程师，使用 Vue 3 开发小说阅读平台的管理后台系统。平台内置 AI 智能客服，本后台负责：查看每轮 AI 对话记录、人工接管转人工会话、维护知识库文档、配置 AI 模型与对话参数。

## 技术栈要求
- 框架：Vue 3 + Vite 5
- UI 库：Element Plus
- 图标：@element-plus/icons-vue
- 路由：Vue Router 4
- 状态管理：Pinia
- HTTP：Axios
- 图表：ECharts（数据看板用）

## 项目背景
开发一个网络小说阅读平台的运营管理后台，运营人员在这里管理书籍、章节、用户、订单、Banner 等内容。

新增：**智能客服管理**。C 端 H5 的 AI 客服每轮对话都会记录到后端，运营人员在本后台查看会话记录、处理转人工请求（人工接管并在会话内回复）、维护 AI 知识库文档、配置 AI 模型与对话规则。这是正式上线功能，需满足会话状态流转正确、消息实时可见、操作留痕等要求。

## 后端 API 约定
- BaseURL: /api/admin（通过 Vite 代理转发到后端）
- 统一返回格式: { code: 0, message: 'success', data: {} }
- 管理员登录后拿到 token，后续请求 Header 带 Authorization: Bearer {token}
- 列表统一返回 { list, total, page, pageSize }
- AI 相关接口见下方「智能客服 API 清单」，全部需要管理员 JWT

## 整体布局
- 左侧：菜单栏（可折叠）
- 顶部：导航栏（面包屑 + 用户头像 + 退出登录）
- 右侧：内容区域

## 页面结构

```
src/
├── api/                 # API 请求封装
│   ├── request.ts       # axios 实例
│   ├── book.ts          # 书籍管理
│   ├── chapter.ts       # 章节管理
│   ├── category.ts       # 分类管理
│   ├── user.ts          # 用户管理
│   ├── order.ts         # 订单管理
│   ├── banner.ts        # Banner管理
│   ├── stats.ts         # 数据统计
│   ├── settings.ts      # 系统设置
│   └── ai.ts            # 智能客服（会话/消息/知识库/配置/统计）
├── layout/              # 布局组件
│   ├── index.vue        # 整体布局
│   ├── Sidebar.vue      # 侧边栏菜单
│   └── Navbar.vue       # 顶部导航
├── views/
│   ├── login/           # 登录页
│   ├── dashboard/       # 数据看板
│   ├── book/
│   │   ├── list.vue     # 书籍列表
│   │   └── edit.vue     # 新增/编辑书籍
│   ├── chapter/
│   │   ├── list.vue     # 章节列表
│   │   └── upload.vue   # 批量上传章节
│   ├── category/        # 分类管理
│   ├── user/            # 用户管理
│   ├── order/          # 订单管理
│   ├── banner/          # Banner管理
│   ├── comment/        # 评论管理
│   ├── setting/        # 系统设置
│   └── ai/              # 智能客服（新增）
│       ├── conversation/
│       │   ├── list.vue     # 会话管理列表
│       │   └── detail.vue   # 会话详情（聊天窗口+人工回复）
│       ├── knowledge/
│       │   └── list.vue     # 知识库管理（含新增/编辑弹窗）
│       └── setting.vue      # AI 设置
├── router/
├── store/
└── main.ts
```

## 各页面详细要求（原有，保持不变）

### 1. 登录页 /login
- 居中卡片式登录框
- 用户名 + 密码输入
- 登录按钮
- 调 /api/admin/login，成功后存 token 跳首页

### 2. 数据看板 /dashboard
顶部四个统计卡片：
- 总书籍数
- 总用户数
- 今日订单数
- 今日营收

下方两个图表：
- 近7天订单趋势（折线图）
- 分类书籍分布（饼图）

### 3. 书籍列表 /book/list
表格列：封面缩略图、书名、作者、分类、字数、章节数、状态（连载/完结）、评分、操作（编辑/删除）
顶部操作栏：搜索框（按书名/作者搜索）、分类筛选下拉框、新增书籍按钮；底部分页组件。

### 4. 书籍编辑 /book/edit
表单字段：书名（必填）、作者（必填）、分类（下拉选择）、封面上传、简介（多行文本）、标签（多选）、连载状态（单选）、是否VIP书籍（开关）、每章价格（数字输入）、免费章节数（数字输入）。保存按钮新增或更新调对应接口。

### 5. 章节管理 /chapter/list
- 顶部选择书籍（下拉）；表格列：章节序号、标题、字数、是否免费、发布时间、操作（编辑/删除）；新增章节按钮。

### 6. 批量上传章节 /chapter/upload
- 文本框粘贴 TXT 内容；自动按「第X章」正则切分；预览切分结果；确认后批量导入。

### 7. 分类管理 /category
- 表格：分类名、图标、排序、状态、操作；新增/编辑弹窗表单。

### 8. 用户管理 /user
- 表格：头像、昵称、手机号、VIP等级、余额、注册时间、状态；按昵称/手机号搜索；禁用/启用、调整VIP等级。

### 9. 订单管理 /order
- 表格：订单号、用户、类型、金额、状态、支付时间；按状态筛选、按订单号搜索。

### 10. Banner管理 /banner
- 表格：图片预览、标题、排序、状态、开始结束时间；新增/编辑：上传图片、跳转链接、排序、上线时间。

### 11. 评论管理 /comment
- 表格：用户、书籍、评论内容、点赞数、时间、操作（隐藏/显示）。

### 12. 系统设置 /setting
- 设置项：站点名称、客服电话、邮箱、版本号
- 页面加载时调用 `GET /api/admin/settings`，保存时调用 `PUT /api/admin/settings`
- 保存后数据必须持久化到后端 MySQL，不能只保存在浏览器或服务内存
- 邮箱必须为有效邮箱；接口失败时显示错误提示，不得静默回退到本地默认值

## 菜单结构（侧边栏）
```
数据看板
内容管理
  ├─ 书籍管理
  ├─ 章节管理
  ├─ 分类管理
  └─ Banner管理
用户管理
订单管理
评论管理
智能客服（新增）
  ├─ 会话管理
  ├─ 知识库管理
  └─ AI 设置
系统设置
```
- 侧边栏「智能客服」组内：会话管理带未处理角标（待转人工数量，随轮询刷新）；会话管理/知识库管理路由需配置「管理端 AI 权限点」（可复用管理员角色，不做细分权限时至少保证仅管理员可访问）

## 智能客服管理设计（新增）

### API 封装 src/api/ai.ts
- `getConversations(params)` → GET /api/admin/ai/conversations（params: page/pageSize/status/startTime/endTime/keyword）
- `getConversation(id)` → GET /api/admin/ai/conversations/:id
- `getMessages(id, params)` → GET /api/admin/ai/conversations/:id/messages
- `takeOver(id)` → POST /api/admin/ai/conversations/:id/take-over
- `reply(id, content)` → POST /api/admin/ai/conversations/:id/reply
- `closeConversation(id)` → POST /api/admin/ai/conversations/:id/close
- `getAiStats()` → GET /api/admin/ai/stats
- `getKnowledge(params)` → GET /api/admin/ai/knowledge
- `createKnowledge(data)` → POST /api/admin/ai/knowledge
- `parseKnowledge(id)` → POST /api/admin/ai/knowledge/:id/parse
- `updateKnowledge(id, data)` → PUT /api/admin/ai/knowledge/:id
- `deleteKnowledge(id)` → DELETE /api/admin/ai/knowledge/:id
- `getChunks(id)` → GET /api/admin/ai/knowledge/:id/chunks
- `getAiSettings()` → GET /api/admin/ai/settings
- `updateAiSettings(data)` → PUT /api/admin/ai/settings
- `testAi(question)` → POST /api/admin/ai/test

### 1. 会话管理 views/ai/conversation/list.vue
- 顶部统计条（调 getAiStats）：待转人工数、今日会话数、已接管数、AI 解决率（未转人工且已结束占比）
- 筛选区：状态下拉（全部/进行中/待转人工/人工已接管/已结束）、时间范围（date-picker 范围）、关键词输入（会话编号/用户昵称）、查询/重置
- 表格列：会话编号、用户（昵称，无昵称显示 ID）、来源、状态（el-tag 配色：进行中 primary / 待转人工 warning / 已接管 success / 已结束 info）、消息数、最后消息时间、创建时间、操作（详情 / 接管 / 结束）
- 规则：
  - 待转人工行高亮（浅黄背景）并默认按创建时间倒序置顶
  - 接管/结束需二次确认（ElMessageBox.confirm）；结束后按钮置灰
  - 每 30s 自动轮询列表（仅停留在本页时），并同步刷新侧边栏角标
- 分页：page/pageSize 可调，pageSize 默认 20

### 2. 会话详情 views/ai/conversation/detail.vue（人工转接工作台）
- 布局：左侧会话信息栏（用户、来源、状态、创建/最后消息/转人工/结束时间线，接管人）+ 右侧聊天窗口 + 底部回复区
- 聊天窗口消息渲染（与 C 端同规则）：
  - role=user：右侧主题色气泡；role=assistant：左侧白底气泡，底部显示「参考来源」引用（点击弹 Drawer 查看来源文档标题/切片原文）；role=agent：左侧浅色气泡带「客服」标签（显示接管人姓名）；role=system：居中灰字
  - 支持滚动加载历史（分页，向上翻）；新消息自动滚到底部
- 回复区：
  - 会话状态 chatting/待转人工（未接管）：显示「接管会话」按钮（调 takeOver）与说明文案「接管后可回复用户」
  - 已接管（agent）：显示 textarea + 发送按钮（调 reply，发送后立即上屏 agent 消息）；回车发送、Shift+Enter 换行
  - 已结束：回复区禁用，显示「会话已结束」
- 刷新：停留在详情页时每 10-15s 轮询消息接口（新 user/agent 消息实时上屏；AI 流式回复期间轮询可拿到逐条落库消息，亦可接受 3s 快速轮询）
- 操作留痕：接管/结束操作成功后 Message 提示，并在时间线中体现（后端落 system 消息）

### 3. 知识库管理 views/ai/knowledge/list.vue
- 表格列：标题、来源类型（手工录入/文件上传/网页抓取）、切片数、状态（el-tag：待解析 info / 解析中 warning 带 loading / 已入库 success / 失败 danger，鼠标悬停显示 fail_reason）、更新时间、操作（解析 / 查看切片 / 编辑 / 删除）
- 顶部操作栏：搜索框（按标题）、「新增文档」按钮
- 新增/编辑弹窗（el-dialog）：
  - 标题（必填）
  - 内容来源三选一：
    - 手工录入：textarea 正文
    - 文件上传：el-upload，accept 白名单 .txt/.md/.pdf/.doc/.docx，大小上限 10MB（后端校验，前端同步限制并提示）
    - 网页抓取：URL 输入
  - 提交调 createKnowledge / updateKnowledge；编辑保存后后端需重新解析，弹窗提示「已提交重新解析」
- 解析流程：
  - 手动点「解析」或新增后自动触发 → 调 parseKnowledge → 轮询列表状态（每 5s）直到 已入库/失败
  - 解析失败展示失败原因与「重试」按钮
- 删除：二次确认，明确提示「将同步删除向量与切片，不可恢复」
- 查看切片：抽屉（el-drawer）展示该文档切片列表（序号、内容、token 数、向量状态）

### 4. AI 设置 views/ai/setting.vue
- 表单分组（el-form + el-tabs 或分段卡片）：
  1. 模型配置：供应商下拉（OpenAI/火山方舟/智谱）、对话模型名、API Key（密码框，回显脱敏值，留空表示不修改）、Embedding 模型名
  2. 对话配置：系统提示词（textarea，默认允许知识库无资料时基于通用知识回答，并要求知道就回答、不知道就说不知道）、欢迎语（新建会话时展示）、topK（数字 1-10，默认 5）、相似度阈值（slider 0-1，默认 0.5）、启用引用开关（enableCitation）、模型异常兜底话术（noHitFallback，仅在模型调用失败或没有返回内容时使用）
  3. 转人工与限流：允许用户转人工开关、限流条数/分钟（默认 10）、SSE 超时秒数（默认 60）；不提供空闲自动转人工，转人工仅由用户主动申请或后台接管触发
- 加载：进入页面调 getAiSettings 回填；保存调 updateAiSettings，成功 Message 提示「已生效」
- 测试区：输入测试问题 → 调 testAi → 展示命中切片列表与 AI 回答预览（说明：测试不入库、不产生会话记录）
- 校验：topK 整数 1-10；阈值 0-1；API Key 若输入非空需满足对应供应商格式提示（后端最终校验）

## 交互要求（原有）
1. 所有列表页带分页
2. 删除操作需要二次确认弹窗
3. 表单提交时 loading 状态
4. 操作成功/失败用 Message 提示
5. 未登录或 token 过期自动跳登录页
6. 菜单高亮当前路由
7. （新增）接管/结束会话同样需要二次确认；会话详情轮询期间若 401 立即跳登录

## 系统设置 API / 数据约定（原有）
- 统一响应：`{ code: 0, message: 'success', data: { siteName, contact, email, version } }`
- 两个接口均需要管理员 JWT；`GET` 返回完整设置（未保存字段用默认值）；`PUT` 提交同字段并返回持久化结果；数据表 admin_settings 以 setting_key 为主键

## 跨端契约（与后端、H5 对齐）
- 会话状态：0进行中 / 1待转人工 / 2人工已接管 / 3已结束（会话列表/详情共用此枚举，勿自定义文案之外的映射）
- 消息角色：user / assistant（AI）/ agent（客服）/ system
- AI 回复引用 meta.citations：[{docId, title, chunkIndex}]，详情页按此渲染参考来源
- AI 配置返回字段：llmProvider / llmModel / llmApiKeyMasked / embeddingModel / systemPrompt / welcomeMessage / topK / similarityThreshold / enableCitation / noHitFallback / allowUserTransfer / rateLimitPerMinute / sseTimeoutSec（提交时 llmApiKey 可留空）

## 样式要求（原有）
- Element Plus 默认主题即可
- 布局宽度自适应
- 表格行高适中，不要太拥挤
- 封面缩略图统一尺寸（80x100）
- （新增）会话详情聊天窗口参照即时通讯样式：消息区高度约 55vh、滚动、气泡最大宽度 65%；待转人工高亮色 #FDF6EC 系

## 验收标准
1. 登录流程正常；所有 CRUD 页面能正常操作；数据看板图表正常渲染；菜单和路由联动正确
2. 会话管理：C 端产生的每轮对话记录完整可见（含 AI 与人工消息），状态筛选/时间筛选/关键词搜索可用
3. 转人工全流程：待转人工高亮与角标 → 接管 → 客服回复 → C 端可见 → 结束会话，状态流转与二次确认正确
4. 知识库：新增（三种来源）→ 解析 → 切片查看 → 编辑重新解析 → 删除（含向量）全链路可用；失败可见原因
5. AI 设置：读取回填、保存生效、测试预览可用；API Key 不回显明文
6. npm run dev 启动正常，页面无报错
