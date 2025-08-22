# ChainUI - A Lightweight, High-Performance, Virtual-DOM-Free UI Library

ChainUI is a modern JavaScript UI library focused on building high-performance user interfaces. It eschews the traditional Virtual DOM in favor of a unique "operation stream" mechanism, providing exceptional runtime performance and an intuitive development experience through its fluent chainable API.

## Core Features

- **Chainable API**: Construct complex UI structures in an intuitive, readable manner. Your code directly reflects the DOM structure.
- **High Performance**: No V-DOM overhead. DOM updates are batched and applied efficiently, minimizing reflows and repaints.
- **Reactive State Management**: Built-in simple yet powerful reactive system (`createState`) for easily creating data-driven views.
- **Unified Element Configuration**: A powerful `set` method to configure attributes, styles, and classes with a single, consistent API.
- **Lightweight & Zero Dependencies**: The core library is very small and has no external dependencies.
- **Feature-Rich**: Includes built-in solutions for:
  - Component-based architecture (`createComponent`)
  - List rendering with optimized reconciliation algorithm (`map`)
  - Conditional rendering (`when`)
  - **Client-Side Routing**: A comprehensive routing system (`createRouter`, `createApp`) supporting dynamic paths, navigation guards, and history management.
  - Server-Side Rendering (SSR) support

## Quick Example

The following is a simple counter application example built with ChainUI, demonstrating its intuitive API design.

```javascript
import { h, createState, mount } from "@luxbai-dev/chainui";

const count = createState(0);

const app = h("div").child(
  h("h1").child("Counter Example"),
  h("p").child(count.map((c) => `Current value: ${c}`)),
  h("div").child(
    h("button")
      .child("Increment")
      .on("click", () => count.update((c) => c + 1)),
    h("button")
      .child("Decrement")
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

## Installation and Usage

You can add ChainUI to your project via npm/yarn, or directly use it in the browser via CDN.

### Package Manager Installation

```bash
npm install @luxbai-dev/chainui
# or
yarn add @luxbai-dev/chainui
```

```javascript
// Then import in your module
// Named imports (recommended)
import { h, createState, mount } from "@luxbai-dev/chainui";

