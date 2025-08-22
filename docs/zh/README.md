# ChainUI - 一个轻量级、高性能、无虚拟 DOM 的 UI 库

ChainUI 是一个现代化的 JavaScript UI 库，专注于构建高性能用户界面。它摒弃了传统的虚拟 DOM，采用独特的“操作流”机制，并通过流畅的链式 API，提供了卓越的运行时性能和直观的开发体验。

## 核心特性

- **链式 API**: 以直观、可读的方式构建复杂的 UI 结构。你的代码就是 DOM 结构的直接反映。
- **高性能**: 没有 V-DOM 开销。DOM 更新被批量处理并高效应用，最大限度地减少了重排和重绘。
- **响应式状态管理**: 内置简单而强大的响应式系统 (`createState`)，轻松创建数据驱动的视图。
- **统一的元素配置**: 一个强大的 `set` 方法，用统一、一致的 API 配置属性、样式和类。
- **轻量级 & 零依赖**: 核心库非常小，且没有任何外部依赖。
- **功能完备**: 内置解决方案包括：
  - 基于组件的架构 (`createComponent`)
  - 带有优化协调算法的列表渲染 (`map`)
  - 条件渲染 (`when`)
  - **客户端路由**: 一个全面的路由系统 (`createRouter`, `createApp`)，支持动态路径、导航守卫和历史管理。
  - 服务端渲染 (SSR) 支持

## 快速示例

以下是一个使用 ChainUI 构建的简单计数器应用示例，展示了其直观的 API 设计。

```javascript
import { h, createState, mount } from "@luxbai-dev/chainui";

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
      .set({
        attr: {
          disabled: count.map((c) => c <= 0),
        },
      })
      .on("click", () => count.update((c) => c - 1))
  )
);

mount("#app", app);
```

## 安装与使用

你可以通过 npm/yarn 将 ChainUI 添加到你的项目中，也可以通过 CDN 直接在浏览器中使用。

### 包管理器安装

```bash
npm install @luxbai-dev/chainui
# 或
yarn add @luxbai-dev/chainui
```

```javascript
// 然后在你的模块中导入
// 命名导入 (推荐)
import { h, createState, mount } from "@luxbai-dev/chainui";

// 或使用默认导入
import ChainUI from "@luxbai-dev/chainui";
// 然后使用 ChainUI.h, ChainUI.createState, ChainUI.mount 等
```

### CDN 导入

你也可以直接通过 CDN 引入 ChainUI，这对于快速原型开发或不使用构建工具的项目非常方便。请使用 `chainui.min.js` 的 `@latest` 版本以获取最新功能。

```html
<!-- 在 <head> 或 <body> 结束前引入 -->
<script src="https://cdn.jsdelivr.net/npm/@luxbai-dev/chainui@latest/build/iife/chainui.min.js"></script>
<script>
  // ChainUI 会作为全局变量 ChainUI 暴露
  const { h, createState, mount } = ChainUI;

  const count = createState(0);

  const app = h("div").child(
    h("h1").child("计数器示例 (来自 CDN)"),
    h("p").child(count.map((c) => `当前值: ${c}`)),
    h("div").child(
      h("button")
        .child("增加")
        .on("click", () => count.update((c) => c + 1)),
      h("button")
        .child("减少")
        .set({
          attr: {
            disabled: count.map((c) => c <= 0),
          },
        })
        .on("click", () => count.update((c) => c - 1))
    )
  );

  mount("#app", app);
</script>
```

## API 参考

### 核心构建函数

#### `h(tagName)`

`h` (即 `createElement` 的缩写) 是所有 UI 构建的入口点。它返回一个 `ChainElement` 实例，该实例允许你通过链式调用来定义元素的结构和行为。

#### `createComponent(name, factory)`

`createComponent` 函数用于将 UI 逻辑封装成可复用的组件。

```javascript
const MyButton = createComponent("MyButton", (text, onClickHandler) =>
  h("button")
    .set("data-component-name", "MyButton")
    .on("click", onClickHandler)
    .child(text)
);

h("div").child(
  MyButton("点击我", () => console.log("按钮被点击了")),
  MyButton("另一个按钮", () => alert("另一个按钮被点击了"))
);
```

**机制详解**:

- `createComponent` 接受一个组件名称和一个工厂函数。工厂函数接收组件的参数，并返回一个 `ChainElement` 实例作为组件的根节点。
- 它返回一个新的组件函数，该函数在被调用时会执行工厂函数，并为组件的根节点添加 `data-component` 属性，方便调试和识别。

