STYLEKIT_STYLE_REFERENCE
style_name: 编辑杂志风
style_slug: editorial
style_source: /styles/editorial

## 项目上下文
- 项目类型: 编辑器核心型桌面应用

# Hard Prompt

## 什么时候用
当你希望 AI 严格按风格规则生成代码时使用。它是生产界面最稳的默认选择。

## 怎么用
- 把完整提示词复制到 ChatGPT、Claude、Cursor 或其他编码助手。
- 在提示词后追加具体产品、页面或组件需求。
- 生成后按禁止项和交互状态检查，确认没有风格漂移。

请严格遵守以下风格规则并保持一致性，禁止风格漂移。

## 执行要求

- 优先保证风格一致性，其次再做创意延展。
- 遇到冲突时以禁止项为最高优先级。
- 输出前自检：颜色、排版、间距、交互是否仍属于该风格。

## Style Rules

# Editorial (编辑杂志风) Design System

> 优雅的杂志排版风格，衬线标题、无衬线正文、精致的留白和网格系统。灵感来自高端时尚杂志和报纸排版。暖米色背景、柔和黑文字、精细的透明度层次和动画下划线交互。

## 核心理念

Editorial（编辑杂志风）设计风格源于传统印刷媒体的排版美学，特别是高端时尚杂志和报纸的设计语言。这种风格强调内容的层次结构、精致的字体搭配和大量留白。

核心理念：
- 内容为王：设计服务于内容，不喧宾夺主。UI 是低声细语，不是大声喊叫
- 字体层次：衬线标题与无衬线正文形成对比，标签使用 uppercase tracking 增加呼吸感
- 留白即美：适当的负空间让内容呼吸，section 间距 py-24 md:py-40 起步
- 单色克制：仅使用 #1C1C1C 配合不同透明度（/60 /40 /10）构建视觉层次，拒绝彩色装饰
- 微妙动效：hover-underline 动画、clip-path reveal、group-hover:italic 等克制而精致的交互

---

## Token 字典（精确 Class 映射）

### 边框
```
宽度: border
颜色: border-border
圆角: rounded-none
```

### 阴影
```
小:   shadow-none
中:   shadow-none
大:   shadow-none
悬停: shadow-none
聚焦: shadow-none
```

### 交互效果
```
悬停位移: undefined
过渡动画: transition-colors duration-200
按下状态: active:scale-95
```

### 字体
```
标题: font-serif tracking-tight
正文: font-sans
```

### 字号
```
Hero:  text-4xl md:text-6xl lg:text-7xl
H1:    text-3xl md:text-5xl
H2:    text-2xl md:text-3xl
H3:    text-xl md:text-2xl
正文:  text-sm md:text-base
小字:  text-xs
```

### 间距
```
Section: py-16 md:py-24 lg:py-32
容器:    px-6 md:px-12
卡片:    p-6
```

---

## [FORBIDDEN] 绝对禁止

以下 class 在本风格中**绝对禁止使用**，生成时必须检查并避免：

### 禁止的 Class
- `rounded-sm`
- `rounded`
- `rounded-md`
- `rounded-lg`
- `rounded-xl`
- `rounded-2xl`
- `rounded-3xl`
- `rounded-full`
- `shadow-sm`
- `shadow`
- `shadow-md`
- `shadow-lg`
- `shadow-xl`
- `shadow-2xl`
- `border-2`
- `border-4`
- `border-8`
- `bg-blue-500`
- `bg-green-500`
- `bg-yellow-500`

### 禁止的模式
- 匹配 `^rounded-(?!none)`
- 匹配 `^shadow-(?!none)`
- 匹配 `^border-[248]`
- 匹配 `^bg-gradient-`

### 禁止原因
- `rounded-lg`: Editorial uses sharp corners only (rounded-none)
- `shadow-lg`: Editorial avoids shadows completely
- `border-4`: Editorial uses thin borders only (border)
- `bg-gradient-to-r`: Editorial uses solid colors, no gradients
- `font-black`: Editorial headings use font-serif with normal weight, not bold

> WARNING: 如果你的代码中包含以上任何 class，必须立即替换。

---

## [REQUIRED] 必须包含

### 按钮必须包含
```
px-6 py-3
text-sm tracking-wide
transition-colors
```

