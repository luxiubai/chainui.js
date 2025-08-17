# ChainUI - UI 库

ChainUI 是一个 JavaScript UI 库，通过操作流机制和链式 API 提供开发体验。

**核心特性:**

- **链式 API**: 直观的 UI 构建方式。
- **操作流**: 高效的批量 DOM 更新机制。
- **响应式系统**: 灵活的状态管理，自动驱动 UI 更新。
- **客户端路由**: 内置路由系统，支持动态路径和导航守卫。
- **SSR 支持**: 服务端渲染能力，优化首屏加载和 SEO。

## 快速上手

使用 ChainUI 构建简单计数器：

```javascript
import { h, createState, mount } from "chainui";

const count = createState(0);

const app = h("div").child(
  h("h1").child("计数器示例"),
  h("p").child(count.map((c) => `当前值: ${c}`)),
  h("div").child(
    h("button")
      .child("增加")
      .on("click", () => count.update((c) => c + 1)),
    h("button")
      .child("减少")
      .set(
        "disabled",
        count.map((c) => c <= 0),
        "attr"
      )
      .on("click", () => count.update((c) => c - 1))
  )
);

mount(app, "#app");
```

## 安装与使用

ChainUI 支持多种集成方式，以适应你的项目需求。

### 1. 使用构建工具 (Vite/Webpack)

这是最推荐的方式，可以获得完整的 TypeScript 类型支持和最佳的打包优化。

```bash
npm install @luxbai-dev/chainui
# 或者
yarn add @luxbai-dev/chainui
```

在你的 JavaScript 或 TypeScript 文件中导入：

```javascript
// 命名导入（推荐）
import { h, createState, mount } from "@luxbai-dev/chainui";

// 或使用默认导入
import ChainUI from "@luxbai-dev/chainui";
// 然后使用 ChainUI.h, ChainUI.createState, ChainUI.mount 等
```

### 2. 通过 `<script type="module">` (ESM)