### 响应式状态管理

#### `createState(initialValue)`

`createState` 函数用于创建响应式状态对象。当状态的值发生变化时，所有订阅了该状态的 UI 部分都会自动更新。

```javascript
const count = createState(0); // 创建一个初始值为 0 的响应式状态

// 访问状态值
console.log(count.value); // 0

// 更新状态值
count.update((c) => c + 1); // count.value 现在是 1
count.value = 5; // 也可以直接赋值

// 订阅状态变化
const unsubscribe = count.subscribe((newValue) => {
  console.log("Count changed to:", newValue);
});
// ...
unsubscribe(); // 取消订阅

// `map` 方法：创建派生状态
const doubledCount = count.map((c) => c * 2);
console.log(doubledCount.value); // 如果 count 是 5，则 doubledCount 是 10
```

**机制详解**:
`createState` 返回一个包含 `value` (getter/setter)、`update`、`subscribe` 和 `map` 方法的对象。

- `value` 的 getter 返回当前值，setter 在新值与旧值不同时触发所有订阅者。
- `update` 方法提供了一种函数式更新状态的方式，也可以直接传入新值。
- `subscribe` 允许注册回调函数，这些函数会在状态值更新时被调用。它会立即调用一次回调，并返回一个取消订阅的函数。
- `map` 方法是一个强大的特性，它允许你基于当前状态创建一个新的派生状态。这个派生状态会随着原始状态的变化而自动更新，但它本身是只读的，不能直接修改。这对于从现有状态计算新值而无需手动管理依赖关系非常有用。

#### `map(stateArray, factory)`

`map` 函数用于从一个响应式数组状态 (`ChainState<Array<T>>`) 动态渲染一个列表。

```javascript
const items = createState([
  { id: 1, text: "Item 1" },
  { id: 2, text: "Item 2" },
]);

h("ul").child(
  map(items, (item) => h("li").set("key", item.id).child(item.text))
);

// 当 items 状态更新时，列表会自动协调更新
items.update((arr) => [...arr, { id: 3, text: "Item 3" }]);
```

**机制详解**:

- `map` 内部会创建一个 `div` 容器，并向其 `OperationStream` 添加一个 `BIND_LIST` 操作。
- `BIND_LIST` 操作会订阅 `stateArray` 的变化。当数组更新时，`ChainRuntime` 的 `reconcileList` 方法会被调用。
- `reconcileList` 使用高效的列表协调算法，通过比较新旧列表项的 `key`（通常是 `item.id` 或索引），智能地添加、移除或移动 DOM 节点，最大限度地减少 DOM 操作。

### `ChainElement` 元素操作

`ChainElement` 是 `h()` 函数返回的核心对象，它提供了丰富的链式方法来定义 UI 元素的结构、属性、样式、事件和行为。

#### `.child(...children)`

添加一个或多个子节点。子节点可以是 `ChainElement` 实例、字符串（会自动转换为文本节点）或 `ChainState<string>` 实例（会自动创建响应式文本节点）。

```javascript
h("div").child(
  h("span").child("Hello"),
  " ", // 文本节点
  createState("World!"), // 响应式文本节点
  h("button").child("Click Me")
);
```

**机制详解**:

- 当添加 `ChainElement` 子节点时，子节点的 `OperationStream` 会被合并到父节点的流中，并且子节点的事件处理器也会被收集。
- 当添加字符串或 `ChainState<string>` 时，会内部调用 `_createTextChild` 方法，创建一个文本节点或响应式文本节点，并将其操作添加到流中。

#### `.on(eventType, handler)`

为元素附加一个事件监听器。

```javascript
h("button")
  .child("点击")
  .on("click", (e) => console.log("按钮被点击了", e));
```

**机制详解**:

- ChainUI 采用事件委托机制来提高性能。事件监听器不会直接附加到每个 DOM 元素上，而是通过 `EventDelegator` 在 `document.body` 上统一监听。
- 当事件触发时，`EventDelegator` 会根据 `data-chain-action` 属性找到对应的处理器并执行。这减少了内存消耗，尤其是在处理大量动态元素时。
- 在 SSR 场景下，事件处理器会被序列化为字符串，并在客户端重新绑定。

#### `.set(name, value, type?)`

一个强大的统一方法，用于设置元素的属性 (`attr`)、样式 (`style`) 或 CSS 类 (`class`)。它支持链式调用，并且可以接受响应式状态作为值。

