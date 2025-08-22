/*!
 * @file chainui.js
 * @description A lightweight, reactive UI library for modern web apps.
 * @project https://github.com/luxiubai/chainui.js
 * @copyright Copyright (c) 2025-present ChainUI Team
 * @license MIT Licensed (https://opensource.org/licenses/MIT).
 * SPDX-License-Identifier: MIT
 */

/**
 * @enum {string}
 * @description Defines all possible DOM operation types in ChainUI.
 */
export const OperationType = {
    CREATE_ELEMENT: 'CREATE_ELEMENT',
    CREATE_TEXT_NODE: 'CREATE_TEXT_NODE',
    SET_TEXT_CONTENT: 'SET_TEXT_CONTENT',
    APPEND_CHILD: 'APPEND_CHILD',
    REMOVE_CHILD: 'REMOVE_CHILD',
    INSERT_BEFORE: 'INSERT_BEFORE',
    SET_ATTRIBUTE: 'SET_ATTRIBUTE',
    REMOVE_ATTRIBUTE: 'REMOVE_ATTRIBUTE',
    SET_STYLE: 'SET_STYLE',
    ADD_CLASS: 'ADD_CLASS',
    REMOVE_CLASS: 'REMOVE_CLASS',
    ADD_EVENT_LISTENER: 'ADD_EVENT_LISTENER',
    MOUNT: 'MOUNT',
    BIND_STATE: 'BIND_STATE',
    BIND_ATTRIBUTE: 'BIND_ATTRIBUTE',
    BIND_LIST: 'BIND_LIST',
    UPDATE_NODE: 'UPDATE_NODE',
    ROUTE_CHANGE: 'ROUTE_CHANGE',
    ROUTE_MATCH: 'ROUTE_MATCH',
    INIT_ROUTER: 'INIT_ROUTER',
};

/**
 * @type {number}
 * @description Global ID counter used to generate unique node and state IDs.
 */
let globalIdCounter = 0;

/**
 * @returns {number} The current value of the global ID counter.
 */
export const getGlobalIdCounter = () => globalIdCounter;

/**
 * @returns {void}
 * @description Resets the global ID counter to 0.
 */
export const resetGlobalIdCounter = () => { globalIdCounter = 0; };

/**
 * @param {string} prefix - The prefix for the ID.
 * @returns {string} The generated unique ID.
 */
export const generateId = (prefix) => `${prefix}-${globalIdCounter++}`;

/**
 * @param {any} value - Any type of value.
 * @returns {string} The string representation of the value. Objects will attempt JSON.stringify.
 */
export const valueToString = (value) => {
    if (value === null || value === undefined) return String(value);
    if (typeof value === 'object') {
        try { return JSON.stringify(value); } catch (e) { return String(value); }
    }
    return String(value);
};

/**
 * @type {Map<string, import('./chainui').ChainRuntime>}
 * @description Tracks all mounted runtime instances for cleanup on remount.
 */
const _mountedRuntimes = new Map();

/**
 * @typedef {object} ChainState
 * @property {*} value - The current value of the state.
 * @property {function(function(*): *|*): void} update - Updates the value of the state.
 * @property {function(function(*): void): function(): void} subscribe - Subscribes to state changes.
 * @property {function(): string} toString - Returns the string representation of the state's value.
 * @property {function(function(*): *): ChainState} map - Creates a new derived state.
 * @property {boolean} [isMapped] - Indicates if this state is a mapped state.
 */

/**
 * @template T
 * @param {T} initialValue - The initial value of the state.
 * @returns {ChainState<T>} A reactive state object.
 * @description Creates and manages a reactive state object.
 */
export function createState(initialValue) {
    let currentValue = initialValue;
    /**
     * @private
     * @type {Set<function(T): void>}
     * @description A set of subscriber functions to be called when the state changes.
     */
    const subscribers = new Set();

    return {
        get value() { return currentValue; },
        set value(newValue) {
            if (Object.is(currentValue, newValue)) return;
            currentValue = newValue;
            subscribers.forEach(sub => sub(currentValue));
        },
        /**
         * @param {function(T): T|T} updater - A function to update the state's value, or a new value.
         * @returns {void}
         */
        update(updater) {
            this.value = typeof updater === 'function' ? updater(this.value) : updater;
        },
        /**
         * @param {function(T): void} callback - The subscription callback function.
         * @returns {function(): void} A function to unsubscribe.
         */
        subscribe(callback) {
            subscribers.add(callback);
            callback(currentValue);
            return () => subscribers.delete(callback);
        },
        /**
         * @returns {string} The string representation of the state's value.
         */
        toString() { return valueToString(currentValue); },
        /**
         * @template U
         * @param {function(T): U} mapperFn - A mapping function that transforms the current state value into a new state value.
         * @returns {ChainState<U>} A new derived state.
         */
        map(mapperFn) {
            const mappedState = createState(mapperFn(currentValue));
            this.subscribe(newValue => mappedState.update(mapperFn(newValue)));
            mappedState.isMapped = true;
            return mappedState;
        }
    };
}

/**
 * @class OperationStream
 * @description Manages a queue of operations for batch processing DOM updates.
 */
export class OperationStream {
    /**
     * @constructor
     */
    constructor() {
        /**
         * @type {Array<object>}
         * @description The array storing operations.
         */
        this.operations = [];
    }

    /**
     * @param {object} operation - The operation to add to the stream.
     * @param {OperationType} operation.type - The type of operation.
     * @param {string} operation.nodeId - The ID of the target node.
     * @param {string} [operation.tagName] - For CREATE_ELEMENT, the tag name of the element.
     * @param {string} [operation.content] - For CREATE_TEXT_NODE or SET_TEXT_CONTENT, the text content.
     * @param {string} [operation.parentId] - For APPEND_CHILD or REMOVE_CHILD, the ID of the parent node.
     * @param {string} [operation.childId] - For APPEND_CHILD or REMOVE_CHILD, the ID of the child node.
     * @param {string} [operation.name] - For SET_ATTRIBUTE or REMOVE_ATTRIBUTE, the attribute name.
     * @param {*} [operation.value] - For SET_ATTRIBUTE or SET_STYLE, the attribute or style value.
     * @param {string} [operation.property] - For SET_STYLE, the style property name.
     * @param {string} [operation.className] - For ADD_CLASS or REMOVE_CLASS, the CSS class name.
     * @param {string} [operation.eventType] - For ADD_EVENT_LISTENER, the event type.
     * @param {string} [operation.actionId] - For ADD_EVENT_LISTENER, the event action ID.
     * @param {function(Event): void} [operation.handler] - For ADD_EVENT_LISTENER, the event handler function.
     * @param {string} [operation.selector] - For MOUNT, the CSS selector of the mount target.
     * @param {ChainState<any>} [operation.state] - For BIND_STATE or BIND_LIST, the bound state object.
     * @param {string} [operation.stateId] - For BIND_STATE, the ID of the state.
     * @param {function(*, OperationStream): void} [operation.updateFn] - For BIND_STATE, the state update function.
     * @param {function(object, number): ChainElement} [operation.factory] - For BIND_LIST, the factory function for list items.
     * @param {string} [operation.anchorId] - For INSERT_BEFORE, the ID of the anchor node.
     * @param {object} [operation.router] - For INIT_ROUTER, the router instance or configuration.
     * @returns {void}
     * @description Adds an operation to the stream and optimizes consecutive operations on the same node.
     */
    add(operation) {
        const lastOp = this.operations[this.operations.length - 1];
        if (lastOp && operation.nodeId === lastOp.nodeId) {
            if (operation.type === OperationType.SET_ATTRIBUTE &&
                lastOp.type === OperationType.SET_ATTRIBUTE &&
                operation.name === lastOp.name) {
                lastOp.value = operation.value;
                return;
            }
            if (operation.type === OperationType.SET_STYLE &&
                lastOp.type === OperationType.SET_STYLE &&
                operation.property === lastOp.property) {
                lastOp.value = operation.value;
                return;
            }
        }
        this.operations.push(operation);
    }

    /**
     * @returns {Array<object>} A copy of the current operation queue.
     */
    getOperations() { return this.operations; }

    /**
     * @returns {void}
     * @description Clears the operation queue.
     */
    clear() { this.operations = []; }

    /**
     * @returns {string} The JSON string representation of the operation stream, for SSR.
     */
    serialize() {
        return JSON.stringify(this.operations);
    }

    /**
     * @static
     * @param {string} json - The JSON string of the operation stream.
     * @returns {OperationStream} An OperationStream instance deserialized from the JSON string.
     */
    static deserialize(json) {
        const stream = new OperationStream();
        stream.operations = JSON.parse(json);
        return stream;
    }
}

/**
 * @class ChainElement
 * @description Represents a DOM element that can be built using a chainable method call.
 */