// Or use default import
import ChainUI from "@luxbai-dev/chainui";
// Then use ChainUI.h, ChainUI.createState, ChainUI.mount, etc.
```

### CDN Import

You can also directly include ChainUI via CDN, which is very convenient for rapid prototyping or projects not using build tools. Please use the `@latest` version of `chainui.min.js` to get the latest features.

```html
<!-- Include before </head> or at the end of <body> -->
<script src="https://cdn.jsdelivr.net/npm/@luxbai-dev/chainui@latest/build/iife/chainui.min.js"></script>
<script>
  // ChainUI will be exposed as a global variable ChainUI
  const { h, createState, mount } = ChainUI;

  const count = createState(0);

  const app = h("div").child(
    h("h1").child("Counter Example (from CDN)"),
    h("p").child(count.map((c) => `Current value: ${c}`)),
    h("div").child(
      h("button")
        .child("Increment")
        .on("click", () => count.update((c) => c + 1)),
      h("button")
        .child("Decrement")
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

## API Reference

### Core Building Functions

#### `h(tagName)`

`h` (short for `createElement`) is the entry point for all UI construction. It returns a `ChainElement` instance, which allows you to define the element's structure and behavior through chainable calls.

#### `createComponent(name, factory)`

The `createComponent` function is used to encapsulate UI logic into reusable components.

```javascript
const MyButton = createComponent("MyButton", (text, onClickHandler) =>
  h("button")
    .set("data-component-name", "MyButton") // For debugging
    .on("click", onClickHandler)
    .child(text)
);

h("div").child(
  MyButton("Click Me", () => console.log("Button clicked")),
  MyButton("Another Button", () => alert("Another button clicked"))
);
```

**Mechanism Details**:

- `createComponent` accepts a component name and a factory function. The factory function receives component arguments and returns a `ChainElement` instance as the root of the component.
- It returns a new component function that, when called, executes the factory function and adds a `data-component` attribute to the component's root node for easy debugging and identification.

### Reactive State Management

#### `createState(initialValue)`

The `createState` function is used to create reactive state objects. When the state's value changes, all UI parts subscribed to this state will automatically update.

```javascript
const count = createState(0); // Create a reactive state with initial value 0

// Access state value
console.log(count.value); // 0

// Update state value
count.update((c) => c + 1); // count.value is now 1
count.value = 5; // Can also assign directly

// Subscribe to state changes
const unsubscribe = count.subscribe((newValue) => {
  console.log("Count changed to:", newValue);
});
// ...
unsubscribe(); // Unsubscribe

// `map` method: Create a derived state
const doubledCount = count.map((c) => c * 2);
console.log(doubledCount.value); // If count is 5, doubledCount is 10
```

**Mechanism Details**:
`createState` returns an object containing `value` (getter/setter), `update`, `subscribe`, and `map` methods.

- The `value` getter returns the current value, and the setter triggers all subscribers if the new value is different from the old one.
- The `update` method provides a functional way to update the state, or you can directly pass a new value.
- `subscribe` allows registering callback functions that will be called when the state value updates. It immediately calls the callback once and returns an unsubscribe function.
- The `map` method is a powerful feature that allows you to create a new derived state based on the current state. This derived state automatically updates as the original state changes, but it is read-only and cannot be directly modified. This is very useful for computing new values from existing states without manually managing dependencies.

#### `map(stateArray, factory)`

The `map` function is used to dynamically render a list from a reactive array state (`ChainState<Array<T>>`).

```javascript
const items = createState([
  { id: 1, text: "Item 1" },
  { id: 2, text: "Item 2" },
]);

h("ul").child(
  map(items, (item) => h("li").set("key", item.id).child(item.text))
);

// When the items state updates, the list will automatically reconcile and update
items.update((arr) => [...arr, { id: 3, text: "Item 3" }]);
```

**Mechanism Details**:

- `map` internally creates a `div` container and adds a `BIND_LIST` operation to its `OperationStream`.
- The `BIND_LIST` operation subscribes to changes in `stateArray`. When the array updates, `ChainRuntime`'s `reconcileList` method is called.
- `reconcileList` uses an efficient list reconciliation algorithm. By comparing the `key` (usually `item.id` or index) of new and old list items, it intelligently adds, removes, or moves DOM nodes, minimizing DOM operations.

### `ChainElement` Element Operations

`ChainElement` is the core object returned by the `h()` function, providing rich chainable methods to define the structure, attributes, styles, events, and behavior of UI elements.

#### `.child(...children)`

Adds one or more child nodes. Child nodes can be `ChainElement` instances, strings (automatically converted to text nodes), or `ChainState<string>` instances (automatically creating reactive text nodes).

```javascript
h("div").child(
  h("span").child("Hello"),
  " ", // Text node
  createState("World!"), // Reactive text node
  h("button").child("Click Me")
);
```

**Mechanism Details**:

- When adding `ChainElement` child nodes, the child's `OperationStream` is merged into the parent's stream, and the child's event handlers are also collected.
- When adding a string or `ChainState<string>`, the `_createTextChild` method is internally called to create a text node or reactive text node, and its operations are added to the stream.

#### `.on(eventType, handler)`

Attaches an event listener to the element.

```javascript
h("button")
  .child("Click")
  .on("click", (e) => console.log("Button clicked", e));
```

**Mechanism Details**:

- ChainUI uses an event delegation mechanism to improve performance. Event listeners are not directly attached to each DOM element but are uniformly listened to on `document.body` via `EventDelegator`.
- When an event is triggered, `EventDelegator` finds the corresponding handler based on the `data-chain-action` attribute and executes it. This reduces memory consumption, especially when dealing with a large number of dynamic elements.
- In SSR scenarios, event handlers are serialized as strings and re-bound on the client.

#### `.set(name, value, type?)`

A powerful unified method for setting element attributes (`attr`), styles (`style`), or CSS classes (`class`). It supports chainable calls and can accept reactive states as values.

```javascript
h("div")
  .set("id", "my-element") // Set attribute
  .set("color", "red", "style") // Set style
  .set("active", true, "class"); // Add class

// Can also set multiple properties at once with an object
const isActive = createState(true);
h("button").set({
  attr: {
    "data-custom": "value",
    disabled: isActive.map((v) => !v), // Attribute bound to reactive state
  },
  style: {
    backgroundColor: isActive.map((v) => (v ? "blue" : "gray")), // Style bound to reactive state
    padding: "10px",
  },
  class: {
    "btn-primary": isActive, // Class bound to reactive state
    "btn-secondary": isActive.map((v) => !v),
    "large-text": true,
    "another-class": false, // false will remove the class
  },
});
```

**Parameters**:

- `name`: Attribute name, style property name, class name, or an object containing `attr`, `style`, `class` configurations.
- `value`: The corresponding value, which can be a regular value or a `ChainState` instance.
- `type`: (Optional) Explicitly specifies the type of setting (`'attr'`, `'style'`, `'class'`). If not provided, ChainUI will attempt to infer the type based on `name` (e.g., if `name` is a valid CSS property, it defaults to `'style'`).

**Mechanism Details**:

- The `set` method internally calls `_setAttr`, `_setStyle`, or `_setClass` methods.
- When `value` is a `ChainState` instance, the `set` method internally calls the `_bind` method to bind state changes to corresponding DOM operations. This means that when the state updates, relevant attributes, styles, or classes will automatically update without manual DOM manipulation.
- For attribute binding, if `ChainState` is unmapped, ChainUI uses the `BIND_ATTRIBUTE` operation type for optimized binding.
- For class binding, `value` can be a boolean or `ChainState<boolean>` to control the addition or removal of the class.

#### `.when(state, trueFactory, falseFactory?, options?)`

Conditionally renders one of two components based on a boolean reactive state (`ChainState<boolean>`).

```javascript
const showContent = createState(true);

h("div").child(
  h("button")
    .child("Toggle Content")
    .on("click", () => showContent.update((v) => !v)),
  h("div").when(
    showContent,
    () => h("p").child("This content is shown when state is true."),
    () => h("p").child("This content is shown when state is false.")
  )
);
```

**Parameters**:

- `state`: A `ChainState<boolean>` instance to control rendering.
- `trueFactory`: A factory function to create the component when `state` is `true`.
- `falseFactory`: (Optional) A factory function to create the component when `state` is `false`.
- `options`: (Optional) Rendering options.
  - `options.keepAlive`: `boolean` (default is `false`). If set to `true`, both components created by `trueFactory` and `falseFactory` will be created and added to the DOM, but their visibility will be toggled using `display: none` style based on the `state` value, instead of being destroyed/recreated. This is very useful for scenarios where component state needs to be preserved or frequent DOM operations need to be avoided.

**Mechanism Details**:

- By default, `when` destroys the old component and creates a new one when the state toggles.
- When `keepAlive` is `true`, `when` creates both components and dynamically binds their `display` styles using `state.map`, achieving CSS-based show/hide toggling. This avoids frequent mounting and unmounting of components, preserving their internal state.

### Client-Side Routing

ChainUI provides a comprehensive client-side routing system, supporting dynamic paths, navigation guards, and history management.

#### `createRouter(options)`

`createRouter` is a factory function for creating and initializing a router instance. It returns an object containing the `router` instance, a `Link` component, a `PageView` element, and `rootPageViewRuntime`.

```javascript
import { createRouter, h, createState } from "@luxbai-dev/chainui";

const HomePage = () => h("div").child("Welcome to Home Page");
const AboutPage = () => h("div").child("About Us");
const UserPage = (params) => h("div").child(`User ID: ${params.id}`);

const { router, Link, PageView } = createRouter({
  routes: [
    { path: "/", component: HomePage },
    { path: "/about", component: AboutPage },
    { path: "/users/:id", component: UserPage, options: { keepAlive: true } },
  ],
  mode: "history", // or 'hash'
});

// PageView is a special ChainElement that renders the corresponding component based on route matching.
// You need to mount PageView to the DOM.
// mount('#app', PageView);
```

**Returned Object**:

- **`router`**: `ChainPageRouter` instance, used for programmatic navigation (`router.navigate('/path')`).
- **`Link`**: A component for creating navigation links.
  ```javascript
  h("nav").child(
    Link({ to: "/" }, "Home"),
    Link({ to: "/about" }, "About"),
    Link({ to: "/users/123", params: { id: "123" } }, "User 123")
  );
  ```
- **`PageView`**: A special `ChainElement` that acts as a placeholder for route content. You need to mount `PageView` to your application's root container, and the router will be responsible for rendering the matched page component inside it.
- **`rootPageViewRuntime`**: An internally used `ChainRuntime` instance for managing `PageView`'s own lifecycle and operations.

#### `createApp(config)`

`createApp` is the main entry point for creating a ChainUI application, especially one with routing capabilities. It simplifies the router initialization and mounting process.

```javascript
import { createApp, h, createState } from "@luxbai-dev/chainui";

const HomePage = () => h("div").child("Welcome to Home Page");
const AboutPage = () => h("div").child("About Us");

const { router, Link, destroy } = createApp({
  mount: "#app", // Specify the DOM element to mount the application to
  routes: [
    { path: "/", component: HomePage },
    { path: "/about", component: AboutPage },
  ],
  mode: "history",
});

// You can now use the router and Link components
// router.navigate('/about');
// h('nav').child(Link({ to: '/' }, 'Home'));

// When the application is no longer needed, call destroy() to clean up resources
// destroy();
```

**Parameters**:

- `config.mount`: (Required) A CSS selector string or an actual `HTMLElement`, specifying the target for application mounting.
- `config.routes`: (Optional) An array of route configurations.
- `config.mode`: (Optional) Router mode: `'history'` (default) or `'hash'`.
- `config.persist`: (Optional) Whether to persist router history.
- `config.initialPath`: (Optional) Initial path for memory mode.
- Other `ChainPageRouter` options.

**Returned Object**:

- **`router`**: `ChainPageRouter` instance.
- **`Link`**: Component for creating navigation links.
- **`destroy`**: A function to destroy the entire application instance, cleaning up all routes, runtimes, and event listeners.

### Server-Side Rendering (SSR)

ChainUI supports rendering in a Node.js environment for better performance and SEO. Through the `render` function, you can generate HTML strings on the server, and combine it with the client-side `mount` function to achieve fast interactive application loading.

#### `render(componentFactory, options?)` (SSR Only)

The `render` function is used in Server-Side Rendering (SSR) environments to convert a `ChainElement` into an HTML string.

```javascript
const { html, state, clientEventHandlers } = render(() =>
  h("div").child("Hello SSR")
);
// html: "<div>Hello SSR</div>"
// state: { 'state-1': 'someValue' } // Current values of collected reactive states
// clientEventHandlers: [{ actionId: 'action-1', eventType: 'click', handlerCode: 'function(e){ console.log("Clicked!"); }' }]
```

**Parameters**:

- `componentFactory`: A factory function that returns the root `ChainElement` instance to be rendered.
- `options`: (Optional) Rendering options.
  - `options.format`: `'html'` (default) or `'stream'`.
    - `'html'`: Returns the HTML string, collected states, and client event handlers.
    - `'stream'`: Returns the serialized `OperationStream` string, collected states, and client event handlers. This is useful for client-side application recovery via `OperationStream.deserialize`.

**Mechanism Details**:

- `render` calls `componentFactory` to create the `ChainElement` instance.
- It traverses the component tree, collects the current values of all reactive states bound in `BIND_STATE` operations, and returns them as a `state` object.
- It also calls the `ChainElement.toHtml()` method to generate the HTML string and collects all event handlers, converting their `handler` functions into string form (`handlerCode`) for event replay on the client.

### Internal Mechanism Details

#### `OperationType` Enum

`OperationType` defines all possible internal DOM operation types in ChainUI. These types are fundamental to ChainUI's core "operation stream" mechanism, describing how DOM elements are created, modified, and managed.

```javascript
export const OperationType = {
  CREATE_ELEMENT: "CREATE_ELEMENT", // Creates a new DOM element
  CREATE_TEXT_NODE: "CREATE_TEXT_NODE", // Creates a new text node
  SET_TEXT_CONTENT: "SET_TEXT_CONTENT", // Sets the text content of a DOM node
  APPEND_CHILD: "APPEND_CHILD", // Appends a child node to a parent node
  REMOVE_CHILD: "REMOVE_CHILD", // Removes a child node from a parent node
  INSERT_BEFORE: "INSERT_BEFORE", // Inserts a child node before a specified anchor node
  SET_ATTRIBUTE: "SET_ATTRIBUTE", // Sets an attribute of a DOM element
  REMOVE_ATTRIBUTE: "REMOVE_ATTRIBUTE", // Removes an attribute from a DOM element
  SET_STYLE: "SET_STYLE", // Sets a CSS style property of a DOM element
  ADD_CLASS: "ADD_CLASS", // Adds a CSS class to a DOM element
  REMOVE_CLASS: "REMOVE_CLASS", // Removes a CSS class from a DOM element
  ADD_EVENT_LISTENER: "ADD_EVENT_LISTENER", // Adds an event listener to a DOM element
  MOUNT: "MOUNT", // Mounts the root component to a specified DOM container
  BIND_STATE: "BIND_STATE", // Binds a reactive state to a DOM element or its content for automatic updates
  BIND_ATTRIBUTE: "BIND_ATTRIBUTE", // Binds a reactive state to a specific attribute of a DOM element
  BIND_LIST: "BIND_LIST", // Binds a reactive array state to a DOM list for efficient reconciliation updates
  UPDATE_NODE: "UPDATE_NODE", // Internal operation: updates an existing DOM node
  ROUTE_CHANGE: "ROUTE_CHANGE", // Internal operation: indicates a route path change
  ROUTE_MATCH: "ROUTE_MATCH", // Internal operation: indicates a successful route path match
  INIT_ROUTER: "INIT_ROUTER", // Internal operation: initializes the router instance
};
```

#### `OperationStream`

`OperationStream` is ChainUI's core mechanism for collecting and batch processing DOM operations. It transforms all chainable calls on `ChainElement` into a series of executable operations, which are then executed by `ChainRuntime` at appropriate times (e.g., during `mount` or state updates).

```javascript
// Internal usage example
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
const operations = stream.getOperations(); // Get the list of operations
```

**Mechanism Details**:

- **Batch Processing**: `OperationStream` collects operations and optimizes them via the `add` method. For example, if the same attribute of the same element is set consecutively, it will only keep the last operation, avoiding unnecessary intermediate DOM updates.
- **Serialization and Deserialization**: The `serialize()` method converts the operation stream into a JSON string, which is very useful for Server-Side Rendering (SSR) to transfer the operation stream from the server to the client. The `static deserialize()` method can then deserialize the JSON string back into an `OperationStream` instance for client-side restoration and execution.

#### `ChainRuntime` (Client-Side Runtime)

`ChainRuntime` is ChainUI's core engine on the client-side, responsible for receiving `OperationStream` and transforming it into actual DOM operations. It manages DOM node mapping, state subscriptions, event delegation, and batch updates to ensure efficient and responsive UI rendering.

**Mechanism Details**:

- **`nodeMap`**: A `Map` object that stores a mapping from ChainUI internal generated node IDs to actual DOM nodes, facilitating quick lookup and manipulation.
- **`stateSubscriptions` / `nodeSubscriptions`**: Two `Map` objects used to manage the lifecycle of reactive state subscriptions. They ensure that all related state subscriptions are correctly unsubscribed when a DOM node is removed, effectively preventing memory leaks.
- **`eventDelegator`**: An `EventDelegator` instance, responsible for implementing an efficient event delegation mechanism, reducing the number of event listeners.
- **`batchQueue` / `scheduleBatchExecution`**: Internal queue and scheduling mechanism that utilizes `requestAnimationFrame` to batch multiple DOM operations and execute them uniformly before the browser's next repaint, thereby optimizing performance and user experience.
- **`applyOperation(op)`**: Executes a single DOM operation based on `OperationType`, such as creating elements, setting attributes, appending child nodes, etc.
- **`execute(operations, immediate?)`**: Executes a series of operations, with an option for immediate execution or adding to the batch queue.
- **`bindOperations(stream)`**: Specifically used to bind `BIND_STATE` and `BIND_LIST` type operations, ensuring the reactive update mechanism is active.
- **`cleanupNodeTree(node)`**: Recursively cleans up event handlers and state subscriptions on a node and its entire subtree before DOM removal.
- **`reconcileList(parentNodeId, newItems, factory)`**: Implements an efficient list reconciliation algorithm. When a reactive array state updates, it intelligently compares new and old list items, only adding, removing, or moving changed DOM nodes, minimizing DOM operations. This is achieved by assigning `data-key` attributes to list items, similar to React/Vue's `key` mechanism.
- **`destroy()`**: Destroys the runtime instance, cleaning up all resources, including canceling animation frames, clearing queues, unsubscribing from all states, and removing event listeners.

#### `EventDelegator` (Event Delegator)

`EventDelegator` is a component of `ChainRuntime`, specifically designed to implement efficient event handling.

**Mechanism Details**:

- **Unified Listening**: It registers a global listener on `document.body` for all delegated event types (e.g., `click`, `input`).
- **`handlerMap`**: Stores a mapping from `actionId` (a unique ID generated by `generateId('action')`) to actual event handler functions.
- **Event Dispatching**: When the global listener captures an event, it traverses the DOM tree upwards from the event's `target` element, looking for elements with a `data-chain-action` attribute. Once found, it retrieves the corresponding handler function from `handlerMap` and executes it.
- **`registerHandlers` / `clearHandlersForNode`**: Used to register and clear event handlers on specific nodes and their descendants.
- **`destroy()`**: Removes all global event listeners and clears the handler map.

#### `NavigationController` and `NavManager` (Routing Internal Mechanisms)

- **`NavigationController`**: This is an abstract base class that defines the basic interface for navigation managers, including listening for navigation changes, notifying listeners, navigating to new paths, getting the current location, and going back in history.
- **`NavManager`**: Implements the `NavigationController` interface, providing concrete history management logic. It supports three modes: `'history'` (using History API), `'hash'` (using URL hash), and `'memory'` (in-memory mode, for SSR or testing). `NavManager` internally manages a navigation stack and notifies all registered listeners when navigation changes.

#### `ChainPageRouter` (Routing Internal Mechanisms)

`ChainPageRouter` is the core of ChainUI's routing system. It is responsible for registering routes, matching paths, and managing the lifecycle and caching of page components.

**Mechanism Details**:

- **Route Registration**: The `register(path, componentFactory, options?)` method is used to register routes. It converts the path into a regular expression and extracts path parameters.
- **`currentPage` State**: A `ChainState` instance that stores the ID and parameters of the currently matched page. When this state updates, the router triggers page rendering.
- **`_runtimeCache` (Keep-Alive Cache)**: When `keepAlive: true` is set in route options, the `ChainRuntime` instance of the page component is cached. This means that when users switch between these pages, components are not destroyed and recreated but are hidden and shown, preserving their internal state and improving performance. The cache has a `keepAliveCacheLimit` and uses an LRU (Least Recently Used) eviction strategy.
- **Navigation Guards**: Route options support `beforeEnter` (before entering) and `onLeave` (on leaving) hooks, allowing you to execute custom logic before or after navigation, such as permission checks, data loading, or cleanup.
- **Route Matching**: The `_matchRoute` method is responsible for matching the current URL path against registered routes and parsing path and query parameters.
- **`_handleLocationChange`**: Listens for navigation changes from `NavManager` and updates the `currentPage` state based on the new location, thereby triggering page rendering.
- **`destroy()`**: Destroys the router instance, cleaning up all subscriptions, cached runtimes, and the history manager.
