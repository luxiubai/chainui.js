# ChainUI - A Lightweight UI Library

ChainUI is a JavaScript UI library that uses an operation stream mechanism and a chainable API to provide a simple development experience. It's suitable for adding dynamic interactions to web pages.

**Core Features:**

- **Chainable API**: Build UI with a readable, chainable syntax.
- **Reactive State**: Built-in state management for data-driven views.
- **Lightweight**: Small library size with minimal dependencies.

## Quick Start

Experience how simple it is to build a counter with ChainUI.

```javascript
import { h, createState, mount } from "@luxbai-dev/chainui";

// 1. Create a reactive state using createState
const count = createState(0);

// 2. Build the UI using the h() function and chainable API
const app = h("div").child(
  h("h1").child("ChainUI Counter"),
  // Create a derived state with state.map; the text updates when count changes
  h("p").child(count.map((c) => `Current count: ${c}`)),
  h("div").child(
    h("button")
      .child("Increment")
      // Use the .on() method to bind events
      .on("click", () => count.update((c) => c + 1)),
    h("button")
      .child("Decrement")
      // Bind state directly to HTML attributes with .set()
      .set(
        "disabled",
        count.map((c) => c <= 0),
        "attr"
      )
      .on("click", () => count.update((c) => c - 1))
  )
);

// 3. Mount the UI to a specific element on the page
mount(app, "#app");
```

## Installation and Usage

ChainUI supports multiple integration methods to fit your project's needs.

### 1. Using a Bundler (Vite/Webpack)

This is the recommended approach, providing full TypeScript support and optimal bundle sizes.

```bash
npm install @luxbai-dev/chainui
# or
yarn add @luxbai-dev/chainui
```

Import it in your JavaScript or TypeScript files:

```javascript
// Named imports (recommended)
import { h, createState, mount } from "@luxbai-dev/chainui";

// Or use default import
import ChainUI from "@luxbai-dev/chainui";
// Then use as ChainUI.h, ChainUI.createState, ChainUI.mount, etc.
```

### 2. Via `<script type="module">` (ESM)