### 卡片必须包含
```
border border-border
hover:border-foreground
transition-colors
```

### 输入框必须包含
```
border border-border
text-sm
focus:outline-none
focus:border-foreground
transition-colors
placeholder:text-muted
```

---

## [COMPARE] 错误 vs 正确对比

### 按钮

[WRONG] **错误示例**（使用了圆角和模糊阴影）：
```html
<button class="rounded-lg shadow-lg bg-blue-500 text-white px-4 py-2 hover:bg-blue-600">
  点击我
</button>
```

[CORRECT] **正确示例**（使用硬边缘、无圆角、位移效果）：
```html
<button class="px-6 py-3 text-sm tracking-wide transition-colors bg-[#ff006e] text-white px-4 py-2 md:px-6 md:py-3">
  点击我
</button>
```

### 卡片

[WRONG] **错误示例**（使用了渐变和圆角）：
```html
<div class="rounded-xl shadow-2xl bg-gradient-to-r from-purple-500 to-pink-500 p-6">
  <h3 class="text-xl font-semibold">标题</h3>
</div>
```

[CORRECT] **正确示例**（纯色背景、硬边缘阴影）：
```html
<div class="border border-border hover:border-foreground transition-colors p-6">
  <h3 class="font-serif tracking-tight text-xl md:text-2xl">标题</h3>
</div>
```

### 输入框

[WRONG] **错误示例**（灰色边框、圆角）：
```html
<input class="rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500" />
```

[CORRECT] **正确示例**（黑色粗边框、聚焦阴影）：
```html
<input class="border border-border text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-muted px-3 py-2 md:px-4 md:py-3" placeholder="请输入..." />
```

---

## [TEMPLATES] 页面骨架模板

使用以下模板生成页面，只需替换 `{PLACEHOLDER}` 部分：

### 导航栏骨架
```html
<nav class="bg-white border-b-2 md:border-b-4 border-black px-4 md:px-8 py-3 md:py-4">
  <div class="flex items-center justify-between max-w-6xl mx-auto">
    <a href="/" class="font-black text-xl md:text-2xl tracking-wider">
      {LOGO_TEXT}
    </a>
    <div class="flex gap-4 md:gap-8 font-mono text-sm md:text-base">
      {NAV_LINKS}
    </div>
  </div>
</nav>
```

### Hero 区块骨架
```html
<section class="min-h-[60vh] md:min-h-[80vh] flex items-center px-4 md:px-8 py-12 md:py-0 bg-{ACCENT_COLOR} border-b-2 md:border-b-4 border-black">
  <div class="max-w-4xl mx-auto">
    <h1 class="font-black text-4xl md:text-6xl lg:text-8xl leading-tight tracking-tight mb-4 md:mb-6">
      {HEADLINE}
    </h1>
    <p class="font-mono text-base md:text-xl max-w-xl mb-6 md:mb-8">
      {SUBHEADLINE}
    </p>
    <button class="bg-black text-white font-black px-6 py-3 md:px-8 md:py-4 border-2 md:border-4 border-black shadow-[4px_4px_0px_0px_rgba(255,0,110,1)] md:shadow-[8px_8px_0px_0px_rgba(255,0,110,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm md:text-base">
      {CTA_TEXT}
    </button>
  </div>
</section>
```

### 卡片网格骨架
```html
<section class="py-12 md:py-24 px-4 md:px-8">
  <div class="max-w-6xl mx-auto">
    <h2 class="font-black text-2xl md:text-4xl mb-8 md:mb-12">{SECTION_TITLE}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      <!-- Card template - repeat for each card -->
      <div class="bg-white border-2 md:border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 md:p-6 hover:shadow-[4px_4px_0px_0px_rgba(255,0,110,1)] md:hover:shadow-[8px_8px_0px_0px_rgba(255,0,110,1)] hover:-translate-y-1 transition-all">
        <h3 class="font-black text-lg md:text-xl mb-2">{CARD_TITLE}</h3>
        <p class="font-mono text-sm md:text-base text-gray-700">{CARD_DESCRIPTION}</p>
      </div>
    </div>
  </div>
</section>
```