export class ChainElement {
    /**
     * @param {string} [tagName] - The HTML tag name of the element. If not provided, this ChainElement instance might be a placeholder for internal logic.
     */
    constructor(tagName) {
        /**
         * @type {string}
         * @description The unique node ID of the element.
         */
        this.nodeId = generateId('node');
        /**
         * @type {OperationStream}
         * @description The operation stream associated with this element, used to record DOM operations.
         */
        this.stream = new OperationStream();
        /**
         * @type {Array<ChainElement|string|ChainState<any>>}
         * @description An array of child elements for this element.
         */
        this.children = [];
        /**
         * @type {Array<{actionId: string, eventType: string, handler: function(Event): void}>}
         * @description All event handlers for this element and its children.
         */
        this.eventHandlers = [];

        if (tagName) {
            this.tagName = tagName;
            this.stream.add({ type: OperationType.CREATE_ELEMENT, nodeId: this.nodeId, tagName });
        }
    }

    /**
     * @private
     * @param {ChainState<any>|*} value - The value to bind, which can be a ChainState instance or a regular value.
     * @param {function(*, OperationStream): void} updateFn - The function to execute when the value updates.
     * @returns {ChainElement} The current ChainElement instance, supporting chainable calls.
     * @description Internal method to bind a reactive state to an element's attribute or content.
     */
    _bind(value, updateFn) {
        if (value && typeof value.subscribe === 'function') {
            const stateId = generateId('state');
            updateFn(value.value, this.stream);
            this.stream.add({ type: OperationType.BIND_STATE, nodeId: this.nodeId, stateId, updateFn, state: value });
        } else {
            updateFn(value, this.stream);
        }
        return this;
    }

    /**
     * @private
     * @param {string} name - The attribute name.
     * @param {ChainState<any>|*} value - The attribute value, which can be a ChainState instance or a regular value.
     * @returns {void}
     * @description Internal method to set an element's attribute.
     */
    _setAttr(name, value) {
        const nodeId = this.nodeId;
        if (value && typeof value.subscribe === 'function' && !value.isMapped) {
            const initialValue = valueToString(value.value);
            this.stream.add({ type: OperationType.SET_ATTRIBUTE, nodeId, name, value: initialValue });
            this.stream.add({ type: OperationType.BIND_ATTRIBUTE, nodeId: this.nodeId, name, state: value, stateId: generateId('attr_state') });
            return;
        }

        if (value == null) {
            this.stream.add({ type: OperationType.REMOVE_ATTRIBUTE, nodeId, name });
            return;
        }

        this._bind(value, (val, updateStream) => {
            updateStream.add({ type: OperationType.SET_ATTRIBUTE, nodeId, name, value: val });
        });
    }

    /**
     * @private
     * @param {string} property - The CSS style property name (e.g., 'color', 'fontSize').
     * @param {ChainState<string>|string} value - The style value, which can be a ChainState instance or a string.
     * @returns {void}
     * @description Internal method to set an element's style property.
     */
    _setStyle(property, value) {
        const nodeId = this.nodeId;
        this._bind(value, (val, updateStream) => {
            updateStream.add({ type: OperationType.SET_STYLE, nodeId, property, value: val });
        });
    }

    /**
     * @private
     * @param {string} className - The CSS class name.
     * @param {boolean|ChainState<boolean>} shouldAdd - Indicates whether to add the class, can be a boolean or a ChainState instance.
     * @returns {void}
     * @description Internal method to add or remove a CSS class from an element.
     */
    _setClass(className, shouldAdd) {
        const nodeId = this.nodeId;
        if (shouldAdd === null || shouldAdd === false) {
            this.stream.add({ type: OperationType.REMOVE_CLASS, nodeId, className });
        } else {
            const classes = className.split(' ').filter(Boolean);
            for (const singleClassName of classes) {
                this.stream.add({ type: OperationType.ADD_CLASS, nodeId, className: singleClassName });
            }
        }
    }

    /**
     * @param {string|object} name - The attribute name, style property name, class name, or an object containing attr/style/class configurations.
     * @param {*|ChainState<any>} [value] - The corresponding value, which can be a regular value or a ChainState instance.
     * @param {'attr'|'style'|'class'} [type] - Optional parameter to explicitly specify the type of setting (attribute, style, or class).
     * @returns {ChainElement} The current ChainElement instance, supporting chainable calls.
     * @description Sets an element's attributes, styles, or classes in a unified manner.
     * @example
     * h('div').set('id', 'myDiv');
     * h('div').set('color', 'red', 'style');
     * h('div').set('active', true, 'class');
     * h('div').set({ attr: { id: 'myDiv' }, style: { color: 'red' }, class: { active: true } });
     */
    set(name, value, type) {
        if (typeof name === 'object' && name !== null && arguments.length === 1) {
            const config = name;
            if (config.attr) {
                for (const [k, v] of Object.entries(config.attr)) {
                    this._setAttr(k, v);
                }
            }
            if (config.style) {
                for (const [k, v] of Object.entries(config.style)) {
                    this._setStyle(k, v);
                }
            }
            if (config.class) {
                if (typeof config.class === 'string') {
                    this._setClass(config.class, true);
                } else if (Array.isArray(config.class)) {
                    for (const c of config.class) {
                        this._setClass(c, true);
                    }
                } else if (typeof config.class === 'object') {
                    for (const [k, v] of Object.entries(config.class)) {
                        this._setClass(k, v);
                    }
                }
            }
            return this;
        }

        if (typeof name === 'string') {
            if (!type) {
                const isStyle = typeof document !== 'undefined' && (name in document.documentElement.style);
                type = (name.startsWith('data-') || name.includes('-')) ? 'attr' : isStyle ? 'style' : 'attr';
            }
            
            switch (type) {
                case 'style': this._setStyle(name, value); break;
                case 'class': this._setClass(name, value); break;
                case 'attr': 
                default: this._setAttr(name, value); break;
            }
        }
        return this;
    }

    /**
     * @param {string} eventType - The event type (e.g., 'click', 'input').
     * @param {function(Event): void} handler - The event handler function.
     * @returns {ChainElement} The current ChainElement instance, supporting chainable calls.
     * @description Adds an event listener to the element.
     */
    on(eventType, handler) {
        const actionId = generateId('action');
        this.stream.add({ type: OperationType.ADD_EVENT_LISTENER, nodeId: this.nodeId, eventType, actionId, handler });
        
        if (typeof window !== 'undefined') {
            let runtime = null;
            
            if (arguments.length > 2 && arguments[2] && typeof arguments[2] === 'object' && arguments[2].eventDelegator) {
                runtime = arguments[2];
            }
            else if (typeof window.__CHAIN_ACTIVE_RUNTIME__ !== 'undefined') {
                runtime = window.__CHAIN_ACTIVE_RUNTIME__;
            }
            
            if (runtime) {
                runtime.eventDelegator.registerHandlers([{ actionId, handler }]);
                runtime.eventDelegator.delegate(eventType);
            }
        }
        
        this.eventHandlers.push({ actionId, eventType, handler });
        return this;
    }

    /**
     * @private
     * @param {string|ChainState<string>} content - The text content, which can be a string or a ChainState instance.
     * @returns {void}
     * @description Internal method to create and append a text child node.
     */
    _createTextChild(content) {
        const textNodeId = generateId('text');
        const isState = content && typeof content.subscribe === 'function';
        const initialContent = isState ? content.value : content;
        const processedContent = valueToString(initialContent);

        this.stream.add({ type: OperationType.CREATE_TEXT_NODE, nodeId: textNodeId, content: processedContent });
        this.stream.add({ type: OperationType.APPEND_CHILD, parentId: this.nodeId, childId: textNodeId });

        if (isState) {
            this.stream.add({
                type: OperationType.BIND_STATE,
                nodeId: this.nodeId,
                stateId: generateId('state'),
                updateFn: (val, updateStream) => {
                    updateStream.add({ type: OperationType.SET_TEXT_CONTENT, nodeId: textNodeId, content: valueToString(val) });
                },
                state: content
            });
        }
    }

    /**
     * @param {...(ChainElement|string|ChainState<string>|Array<ChainElement|string|ChainState<string>>)} children - One or more child elements, which can be ChainElement instances, strings, ChainState instances, or arrays thereof.
     * @returns {ChainElement} The current ChainElement instance, supporting chainable calls.
     * @description Appends one or more child elements to the current element.
     */
    child(...children) {
        for (const childNode of children.flat()) {
            if (childNode instanceof ChainElement) {
                this.children.push(childNode);
                this.stream.operations.push(...childNode.stream.getOperations());
                this.stream.add({ type: OperationType.APPEND_CHILD, parentId: this.nodeId, childId: childNode.nodeId });
                this.eventHandlers.push(...childNode.eventHandlers);
            } else {
                this._createTextChild(childNode);
            }
        }
        return this;
    }

    /**
     * @param {string} selector - The CSS selector of the DOM element to which the component will be mounted.
     * @returns {void}
     * @description Mounts the current element to the specified DOM selector. This method is typically called at the end of a ChainElement chain.
     */
    mount(selector) {
        this.stream.add({ type: OperationType.MOUNT, nodeId: this.nodeId, selector });
    }