```javascript
h("div")
  .set("id", "my-element") // 设置属性
  .set("color", "red", "style") // 设置样式
  .set("active", true, "class"); // 添加类

// 也可以通过对象一次性设置多个
const isActive = createState(true);
h("button").set({
  attr: {
    "data-custom": "value",
    disabled: isActive.map((v) => !v), // 属性绑定响应式状态
  },
  style: {
    backgroundColor: isActive.map((v) => (v ? "blue" : "gray")), // 样式绑定响应式状态
    padding: "10px",
  },
  class: {
    "btn-primary": isActive, // 类绑定响应式状态
    "btn-secondary": isActive.map((v) => !v),
    "large-text": true,
    "another-class": false, // false 会移除类
  },
});
```

**参数**:

- `name`: 属性名、样式属性名、类名，或者一个包含 `attr`、`style`、`class` 配置的对象。
- `value`: 对应的值，可以是普通值或 `ChainState` 实例。
- `type`: (可选) 明确指定设置的类型 (`'attr'`, `'style'`, `'class'`)。如果未提供，ChainUI 会尝试根据 `name` 自动推断类型（例如，如果 `name` 是有效的 CSS 属性，则默认为 `'style'`）。

**机制详解**:

- `set` 方法内部会调用 `_setAttr`、`_setStyle` 或 `_setClass` 方法。
- 当 `value` 是 `ChainState` 实例时，`set` 方法会内部调用 `_bind` 方法，将状态的变化绑定到对应的 DOM 操作上。这意味着当状态更新时，相关的属性、样式或类会自动更新，无需手动操作 DOM。
- 对于属性绑定，如果 `ChainState` 是未映射的，ChainUI 会使用 `BIND_ATTRIBUTE` 操作类型进行优化绑定。
- 对于类绑定，`value` 可以是布尔值或 `ChainState<boolean>`，用于控制类的添加或移除。

#### `.when(state, trueFactory, falseFactory?, options?)`

根据一个布尔类型的响应式状态 (`ChainState<boolean>`) 来条件性地渲染两个组件中的一个。

```javascript
const showContent = createState(true);

h("div").child(
  h("button")
    .child("切换内容")
    .on("click", () => showContent.update((v) => !v)),
  h("div").when(
    showContent,
    () => h("p").child("这是当状态为真时显示的内容。"),
    () => h("p").child("这是当状态为假时显示的内容。")
  )
);
```

**参数**:

- `state`: 一个 `ChainState<boolean>` 实例，用于控制渲染。
- `trueFactory`: 当 `state` 为 `true` 时，用于创建组件的工厂函数。
- `falseFactory`: (可选) 当 `state` 为 `false` 时，用于创建组件的工厂函数。
- `options`: (可选) 渲染选项。
  - `options.keepAlive`: `boolean` (默认为 `false`)。如果设置为 `true`，则 `trueFactory` 和 `falseFactory` 创建的组件都会被创建并添加到 DOM 中，但会根据 `state` 的值通过 `display: none` 样式进行切换显示/隐藏，而不是销毁/重新创建。这对于需要保留组件状态或避免频繁 DOM 操作的场景非常有用。

**机制详解**:

- 默认情况下，`when` 会在状态切换时销毁旧组件并创建新组件。
- 当 `keepAlive` 为 `true` 时，`when` 会创建两个组件，并使用 `state.map` 动态绑定它们的 `display` 样式，实现基于 CSS 的显示/隐藏切换。这避免了组件的频繁挂载和卸载，保留了组件的内部状态。

### 客户端路由

ChainUI 提供了一个全面的客户端路由系统，支持动态路径、导航守卫和历史管理。

#### `createRouter(options)`

`createRouter` 是创建和初始化路由器实例的工厂函数。它返回一个包含 `router` 实例、`Link` 组件、`PageView` 元素和 `rootPageViewRuntime` 的对象。

```javascript
import { createRouter, h, createState } from "@luxbai-dev/chainui";

const HomePage = () => h("div").child("欢迎来到主页");
const AboutPage = () => h("div").child("关于我们");
const UserPage = (params) => h("div").child(`用户 ID: ${params.id}`);

const { router, Link, PageView } = createRouter({
  routes: [
    { path: "/", component: HomePage },
    { path: "/about", component: AboutPage },
    { path: "/users/:id", component: UserPage, options: { keepAlive: true } },
  ],
  mode: "history", // 或 'hash'
});

// PageView 是一个特殊的 ChainElement，它会根据路由匹配结果渲染对应的组件
// 你需要将 PageView 挂载到 DOM 中
// mount('#app', PageView);
```