### 页脚骨架
```html
<footer class="bg-black text-white py-12 md:py-16 px-4 md:px-8 border-t-2 md:border-t-4 border-black">
  <div class="max-w-6xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <span class="font-black text-xl md:text-2xl">{LOGO_TEXT}</span>
        <p class="font-mono text-sm mt-4 text-gray-400">{TAGLINE}</p>
      </div>
      <div>
        <h4 class="font-black text-lg mb-4">{COLUMN_TITLE}</h4>
        <ul class="space-y-2 font-mono text-sm text-gray-400">
          {FOOTER_LINKS}
        </ul>
      </div>
    </div>
  </div>
</footer>
```

### 书架 Dashboard 骨架
```html
<div class="min-h-screen bg-[#F9F8F6] px-6 md:px-12 py-16 md:py-24">
  <!-- 顶部标题区 -->
  <div class="max-w-6xl mx-auto mb-12 md:mb-16">
    <h1 class="font-serif tracking-tight text-3xl md:text-5xl mb-2">项目中心</h1>
    <p class="font-sans text-sm text-[#1C1C1C]/60">管理你的书籍项目</p>
  </div>

  <!-- 书籍卡片网格 -->
  <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mb-16">
    <!-- Book Card — repeat for each book -->
    <div class="border border-border hover:border-foreground transition-colors p-6 cursor-pointer">
      <h2 class="font-serif tracking-tight text-xl md:text-2xl mb-1">{BOOK_TITLE}</h2>
      <p class="font-sans text-xs tracking-[0.2em] uppercase text-[#1C1C1C]/40 mb-4">{BOOK_GENRE}</p>
      <div class="flex items-center gap-4 font-sans text-xs text-[#1C1C1C]/60">
        <span>第 {CHAPTER_NUM} 章</span>
        <span>{WORD_COUNT} 字</span>
      </div>
      <p class="font-sans text-xs text-[#1C1C1C]/40 mt-2">更新于 {LAST_UPDATED}</p>
    </div>

    <!-- New Project Card -->
    <div class="border border-border border-dashed hover:border-foreground transition-colors p-6 cursor-pointer flex items-center justify-center min-h-[160px]">
      <span class="font-sans text-sm text-[#1C1C1C]/40 tracking-wide">+ 新建项目</span>
    </div>
  </div>

  <!-- 底部 Agent 状态指示条 -->
  <div class="max-w-6xl mx-auto border-t border-border pt-4 flex items-center gap-3">
    <span class="w-2 h-2 rounded-full bg-green-600"></span>
    <span class="font-sans text-xs text-[#1C1C1C]/60">所有 Agent 运行正常</span>
  </div>
</div>
```

