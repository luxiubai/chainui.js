// Type definitions for ChainUI
// Project: ChainUI
// Definitions by: ChainUI Team

/**
 * @enum {string}
 * @description Defines all possible DOM operation types in ChainUI.
 */
export declare const OperationType: {
    readonly CREATE_ELEMENT: 'CREATE_ELEMENT';
    readonly CREATE_TEXT_NODE: 'CREATE_TEXT_NODE';
    readonly SET_TEXT_CONTENT: 'SET_TEXT_CONTENT';
    readonly APPEND_CHILD: 'APPEND_CHILD';
    readonly REMOVE_CHILD: 'REMOVE_CHILD';
    readonly INSERT_BEFORE: 'INSERT_BEFORE';
    readonly SET_ATTRIBUTE: 'SET_ATTRIBUTE';
    readonly REMOVE_ATTRIBUTE: 'REMOVE_ATTRIBUTE';
    readonly SET_STYLE: 'SET_STYLE';
    readonly ADD_CLASS: 'ADD_CLASS';
    readonly REMOVE_CLASS: 'REMOVE_CLASS';
    readonly ADD_EVENT_LISTENER: 'ADD_EVENT_LISTENER';
    readonly MOUNT: 'MOUNT';
    readonly BIND_STATE: 'BIND_STATE';
    readonly BIND_ATTRIBUTE: 'BIND_ATTRIBUTE';
    readonly BIND_LIST: 'BIND_LIST';
    readonly UPDATE_NODE: 'UPDATE_NODE';
    readonly ROUTE_CHANGE: 'ROUTE_CHANGE';
    readonly ROUTE_MATCH: 'ROUTE_MATCH';
    readonly INIT_ROUTER: 'INIT_ROUTER';
};

/**
 * @returns {number} The current value of the global ID counter.
 */
export declare const getGlobalIdCounter: () => number;

/**
 * @returns {void}
 * @description Resets the global ID counter to 0.
 */
export declare const resetGlobalIdCounter: () => void;

/**
 * @param {string} prefix - The prefix for the ID.
 * @returns {string} The generated unique ID.
 */
export declare const generateId: (prefix: string) => string;

/**
 * @param {any} value - Any type of value.
 * @returns {string} The string representation of the value. Objects will attempt JSON.stringify.
 */
export declare const valueToString: (value: any) => string;

/**
 * @typedef {object} ChainState
 * @property {*} value - The current value of the state.
 * @property {function(function(*): *|*): void} update - Updates the value of the state.
 * @property {function(function(*): void): function(): void} subscribe - Subscribes to state changes.
 * @property {function(): string} toString - Returns the string representation of the state's value.
 * @property {function(function(*): *): ChainState} map - Creates a new derived state.
 * @property {boolean} [isMapped] - Indicates if this state is a mapped state.
 */
export interface ChainState<T> {
    value: T;
    update(updater: ((value: T) => T) | T): void;
    subscribe(callback: (value: T) => void): () => void;
    toString(): string;
    map<U>(mapperFn: (value: T) => U): ChainState<U>;
    isMapped?: boolean;
}

/**
 * @template T
 * @param {T} initialValue - The initial value of the state.
 * @returns {ChainState<T>} A reactive state object.
 * @description Creates and manages a reactive state object.
 */
export declare function createState<T>(initialValue: T): ChainState<T>;

export interface Operation {
    type: typeof OperationType[keyof typeof OperationType];
    nodeId: string;
    tagName?: string;
    content?: string;
    parentId?: string;
    childId?: string;
    name?: string;
    value?: any;
    property?: string;
    className?: string;
    eventType?: string;
    actionId?: string;
    handler?: (event: Event) => void;
    selector?: string;
    state?: ChainState<any>;
    stateId?: string;
    updateFn?: (value: any, stream: OperationStream) => void;
    factory?: (item: any, index: number) => ChainElement;
    anchorId?: string;
    router?: any; // This could be more specific if we define RouterConfig
}

/**
 * @class OperationStream
 * @description Manages a queue of operations for batch processing DOM updates.
 */
export declare class OperationStream {
    operations: Operation[];
    constructor();
    add(operation: Operation): void;
    getOperations(): Operation[];
    clear(): void;
    serialize(): string;
    static deserialize(json: string): OperationStream;
}

/**
 * @class ChainElement
 * @description Represents a DOM element that can be built using a chainable method call.
 */
