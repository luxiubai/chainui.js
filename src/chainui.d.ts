/**
 * @license MIT
 * Copyright (c) 2025-present
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// Interfaces and Enums
export interface ChainState<T> {
    value: T;
    update(updater: ((value: T) => T) | T): void;
    subscribe(callback: (value: T) => void): () => void;
    toString(): string;
    map<U>(mapperFn: (value: T) => U): ChainState<U>;
}

export enum OperationType {
    CREATE_ELEMENT = 'CREATE_ELEMENT',
    CREATE_TEXT_NODE = 'CREATE_TEXT_NODE',
    SET_TEXT_CONTENT = 'SET_TEXT_CONTENT',
    APPEND_CHILD = 'APPEND_CHILD',
    REMOVE_CHILD = 'REMOVE_CHILD',
    INSERT_BEFORE = 'INSERT_BEFORE',
    SET_ATTRIBUTE = 'SET_ATTRIBUTE',
    REMOVE_ATTRIBUTE = 'REMOVE_ATTRIBUTE',
    SET_STYLE = 'SET_STYLE',
    ADD_CLASS = 'ADD_CLASS',
    REMOVE_CLASS = 'REMOVE_CLASS',
    ADD_EVENT_LISTENER = 'ADD_EVENT_LISTENER',
    MOUNT = 'MOUNT',
    BIND_STATE = 'BIND_STATE',
    BIND_ATTRIBUTE = 'BIND_ATTRIBUTE',
    BIND_LIST = 'BIND_LIST',
    UPDATE_NODE = 'UPDATE_NODE',
    ROUTE_CHANGE = 'ROUTE_CHANGE',
    ROUTE_MATCH = 'ROUTE_MATCH',
    INIT_ROUTER = 'INIT_ROUTER'
}

// Classes
export class OperationStream {
    constructor();
    add(operation: any): void;
    getOperations(): any[];
    clear(): void;
    serialize(): string;
    static deserialize(json: string): OperationStream;
}

export class ChainElement {
    constructor(tagName?: string);
    nodeId: string;
    stream: OperationStream;
    children: ChainElement[];
    eventHandlers: { actionId: string; handler: (event: Event) => void }[];
    tagName?: string;
    _bind(value: any, updateFn: (val: any, updateStream: OperationStream) => void): this;
    
    // Unified set method
    set(name: string, value?: any, type?: 'attr' | 'style' | 'class'): this;
    set(config: {
        attr?: Record<string, any>;
        style?: Record<string, string | number>;
        class?: string | string[] | Record<string, boolean>;
    }): this;
    
    text(content: string | number | ChainState<any>): this;
    on(eventType: string, handler: (event: Event) => void): this;
    child(...children: (ChainElement | string | number | ChainState<any>)[]): this;
    key(value: string | number): this;
    mount(selector: string): void;
    when(state: ChainState<boolean>, trueFactory: () => ChainElement, falseFactory?: () => ChainElement, options?: { keepAlive?: boolean }): this;
}

export class ChainRuntime {
    constructor();
    nodeMap: Map<string, Node>;
    stateSubscriptions: Map<string, () => void>;
    eventDelegator: EventDelegator;
    batchQueue: any[];
    isBatchingScheduled: boolean;
    execute(operations: any[], immediate?: boolean): void;
    scheduleBatchExecution(): void;
    applyOperation(op: any): void;
    reconcileList(parentNodeId: string, newItems: any[], factory: (item: any, index: number) => ChainElement): void;
    destroy(): void;
    cleanupNodeTree(node: Node): void;
}

export class EventDelegator {
    constructor(runtime: ChainRuntime);
    runtime: ChainRuntime;
    delegatedEvents: Set<string>;
    handlerMap: Map<string, (event: Event) => void>;
    registerHandlers(handlers: { actionId: string; handler: (event: Event) => void }[]): void;
    delegate(eventType: string): void;
    handleEvent(e: Event): void;
    destroy(): void;
    clearHandlersForNode(node: Node): void;
}

export class HistoryController {
    constructor();
    listeners: Set<Function>;
    listen(callback: Function): () => void;
    notify(location: { path: string; state: object }): void;
    navigate(path: string, state: object, replace: boolean): void;
    getLocation(): { path: string; state: object };
    goBack(): void;
}

export class BrowserHistory extends HistoryController {
    constructor();
    navigate(path: string, state?: object, replace?: boolean): void;
    getLocation(): { path: string; state: object };
    goBack(): void;
}

export class ServerHistory extends HistoryController {
    constructor(initialPath?: string);
    stack: Array<{ path: string; state: object }>;
    index: number;
    navigate(path: string, state?: object, replace?: boolean): void;
    getLocation(): { path: string; state: object };
    goBack(): void;
}

export class ChainPageRouter {
    constructor(options?: { history?: HistoryController; normalizePath?: (path: string) => string; initialPath?: string });
    pages: Map<string, { 
        factory: Function; 
        options: { 
            keepAlive: boolean; 
            beforeEnter?: (toParams: object, fromState: { id: string | null; params: object }) => boolean;
            onLeave?: (fromParams: object, toState: { id: string | null; params: object }) => void;
        };
        regex: RegExp;
        paramNames: string[];
    }>;
    currentPage: ChainState<{ id: string | null; params: object }>;
    _runtimeCache: WeakMap<Function, { runtime: ChainRuntime; params: object }>;
    history: HistoryController;
    normalizePath: (path: string) => string;
    root: Element;
    init(rootContainer: Element): void;
    register(path: string, componentFactory: (params: object) => ChainElement, options?: { keepAlive?: boolean; beforeEnter?: (toParams: object, fromState: { id: string | null; params: object }) => boolean; onLeave?: (fromParams: object, toState: { id: string | null; params: object }) => void }): this;
    navigate(path: string, params?: object, replace?: boolean): this;
    goBack(): void;
    closePage(pageId: string): void;
    getCurrentPage(): { id: string | null; params: object };
    _initEventDelegation(): void;
    _matchRoute(path: string): { route: any; resolvedParams: object; path: string };
    _handleLocationChange(location: { path: string; state: object }): void;
    _renderBlank(): void;
    _renderFallback(): void;
    _closePage(pageId: string): void;
}

// Functions
export function valueToString(value: any): string;
export function generateId(prefix: string): string;
export function createState<T>(initialValue: T): ChainState<T>;
export function h(tagName: string): ChainElement;
export function mount(component: ChainElement, selector: string, ssrData?: { stream?: string; state?: object }): ChainRuntime;
export function renderToStream(componentFactory: () => ChainElement): { stream: string; state: object; rootId: string };
export function map(stateArray: ChainState<any[]>, factory: (item: any, index: number) => ChainElement): ChainElement;
export function createComponent(name: string, factory: (...args: any[]) => ChainElement): (...args: any[]) => ChainElement;
/**
 * Creates and initializes a router instance with a declarative API.
 * @param {object} options - The router configuration.
 * @param {Array<{path: string, component: function, options?: object}>} options.routes - An array of route objects.
 * @param {HistoryController} [options.history] - An optional history controller instance.
 * @param {function(string): string} [options.normalizePath] - A function to normalize paths before matching.
 * @returns {{router: ChainPageRouter, Link: function, PageView: ChainElement}} An object containing the router instance, Link component, and PageView element.
 */
export function createRouter(options?: { 
    routes?: Array<{ path: string; component: (params: object) => ChainElement; options?: { keepAlive?: boolean; beforeEnter?: (toParams: object, fromState: { id: string | null; params: object }) => boolean; onLeave?: (fromParams: object, toState: { id: string | null; params: object }) => void } }>; 
    history?: HistoryController; 
    normalizePath?: (path: string) => string;
    basePath?: string; // 新增 basePath 选项
}): { router: ChainPageRouter; Link: (props: { to: string; params?: object; [key: string]: any }, ...children: (ChainElement | string | number | ChainState<any>)[]) => ChainElement; PageView: ChainElement };

// Define the shape of the default export
declare const ChainUI: {
    h: typeof h;
    createState: typeof createState;
    createComponent: typeof createComponent;
    map: typeof map;
    createRouter: typeof createRouter;
    mount: typeof mount;
    renderToStream: typeof renderToStream;
};

// Export the default object
export default ChainUI;