    /**
     * @param {ChainState<boolean>} state - A boolean reactive state to control conditional rendering.
     * @param {function(): ChainElement} trueFactory - A factory function to create the component when the state is true.
     * @param {function(): ChainElement} [falseFactory] - An optional factory function to create the component when the state is false.
     * @param {object} [options] - Rendering options.
     * @param {boolean} [options.keepAlive=false] - If true, both components will be created and toggled visible/hidden based on state, instead of destroyed/recreated.
     * @returns {ChainElement} The current ChainElement instance, supporting chainable calls.
     * @description Conditionally renders one of two components based on the value of a reactive state.
     */
    when(state, trueFactory, falseFactory, options = {}) {
        const { keepAlive = false } = options;
        
        if (keepAlive) {
            const trueComponent = trueFactory();
            const falseComponent = falseFactory ? falseFactory() : null;
            
            if (trueComponent) {
                trueComponent.set('display', state.map(v => v ? 'block' : 'none'), 'style');
                this.child(trueComponent);
            }
            
            if (falseComponent) {
                falseComponent.set('display', state.map(v => v ? 'none' : 'block'), 'style');
                this.child(falseComponent);
            }
        } else {
            const placeholder = new ChainElement('div').set('data-chain-placeholder', 'true', 'attr');
            this.child(placeholder);
    
            /**
             * @param {boolean} value - The current value of the state.
             * @this {ChainRuntime}
             * @returns {void}
             */
            const updateFn = function(value) {
                const parentNode = this.nodeMap?.get(placeholder.nodeId);
                if (!parentNode) return;
                
                const oldChildId = parentNode.dataset.childNodeId;
                if (oldChildId) {
                    const oldChildNode = this.nodeMap.get(oldChildId);
                    if (oldChildNode) {
                        this.cleanupNodeTree(oldChildNode);
                        if (parentNode.contains(oldChildNode)) {
                            parentNode.removeChild(oldChildNode);
                        }
                    }
                    this.nodeMap.delete(oldChildId);
                    delete parentNode.dataset.childNodeId;
                }

                const factoryToUse = value ? trueFactory : falseFactory;
                if (factoryToUse) {
                    const newComponent = factoryToUse();
                    if (newComponent) {
                        const runtime = this;
                        runtime.executeOperations(newComponent.stream);
                        const newNode = runtime.nodeMap.get(newComponent.nodeId);
                        if (newNode) {
                            parentNode.appendChild(newNode);
                            parentNode.dataset.childNodeId = newComponent.nodeId;
                            runtime.bindOperations(newComponent.stream);
                            
                            if (newNode instanceof HTMLInputElement || newNode instanceof HTMLTextAreaElement) {
                                setTimeout(() => newNode.focus(), 10);
                            }
                        }
                    }
                }
            };
    
            this.stream.add({
                type: OperationType.BIND_STATE,
                nodeId: placeholder.nodeId,
                stateId: generateId('when'),
                updateFn,
                state: state
            });
        }
        return this;
    }
    