export declare class ChainElement {
    nodeId: string;
    stream: OperationStream;
    children: Array<ChainElement | string | ChainState<any>>;
    eventHandlers: Array<{ actionId: string; eventType: string; handler: (event: Event) => void }>;
    tagName?: string;
    constructor(tagName?: string);
    private _bind;
    private _setAttr;
    private _setStyle;
    private _setClass;
    set(name: string | { attr?: Record<string, any>; style?: Record<string, string>; class?: string | string[] | Record<string, boolean | ChainState<boolean>> }, value?: any, type?: 'attr' | 'style' | 'class'): ChainElement;
    on(eventType: string, handler: (event: Event) => void): ChainElement;
    private _createTextChild;
    child(...children: Array<ChainElement | string | ChainState<string> | Array<ChainElement | string | ChainState<string>>>): ChainElement;
    mount(selector: string): void;
    when(state: ChainState<boolean>, trueFactory: () => ChainElement, falseFactory?: () => ChainElement, options?: { keepAlive?: boolean }): ChainElement;
    toHtml(): { html: string; eventHandlers: Array<{ actionId: string; eventType: string; handler: (event: Event) => void }> };
}

/**
 * @class ChainRuntime
 * @description Client-side runtime responsible for executing operation streams to manipulate the real DOM.
 */
export declare class ChainRuntime {
    nodeMap: Map<string, HTMLElement | Text>;
    stateSubscriptions: Map<string, () => void>;
    nodeSubscriptions: Map<string, Array<() => void>>;
    eventDelegator: EventDelegator;
    batchQueue: Operation[];
    isBatchingScheduled: boolean;
    animationFrameId: number | null;
    rootNodeId?: string;
    constructor();
    execute(operations: Operation[], immediate?: boolean): void;
    executeOperations(stream: OperationStream, immediate?: boolean): void;
    bindOperations(stream: OperationStream): void;
    scheduleBatchExecution(): void;
    applyOperation(op: Operation): void;
    cleanupNodeTree(node: HTMLElement | Text): void;
    reconcileList(parentNodeId: string, newItems: any[], factory: (item: any, index: number) => ChainElement): void;
    destroy(): void;
}

/**
 * @class EventDelegator
 * @description Efficiently handles events using the event delegation pattern.
 */
export declare class EventDelegator {
    runtime: ChainRuntime;
    delegatedEvents: Set<string>;
    handlerMap: Map<string, (event: Event) => void>;
    boundHandleEvent: (event: Event) => void;
    constructor(runtime: ChainRuntime);
    registerHandlers(handlers: Array<{ actionId: string; handler: (event: Event) => void }>): void;
    clearHandlersForNode(node: HTMLElement | Text): void;
    delegate(eventType: string): void;
    handleEvent(e: Event): void;
    destroy(): void;
}

/**
 * @param {string} tagName - The tag name of the HTML element to create.
 * @returns {ChainElement} A new ChainElement instance.
 * @description A factory function for creating ChainElement instances. This is the starting point for building UI.
 * @example
 * h('div').child('Hello, world!');
 * h('button').on('click', () => console.log('Clicked!'));
 */
export declare function h(tagName: string): ChainElement;

export interface MountSSRData {
    eventHandlers: Array<{ actionId: string; eventType: string; handlerCode: string | null }>;
}

/**
 * @param {string|HTMLElement} selector - The CSS selector of the DOM element or the actual HTMLElement to which the component will be mounted.
 * @param {ChainElement|object} [componentOrEventData=null] - The ChainElement instance to mount, or an object containing SSR event handler data.
 * @returns {{runtime: ChainRuntime, destroy: function(): void}|null} An object containing the runtime instance and a destroy function, or null if the mount target is not found.
 * @description Mounts a component to the specified location in the DOM and binds event handlers.
 * @example
 * // Mount a ChainElement
 * mount('#app', h('div').child('My App'));
 *
 * // Mount from SSR data
 * const ssrData = {
 *   eventHandlers: [{ actionId: 'action-1', eventType: 'click', handlerCode: 'function(e){ console.log("SSR Click"); }' }]
 * };
 * mount('#app', ssrData);
 */
export declare function mount(selector: string | HTMLElement, componentOrEventData?: ChainElement | MountSSRData | null): { runtime: ChainRuntime; destroy: () => void } | null;

export interface RenderOptions {
    format?: 'html' | 'stream';
}