### 编辑器三栏骨架
```html
<div class="flex h-screen bg-[#F9F8F6] overflow-hidden">

  <!-- 左侧项目栏（可折叠） -->
  <aside class="w-64 border-r border-border flex-shrink-0 flex flex-col hidden md:flex">
    <div class="p-4 border-b border-border">
      <h2 class="font-serif tracking-tight text-lg">{BOOK_TITLE}</h2>
    </div>
    <nav class="flex-1 overflow-y-auto p-4 space-y-1">
      <!-- Volume -->
      <p class="font-sans text-xs tracking-[0.2em] uppercase text-[#1C1C1C]/40 mb-2">第一卷</p>
      <!-- Chapter item -->
      <a href="#" class="block font-sans text-sm text-[#1C1C1C]/80 hover:text-[#1C1C1C] hover:underline transition-colors py-1 pl-3 border-l border-border hover:border-[#1C1C1C]">
        第一章 {CHAPTER_TITLE}
      </a>
      <a href="#" class="block font-sans text-sm text-[#1C1C1C]/40 hover:text-[#1C1C1C] hover:underline transition-colors py-1 pl-3 border-l border-transparent hover:border-[#1C1C1C]">
        第二章 {CHAPTER_TITLE}
      </a>
    </nav>
    <div class="p-4 border-t border-border">
      <span class="font-sans text-xs text-[#1C1C1C]/40">v0.1.0</span>
    </div>
  </aside>

  <!-- 中心编辑区 -->
  <main class="flex-1 flex flex-col min-w-0">
    <!-- 编辑器头部 -->
    <header class="flex items-center justify-between px-6 py-3 border-b border-border">
      <div class="flex items-center gap-3">
        <span class="font-sans text-xs text-[#1C1C1C]/60">第三章</span>
        <span class="font-serif text-lg">{CHAPTER_TITLE}</span>
      </div>
      <div class="flex items-center gap-4">
        <span class="font-sans text-xs text-[#1C1C1C]/60">4,500 字</span>
        <button class="font-sans text-xs tracking-wide px-4 py-2 border border-border hover:border-foreground transition-colors">
          保存
        </button>
      </div>
    </header>

    <!-- 纯文本编辑器 -->
    <div class="flex-1 overflow-y-auto p-6 md:p-12">
      <textarea
        class="w-full h-full bg-transparent font-sans text-base leading-relaxed text-[#1C1C1C] resize-none focus:outline-none"
        placeholder="开始写作..."
      ></textarea>
    </div>

    <!-- 底部状态栏 -->
    <footer class="flex items-center justify-between px-6 py-2 border-t border-border">
      <span class="font-sans text-xs text-[#1C1C1C]/60">第三章 · 4,500 字</span>
      <span class="font-sans text-xs text-[#1C1C1C]/40">main@abc1234</span>
      <div class="flex items-center gap-3">
        <span class="font-sans text-xs text-[#1C1C1C]/60">all agents active</span>
        <button class="font-sans text-xs tracking-wide px-3 py-1 border border-border hover:border-foreground transition-colors">
          Solo
        </button>
      </div>
    </footer>
  </main>

  <!-- 右侧工具栏 -->
  <aside class="w-72 border-l border-border flex-shrink-0 flex flex-col">
    <!-- Tab 切换栏 -->
    <div class="flex border-b border-border">
      <button class="flex-1 py-3 font-sans text-xs tracking-wide border-b-2 border-[#1C1C1C] text-[#1C1C1C]">大纲</button>
      <button class="flex-1 py-3 font-sans text-xs tracking-wide text-[#1C1C1C]/40 hover:text-[#1C1C1C] transition-colors">角色</button>
      <button class="flex-1 py-3 font-sans text-xs tracking-wide text-[#1C1C1C]/40 hover:text-[#1C1C1C] transition-colors">AI</button>
      <button class="flex-1 py-3 font-sans text-xs tracking-wide text-[#1C1C1C]/40 hover:text-[#1C1C1C] transition-colors">设置</button>
    </div>

    <!-- Tab 内容区 -->
    <div class="flex-1 overflow-y-auto p-4">
      <p class="font-sans text-xs tracking-[0.2em] uppercase text-[#1C1C1C]/40 mb-3">章节大纲</p>
      <p class="font-sans text-sm text-[#1C1C1C]/80 leading-relaxed">{OUTLINE_CONTENT}</p>
    </div>
  </aside>

</div>
```

---

## [CHECKLIST] 生成后自检清单

**在输出代码前，必须逐项验证以下每一条。如有违反，立即修正后再输出：**

### 1. 圆角检查
- [ ] 搜索代码中的 `rounded-`
- [ ] 确认只有 `rounded-none` 或无圆角
- [ ] 如果发现 `rounded-lg`、`rounded-md` 等，替换为 `rounded-none`

### 2. 阴影检查
- [ ] 搜索代码中的 `shadow-`
- [ ] 确认只使用 `shadow-[Xpx_Xpx_0px_0px_rgba(...)]` 格式
- [ ] 如果发现 `shadow-lg`、`shadow-xl` 等，替换为正确格式

### 3. 边框检查
- [ ] 搜索代码中的 `border-`
- [ ] 确认边框颜色是 `border-black`
- [ ] 如果发现 `border-gray-*`、`border-slate-*`，替换为 `border-black`

### 4. 交互检查
- [ ] 所有按钮都有 `hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]`
- [ ] 所有卡片都有 hover 效果（阴影变色或位移）
- [ ] 都包含 `transition-all`

### 5. 响应式检查
- [ ] 边框有 `border-2 md:border-4`
- [ ] 阴影有 `shadow-[4px...] md:shadow-[8px...]`
- [ ] 间距有 `p-4 md:p-6` 或类似的响应式值
- [ ] 字号有 `text-sm md:text-base` 或类似的响应式值