    /**
     * @returns {{html: string, eventHandlers: Array<{actionId: string, eventType: string, handler: function(Event): void}>}} An object containing the HTML string and event handler data, for SSR.
     * @description Converts the current element and its children into an HTML string, for Server-Side Rendering (SSR).
     */
    toHtml() {
        /**
         * @private
         * @param {*} text - The text to escape.
         * @returns {string} The escaped HTML string.
         */
        const escapeHtml = (text) => {
            if (typeof text !== 'string') return String(text);
            return text
                .replace(/&/g, '&')
                .replace(/</g, '<')
                .replace(/>/g, '>')
                .replace(/"/g, '"')
                .replace(/'/g, '&#039;');
        };
        
        /**
         * @type {Array<{actionId: string, eventType: string, handler: function(Event): void}>}
         * @description Array to collect event handlers.
         */
        const eventHandlers = [];
        /**
         * @type {Set<string>}
         * @description Set to track seen action IDs to avoid duplicates.
         */
        const seenActionIds = new Set();
        
        /**
         * @private
         * @param {ChainElement} element - The element to collect event handlers from.
         * @returns {void}
         */
        const collectEventHandlers = (element) => {
            if (element.eventHandlers?.length > 0) {
                element.eventHandlers.forEach(handler => {
                    if (!seenActionIds.has(handler.actionId)) {
                        eventHandlers.push(handler);
                        seenActionIds.add(handler.actionId);
                    }
                });
            }
            if (element.children) {
                element.children.forEach(child => {
                    if (child instanceof ChainElement) {
                        collectEventHandlers(child);
                    }
                });
            }
        };
        collectEventHandlers(this);
        
        /**
         * @private
         * @param {ChainElement|string} element - The element or text to generate HTML for.
         * @returns {string} The generated HTML string.
         */
        const generateHtml = (element) => {
            if (element instanceof ChainElement) {
                if (!element.tagName) return '';
                
                let html = `<${element.tagName}`;
                const ops = element.stream.getOperations();
                const attributeOps = ops.filter(op => op.type === OperationType.SET_ATTRIBUTE && op.nodeId === element.nodeId);
                const styleOps = ops.filter(op => op.type === OperationType.SET_STYLE && op.nodeId === element.nodeId);
                const eventOps = ops.filter(op => op.type === OperationType.ADD_EVENT_LISTENER && op.nodeId === element.nodeId);
                
                for (const op of attributeOps) {
                    html += ` ${op.name}="${escapeHtml(String(op.value))}"`;
                }
                
                if (styleOps.length > 0) {
                    let styleStr = '';
                    for (const op of styleOps) {
                        styleStr += `${op.property}: ${escapeHtml(String(op.value))}; `;
                    }
                    html += ` style="${escapeHtml(styleStr.trim())}"`;
                }
                
                for (const op of eventOps) {
                    html += ` data-chain-action="${op.actionId}" data-chain-event="${op.eventType}"`;
                }
                
                html += '>';
                if (element.children) {
                    for (const child of element.children) {
                        html += generateHtml(child);
                    }
                }
                
                const textOps = ops.filter(op => 
                    op.type === OperationType.CREATE_TEXT_NODE && 
                    ops.some(parentOp => parentOp.type === OperationType.APPEND_CHILD && 
                        parentOp.parentId === element.nodeId && parentOp.childId === op.nodeId)
                );
                
                for (const op of textOps) {
                    html += escapeHtml(op.content);
                }
                
                html += `</${element.tagName}>`;
                return html;
            } else {
                return escapeHtml(String(element));
            }
        };
        
        return { html: generateHtml(this), eventHandlers };
    }
}

/**
 * @class ChainRuntime
 * @description Client-side runtime responsible for executing operation streams to manipulate the real DOM.
 */
export class ChainRuntime {
    /**
     * @constructor
     */
    constructor() {
        /**
         * @type {Map<string, HTMLElement|Text>}
         * @description Stores a mapping from node IDs to actual DOM nodes.
         */
        this.nodeMap = new Map();
        /**
         * @type {Map<string, function(): void>}
         * @description Stores a mapping from state IDs to their unsubscribe functions.
         */
        this.stateSubscriptions = new Map();
        /**
         * @type {Map<string, Array<function(): void>>}
         * @description Tracks state subscriptions per node for cleanup when a node is removed.
         */
        this.nodeSubscriptions = new Map();
        /**
         * @type {EventDelegator}
         * @description The EventDelegator instance for efficient event handling.
         */
        this.eventDelegator = new EventDelegator(this);
        /**
         * @type {Array<object>}
         * @description The batch processing queue, storing operations to be executed.
         */
        this.batchQueue = [];
        /**
         * @type {boolean}
         * @description Indicates whether batch processing has been scheduled.
         */
        this.isBatchingScheduled = false;
        /**
         * @type {number|null}
         * @description The ID of the requestAnimationFrame, used to cancel animation frames.
         */
        this.animationFrameId = null;
    }

    /**
     * @param {Array<object>} operations - The array of operations to execute.
     * @param {boolean} [immediate=false] - If true, operations are executed immediately; otherwise, they are added to the batch queue.
     * @returns {void}
     * @description Executes a queue of operations.
     */
    execute(operations, immediate = false) {
        if (immediate) {
            operations.forEach(op => this.applyOperation(op));
        } else {
            this.batchQueue.push(...operations);
            this.scheduleBatchExecution();
        }
    }

    /**
     * @param {OperationStream} stream - The OperationStream instance.
     * @param {boolean} [immediate=false] - If true, operations are executed immediately; otherwise, they are added to the batch queue.
     * @returns {void}
     * @description Executes operations from an OperationStream instance.
     */
    executeOperations(stream, immediate = false) {
        if (stream && typeof stream.getOperations === 'function') {
            this.execute(stream.getOperations(), immediate);
        }
    }

    /**
     * @param {OperationStream} stream - The OperationStream instance.
     * @returns {void}
     * @description Binds state and list operations from an OperationStream instance.
     */
    bindOperations(stream) {
        if (stream && typeof stream.getOperations === 'function') {
            stream.getOperations()
                .filter(op => op.type === OperationType.BIND_STATE || op.type === OperationType.BIND_LIST)
                .forEach(op => this.applyOperation(op));
        }
    }

    /**
     * @returns {void}
     * @description Schedules batch execution using requestAnimationFrame for optimized performance.
     */
    scheduleBatchExecution() {
        if (!this.isBatchingScheduled) {
            this.isBatchingScheduled = true;
            this.animationFrameId = requestAnimationFrame(() => {
                const queue = this.batchQueue;
                this.batchQueue = [];
                queue.forEach(op => this.applyOperation(op));
                this.isBatchingScheduled = false;
                this.animationFrameId = null;
            });
        }
    }

    /**
     * @param {object} op - The single operation to apply.
     * @returns {void}
     * @description Applies a single operation to the DOM.
     */
    applyOperation(op) {
        const node = this.nodeMap.get(op.nodeId);
        switch (op.type) {
            case OperationType.CREATE_ELEMENT: {
                const el = document.createElement(op.tagName);
                el.dataset.chainId = op.nodeId;
                this.nodeMap.set(op.nodeId, el);
                break;
            }
            case OperationType.CREATE_TEXT_NODE: {
                this.nodeMap.set(op.nodeId, document.createTextNode(op.content));
                break;
            }
            case OperationType.SET_TEXT_CONTENT: {
                if (node) node.textContent = op.content;
                break;
            }
            case OperationType.APPEND_CHILD: {
                const parent = this.nodeMap.get(op.parentId);
                const child = this.nodeMap.get(op.childId);
                if (parent && child) parent.appendChild(child);
                break;
            }
            case OperationType.SET_ATTRIBUTE: {
                if (node) {
                    if (op.name === 'value' && 'value' in node) {
                        /** @type {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement} */ (node).value = op.value;
                    } else if (op.name === 'disabled' && 'disabled' in node) {
                        /** @type {HTMLInputElement|HTMLTextAreaElement|HTMLButtonElement} */ (node).disabled = Boolean(op.value);
                    } else {
                        node.setAttribute(op.name, op.value);
                    }
                }
                break;
            }
            case OperationType.SET_STYLE: {
                if (node instanceof HTMLElement) node.style[op.property] = op.value;
                break;
            }
            case OperationType.ADD_CLASS: {
                if (node instanceof HTMLElement) node.classList.add(op.className);
                break;
            }
            case OperationType.REMOVE_CLASS: {
                if (node instanceof HTMLElement) node.classList.remove(op.className);
                break;
            }
            case OperationType.ADD_EVENT_LISTENER: {
                if (node instanceof HTMLElement) {
                    node.dataset.chainAction = op.actionId;
                    this.eventDelegator.delegate(op.eventType);
                }
                break;
            }
            case OperationType.BIND_STATE: {
                if (op.state && typeof op.state.subscribe === 'function') {
                    const runtime = this;
                    const unsubscribe = op.state.subscribe(newValue => {
                        if (op.updateFn.length === 2) {
                            const updateStream = new OperationStream();
                            op.updateFn.call(runtime, newValue, updateStream);
                            runtime.execute(updateStream.getOperations());
                        } else {
                            op.updateFn.call(runtime, newValue);
                        }
                    });
                    this.stateSubscriptions.set(op.stateId, unsubscribe);
                    if (!this.nodeSubscriptions.has(op.nodeId)) {
                        this.nodeSubscriptions.set(op.nodeId, []);
                    }
                    this.nodeSubscriptions.get(op.nodeId).push(unsubscribe);
                }
                break;
            }
            case OperationType.BIND_ATTRIBUTE: {
                if (node instanceof HTMLElement && op.state && typeof op.state.subscribe === 'function') {
                    const unsubscribe = op.state.subscribe(newValue => {
                        if (op.name === 'disabled' && (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLButtonElement)) {
                            node.disabled = !!newValue;
                        } else {
                            node.setAttribute(op.name, valueToString(newValue));
                        }
                    });
                    this.stateSubscriptions.set(op.stateId, unsubscribe);
                    if (!this.nodeSubscriptions.has(op.nodeId)) {
                        this.nodeSubscriptions.set(op.nodeId, []);
                    }
                    this.nodeSubscriptions.get(op.nodeId).push(unsubscribe);
                }
                break;
            }
            case OperationType.BIND_LIST: {
                if (op.state && typeof op.state.subscribe === 'function') {
                    const unsubscribe = op.state.subscribe(items => {
                        this.reconcileList(op.nodeId, items, op.factory);
                    });
                    this.stateSubscriptions.set(generateId('sub'), unsubscribe);
                    if (!this.nodeSubscriptions.has(op.nodeId)) {
                        this.nodeSubscriptions.set(op.nodeId, []);
                    }
                    this.nodeSubscriptions.get(op.nodeId).push(unsubscribe);
                }
                break;
            }
            case OperationType.MOUNT: {
                const container = document.querySelector(op.selector);
                const nodeToMount = this.nodeMap.get(op.nodeId);
                if (container && nodeToMount) {
                    container.innerHTML = '';
                    container.appendChild(nodeToMount);
                }
                break;
            }
            case OperationType.INSERT_BEFORE: {
                const parent = this.nodeMap.get(op.parentId);
                const child = this.nodeMap.get(op.childId);
                const anchor = this.nodeMap.get(op.anchorId);
                if (parent && child && anchor) parent.insertBefore(child, anchor);
                break;
            }
            case OperationType.REMOVE_CHILD: {
                const parent = this.nodeMap.get(op.parentId);
                const child = this.nodeMap.get(op.childId);
                if (parent && child) {
                    this.cleanupNodeTree(child);
                    parent.removeChild(child);
                }
                break;
            }
            case OperationType.INIT_ROUTER: {
                if (node instanceof HTMLElement && op.router) {
                    if (typeof op.router.init === 'function') {
                        op.router.init(node);
                    } else if (op.router.routes) {
                        const routerConfig = {
                            routes: op.router.routes.map(route => ({
                                path: route.path,
                                component: () => h('div').set('data-route', route.path),
                                options: route.options || {}
                            })),
                            mode: op.router.mode || 'history'
                        };
                        const { router: newRouter } = createRouter(routerConfig);
                        if (newRouter && typeof newRouter.init === 'function') {
                            newRouter.init(node);
                        }
                    }
                }
                break;
            }
        }
    }

    /**
     * @param {HTMLElement|Text} node - The DOM node to clean up.
     * @returns {void}
     * @description Cleans up event listeners and state subscriptions for a node and its entire subtree before removal.
     */
    cleanupNodeTree(node) {
        if (!node) return;
        this.eventDelegator.clearHandlersForNode(node);
        const nodesToClean = (typeof node.querySelectorAll === 'function') ? [node, ...node.querySelectorAll('[data-chain-id]')] : [node];
        
        nodesToClean.forEach(el => {
            const nodeId = el.dataset?.chainId;
            if (nodeId) {
                if (this.nodeSubscriptions.has(nodeId)) {
                    this.nodeSubscriptions.get(nodeId).forEach(unsub => unsub());
                    this.nodeSubscriptions.delete(nodeId);
                }
                this.nodeMap.delete(nodeId);
            }
        });
    }

    /**
     * @param {string} parentNodeId - The ID of the parent node.
     * @param {Array<object>} newItems - The new array of list items.
     * @param {function(object, number): ChainElement} factory - The factory function to create a ChainElement for each list item.
     * @returns {void}
     * @description List reconciliation algorithm for efficiently updating element lists.
     */
    reconcileList(parentNodeId, newItems, factory) {
        const parentNode = this.nodeMap.get(parentNodeId);
        if (!parentNode) return;

        const oldKeyedNodes = new Map();
        for (const node of parentNode.childNodes) {
            if (node.dataset?.key) {
                oldKeyedNodes.set(node.dataset.key, node);
            }
        }
        
        const newDomNodes = [];
        for (let i = 0; i < newItems.length; i++) {
            const item = newItems[i];
            const key = String(item.id ?? i);
            let domNode = oldKeyedNodes.get(key);
            
            if (domNode) {
                oldKeyedNodes.delete(key);
            } else {
                const newElement = factory(item, i).set('data-key', key, 'attr');
                const runtime = this;
                runtime.executeOperations(newElement.stream, true);
                domNode = runtime.nodeMap.get(newElement.nodeId);
                runtime.eventDelegator.registerHandlers(newElement.eventHandlers);
                runtime.bindOperations(newElement.stream);
            }
            newDomNodes.push(domNode);
        }

        for (const unusedNode of oldKeyedNodes.values()) {
            this.cleanupNodeTree(unusedNode);
            parentNode.removeChild(unusedNode);
        }

        for (let i = 0; i < newDomNodes.length; i++) {
            const node = newDomNodes[i];
            if (parentNode.childNodes[i] !== node) {
                parentNode.insertBefore(node, parentNode.childNodes[i] || null);
            }
        }
    }

    /**
     * @returns {void}
     * @description Destroys the runtime, cleaning up all subscriptions and references.
     */
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.batchQueue = [];
        this.isBatchingScheduled = false;

        const nodesToClean = Array.from(this.nodeMap.values());
        nodesToClean.forEach(node => {
            this.cleanupNodeTree(node);
        });

        this.stateSubscriptions.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.stateSubscriptions.clear();
        this.nodeSubscriptions.forEach(subs => subs.forEach(unsub => unsub()));
        this.nodeSubscriptions.clear();
        this.nodeMap.clear();

        if (this.eventDelegator && typeof this.eventDelegator.destroy === 'function') {
            this.eventDelegator.destroy();
        }

        this.eventDelegator = null;
        this.batchQueue = null;
        this.stateSubscriptions = null;
        this.nodeMap = null;
    }
}

if (typeof window !== 'undefined') {
    window.__CHAIN_EVENT_HANDLERS__ = window.__CHAIN_EVENT_HANDLERS__ || {};
}

/**
 * @class EventDelegator
 * @description Efficiently handles events using the event delegation pattern.
 */
export class EventDelegator {
    /**
     * @param {ChainRuntime} runtime - The associated ChainRuntime instance.
     */
    constructor(runtime) {
        /**
         * @type {ChainRuntime}
         * @description The associated ChainRuntime instance.
         */
        this.runtime = runtime;
        /**
         * @type {Set<string>}
         * @description Stores the event types that have been delegated.
         */
        this.delegatedEvents = new Set();
        /**
         * @type {Map<string, function(Event): void>}
         * @description Stores a mapping from action IDs to event handler functions.
         */
        this.handlerMap = new Map();
        /**
         * @type {function(Event): void}
         * @description The `handleEvent` method bound to this instance.
         */
        this.boundHandleEvent = this.handleEvent.bind(this);
    }