**返回对象**:

- **`router`**: `ChainPageRouter` 实例，用于程序化导航 (`router.navigate('/path')`)。
- **`Link`**: 一个组件，用于创建导航链接。
  ```javascript
  h("nav").child(
    Link({ to: "/" }, "主页"),
    Link({ to: "/about" }, "关于"),
    Link({ to: "/users/123", params: { id: "123" } }, "用户 123")
  );
  ```
- **`PageView`**: 一个特殊的 `ChainElement`，它充当路由内容的占位符。你需要将 `PageView` 挂载到你的应用根容器中，路由器会负责在其内部渲染匹配到的页面组件。
- **`rootPageViewRuntime`**: 内部使用的 `ChainRuntime` 实例，用于管理 `PageView` 元素自身的生命周期和操作。

#### `createApp(config)`

`createApp` 是创建 ChainUI 应用（尤其是带有路由功能的应用）的主要入口点。它简化了路由器的初始化和挂载过程。

```javascript
import { createApp, h, createState } from "@luxbai-dev/chainui";

const HomePage = () => h("div").child("欢迎来到主页");
const AboutPage = () => h("div").child("关于我们");

const { router, Link, destroy } = createApp({
  mount: "#app", // 指定应用挂载的 DOM 元素
  routes: [
    { path: "/", component: HomePage },
    { path: "/about", component: AboutPage },
  ],
  mode: "history",
});

// 现在你可以使用 router 和 Link 组件了
// router.navigate('/about');
// h('nav').child(Link({ to: '/' }, '主页'));

// 当应用不再需要时，调用 destroy() 清理资源
// destroy();
```

**参数**:

- `config.mount`: (必选) CSS 选择器字符串或实际的 `HTMLElement`，指定应用挂载的目标。
- `config.routes`: (可选) 路由配置数组。
- `config.mode`: (可选) 路由模式：`'history'` (默认) 或 `'hash'。`
- `config.persist`: (可选) 是否持久化路由历史。
- `config.initialPath`: (可选) 内存模式下的初始路径。
- 其他 `ChainPageRouter` 选项。

**返回对象**:

- **`router`**: `ChainPageRouter` 实例。
- **`Link`**: 用于创建导航链接的组件。
- **`destroy`**: 一个函数，用于销毁整个应用实例，清理所有路由、运行时和事件监听器。

### 服务端渲染 (SSR)

ChainUI 支持在 Node.js 环境中进行渲染，以获得更好的性能和 SEO。通过 `render` 函数，你可以在服务器上生成 HTML 字符串，并配合客户端的 `mount` 函数实现快速的交互式应用加载。

#### `render(componentFactory, options?)` (SSR 专用)

`render` 函数用于在服务端渲染 (SSR) 环境下将 `ChainElement` 转换为 HTML 字符串。

```javascript
const { html, state, clientEventHandlers } = render(() =>
  h("div").child("Hello SSR")
);
// html: "<div>Hello SSR</div>"
// state: { 'state-1': 'someValue' } // 收集到的响应式状态的当前值
// clientEventHandlers: [{ actionId: 'action-1', eventType: 'click', handlerCode: 'function(e){ console.log("Clicked!"); }' }]
```

**参数说明**:

- `componentFactory`: 一个工厂函数，返回要渲染的根 `ChainElement` 实例。
- `options`: (可选) 渲染选项。
  - `options.format`: `'html'` (默认) 或 `'stream'`。
    - `'html'`: 返回 HTML 字符串、收集到的状态和客户端事件处理器。
    - `'stream'`: 返回序列化后的 `OperationStream` 字符串、收集到的状态和客户端事件处理器。这对于在客户端通过 `OperationStream.deserialize` 恢复应用非常有用。

**机制详解**:

- `render` 会调用 `componentFactory` 创建 `ChainElement` 实例。
- 它会遍历组件树，收集所有 `BIND_STATE` 操作中绑定的响应式状态的当前值，并将其作为 `state` 对象返回。
- 它还会调用 `ChainElement.toHtml()` 方法生成 HTML 字符串，并收集所有事件处理器，将其 `handler` 函数转换为字符串形式 (`handlerCode`)，以便在客户端进行事件重放。

### 内部机制详解

#### `OperationType` 枚举

`OperationType` 定义了 ChainUI 内部所有可能的 DOM 操作类型。这些类型是 ChainUI 核心“操作流”机制的基础，用于描述如何创建、修改和管理 DOM 元素。