export interface RenderResultHtml {
    html: string;
    state: Record<string, any>;
    clientEventHandlers: Array<{ actionId: string; eventType: string; handlerCode: string | null }>;
}

export interface RenderResultStream {
    stream: string;
    state: Record<string, any>;
    eventHandlers: Array<{ actionId: string; eventType: string; handlerCode: string | null }>;
}

/**
 * @param {function(): ChainElement} componentFactory - A factory function that creates the root ChainElement for the component.
 * @param {object} [options] - Rendering options.
 * @param {'html'|'stream'} [options.format='html'] - The format of the returned output, either 'html' or 'stream'.
 * @returns {{html: string, state: object, clientEventHandlers: Array<{actionId: string, eventType: string, handlerCode: string|null}>}|{stream: string, state: object, eventHandlers: Array<{actionId: string, eventType: string, handlerCode: string|null}>}}
 * @description Renders a component for Server-Side Rendering (SSR).
 * @example
 * const { html, state, clientEventHandlers } = render(() => h('div').child('Hello SSR'));
 * // html: "<div>Hello SSR</div>"
 */
export declare function render(componentFactory: () => ChainElement, options?: RenderOptions): RenderResultHtml | RenderResultStream;

/**
 * @template T
 * @param {ChainState<Array<T>>} stateArray - A reactive array state whose values will be used to render the list.
 * @param {function(T, number): ChainElement} factory - A factory function that creates a ChainElement for each item in the array.
 * @returns {ChainElement} A ChainElement that will dynamically render the list.
 * @description Dynamically renders a list of elements from a reactive array state.
 * @example
 * const items = createState([{ id: 1, text: 'Item 1' }]);
 * h('ul').child(
 *   map(items, (item) => h('li').child(item.text))
 * );
 */
export declare function map<T>(stateArray: ChainState<T[]>, factory: (item: T, index: number) => ChainElement): ChainElement;

/**
 * @param {string} name - The name of the component, used for debugging or identification.
 * @param {function(...any[]): ChainElement} factory - A factory function that accepts arguments and returns a ChainElement instance as the root of the component.
 * @returns {function(...any[]): ChainElement} A new component function that can be used like a ChainElement.
 * @description Creates a reusable component.
 * @example
 * const MyButton = createComponent('MyButton', (text) => h('button').child(text));
 * h('div').child(MyButton('Click Me'));
 */
export declare function createComponent<Args extends any[]>(name: string, factory: (...args: Args) => ChainElement): (...args: Args) => ChainElement;

/**
 * @class NavigationController
 * @description Abstract navigation controller - provides a common interface for managing navigation.
 */
export declare class NavigationController {
    listeners: Set<({ path: string, state: object }) => void>;
    constructor();
    listen(callback: ({ path: string, state: object }) => void): () => void;
    notify(location: { path: string, state: object }): void;
    navigate(path: string, state?: object, replace?: boolean): void;
    getLocation(): { path: string, state: object };
    goBack(): void;
}

export interface NavManagerOptions {
    defaultPath?: string;
    mode?: 'history' | 'hash' | 'memory';
    initialPath?: string;
    persist?: boolean;
}

/**
 * @class NavManager
 * @augments NavigationController
 * @description Provides a unified interface for managing navigation across different environments.
 */
export declare class NavManager extends NavigationController {
    defaultPath: string;
    mode: 'history' | 'hash' | 'memory';
    stack: Array<{ path: string; state: object }>;
    index: number;
    constructor(options?: NavManagerOptions);
    navigate(path: string, state?: object, replace?: boolean): void;
    getLocation(): { path: string; state: object };
    goBack(): void;
    toJSON(): string;
    fromJSON(json: string): void;
    serialize(): { stack: Array<{ path: string; state: object }>; index: number; defaultPath: string };
    deserialize(data: { stack: Array<{ path: string; state: object }>; index: number; defaultPath: string }): void;
}

export interface RouteConfig {
    path: string;
    component: (...args: any[]) => ChainElement;
    options?: {
        keepAlive?: boolean;
        beforeEnter?: (toParams: object, fromLocation: { id: string | null; params: object }) => Promise<boolean> | boolean;
        onLeave?: (fromParams: object, toLocation: { id: string | null; params: object }) => void;
    };
}