    /**
     * @param {Array<{actionId: string, handler: function(Event): void}>} handlers - An array of event handlers to register.
     * @returns {void}
     * @description Registers event handlers.
     */
    registerHandlers(handlers) {
        handlers.forEach(({ actionId, handler }) => {
            this.handlerMap.set(actionId, handler);
        });
    }

    /**
     * @param {HTMLElement} node - The DOM node for which to clear event handlers.
     * @returns {void}
     * @description Clears all event handlers associated with a DOM node and its descendants.
     */
    clearHandlersForNode(node) {
        if (!node || typeof node.querySelectorAll !== 'function') return;
        const nodesToClean = [node, ...node.querySelectorAll('[data-chain-action]')];
        nodesToClean.forEach(el => {
            if (el.dataset?.chainAction) {
                const actionId = el.dataset.chainAction;
                if (actionId) {
                    this.handlerMap.delete(actionId);
                }
            }
        });
    }

    /**
     * @param {string} eventType - The event type to delegate.
     * @returns {void}
     * @description Sets up a delegated event listener on `document.body` for a specific event type.
     */
    delegate(eventType) {
        if (this.delegatedEvents.has(eventType)) return;
        document.body.addEventListener(eventType, this.boundHandleEvent, true);
        this.delegatedEvents.add(eventType);
    }

    /**
     * @param {Event} e - The triggered event object.
     * @returns {void}
     * @description Handles delegated events.
     */
    handleEvent(e) {
        let target = /** @type {HTMLElement} */ (e.target);
        while (target && target !== document.body) {
            const actionId = target.dataset.chainAction;
            if (actionId) {
                if (this.handlerMap.has(actionId)) {
                    this.handlerMap.get(actionId)(e);
                    return;
                } else if (typeof window !== 'undefined' && window.__CHAIN_EVENT_HANDLERS__?.[actionId]) {
                    window.__CHAIN_EVENT_HANDLERS__[actionId](e);
                    return;
                }
            }
            target = target.parentElement;
        }
    }