You can use the ESM build directly in modern browsers without any build tools. Using a CDN like [unpkg](https://www.unpkg.com/) is recommended.

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="app"></div>

    <script type="module">
      // Import from a CDN, pinning to a specific version for stability
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

### 3. Via `<script>` Tag (IIFE)

For rapid prototyping or legacy projects, the IIFE build is the simplest option. It exposes a global `ChainUI` object.

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="app"></div>

    <!-- Include the IIFE build file -->
    <script src="https://www.unpkg.com/@luxbai-dev/chainui@latest/build/iife/chainui.min.js"></script>
    <script>
      // All APIs are available on the global ChainUI object
      const { h, createState, mount } = ChainUI;

      const app = h("p").child("Hello from IIFE!");
      mount(app, "#app");
    </script>
  </body>
</html>
```

### 4. In Node.js

ChainUI can also run in a Node.js environment, primarily for Server-Side Rendering (SSR). It supports both CommonJS and ES Module systems.

## Advanced Topics

**CommonJS (CJS)**

```javascript
const { h, renderToStream } = require("@luxbai-dev/chainui");

// ... see the Server-Side Rendering section for details
```

**ES Module (ESM)**

Set `"type": "module"` in your `package.json` or use the `.mjs` file extension.

```javascript
import { h, renderToStream } from "@luxbai-dev/chainui";

// ... see the Server-Side Rendering section for details
```

## Core Concepts

Understanding ChainUI's core mechanics will help you unlock its full potential.

### 1. Operation Stream

This is the cornerstone of ChainUI's performance. When you call methods like `.child()`, `.attr()`, or `.text()`, ChainUI **does not immediately manipulate the DOM**. Instead, it translates these intentions (e.g., `CREATE_ELEMENT`, `SET_ATTRIBUTE`) into simple operation objects and pushes them into a queue.

### 2. Batch Updates

All collected operations are executed in a single batch within a `requestAnimationFrame` callback. This means all DOM reads and writes are consolidated into a single browser render frame, effectively preventing layout thrashing and ensuring smooth performance.

### 3. Event Delegation

For maximum performance and minimal memory footprint, ChainUI uses event delegation on the root element to handle all events. When you bind an event with `.on()`, it doesn't call `addEventListener` on each element. Instead, the handler is registered with a global manager. This is especially efficient for large lists and complex applications.

## API Reference

### `h(tagName)`

`h` (short for `createElement`) is the entry point for all UI construction. It returns a `ChainElement` instance, which you can then use chainable methods on to define its properties and children.

```javascript
const myDiv = h("div");
```

### Element Operations

- **`.child(...children)`**: Adds one or more child nodes. Children can be `ChainElement` instances, strings, numbers, or state objects.
- **`.on(eventType, handler)`**: Attaches an event listener.
- **`.when(state, trueFactory, falseFactory, options?)`**: Conditionally renders different UI based on a state.
- **`.set(name, value, type?)`**: A powerful method for setting attributes, styles, and classes.

  **`.set()` Usage:**

  1.  **Set a single property/style**:

      ```javascript
      // Set an attribute (type is optional and often inferred)
      h("input").set("placeholder", "Enter text...", "attr");

      // Set a style
      h("div").set("color", "red", "style");

      // Add/remove a class
      h("p").set("active", true, "class"); // Adds 'active'
      h("p").set("hidden", false, "class"); // Removes 'hidden'
      ```

  2.  **Set multiple properties with an object**:

      ```javascript
      h("div").set({
        attr: { id: "main", "data-value": 123 },
        style: { backgroundColor: "lightblue", fontSize: "16px" },
        class: {
          "is-active": true,
          "is-disabled": someState.map((s) => s.disabled),
        },
      });
      ```

  3.  **Flexible Class Setting**:
      `class` property in the configuration object supports various formats for maximum flexibility:

      - **Object Form**: Keys are class names, values are booleans (`true` to add, `false` to remove).
        ```javascript
        .set({ class: { 'class-a': true, 'class-b': false, 'class-c': someState.value } })
        ```
      - **Array Form**: Each string in the array will be added as a class.
        ```javascript
        .set({ class: ['class-x', 'class-y', 'class-z'] })
        ```
      - **String Form**: The string will be added directly as a class (supports space-separated multiple classes).
        ```javascript
        .set({ class: 'single-class another-class' })
        ```

### Reactive State (`createState`)

`createState` is the heart of ChainUI's reactivity system. It returns a state object that the UI can subscribe to for automatic updates.

```javascript
const name = createState("Guest");

// Read the value
console.log(name.value); // "Guest"

// Update the value
name.value = "Alex"; // Option 1: Direct assignment
name.update((currentName) => currentName + "!"); // Option 2: Updater function, recommended for complex logic

// Subscribe to changes
const unsubscribe = name.subscribe((newValue) => {
  console.log(`Name changed to: ${newValue}`);
});
// Call unsubscribe() when no longer needed to prevent memory leaks.

// Derived State
// The .map() method creates a new, read-only state whose value is computed from the original.
const welcomeMessage = name.map((n) => `Welcome, ${n}`);

// Use it in the UI
h("h1").child(welcomeMessage); // The h1's text will automatically update when `name` changes
```

### Rendering Lists (`map`)

The `map` function is a specialized utility for rendering dynamic lists. It takes a state object containing an array and a factory function, efficiently rendering each item into a UI element.

**How it works**: When the state array changes, ChainUI uses an efficient reconciliation algorithm. It identifies each element by its `data-key` attribute and computes the minimal set of DOM operations (add, remove, move) to update the view, instead of wastefully re-rendering the entire list. Therefore, each item in the list needs to be provided with a stable and unique `key`.

```javascript
const items = createState([
  { id: 1, text: "Learn ChainUI" },
  { id: 2, text: "Build a project" },
]);

const list = h("ul").child(
  // The map function takes a state array and a factory function
  map(items, (item, index) =>
    h("li")
      // CRITICAL! Provide a unique key using .set()
      .set("data-key", item.id, "attr")
      .child(`${index + 1}: ${item.text}`)
  )
);

// Add a new item
setTimeout(() => {
  items.update((current) => [
    ...current,
    { id: 3, text: "Share with friends" },
  ]);
}, 2000);
```

### Conditional Rendering (`when`)

The `when` method dynamically renders one of two components based on a state's value.

```javascript
const isLoggedIn = createState(false);

h("div").child(
  h("button")
    .child(isLoggedIn.map((v) => (v ? "Logout" : "Login")))
    .on("click", () => (isLoggedIn.value = !isLoggedIn.value)),

  // The .when() method for conditional rendering
  h("div").when(
    isLoggedIn,
    () => h("p").child("Welcome back!"), // Renders when true
    () => h("p").child("Please log in."), // Renders when false (optional)
    { keepAlive: true } // Enable keepAlive mode
  )
);
```

**`keepAlive` Mode**:
By default, the inactive component is completely removed from the DOM. If you want to preserve the component and its internal state (like form inputs), enable `keepAlive` mode. This will toggle the component's visibility using `display: none` instead.

```javascript
h("div").when(state, trueFactory, falseFactory, { keepAlive: true });
```

### Creating Components (`createComponent`)

Encapsulate UI logic into reusable, independent units with `createComponent`.

```javascript
// Define a Button component
const Button = createComponent("Button", (label, onClick) => {
  return h("button")
    .child(label)
    .set("padding", "8px 16px", "style")
    .on("click", onClick);
});

// Use the component in your app
const app = h("div").child(
  Button("Click Me", () => alert("Componentized!")),
  Button("Another Button", () => console.log("..."))
);
```

### Form Handling

Easily manage forms by creating a two-way binding between a state and a form element's `value` attribute and `input` event.

```javascript
const textValue = createState("");

const app = h("div").child(
  h("input")
    .set("type", "text", "attr")
    .set("placeholder", "Type something...", "attr")
    // Bind the value attribute to the state
    .set("value", textValue, "attr")
    // Listen to the input event to update the state with the input's value
    .on("input", (e) => (textValue.value = e.target.value)),

  h("p").child(textValue.map((v) => `You are typing: ${v}`))
);
```

## Advanced Topics

### Client-Side Routing

ChainUI provides a complete client-side routing solution, supporting declarative route configuration, dynamic parameters, navigation guards, and history management.

#### 1. History Controllers

ChainUI's routing system is pluggable, managing browser history through the `HistoryController` abstract class. It offers two built-in implementations:

- **`BrowserHistory`**: For browser environments, using the HTML5 History API (`pushState`, `replaceState`, `popstate`).
- **`ServerHistory`**: For non-browser environments (e.g., SSR or testing), maintaining an in-memory history stack.

Typically, you don't need to instantiate them directly; `createRouter` automatically selects one based on the environment.

#### 2. `createRouter(options) → { router, Link, PageView }`

This is the core function for creating and configuring the router.

- **`options.routes`**: (Required) An array of route configurations. Each route object includes:
  - `path`: The route path (e.g., `'/users/:id'`).
  - `component`: A factory function that receives a `params` object (containing dynamic path parameters **and URL query parameters**) and returns the `ChainElement` component for this route.
  - `options`: (Optional) Route-specific options:
    - `keepAlive`: `boolean`. If `true`, the page instance is kept alive (hidden, not destroyed) when navigating away. It will be reused when re-entering. **Note: If route parameters change, the component will be destroyed and recreated even if `keepAlive` is `true`.**
    - `beforeEnter`: `(toParams, fromParams) => boolean`. A guard function called before entering the route. If it returns `false`, navigation will be canceled.
    - `onLeave`: `(fromParams, toParams) => void`. A hook function called when leaving the route.
- **`options.history`**: (Optional) A custom `HistoryController` instance.
- **`options.normalizePath`**: (Optional) `(path: string) => string`. A function to normalize paths before matching.
- **`options.basePath`**: (Optional) `string`. The base path for the application. If your application is deployed in a subdirectory (e.g., `https://example.com/my-app/`), `basePath` should be set to `/my-app`. This affects route matching and `href` generation for `Link` components.

`createRouter` returns a configuration object containing the `router` instance, `Link` component, and `PageView` element.

#### 3. `router` Instance

The `router` instance returned by `createRouter` allows for programmatic navigation:

- **`router.navigate(path, params?, replace?)`**: Navigates to the specified path. If the target path and parameters are identical to the current ones, no navigation will occur.
  - `path`: The target path.
  - `params`: (Optional) An object containing dynamic route parameters and query parameters.
  - `replace`: (Optional) `boolean`. If `true`, replaces the current history entry instead of pushing a new one.
- **`router.goBack()`**: Navigates back in history.
- **`router.getCurrentPage()`**: Gets the current page's ID and parameters.
- **`router.closePage(pageId)`**: Closes the page with the specified ID and removes its component instance from the cache.

#### 4. `Link` Component

`Link` is a component for creating navigation links. It renders an `<a>` tag and automatically handles click events for client-side routing.

- **`props.to`**: (Required) The target route path.
- **`props.params`**: (Optional) Dynamic route parameters or query parameters. These parameters will be used to fill dynamic segments in the `to` path (e.g., `:id` in `/users/:id`), and any remaining parameters will be added as a query string to the URL.
- **`props`**: (Optional) Additional attributes to set on the `<a>` element (e.g., `class`, `id`, `style`, etc.).
- **`...children`**: The child content of the link (text, other elements, etc.).

```javascript
import { h, createRouter } from "@luxbai-dev/chainui";

const { Link } = createRouter({ routes: [] }); // Assuming routes are configured

// Create a navigation link
const myLink = Link(
  { to: "/users/:id", params: { id: 123, tab: "profile" }, class: "nav-link" },
  "View User Profile"
);
// Renders as <a href="/users/123?tab=profile" data-chain-route="/users/:id" class="nav-link">View User Profile</a>
```

#### 5. `PageView` Element

`PageView` is a special `ChainElement` that serves as the rendering outlet for route content. You simply add it to your application layout, and the matched component will automatically render here.

#### 6. Navigation Guards and Lifecycle Hooks

You can define `beforeEnter` and `onLeave` hooks in your route configuration to control the navigation flow and execute side effects.

```javascript
import { h, createRouter, createState } from "@luxbai-dev/chainui";

const isAuthenticated = createState(false); // Simulate user login status

const LoginPage = () =>
  h("div").child(
    h("h2").child("Login"),
    h("button")
      .child("Click to Login")
      .on("click", () => {
        isAuthenticated.value = true;
        router.navigate("/dashboard"); // Navigate after successful login
      })
  );

const DashboardPage = () => h("h2").child("Dashboard");

const { router, Link, PageView } = createRouter({
  routes: [
    { path: "/login", component: LoginPage },
    {
      path: "/dashboard",
      component: DashboardPage,
      options: {
        beforeEnter: (toParams, fromParams) => {
          if (!isAuthenticated.value) {
            alert("Please log in to access the dashboard!");
            router.navigate("/login", {}, true); // Redirect to login if not authenticated
            return false; // Prevent navigation
          }
          console.log("Entering dashboard");
          return true; // Allow navigation
        },
        onLeave: (fromParams, toParams) => {
          console.log("Leaving dashboard");
        },
      },
    },
  ],
});

const app = h("div").child(
  h("nav").child(
    Link({ to: "/login" }, "Login"),
    Link({ to: "/dashboard" }, "Dashboard")
  ),
  PageView
);

mount(app, "#app");
```

#### 7. Back Button Event (`chain:backpress`)

The ChainUI routing system listens for a custom event named `chain:backpress`. When this event is triggered, the router calls the `router.goBack()` method, simulating a browser back action. This is useful for implementing custom back button logic in non-browser environments (e.g., desktop or hybrid apps).

You can trigger this event as follows:

```javascript
// Where you need to trigger a back operation
document.dispatchEvent(new CustomEvent("chain:backpress"));
```

### Server-Side Rendering (SSR)

ChainUI supports isomorphic rendering in a Node.js environment to improve First Contentful Paint (FCP) and Search Engine Optimization (SEO).

**1. On the Server (Node.js)**

Choose the import syntax that matches your project's module system.

**ES Module (`import`)**

```javascript
// server.mjs
import http from "http";
import { h, renderToStream } from "@luxbai-dev/chainui";

const App = () => h("div").child(h("h1").child("Hello from SSR"));
const ssrData = renderToStream(() => App());

// ... (HTML generation and server logic omitted)
```

**CommonJS (`require`)**

```javascript
// server.js
const http = require("http");
const { h, renderToStream } = require("@luxbai-dev/chainui");

const App = () => h("div").child(h("h1").child("Hello from SSR"));
const ssrData = renderToStream(() => App());

// ... (HTML generation and server logic omitted)
```

**2. On the Client (Browser)**

```javascript
// client.js
import { h, mount } from "@luxbai-dev/chainui";

const App = () => h("div").child(h("h1").child("Hello from SSR"));

// Mount using the ssrData from the server (this process is called "hydration")
// It reuses the server-generated DOM and attaches event listeners and state bindings
// without recreating the DOM from scratch.
mount(App(), "#app", window.ssrData);
```