你可以直接在现代浏览器中使用 ESM 版本，无需任何构建工具。推荐使用 [unpkg](https://www.unpkg.com/) CDN。

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="app"></div>

    <script type="module">
      // 从 CDN 导入，请确保使用具体的版本号以保证稳定性
      import {
        h,
        createState,
        mount,
      } from "https://www.unpkg.com/@luxbai-dev/chainui@latest/build/esm/chainui.min.js";

      const app = h("p").child("Hello from ESM!");
      mount(app, "#app");
    </script>
  </body>
</html>
```

### 3. 通过 `<script>` 标签 (IIFE)

对于快速原型或传统项目，IIFE 版本是最简单的方式。它会在全局暴露一个 `ChainUI` 对象。

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="app"></div>

    <!-- 引入 IIFE 构建文件 -->
    <script src="https://www.unpkg.com/@luxbai-dev/chainui@latest/build/iife/chainui.min.js"></script>
    <script>
      // 所有 API 都挂载在全局的 ChainUI 对象上
      const { h, createState, mount } = ChainUI;

      const app = h("p").child("Hello from IIFE!");
      mount(app, "#app");
    </script>
  </body>
</html>
```

### 4. 在 Node.js 中使用

ChainUI 同样可以在 Node.js 环境中运行，主要用于服务端渲染 (SSR)。它同时支持 CommonJS 和 ES Module 两种模块系统。

## 高级主题

**CommonJS (CJS)**

```javascript
const { h, renderToStream } = require("@luxbai-dev/chainui");

// ... 详见服务端渲染章节
```

**ES Module (ESM)**

在 `package.json` 中设置 `"type": "module"`，或者使用 `.mjs` 文件扩展名。

```javascript
import { h, renderToStream } from "@luxbai-dev/chainui";

// ... 详见服务端渲染章节
```

## 核心机制

### 1. 操作流 (Operation Stream)

- 链式 API 生成操作指令（如 `CREATE_ELEMENT`, `SET_ATTRIBUTE`）
- 指令收集到操作流中批量处理
- 支持操作优化（合并连续属性/样式更新）
- 支持序列化/反序列化（SSR 场景）

### 2. 批量 DOM 更新

- 在 `requestAnimationFrame` 回调中批量执行
- 最小化 DOM 操作次数
- 自动合并连续样式/属性更新

### 3. 响应式系统

- 状态变更自动触发相关 UI 更新
- 支持状态映射（`map()`）创建派生状态
- 精细化的更新范围控制

### 4. 列表协调 (List Reconciliation)

- 对动态列表进行高效更新，最小化 DOM 操作。
- 通过 `data-key` 属性识别列表项，实现智能的增、删、移动。
- 确保在列表数据变化时，UI 能够平滑、高效地更新。

## API 参考

### `h(tagName) → ChainElement`

创建元素的起点函数，返回可链式调用的元素实例：

```javascript
const element = h("div");
```

### `mount(component, selector, ssrData?) → ChainRuntime`

将组件挂载到 DOM 中的指定位置。

- `component`: (必选) 要挂载的 `ChainElement` 实例。
- `selector`: (必选) 目标容器的 CSS 选择器字符串，或直接的 DOM 元素。
- `ssrData`: (可选) 服务端渲染提供的数据对象，用于客户端“注水”（Hydration）。
  - `ssrData.stream`: 序列化的操作流字符串。
  - `ssrData.state`: 初始状态快照。
  - `ssrData.rootId`: 根组件的唯一节点 ID。

```javascript
import { h, mount, createState } from "chainui";

const myState = createState("Hello");
const app = h("div").child(myState.map((v) => `当前值: ${v}`));

// 挂载到 #app 元素
mount(app, "#app");

// 结合 SSR 数据进行注水
// mount(App(), "#app", window.ssrData);
```

### 元素操作方法

- **`.child(...children)`**: 添加一个或多个子节点。子节点可以是 `ChainElement` 实例、字符串、数字或状态对象。
- **`.on(eventType, handler)`**: 绑定一个事件监听器。
- **`.when(state, trueFactory, falseFactory, options?)`**: 根据响应式状态的值，动态地渲染两个不同的组件之一。
  - `state`: (必选) 用于判断的响应式状态。
  - `trueFactory`: (必选) 当 `state` 为真值时，返回 `ChainElement` 的工厂函数。
  - `falseFactory`: (可选) 当 `state` 为假值时，返回 `ChainElement` 的工厂函数。
  - `options`: (可选) 配置对象。
    - `options.keepAlive`: `boolean`，如果为 `true`，则两个组件都会被渲染到 DOM 中，并通过 CSS `display` 属性进行切换显隐，而不是移除不活动的组件。这有助于保留组件的内部状态（例如表单输入）。默认为 `false`。
- **`.set(name, value, type?)`**: 一个功能强大的方法，用于设置元素的属性、样式和类。它支持多种用法，包括单个设置和批量设置，并能与响应式状态无缝集成。

  **`.set()` 的用法:**

  1.  **设置单个属性、样式或类**:
      当 `name` 是字符串时，`value` 是要设置的值，`type` 是可选的类型提示（`'attr'`、`'style'`、`'class'`）。如果 `type` 未提供，ChainUI 会尝试根据 `name` 自动推断。

      - **属性 (`attr`)**:
        ```javascript
        h("input").set("placeholder", "请输入...", "attr"); // 明确指定为属性
        h("div").set("data-custom", "value"); // 自动推断为属性 (以 'data-' 开头或包含连字符)
        h("input").set("value", myState); // 绑定响应式状态到 input 的 value 属性
        h("button").set("disabled", isDisabledState); // 绑定响应式状态到 button 的 disabled 属性
        ```
      - **样式 (`style`)**:
        ```javascript
        h("div").set("color", "red", "style"); // 明确指定为样式
        h("div").set("backgroundColor", "blue"); // 自动推断为样式 (如果属性名是合法的 CSS 属性)
        h("div").set(
          "display",
          visibilityState.map((v) => (v ? "block" : "none"))
        ); // 响应式样式
        ```
      - **类 (`class`)**:
        ```javascript
        h("p").set("active", true, "class"); // 添加 'active' 类
        h("p").set("hidden", false, "class"); // 移除 'hidden' 类
        h("p").set("highlight", isHighlightedState, "class"); // 根据状态添加/移除类
        ```

  2.  **使用配置对象批量设置**:
      当 `name` 是一个对象时，你可以同时设置 `attr` (属性)、`style` (样式) 和 `class` (类)。

      ```javascript
      h("div").set({
        attr: {
          id: "main-container",
          "data-component": "MyComponent",
          title: "这是一个示例",
          value: myInputState, // 绑定响应式状态
        },
        style: {
          backgroundColor: "lightblue",
          fontSize: "16px",
          padding: "10px",
          opacity: opacityState.map((o) => o / 100), // 响应式样式
        },
        class: {
          "is-active": true, // 根据布尔值添加或移除类
          "is-disabled": someState.map((s) => s.disabled), // 响应式地添加或移除类
        },
      });
      ```

  3.  **灵活的 Class 设置**:
      `class` 属性在配置对象中支持多种格式，提供极大的灵活性：

      - **对象形式**: 键是类名，值是布尔值（`true` 添加，`false` 移除）。
        ```javascript
        .set({ class: { 'class-a': true, 'class-b': false, 'class-c': someState.value } })
        ```
      - **数组形式**: 数组中的每个字符串都会被添加为类。
        ```javascript
        .set({ class: ['class-x', 'class-y', 'class-z'] })
        ```

### `createState(initialValue) → ChainState`

创建响应式状态对象。

### 响应式状态 (`createState`)

`createState` 是 ChainUI 响应式系统的核心。它返回一个状态对象，UI 可以订阅其变化并自动更新。

```javascript
const name = createState("游客");

// 读取值

// 更新值
name.value = "张三"; // 方式一：直接赋值
name.update((currentName) => currentName + "!"); // 方式二：使用更新函数，推荐用于复杂逻辑

// 订阅变化
const unsubscribe = name.subscribe((newValue) => {
  console.log(`名字变成了: ${newValue}`);
});
// 当不再需要时，调用 unsubscribe() 来取消订阅，防止内存泄漏。

// 派生状态 (Derived State)
// .map() 方法创建一个新的只读状态，它的值由原始状态计算而来。
const welcomeMessage = name.map((n) => `欢迎, ${n}`);

// 在 UI 中使用
h("h1").child(welcomeMessage); // 当 name 改变时，h1 的文本会自动更新
```

### 渲染列表 (`map`)

`map` 函数是渲染动态列表的专用工具。它接收一个包含数组的状态对象和一个工厂函数，并高效地将数组中的每一项渲染为 UI 元素。

**工作原理**: 当状态数组发生变化时，ChainUI 会使用一个高效的协调 (Reconciliation) 算法。它通过每个元素上的 `data-key` 属性来识别元素，然后计算出最小的 DOM 操作（增、删、移动）来更新视图，而不是粗暴地重新渲染整个列表。因此，需要为列表中的每个项目提供一个稳定且唯一的 `key` 。

```javascript
const items = createState([
  { id: 1, text: "学习 ChainUI" },
  { id: 2, text: "创建项目" },
]);

const list = h("ul").child(
  // map 函数接收一个状态数组和一个工厂函数
  map(items, (item, index) =>
    h("li")
      // 关键！使用 .set() 提供唯一的 key。通常使用数据的唯一 ID。
      .set("data-key", item.id, "attr")
      .child(`${index + 1}: ${item.text}`)
  )
);

// 添加新项目
setTimeout(() => {
  items.update((current) => [...current, { id: 3, text: "分享给朋友" }]);
}, 2000);

// 移除项目
setTimeout(() => {
  items.update((current) => current.filter((item) => item.id !== 1));
}, 4000);
```

### 条件渲染 (`when`)

`when` 方法可以根据一个响应式状态的值，动态地渲染两个不同的组件之一。

```javascript
const isLoggedIn = createState(false);

h("div").child(
  h("button")
    .child(isLoggedIn.map((v) => (v ? "退出" : "登录")))
    .on("click", () => (isLoggedIn.value = !isLoggedIn.value)),

  // .when() 方法用于条件渲染
  h("div").when(
    isLoggedIn,
    () => h("p").child("欢迎回来！"), // 当 isLoggedIn 为 true 时渲染
    () => h("p").child("请先登录。"), // 当 isLoggedIn 为 false 时渲染 (可选)
    { keepAlive: true } // 启用 keepAlive 模式
  )
);
```

**`options.keepAlive` 模式**:
默认情况下，当条件改变时，不活动的组件会被从 DOM 中彻底移除。如果你希望保留组件及其内部状态（例如表单输入），可以设置 `options.keepAlive` 为 `true`。此时，两个组件都会被渲染到 DOM 中，并通过 CSS `display` 属性进行切换显隐，而不是移除不活动的组件。这有助于保留组件的内部状态（例如表单输入）。

```javascript
h("div").when(state, trueFactory, falseFactory, { keepAlive: true });
```

### 创建组件 (`createComponent`)

使用 `createComponent` 将 UI 逻辑封装成可复用的、独立的单元。

```javascript
// 定义一个按钮组件
const Button = createComponent("Button", (label, onClick) => {
  return h("button")
    .child(label)
    .set("padding", "8px 16px", "style")
    .on("click", onClick);
});

// 在应用中使用组件
const app = h("div").child(
  Button("点击我", () => alert("组件化！")),
  Button("另一个按钮", () => console.log("..."))
);
```

### 表单处理

通过将状态与表单元素的 `value` 属性和 `input` 事件进行双向绑定，可以轻松处理表单。

```javascript
const textValue = createState("");

const app = h("div").child(
  h("input")
    .set("type", "text", "attr")
    .set("placeholder", "输入一些文字...", "attr")
    // 绑定 value 属性，使其随状态变化
    .set("value", textValue, "attr")
    // 监听 input 事件，用输入的值来更新状态
    .on("input", (e) => (textValue.value = e.target.value)),

  h("p").child(textValue.map((v) => `你输入的是: ${v}`))
);
```

## 高级主题

### 客户端路由

ChainUI 提供了一套完整的客户端路由解决方案，支持声明式路由配置、动态参数、导航守卫和历史管理。

#### 1. 历史控制器 (History Controllers)

ChainUI 的路由系统是可插拔的，通过 `HistoryController` 抽象类来管理浏览器历史。它提供了两种内置实现：

- **`BrowserHistory`**: 适用于浏览器环境，使用 HTML5 History API (`pushState`, `replaceState`, `popstate`)。
- **`ServerHistory`**: 适用于非浏览器环境（如服务端渲染或测试），在内存中维护历史堆栈。

通常情况下，你无需直接实例化它们，`createRouter` 会根据环境自动选择。

#### 2. `createRouter(options) → { router, Link, PageView }`

这是创建和配置路由的核心函数。

- **`options.routes`**: (必选) 一个路由配置数组。每个路由可以是一个对象或一个元组（数组）：
  - **对象形式**:
    - `path`: 路由路径，支持动态参数（如 `'/users/:id'`）。
    - `component`: 一个工厂函数，返回该路由对应的 `ChainElement` 组件。该函数会接收一个 `params` 对象作为参数，包含路径中的动态参数**以及 URL 中的查询参数**。
    - `options`: (可选) 路由特有选项：
      - `keepAlive`: `boolean`，如果为 `true`，当离开该路由时，组件实例不会被销毁，而是隐藏。再次进入时会复用。**注意：如果路由参数发生变化，即使 `keepAlive` 为 `true`，组件也会被销毁并重新创建。**
      - `beforeEnter`: `(toParams, fromParams) => boolean`，进入路由前的守卫函数。如果返回 `false`，则导航会被取消。
      - `onLeave`: `(fromParams, toParams) => void`，离开路由时的钩子函数。
  - **元组形式**: `[path, component, options?]`，分别是路径、组件工厂函数和可选的路由选项。
- **`options.history`**: (可选) 自定义 `HistoryController` 实例。
- **`options.normalizePath`**: (可选) `(path: string) => string`，一个用于规范化路径的函数。
- **`options.basePath`**: (可选) `string`，应用的基路径。如果你的应用部署在子目录下（例如 `https://example.com/my-app/`），则 `basePath` 应设置为 `/my-app`。这会影响路由匹配和 `Link` 组件生成的 `href`。

`createRouter` 返回一个包含 `router` 实例、`Link` 组件和 `PageView` 元素的配置对象。

#### 3. `router` 实例

通过 `createRouter` 返回的 `router` 实例，你可以进行程序化导航：

- **`router.navigate(path, params?, replace?)`**: 导航到指定路径。如果目标路径与当前路径相同，且参数也相同，则不会执行导航。
  - `path`: 目标路径。
  - `params`: (可选) 包含动态路由参数和查询参数的对象。
  - `replace`: (可选) `boolean`，如果为 `true`，则替换当前历史记录条目而不是添加新条目。
- **`router.goBack()`**: 返回上一个历史记录。
- **`router.getCurrentPage()`**: 获取当前页面的 ID 和参数。
- **`router.closePage(pageId)`**: 关闭指定 ID 的页面，并从缓存中移除其组件实例。

#### 4. `Link` 组件

`Link` 是一个用于创建导航链接的组件，它会渲染为一个 `<a>` 标签，并自动处理点击事件以进行客户端路由。

- **`props.to`**: (必选) 目标路由路径。
- **`props.params`**: (可选) 动态路由参数或查询参数。这些参数会用于填充 `to` 路径中的动态段（例如 `/users/:id` 中的 `:id`），剩余的参数会作为查询字符串添加到 URL 中。
- **`props`**: (可选) 附加到 `<a>` 元素的其他属性（例如 `class`, `id`, `style` 等）。
- **`...children`**: 链接的子内容（文本、其他元素等）。

```javascript
import { h, createRouter } from "@luxbai-dev/chainui";

const { Link } = createRouter({ routes: [] }); // 假设路由已配置

// 创建一个导航链接
const myLink = Link(
  { to: "/users/:id", params: { id: 123, tab: "profile" }, class: "nav-link" },
  "查看用户资料"
);
// 渲染为 <a href="/users/123?tab=profile" data-chain-route="/users/:id" class="nav-link">查看用户资料</a>
```

#### 5. `PageView` 元素

`PageView` 是一个特殊的 `ChainElement`，它作为路由内容的渲染出口。你只需要将其添加到你的应用布局中，路由匹配到的组件就会自动渲染到这里。

#### 6. 路由守卫和生命周期

你可以在路由配置中定义 `beforeEnter` 和 `onLeave` 钩子，以控制导航流程和执行副作用。

```javascript
import { h, createRouter, createState } from "@luxbai-dev/chainui";

const isAuthenticated = createState(false); // 模拟用户登录状态

const LoginPage = () =>
  h("div").child(
    h("h2").child("登录"),
    h("button")
      .child("点击登录")
      .on("click", () => {
        isAuthenticated.value = true;
        router.navigate("/dashboard"); // 登录成功后跳转
      })
  );

const DashboardPage = () => h("h2").child("仪表盘");

const { router, Link, PageView } = createRouter({
  routes: [
    { path: "/login", component: LoginPage },
    {
      path: "/dashboard",
      component: DashboardPage,
      options: {
        beforeEnter: (toParams, fromParams) => {
          if (!isAuthenticated.value) {
            alert("请先登录才能访问仪表盘！");
            router.navigate("/login", {}, true); // 未登录则重定向到登录页
            return false; // 阻止导航
          }
          console.log("进入仪表盘");
          return true; // 允许导航
        },
        onLeave: (fromParams, toParams) => {
          console.log("离开仪表盘");
        },
      },
    },
  ],
});

const app = h("div").child(
  h("nav").child(
    Link({ to: "/login" }, "登录"),
    Link({ to: "/dashboard" }, "仪表盘")
  ),
  PageView
);

mount(app, "#app");
```

#### 7. 返回按钮事件 (`chain:backpress`)

ChainUI 路由系统监听一个名为 `chain:backpress` 的自定义事件。当这个事件被触发时，路由器会调用 `router.goBack()` 方法，模拟浏览器后退行为。这对于在非浏览器环境（如桌面应用或混合应用）中实现自定义返回按钮逻辑非常有用。

你可以通过以下方式触发此事件：

```javascript
// 在需要触发返回操作的地方
document.dispatchEvent(new CustomEvent("chain:backpress"));
```

### 服务端渲染 (SSR)

ChainUI 支持在 Node.js 环境中进行同构渲染，以提升首屏加载速度 (FCP) 和搜索引擎优化 (SEO)。

**1. 服务端 (Node.js)**

在服务端，你使用 `renderToStream` 函数来生成组件的初始操作流和状态快照。

```javascript
// server.mjs (或 .js)
import http from "http";
import { h, renderToStream } from "@luxbai-dev/chainui";

const App = () => h("div").child(h("h1").child("Hello from SSR!"));

/**
 * renderToStream(componentFactory)
 *
 * 在服务端渲染组件，生成操作流和初始状态快照。
 * @param {function(): ChainElement} componentFactory 一个返回组件实例的工厂函数。
 * @returns {{stream: string, state: object, rootId: string}} 包含序列化操作流、初始状态和根节点 ID 的对象。
 *   - `stream`: 序列化的操作流字符串，包含了构建 DOM 所需的所有指令。
 *   - `state`: 一个对象，包含了组件中所有响应式状态的当前值。
 *   - `rootId`: 根组件的唯一节点 ID，用于客户端注水时识别。
 */
const { stream, state, rootId } = renderToStream(() => App());

// 假设你有一个 HTML 模板
const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>ChainUI SSR App</title>
</head>
<body>
    <div id="app"></div>
    <script>
        // 将 SSR 数据注入到全局变量，供客户端使用
        window.ssrData = {
            stream: '${stream}', // 序列化的操作流
            state: ${JSON.stringify(state)}, // 初始状态
            rootId: '${rootId}' // 根节点的 ID
        };
    </script>
    <script type="module" src="/client.js"></script>
</body>
</html>
`;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(htmlTemplate);
  })
  .listen(3000, () => console.log("Server running on http://localhost:3000"));
```

**2. 客户端 (Browser)**

在客户端，你使用 `mount` 函数的第三个参数 `ssrData` 来进行“注水”（Hydration）。这会复用服务端生成的 DOM 结构，并附加事件监听器和状态绑定，而不是重新创建 DOM，从而实现无缝的用户体验。

```javascript
// client.js
import { h, mount } from "@luxbai-dev/chainui";

const App = () => h("div").child(h("h1").child("Hello from SSR!"));

// 使用从服务端获取的 ssrData 进行挂载（也称为“注水”/Hydration）
// 这会复用服务端生成的 DOM，并附加事件监听器和状态绑定，而不会重新创建 DOM
mount(App(), "#app", window.ssrData);
```