```javascript
export const OperationType = {
  CREATE_ELEMENT: "CREATE_ELEMENT", // 创建新的 DOM 元素
  CREATE_TEXT_NODE: "CREATE_TEXT_NODE", // 创建新的文本节点
  SET_TEXT_CONTENT: "SET_TEXT_CONTENT", // 设置 DOM 节点的文本内容
  APPEND_CHILD: "APPEND_CHILD", // 将子节点添加到父节点
  REMOVE_CHILD: "REMOVE_CHILD", // 从父节点移除子节点
  INSERT_BEFORE: "INSERT_BEFORE", // 在指定锚点节点之前插入子节点
  SET_ATTRIBUTE: "SET_ATTRIBUTE", // 设置 DOM 元素的属性
  REMOVE_ATTRIBUTE: "REMOVE_ATTRIBUTE", // 移除 DOM 元素的属性
  SET_STYLE: "SET_STYLE", // 设置 DOM 元素的 CSS 样式属性
  ADD_CLASS: "ADD_CLASS", // 为 DOM 元素添加 CSS 类
  REMOVE_CLASS: "REMOVE_CLASS", // 从 DOM 元素移除 CSS 类
  ADD_EVENT_LISTENER: "ADD_EVENT_LISTENER", // 为 DOM 元素添加事件监听器
  MOUNT: "MOUNT", // 将根组件挂载到指定的 DOM 容器
  BIND_STATE: "BIND_STATE", // 将响应式状态绑定到 DOM 元素或其内容，以便自动更新
  BIND_ATTRIBUTE: "BIND_ATTRIBUTE", // 将响应式状态绑定到 DOM 元素的特定属性
  BIND_LIST: "BIND_LIST", // 将响应式数组状态绑定到 DOM 列表，实现高效协调更新
  UPDATE_NODE: "UPDATE_NODE", // 内部操作：更新现有 DOM 节点
  ROUTE_CHANGE: "ROUTE_CHANGE", // 内部操作：表示路由路径发生变化
  ROUTE_MATCH: "ROUTE_MATCH", // 内部操作：表示路由路径匹配成功
  INIT_ROUTER: "INIT_ROUTER", // 内部操作：初始化路由器实例
};
```

#### `OperationStream`

`OperationStream` 是 ChainUI 内部用于收集和批量处理 DOM 操作的核心机制。它将所有对 `ChainElement` 的链式调用转换为一系列可执行的操作，并在适当的时机（例如在 `mount` 或状态更新时）由 `ChainRuntime` 统一执行。

```javascript
// 内部使用示例
const stream = new OperationStream();
stream.add({
  type: OperationType.CREATE_ELEMENT,
  nodeId: "node-1",
  tagName: "div",
});
stream.add({
  type: OperationType.SET_ATTRIBUTE,
  nodeId: "node-1",
  name: "id",
  value: "my-div",
});
// ...
const operations = stream.getOperations(); // 获取操作列表
```

**机制详解**:

- **批量处理**: `OperationStream` 会收集操作，并通过 `add` 方法进行优化。例如，连续设置同一个元素的同一个属性，它会只保留最后一个操作，避免不必要的中间 DOM 更新。
- **序列化与反序列化**: `serialize()` 方法将操作流转换为 JSON 字符串，这对于服务端渲染 (SSR) 非常有用，可以将操作流从服务器传输到客户端。`static deserialize()` 方法则可以将 JSON 字符串反序列化回 `OperationStream` 实例，以便在客户端恢复和执行。

#### `ChainRuntime` (客户端运行时)

`ChainRuntime` 是 ChainUI 在客户端的核心引擎，负责接收 `OperationStream` 并将其转换为实际的 DOM 操作。它管理着 DOM 节点映射、状态订阅、事件委托和批处理更新，以确保高效和响应式的 UI 渲染。

**机制详解**:

- **`nodeMap`**: 一个 `Map` 对象，存储从 ChainUI 内部生成的节点 ID 到实际 DOM 节点的映射，方便快速查找和操作。
- **`stateSubscriptions` / `nodeSubscriptions`**: 两个 `Map` 对象，用于管理响应式状态订阅的生命周期。它们确保当 DOM 节点被移除时，所有相关的状态订阅都能被正确取消，有效防止内存泄漏。
- **`eventDelegator`**: `EventDelegator` 实例，负责实现高效的事件委托机制，减少事件监听器的数量。
- **`batchQueue` / `scheduleBatchExecution`**: 内部队列和调度机制，利用 `requestAnimationFrame` 将多个 DOM 操作进行批处理，并在浏览器下一次重绘前统一执行，从而优化性能和用户体验。
- **`applyOperation(op)`**: 根据 `OperationType` 执行单个 DOM 操作，例如创建元素、设置属性、添加子节点等。
- **`execute(operations, immediate?)`**: 执行一系列操作，可以选择立即执行或加入批处理队列。
- **`bindOperations(stream)`**: 专门用于绑定 `BIND_STATE` 和 `BIND_LIST` 类型的操作，确保响应式更新机制生效。
- **`cleanupNodeTree(node)`**: 在 DOM 节点被移除前，递归清理其所有子节点上的事件处理器和状态订阅。
- **`reconcileList(parentNodeId, newItems, factory)`**: 实现高效的列表协调算法。当响应式数组状态更新时，它会智能地比较新旧列表项，只对发生变化的 DOM 节点进行添加、移除或移动，而不是简单地重新渲染整个列表。这通过为列表项分配 `data-key` 属性来实现，类似于 React/Vue 的 `key` 机制。
- **`destroy()`**: 销毁运行时实例，清理所有资源，包括取消动画帧、清空队列、取消所有状态订阅和事件监听器。

#### `EventDelegator` (事件委托器)

`EventDelegator` 是 `ChainRuntime` 的一个组成部分，专门用于实现高效的事件处理。

**机制详解**:

- **统一监听**: 它在 `document.body` 上为所有委托的事件类型（如 `click`, `input` 等）注册一个全局监听器。
- **`handlerMap`**: 存储从 `actionId`（由 `generateId('action')` 生成的唯一 ID）到实际事件处理函数的映射。
- **事件分发**: 当全局监听器捕获到事件时，它会从事件的 `target` 元素向上遍历 DOM 树，查找带有 `data-chain-action` 属性的元素。一旦找到，它就会从 `handlerMap` 中取出对应的处理函数并执行。
- **`registerHandlers` / `clearHandlersForNode`**: 用于注册和清理特定节点及其子节点上的事件处理器。
- **`destroy()`**: 移除所有全局事件监听器并清空处理器映射。

#### `NavigationController` 和 `NavManager` (路由内部机制)

- **`NavigationController`**: 这是一个抽象基类，定义了导航管理器的基本接口，包括监听导航变化、通知监听器、导航到新路径、获取当前位置以及返回历史记录。
- **`NavManager`**: 实现了 `NavigationController` 接口，提供了具体的历史管理逻辑。它支持 `'history'` (使用 History API)、`'hash'` (使用 URL hash) 和 `'memory'` (内存模式，用于 SSR 或测试) 三种模式。`NavManager` 内部管理着一个导航堆栈，并在导航变化时通知所有注册的监听器。

#### `ChainPageRouter` (路由内部机制)

`ChainPageRouter` 是 ChainUI 路由系统的核心，它负责注册路由、匹配路径、管理页面组件的生命周期和缓存。

**机制详解**:

- **路由注册**: `register(path, componentFactory, options?)` 方法用于注册路由。它会将路径转换为正则表达式，并提取路径参数。
- **`currentPage` 状态**: 一个 `ChainState` 实例，存储当前匹配到的页面 ID 和参数。当此状态更新时，路由器会触发页面渲染。
- **`_runtimeCache` (Keep-Alive 缓存)**: 当路由选项中设置 `keepAlive: true` 时，页面组件的 `ChainRuntime` 实例会被缓存。这意味着当用户在这些页面之间切换时，组件不会被销毁和重新创建，而是被隐藏和显示，从而保留其内部状态并提高性能。缓存有 `keepAliveCacheLimit` 限制，使用 LRU (最近最少使用) 策略进行淘汰。
- **导航守卫**: 路由选项支持 `beforeEnter` (进入前) 和 `onLeave` (离开时) 钩子，允许你在导航发生前或发生后执行自定义逻辑，例如权限检查、数据加载或清理。
- **路由匹配**: `_matchRoute` 方法负责将当前 URL 路径与已注册的路由进行匹配，并解析出路径参数和查询参数。
- **`_handleLocationChange`**: 监听 `NavManager` 的导航变化，并根据新的位置更新 `currentPage` 状态，从而触发页面渲染。
- **`destroy()`**: 销毁路由器实例，清理所有订阅、缓存的运行时和历史管理器。