export interface RouterOptions {
    routes?: RouteConfig[];
    history?: NavigationController;
    normalizePath?: (path: string) => string;
    mode?: 'history' | 'hash' | 'memory';
    persist?: boolean;
    initialPath?: string;
    keepAliveCacheLimit?: number;
    fallbackPath?: string;
}

/**
 * @class ChainPageRouter
 * @description Manages client-side routing for ChainUI applications.
 */
export declare class ChainPageRouter {
    pages: Map<string, { factory: (...args: any[]) => ChainElement; options: object; regex: RegExp; paramNames: string[] }>;
    currentPage: ChainState<{ id: string | null; params: object }>;
    private _runtimeCache;
    private _cacheKeys;
    keepAliveCacheLimit: number;
    fallbackPath: string;
    fallbackFactory: (() => ChainElement) | null;
    history: NavManager;
    normalizePath: (path: string) => string;
    private _cleanupFunctions;
    root?: HTMLElement;
    _rootPageViewRuntime?: { runtime: ChainRuntime, destroy: () => void };

    constructor(options?: RouterOptions);
    init(rootContainer: HTMLElement): void;
    register(path: string, componentFactory: (...args: any[]) => ChainElement, options?: RouteConfig['options']): ChainPageRouter;
    navigate(path: string, params?: object, replace?: boolean): Promise<ChainPageRouter>;
    goBack(): void;
    setFallbackPage(factory: () => ChainElement): void;
    getCurrentPage(): { id: string | null; params: object };
    destroy(): void;
    private _initEventDelegation;
    private _matchRoute;
    private _areParamsChanged;
    private _handleLocationChange;
    private _renderBlank;
    private _renderFallback;
}

export interface CreateRouterResult {
    router: ChainPageRouter;
    Link: (props: { to: string; params?: object } & Record<string, any>, ...children: Array<ChainElement | string | ChainState<string> | Array<ChainElement | string | ChainState<string>>>) => ChainElement;
    PageView: ChainElement;
    rootPageViewRuntime: { runtime: ChainRuntime; destroy: () => void };
}

/**
 * @param {object} [options={}] - Router configuration options.
 * @param {Array<object>} [options.routes=[]] - An array of route configurations.
 * @param {NavigationController} [options.history] - A custom history manager.
 * @param {function(string): string} [options.normalizePath] - A function to normalize paths.
 * @param {'history'|'hash'|'memory'} [options.mode] - The navigation mode.
 * @param {boolean} [options.persist] - Whether to persist history.
 * @param {string} [options.initialPath] - The initial path for memory mode.
 * @returns {{router: ChainPageRouter, Link: function(object, ...any[]): ChainElement, PageView: ChainElement, rootPageViewRuntime: {runtime: ChainRuntime, destroy: function(): void}}} An object containing the router instance, Link component, PageView element, and root PageView runtime.
 * @description Creates and initializes a router instance with a declarative API.
 */
export declare function createRouter(options?: RouterOptions): CreateRouterResult;

export interface CreateAppConfig extends RouterOptions {
    mount: string | HTMLElement;
}

export interface CreateAppResult {
    router: ChainPageRouter;
    Link: (props: { to: string; params?: object } & Record<string, any>, ...children: Array<ChainElement | string | ChainState<string> | Array<ChainElement | string | ChainState<string>>>) => ChainElement;
    destroy: () => void;
}

/**
 * @param {object} [config={}] - Application configuration options.
 * @param {string|HTMLElement} config.mount - The CSS selector or HTMLElement to mount the application to.
 * @param {Array<object>} [config.routes=[]] - An array of route configurations for the application.
 * @param {'history'|'hash'|'memory'} [config.mode] - The navigation mode for the router.
 * @param {boolean} [config.persist] - Whether to persist router history.
 * @param {string} [config.initialPath] - The initial path for the router.
 * @returns {{router: ChainPageRouter, Link: function(object, ...any[]): ChainElement, destroy: function(): void}} An object containing the router instance, Link component, and a destroy function.
 * @description Creates and initializes a ChainUI application with routing.
 * @throws {Error} Throws an error if no 'mount' selector is provided in the configuration.
 */
export declare function createApp(config: CreateAppConfig): CreateAppResult;

export interface ChainUI {
    h: typeof h;
    createState: typeof createState;
    createComponent: typeof createComponent;
    createApp: typeof createApp;
    createRouter: typeof createRouter;
    map: typeof map;
    mount: typeof mount;
    render: typeof render;
}

export default ChainUI;