### 6. 字体检查
- [ ] 标题使用 `font-black`
- [ ] 正文使用 `font-mono`

> CRITICAL: **如果任何一项检查不通过，必须修正后重新生成代码。**

---

## [EXAMPLES] 示例 Prompt

### 1. 创意作品集

编辑杂志风格的创意设计师作品集

```
Use Editorial style to create a creative portfolio page:
1. Fixed nav: font-serif logo with tracking-[0.3em], hover-underline links
2. Hero: massive serif title (9rem+) with italic subtitle in #1C1C1C/60, clip-path image reveal
3. Featured works: numbered list (01, 02, 03) with hover image float and group-hover:italic
4. Infinite marquee ticker: services list with dot separators
5. Archive grid: masonry 2-col layout with staggered scroll reveals
6. About section: sticky portrait left, serif quote right, services/clients lists
7. Contact: floating-label inputs with bottom borders, hover-underline submit button
8. Palette: bg-[#F9F8F6], text-[#1C1C1C] with /60 /40 /10 opacity hierarchy only
```

### 2. 杂志风格博客

经典杂志排版的博客首页

```
Use Editorial style to create a magazine blog homepage:
1. Navigation: fixed top, bg-[#F9F8F6]/90 backdrop-blur, hover-underline links
2. Featured article: full-width grayscale image with clip-path reveal, serif title text-7xl
3. Article list: numbered editorial list with border-b border-[#1C1C1C]/10 dividers
4. Typography: font-serif headings tracking-tighter, font-sans text-xs labels with tracking-[0.2em] uppercase
5. Footer: minimal, text-xs uppercase with dot separators
6. Colors: monochrome only, #F9F8F6 background, #1C1C1C text with opacity variants
```

### 3. 工作室介绍

设计工作室的介绍页面

```
Use Editorial style to design a studio about page:
1. Layout: 12-col grid, col-span-5 sticky portrait + col-span-7 content
2. Hero quote: font-serif text-6xl with line breaks and italic decorative words
3. Body text: font-sans text-sm leading-relaxed text-[#1C1C1C]/80, max-w-xl
4. Services & clients: two-column grid with uppercase tracking labels, serif list items
5. Contact section: Say Hello heading text-8xl, floating-label form inputs
6. Interactions: IntersectionObserver scroll reveals, group-hover:italic on links
7. Palette: bg-[#F9F8F6], pure monochrome, NO accent colors
```

## 绝对禁止（匹配即拒绝）

以下模式一旦出现，视为风格违规——不找借口，直接重写。

- 使用彩色强调色（红、蓝、绿等），保持纯单色体系
- 使用粗边框或阴影（shadow-*）
- 使用 #0a0a0a 纯黑或 #fafafa 冷白作为主色
- 标题使用无衬线字体
- 过小的行高，正文至少 leading-relaxed
- 元素堆积，保持呼吸感
- 使用渐变、背景图案或装饰性几何元素
- 使用大圆角 rounded-xl 以上

## 自检清单（交付前逐条确认）

如果任何一条不通过，说明风格漂移了——修改后再交付。

- [ ] 没有紫色到蓝色的渐变
- [ ] 没有使用 Inter / Roboto / Geist 等过度使用的字体
- [ ] 没有嵌套卡片（卡片里面套卡片）
- [ ] 没有在彩色背景上放灰色文字
- [ ] 正文对比度满足 WCAG AA（≥4.5:1）
- [ ] 没有 bounce / elastic 缓动曲线
- [ ] 动效有 prefers-reduced-motion 备选方案
- [ ] 正文行宽不超过 65-75 个字符
- [ ] 没有单侧粗边框装饰（border-left/right accent stripe）
- [ ] 没有渐变文字（background-clip: text）
- [ ] 没有把玻璃态（glassmorphism）当作默认风格
- [ ] 没有 tiny uppercase tracked eyebrow 放在每个 section 标题上面
- [ ] 禁止使用彩色强调色（红、蓝、绿等），保持纯单色体系
- [ ] 禁止使用粗边框或阴影（shadow-*）
- [ ] 禁止使用 #0a0a0a 纯黑或 #fafafa 冷白作为主色
- [ ] 禁止标题使用无衬线字体
- [ ] 禁止过小的行高，正文至少 leading-relaxed