    /**
     * @returns {void}
     * @description Destroys the event delegator, removing all event listeners and clearing the handler map.
     */
    destroy() {
        this.delegatedEvents.forEach(eventType => {
            document.body.removeEventListener(eventType, this.boundHandleEvent, true);
        });
        this.delegatedEvents.clear();
        this.handlerMap.clear();
    }
}

/**
 * @param {string} tagName - The tag name of the HTML element to create.
 * @returns {ChainElement} A new ChainElement instance.
 * @description A factory function for creating ChainElement instances. This is the starting point for building UI.
 * @example
 * h('div').child('Hello, world!');
 * h('button').on('click', () => console.log('Clicked!'));
 */
export function h(tagName) {
    return new ChainElement(tagName);
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
export function mount(selector, componentOrEventData = null) {
    const container = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!container) {
        console.error(`Mount target not found: ${selector}`);
        return null;
    }

    const existingRuntimeId = container.dataset.chainRuntimeId;
    if (existingRuntimeId && _mountedRuntimes.has(existingRuntimeId)) {
        const oldRuntime = _mountedRuntimes.get(existingRuntimeId);
        if (oldRuntime && typeof oldRuntime.destroy === 'function') {
            oldRuntime.destroy();
            _mountedRuntimes.delete(existingRuntimeId);
        }
    }

    const runtime = new ChainRuntime();
    const runtimeId = generateId('runtime');
    container.dataset.chainRuntimeId = runtimeId;
    _mountedRuntimes.set(runtimeId, runtime);
    
    if (typeof window !== 'undefined') {
        window.__CHAIN_ACTIVE_RUNTIME__ = runtime;
    }
    
    if (componentOrEventData instanceof ChainElement) {
        const component = componentOrEventData;
        runtime.rootNodeId = component.nodeId;
        runtime.eventDelegator.registerHandlers(component.eventHandlers);
        runtime.executeOperations(component.stream, true);
        
        const newNode = runtime.nodeMap.get(component.nodeId);
        if (container && newNode) {
            container.innerHTML = '';
            container.appendChild(newNode);
        }
        runtime.bindOperations(component.stream);
    } else if (componentOrEventData?.eventHandlers) {
        if (container) {
            const existingNodes = container.querySelectorAll('[data-chain-id]');
            for (const node of existingNodes) {
                const nodeId = node.dataset.chainId;
                if (nodeId) {
                    runtime.nodeMap.set(nodeId, node);
                }
            }
            
            if (container.hasAttribute('data-chain-id')) {
                const rootId = container.dataset.chainId;
                if (rootId) {
                    runtime.nodeMap.set(rootId, container);
                }
            }
        }
        
        if (Array.isArray(componentOrEventData.eventHandlers)) {
            componentOrEventData.eventHandlers.forEach(({ actionId, eventType, handlerCode }) => {
                if (actionId && eventType) {
                    if (typeof window !== 'undefined') {
                        let handlerFunction;
                        if (handlerCode && typeof handlerCode === 'string') {
                            try {
                                handlerFunction = new Function('event', handlerCode.substring(handlerCode.indexOf('{') + 1, handlerCode.lastIndexOf('}')));
                            } catch (e) {
                                console.warn(`Failed to create handler for action: ${actionId}`, e);
                                handlerFunction = (e) => {
                                    console.log(`Event triggered for action: ${actionId}`, e);
                                };
                            }
                        } else {
                            handlerFunction = (e) => {
                                console.log(`Event triggered for action: ${actionId}`, e);
                            };
                        }
                        
                        runtime.eventDelegator.registerHandlers([{ actionId, handler: handlerFunction }]);
                    }
                    runtime.eventDelegator.delegate(eventType);
                }
            });
        }
    }

    return {
        runtime,
        destroy: () => {
            runtime.destroy();
            if (container.dataset.chainRuntimeId === runtimeId) {
                delete container.dataset.chainRuntimeId;
            }
            _mountedRuntimes.delete(runtimeId);
        }
    };
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
export function render(componentFactory, options = {}) {
    const component = componentFactory();
    /**
     * @type {object}
     * @description Object to store collected states.
     */
    const states = {};
    
    /**
     * @private
     * @param {ChainElement} element - The element from which to collect states.
     * @returns {void}
     */
    const collectStates = (element) => {
        if (element.stream) {
            element.stream.getOperations().forEach(op => {
                if (op.type === OperationType.BIND_STATE && op.state) {
                    states[op.stateId] = op.state.value;
                }
            });
        }
        if (element.children) {
            element.children.forEach(child => {
                if (child instanceof ChainElement) {
                    collectStates(child);
                }
            });
        }
    };
    collectStates(component);

    const { html, eventHandlers } = component.toHtml();

    const clientEventHandlers = eventHandlers.map(({ actionId, eventType, handler }) => ({
        actionId,
        eventType,
        handlerCode: handler && typeof handler === 'function' ? handler.toString().replace(/\s+/g, ' ').trim() : null
    }));

    if (options.format === 'stream') {
        return { 
            stream: component.stream.serialize(), 
            state: states,
            eventHandlers: clientEventHandlers
        };
    }
    return { html, state: states, clientEventHandlers };
}

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
export function map(stateArray, factory) {
    const container = new ChainElement('div');
    container.stream.add({ type: OperationType.BIND_LIST, nodeId: container.nodeId, state: stateArray, factory });
    return container;
}

/**
 * @param {string} name - The name of the component, used for debugging or identification.
 * @param {function(...any[]): ChainElement} factory - A factory function that accepts arguments and returns a ChainElement instance as the root of the component.
 * @returns {function(...any[]): ChainElement} A new component function that can be used like a ChainElement.
 * @description Creates a reusable component.
 * @example
 * const MyButton = createComponent('MyButton', (text) => h('button').child(text));
 * h('div').child(MyButton('Click Me'));
 */
export function createComponent(name, factory) {
    return (...args) => {
        const componentRoot = factory(...args);
        componentRoot.set('data-component', name, 'attr');
        return componentRoot;
    };
}

/**
 * @class NavigationController
 * @description Abstract navigation controller - provides a common interface for managing navigation.
 */
export class NavigationController {
    /**
     * @constructor
     */
    constructor() {
        /**
         * @type {Set<function({path: string, state: object}): void>}
         * @description Stores navigation listeners.
         */
        this.listeners = new Set();
    }

    /**
     * @param {function({path: string, state: object}): void} callback - The callback function to be called when navigation changes.
     * @returns {function(): void} A function to unsubscribe from the listener.
     * @description Listens for navigation changes.
     */
    listen(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * @param {{path: string, state: object}} location - The current navigation location object.
     * @returns {void}
     * @description Notifies all listeners that navigation has changed.
     */
    notify(location) {
        this.listeners.forEach(listener => listener(location));
    }

    /**
     * @param {string} path - The path to navigate to.
     * @param {object} [state={}] - The state object associated with the navigation.
     * @param {boolean} [replace=false] - If true, replaces the current history entry instead of adding a new one.
     * @returns {void}
     * @description Navigates to a new path. To be implemented by subclasses.
     * @throws {Error} Throws an error if not implemented.
     */
    navigate(path, state, replace) { throw new Error("Not implemented"); }
    
    /**
     * @returns {{path: string, state: object}} The current navigation location object.
     * @description Gets the current location. To be implemented by subclasses.
     * @throws {Error} Throws an error if not implemented.
     */
    getLocation() { throw new Error("Not implemented"); }
    
    /**
     * @returns {void}
     * @description Navigates back to the previous location in history. To be implemented by subclasses.
     * @throws {Error} Throws an error if not implemented.
     */
    goBack() { throw new Error("Not implemented"); }
}

/**
 * @class NavManager
 * @augments NavigationController
 * @description Provides a unified interface for managing navigation across different environments.
 */
export class NavManager extends NavigationController {
    /**
     * @param {object} [options={}] - History options.
     * @param {string} [options.defaultPath='/'] - The default path to use if no initial path is specified.
     * @param {'history'|'hash'|'memory'} [options.mode='history'] - The navigation mode ('history', 'hash', or 'memory').
     * @param {string} [options.initialPath] - The initial path for memory mode.
     */
    constructor(options = {}) {
        super();
        /**
         * @type {string}
         * @description The default path for navigation.
         */
        this.defaultPath = options.defaultPath || '/';
        /**
         * @type {'history'|'hash'|'memory'}
         * @description The current navigation mode.
         */
        this.mode = options.mode || 'history';
        /**
         * @type {Array<{path: string, state: object}>}
         * @description The navigation stack for 'memory' mode.
         */
        this.stack = [];
        /**
         * @type {number}
         * @description The current index in the navigation stack.
         */
        this.index = 0;
        
        let resolvedInitialPath = this.defaultPath;
        if (typeof window !== 'undefined' && window.location) {
            if (this.mode === 'hash') {
                resolvedInitialPath = window.location.hash.substring(1) || this.defaultPath;
            } else {
                resolvedInitialPath = window.location.pathname;
            }
        } else if (options.initialPath) {
            resolvedInitialPath = options.initialPath;
        }
        this.stack = [{ path: resolvedInitialPath, state: {} }];
    }

    /**
     * @param {string} path - The path to navigate to.
     * @param {object} [state={}] - The state object associated with the navigation.
     * @param {boolean} [replace=false] - If true, replaces the current history entry instead of adding a new one.
     * @returns {void}
     * @description Navigates to a new path, updating the history stack and notifying listeners.
     */
    navigate(path, state = {}, replace = false) {
        const location = { path, state };
        if (replace && this.index < this.stack.length) {
            this.stack[this.index] = location;
        } else {
            this.stack = this.stack.slice(0, this.index + 1);
            this.stack.push(location);
            this.index = this.stack.length - 1;
        }
        
        if (typeof window !== 'undefined' && window.history) {
            if (this.mode === 'hash') {
                const hashPath = path.startsWith('/') ? path : '/' + path;
                if (replace) {
                    window.history.replaceState(state, '', '#' + hashPath);
                } else {
                    window.history.pushState(state, '', '#' + hashPath);
                }
            } else {
                const url = new URL(path, window.location.origin);
                if (replace) {
                    window.history.replaceState(state, '', url.toString());
                } else {
                    window.history.pushState(state, '', url.toString());
                }
            }
        }
        this.notify(location);
    }

    /**
     * @returns {{path: string, state: object}} The current navigation location object.
     * @description Gets the current location from the navigation stack.
     */
    getLocation() {
        if (this.stack.length === 0) return { path: '/', state: {} };
        return this.stack[this.index];
    }

    /**
     * @returns {void}
     * @description Navigates back in history, updating the index and notifying listeners.
     */
    goBack() {
        if (this.index > 0) {
            this.index--;
            this.notify(this.stack[this.index]);
        }
    }

    /**
     * @returns {string} The current history stack as a JSON string.
     * @description Serializes the current history stack to a JSON string.
     */
    toJSON() {
        return JSON.stringify({ stack: this.stack, index: this.index, defaultPath: this.defaultPath });
    }

    /**
     * @param {string} json - The JSON string to load history from.
     * @returns {void}
     * @description Loads history from a JSON string.
     */
    fromJSON(json) {
        const { stack, index, defaultPath } = JSON.parse(json);
        this.stack = stack;
        this.index = index;
        this.defaultPath = defaultPath;
    }

    /**
     * @returns {{stack: Array<{path: string, state: object}>, index: number, defaultPath: string}} The current history stack as a plain object.
     * @description Serializes the current history stack to a plain object.
     */
    serialize() {
        return { stack: this.stack, index: this.index, defaultPath: this.defaultPath };
    }

    /**
     * @param {{stack: Array<{path: string, state: object}>, index: number, defaultPath: string}} data - The plain object to load history from.
     * @returns {void}
     * @description Loads history from a plain object.
     */
    deserialize(data) {
        this.stack = data.stack || [];
        this.index = data.index || 0;
        this.defaultPath = data.defaultPath || '/';
    }
}

/**
 * @class ChainPageRouter
 * @description Manages client-side routing for ChainUI applications.
 */
export class ChainPageRouter {
    /**
     * @param {object} [options={}] - Router options.
     * @param {Array<object>} [options.routes=[]] - An array of route configurations.
     * @param {NavigationController} [options.history] - A custom history manager.
     * @param {function(string): string} [options.normalizePath] - A function to normalize paths.
     * @param {'history'|'hash'|'memory'} [options.mode] - The navigation mode.
     * @param {boolean} [options.persist] - Whether to persist history.
     * @param {string} [options.initialPath] - The initial path for memory mode.
     * @param {number} [options.keepAliveCacheLimit=10] - The maximum number of keep-alive pages to cache.
     * @param {string} [options.fallbackPath='/'] - The path to redirect to if no route matches.
     */
    constructor(options = {}) {
        /**
         * @type {Map<string, {factory: function(...any[]): ChainElement, options: object, regex: RegExp, paramNames: string[]}>}
         * @description Stores registered page routes.
         */
        this.pages = new Map();
        /**
         * @type {ChainState<{id: string|null, params: object}>}
         * @description A reactive state holding the current page ID and its parameters.
         */
        this.currentPage = createState({ id: null, params: {} });
        /**
         * @type {Map<function(...any[]): ChainElement, {runtime: ChainRuntime, params: object}>}
         * @description Cache for keep-alive page runtimes.
         */
        this._runtimeCache = new Map();
        /**
         * @type {Array<function(...any[]): ChainElement>}
         * @description Keys of the runtime cache, used for LRU eviction.
         */
        this._cacheKeys = [];
        /**
         * @type {number}
         * @description The maximum number of keep-alive pages to cache.
         */
        this.keepAliveCacheLimit = options.keepAliveCacheLimit || 10;
        /**
         * @type {string}
         * @description The path to redirect to if no route matches.
         */
        this.fallbackPath = options.fallbackPath || '/';
        /**
         * @type {function(): ChainElement|null}
         * @description Factory function for the fallback page.
         */
        this.fallbackFactory = null;
        
        const { routes = [] } = options;
        if (routes) {
            routes.forEach(route => {
                if (route.path && route.component) {
                    this.register(route.path, route.component, route.options);
                }
            });
        }

        /**
         * @type {NavManager}
         * @description The navigation manager instance.
         */
        if (options.history) {
            this.history = options.history;
        } else {
            const { mode, persist, initialPath } = options;
            this.history = new NavManager({ mode, persist, initialPath });
        }
        /**
         * @type {function(string): string}
         * @description Function to normalize paths before matching.
         */
        this.normalizePath = options.normalizePath || ((path) => path);
        this._initEventDelegation();

        if (typeof window === 'undefined') {
            this._handleLocationChange(this.history.getLocation());
        }
    }

    /**
     * @param {HTMLElement} rootContainer - The root DOM element where pages will be rendered.
     * @returns {void}
     * @description Initializes the router, attaching it to the root container.
     */
    init(rootContainer) {
        /**
         * @type {HTMLElement}
         * @description The root DOM element for routing.
         */
        this.root = rootContainer;
        this.root.dataset.chainRouter = 'root';
        let previousPage = { id: null, factory: null };
        /**
         * @type {Set<function(): void>}
         * @description Stores cleanup functions for subscriptions.
         */
        this._cleanupFunctions = new Set();

        const unsubscribe = this.currentPage.subscribe(({ id: pageId, params }) => {
            if (this.history.mode === 'memory') {
                previousPage = { id: pageId, factory: this.pages.get(pageId)?.factory || null };
                return;
            }

            if (previousPage.id && previousPage.factory) {
                const oldPageConfig = this.pages.get(previousPage.id);
                const cachedRuntime = this._runtimeCache.get(previousPage.factory);

                if (cachedRuntime?.runtime) {
                    const oldNode = cachedRuntime.runtime.nodeMap.get(cachedRuntime.runtime.rootNodeId);
                    if (oldPageConfig && !oldPageConfig.options.keepAlive) {
                        if (oldNode && oldNode.parentNode === this.root) {
                            this.root.removeChild(oldNode);
                        }
                        if (cachedRuntime.runtime && typeof cachedRuntime.runtime.destroy === 'function') {
                            cachedRuntime.runtime.destroy();
                        }
                        this._runtimeCache.delete(previousPage.factory);
                    } else if (oldNode) {
                        oldNode.hidden = true;
                    }
                }
            }

            if (!pageId) {
                this._renderBlank();
                previousPage = { id: null, factory: null };
                return;
            }

            if (this.pages.has(pageId)) {
                const { factory, options = {} } = this.pages.get(pageId);
                let cached = this._runtimeCache.get(factory);
                const paramsChanged = cached ? JSON.stringify(cached.params) !== JSON.stringify(params) : true;

                if (cached && options.keepAlive && paramsChanged) {
                    const oldNode = cached.runtime.nodeMap.get(cached.runtime.rootNodeId);
                    if (oldNode && oldNode.parentNode === this.root) {
                        this.root.removeChild(oldNode);
                    }
                    if (cached.runtime && typeof cached.runtime.destroy === 'function') {
                        cached.runtime.destroy();
                    }
                    this._runtimeCache.delete(factory);
                    cached = null;
                }

                if (!cached) {
                    const component = factory(params);
                    const runtime = new ChainRuntime();
                    runtime.rootNodeId = component.nodeId;
                    runtime.eventDelegator.registerHandlers(component.eventHandlers);
                    runtime.executeOperations(component.stream, true);

                    const newNode = runtime.nodeMap.get(component.nodeId);
                    if (this.root && newNode) {
                        this.root.appendChild(newNode);
                    }

                    runtime.bindOperations(component.stream);

                    this._runtimeCache.set(factory, { runtime, params });

                    if (options.keepAlive) {
                        const keyIndex = this._cacheKeys.indexOf(factory);
                        if (keyIndex > -1) this._cacheKeys.splice(keyIndex, 1);
                        this._cacheKeys.push(factory);

                        if (this._cacheKeys.length > this.keepAliveCacheLimit) {
                            const keyToRemove = this._cacheKeys.shift();
                            const cachedToRemove = this._runtimeCache.get(keyToRemove);
                            if (cachedToRemove) {
                                if (cachedToRemove.runtime && typeof cachedToRemove.runtime.destroy === 'function') {
                                    cachedToRemove.runtime.destroy();
                                }
                                this._runtimeCache.delete(keyToRemove);
                            }
                        }
                    }
                } else {
                    const existingNode = cached.runtime.nodeMap.get(cached.runtime.rootNodeId);
                    if (existingNode) {
                        existingNode.hidden = false;
                    }
                }
                previousPage = { id: pageId, factory };
            } else {
                console.error(`Page not registered: ${pageId}`);
                this._renderFallback();
                previousPage = { id: null, factory: null };
            }
        });

        this._cleanupFunctions.add(unsubscribe);
        const historyUnsubscribe = this.history.listen((location) => this._handleLocationChange(location));
        this._cleanupFunctions.add(historyUnsubscribe);
        
        if (typeof window !== 'undefined' && window.location) {
            let initialPath = window.location.pathname + window.location.search + window.location.hash;
            if (this.history?.mode === 'hash') {
                initialPath = window.location.hash.substring(1) || '/';
            }
            const initialLocation = { path: initialPath, state: {} };
            this._handleLocationChange(initialLocation);
        } else {
            this._handleLocationChange(this.history.getLocation());
        }
    }

    /**
     * @param {string} path - The route path (e.g., '/users/:id').
     * @param {function(...any[]): ChainElement} componentFactory - A factory function that creates the component for this route.
     * @param {object} [options={}] - Route options.
     * @param {boolean} [options.keepAlive=false] - If true, the component will be cached and reused.
     * @param {function(object, object): Promise<boolean>|boolean} [options.beforeEnter] - A function to run before entering the route.
     * @param {function(object, object): void} [options.onLeave] - A function to run when leaving the route.
     * @returns {ChainPageRouter} The current router instance, supporting chainable calls.
     * @description Registers a new page route.
     */
    register(path, componentFactory, options = {}) {
        if (this.pages.has(path)) {
            console.warn(`Route already registered: ${path}`);
            return this;
        }

        const paramNames = [];
        const regexPath = path.replace(/:(\w+)/g, (_, paramName) => {
            paramNames.push(paramName);
            return '([^/]+)';
        });

        this.pages.set(path, {
            factory: componentFactory,
            options: { keepAlive: false, ...options },
            regex: new RegExp(`^${regexPath}$`),
            paramNames
        });
        return this;
    }

    /**
     * @param {string} path - The path to navigate to.
     * @param {object} [params={}] - Parameters to pass to the route.
     * @param {boolean} [replace=false] - If true, replaces the current history entry instead of adding a new one.
     * @returns {Promise<ChainPageRouter>} The current router instance, supporting chainable calls.
     * @description Navigates to a specified route.
     * @throws {Error} Throws an error if the route is unknown.
     */
    async navigate(path, params = {}, replace = false) {
        const { route, resolvedParams, path: pageId } = this._matchRoute(path);
        if (!route) throw new Error(`Unknown route: ${path}`);

        const finalParams = { ...resolvedParams, ...params };
        const current = this.currentPage.value;
        const paramsChanged = !current || current.id !== pageId || this._areParamsChanged(current.params, finalParams);

        if (!paramsChanged) return this;

        if (current?.id) {
            const oldRoute = this.pages.get(current.id);
            oldRoute.options.onLeave?.(current.params, { id: pageId, params: finalParams });
        }

        if (route.options.beforeEnter) {
            const canEnter = await Promise.resolve(route.options.beforeEnter(finalParams, current));
            if (!canEnter) return this;
        }

        this.currentPage.value = { id: pageId, params: finalParams };
        this.history.navigate(path, finalParams, replace);
        return this;
    }

    /**
     * @returns {void}
     * @description Navigates back in history.
     */
    goBack() {
        this.history.goBack();
    }

    /**
     * @param {function(): ChainElement} factory - A factory function that creates the fallback component.
     * @returns {void}
     * @description Sets a custom fallback page for unmatched routes.
     */
    setFallbackPage(factory) {
        this.fallbackFactory = factory;
    }

    /**
     * @returns {{id: string|null, params: object}} The current page information.
     * @description Gets the current page information.
     */
    getCurrentPage() {
        return this.currentPage.value;
    }

    /**
     * @returns {void}
     * @description Destroys the router, cleaning up all subscriptions and references.
     */
    destroy() {
        if (this._cleanupFunctions) {
            this._cleanupFunctions.forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
            this._cleanupFunctions.clear();
        }

        if (this._runtimeCache) {
            this._runtimeCache.forEach(cached => {
                if (cached.runtime && typeof cached.runtime.destroy === 'function') {
                    cached.runtime.destroy();
                }
            });
            this._runtimeCache.clear();
        }

        if (this.history && typeof this.history.destroy === 'function') {
            this.history.destroy();
        }

        if (this.pages) {
            this.pages.clear();
        }

        if (this._cacheKeys) {
            this._cacheKeys.length = 0;
        }

        if (this._rootPageViewRuntime && typeof this._rootPageViewRuntime.destroy === 'function') {
            this._rootPageViewRuntime.destroy();
            this._rootPageViewRuntime = null;
        }

        this.root = null;
    }

    /**
     * @private
     * @returns {void}
     * @description Initializes event delegation for router-specific events.
     */
    _initEventDelegation() {
        if (typeof document === 'undefined') return;
        document.addEventListener('chain:backpress', () => this.goBack());
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('popstate', (event) => {
                const location = {
                    path: window.location.pathname + window.location.search + window.location.hash,
                    state: event.state || {}
                };
                this._handleLocationChange(location);
            });
        }
    }

    /**
     * @private
     * @param {string} path - The path to match.
     * @returns {{route: object|null, resolvedParams: object|null, path: string|null}} The matched route, resolved parameters, and route path.
     * @description Matches a given path against registered routes.
     */
    _matchRoute(path) {
        const [pathname, queryString] = path.split('?');
        const queryParams = {};
        if (queryString) {
            const searchParams = new URLSearchParams(queryString);
            for (const [key, value] of searchParams) {
                queryParams[key] = value;
            }
        }

        for (const [routePath, route] of this.pages.entries()) {
            const match = pathname.match(route.regex);
            if (match) {
                const resolvedParams = { ...queryParams };
                route.paramNames.forEach((name, index) => {
                    resolvedParams[name] = match[index + 1];
                });
                return { route, resolvedParams, path: routePath };
            }
        }
        return { route: null, resolvedParams: null, path: null };
    }

    /**
     * @private
     * @param {object} params1 - First set of parameters.
     * @param {object} params2 - Second set of parameters.
     * @returns {boolean} True if parameters have changed, false otherwise.
     * @description Compares two sets of parameters to check for changes.
     */
    _areParamsChanged(params1, params2) {
        if (params1 === null || params1 === undefined || params2 === null || params2 === undefined) {
            return params1 !== params2;
        }
        
        if (typeof params1 !== 'object' || typeof params2 !== 'object') {
            return params1 !== params2;
        }
        
        if (Array.isArray(params1) || Array.isArray(params2)) {
            if (!Array.isArray(params1) || !Array.isArray(params2)) return true;
            if (params1.length !== params2.length) return true;
            for (let i = 0; i < params1.length; i++) {
                if (params1[i] !== params2[i]) return true;
            }
            return false;
        }
        
        const keys1 = Object.keys(params1);
        const keys2 = Object.keys(params2);
        
        if (keys1.length !== keys2.length) return true;
        
        for (let key of keys1) {
            if (!params2.hasOwnProperty(key) || params1[key] !== params2[key]) {
                return true;
            }
        }
        return false;
    }

    /**
     * @private
     * @param {{path: string, state: object}} location - The current location object from history.
     * @returns {void}
     * @description Handles location changes from the history manager.
     */
    _handleLocationChange(location) {
        if (!location?.path) return;
        let pathForRouting = location.path;
        if (this.history?.mode === 'hash') {
            pathForRouting = this.normalizePath(pathForRouting);
        } else {
            const url = new URL(location.path, 'http://localhost');
            pathForRouting = this.normalizePath(url.pathname);
        }
        
        const { route, resolvedParams, path: routePath } = this._matchRoute(pathForRouting);
        if (!route) {
            if (pathForRouting !== this.fallbackPath) {
                this.navigate(this.fallbackPath, {}, true);
            }
            return;
        }

        const finalParams = { ...resolvedParams, ...(location.state || {}) };
        const current = this.currentPage.value;
        
        if (!current || current.id !== routePath || this._areParamsChanged(current.params, finalParams)) {
            this.currentPage.value = { id: routePath, params: finalParams };
        }
    }

    /**
     * @private
     * @returns {void}
     * @description Renders a blank page by clearing the root container.
     */
    _renderBlank() {
        if (this.root?.firstChild) {
            this.root.innerHTML = '';
        }
    }

    /**
     * @private
     * @returns {void}
     * @description Renders the fallback page if no route matches.
     */
    _renderFallback() {
        this._renderBlank();
        if (this.fallbackFactory) {
            const fallbackComponent = this.fallbackFactory();
            const runtime = new ChainRuntime();
            runtime.rootNodeId = fallbackComponent.nodeId;
            runtime.eventDelegator.registerHandlers(fallbackComponent.eventHandlers);
            runtime.executeOperations(fallbackComponent.stream, true);

            const newNode = runtime.nodeMap.get(fallbackComponent.nodeId);
            if (this.root && newNode) {
                this.root.appendChild(newNode);
            }

            runtime.bindOperations(fallbackComponent.stream);
        } else {
            this.root.innerHTML = '<div>404 - Page not found</div>';
        }
    }
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
export function createRouter(options = {}) {
    const { routes = [], history, normalizePath, mode, persist, initialPath } = options;

    /**
     * @private
     * @param {object|Array<string|function|object>} route - The route configuration.
     * @returns {{path: string, component: function(): ChainElement, options: object}} Normalized route object.
     */
    const normalizeRoute = (route) => {
        if (Array.isArray(route)) {
            const [path, component, options = {}] = route;
            return { path, component, options };
        }
        return route;
    };

    /**
     * @private
     * @param {string} path - The path to normalize.
     * @returns {string} The normalized path.
     */
    const defaultNormalizePath = (path) => {
        let normalized = path;
        if (normalized === '' || normalized === '/' || normalized === '/index.html') {
            return '/';
        }
        if (!normalized.startsWith('/')) {
            normalized = '/' + normalized;
        }
        return normalized;
    };

    const finalNormalizePath = normalizePath || defaultNormalizePath;
    const normalizedRoutes = routes.map(normalizeRoute);
    
    const router = new ChainPageRouter({ 
        history, 
        normalizePath: finalNormalizePath,
        mode,
        persist,
        initialPath,
        routes: normalizedRoutes
    });

    const PageView = h('div').set('data-chain-router-view', true);
    PageView.stream.add({ type: OperationType.INIT_ROUTER, nodeId: PageView.nodeId, router });

    const runtime = new ChainRuntime();
    runtime.rootNodeId = PageView.nodeId;
    runtime.executeOperations(PageView.stream, true);
    
    const rootPageViewRuntime = {
        runtime,
        destroy: () => runtime.destroy()
    };
    
    // The binding needs to happen after the node is created and potentially mounted.
    // We will bind it here, and createApp will handle the mounting.
    runtime.bindOperations(PageView.stream);

    router._rootPageViewRuntime = rootPageViewRuntime;

    /**
     * @private
     * @param {string} targetPath - The target path for the link.
     * @param {object} [params] - Parameters for the link.
     * @param {...(ChainElement|string|ChainState<string>|Array<ChainElement|string|ChainState<string>>)} children - Child elements of the link.
     * @returns {ChainElement} A ChainElement representing the router link.
     */
    function _createRouterLink(targetPath, params, ...children) {
        let resolvedPath = targetPath;
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (resolvedPath.includes(`:${key}`)) {
                    resolvedPath = resolvedPath.replace(`:${key}`, encodeURIComponent(value));
                }
            }
        }

        return h('a')
            .set('href', resolvedPath)
            .on('click', (e) => {
                e.preventDefault();
                router.navigate(resolvedPath, params);
            })
            .child(...children);
    }

    /**
     * @param {object} props - Link properties.
     * @param {string} props.to - The target path for the link.
     * @param {object} [props.params] - Parameters for the link.
     * @param {...(ChainElement|string|ChainState<string>|Array<ChainElement|string|ChainState<string>>)} children - Child elements of the link.
     * @returns {ChainElement} A ChainElement representing the navigation link.
     * @description A component for creating navigation links.
     */
    const Link = ({ to, params: propParams, ...props }, ...children) => {
        const linkComponent = _createRouterLink(to, propParams, ...children);
        for (const [key, value] of Object.entries(props)) {
            linkComponent.set(key, value);
        }
        return linkComponent;
    };

    return { router, Link, PageView, rootPageViewRuntime };
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
export function createApp(config = {}) {
    const { mount: mountSelector, routes = [], ...routerOptions } = config;
    if (!mountSelector) {
        throw new Error("createApp requires a 'mount' selector in its configuration.");
    }

    const { mode, persist, initialPath, ...otherRouterOptions } = routerOptions;
    const { router, Link, PageView, rootPageViewRuntime } = createRouter({ 
        routes, 
        mode,
        persist,
        initialPath,
        ...otherRouterOptions
    });
    
    const container = typeof mountSelector === 'string' ? document.querySelector(mountSelector) : mountSelector;
    if (container && rootPageViewRuntime.runtime.nodeMap.has(PageView.nodeId)) {
        const pageViewNode = rootPageViewRuntime.runtime.nodeMap.get(PageView.nodeId);
        
        container.innerHTML = ''; 
        container.appendChild(pageViewNode);
    }

    return { 
        router, 
        Link,
        destroy: () => {
            router.destroy();
            if (rootPageViewRuntime && typeof rootPageViewRuntime.destroy === 'function') {
                rootPageViewRuntime.destroy();
            }
        }
    };
}

const ChainUI = { h, createState, createComponent, createApp, createRouter, map, mount, render };
export default ChainUI;
