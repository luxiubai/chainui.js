# ChainUI - A Lightweight, High-Performance, Virtual-DOM-Free UI Library

[**English Documentation**](./docs/en/README.md) | [**中文文档**](./docs/zh/README.md)

ChainUI is a modern JavaScript library for building user interfaces. It ditches the virtual DOM for a unique "Operation Stream" mechanism, offering exceptional performance and a refreshingly simple development experience through its fluent, chainable API.

## Core Features

- **Chainable API**: Build complex UI structures in an intuitive, readable way. Your code becomes a direct reflection of the DOM structure.
- **High Performance**: No V-DOM overhead. DOM updates are batched and applied efficiently, minimizing reflows and repaints.
- **Reactive State Management**: A simple yet powerful built-in reactive system (`createState`) to create data-driven views with ease.
- **Unified Element Configuration**: A powerful `set` method to configure attributes, styles, and classes with a single, consistent API.
- **Lightweight & Zero-Dependency**: The core library is tiny and has no external dependencies.
- **Feature-Rich**: Comes with built-in solutions for:
  - Component-based architecture (`createComponent`)
  - List rendering with optimized reconciliation (`map`)
  - Conditional rendering (`when`)
  - **Client-Side Routing**: A comprehensive routing system (`createRouter`, `createApp`) with dynamic paths, navigation guards, and history management.
  - Server-Side Rendering (SSR) support

## Quick Example

See how easy it is to build a simple counter application with the optimized API.

```javascript
import { h, createState, mount } from "@luxbai-dev/chainui";

const count = createState(0);

const app = h("div").child(
  h("h1").child("Counter Example"),
  h("p").child(count.map((c) => `Current count: ${c}`)),
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

## Installation

Get started by adding ChainUI to your project using your favorite package manager.

```bash
npm install @luxbai-dev/chainui
# or
yarn add @luxbai-dev/chainui
```

```javascript
// Then import it in your modules
// Named imports (recommended)
import { h, createState, mount } from "@luxbai-dev/chainui";

// Or use default import
import ChainUI from "@luxbai-dev/chainui";
// Then use as ChainUI.h, ChainUI.createState, ChainUI.mount, etc.
```
