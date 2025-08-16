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

 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,

 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE

 * SOFTWARE.

 */

/**
 * Safely converts a value to its string representation.

 * For objects, it attempts to use JSON.stringify, falling back to String().

 * @param {*} value The value to convert.

 * @returns {string} The string representation of the value.

 */
export function valueToString(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return String(value);
        }
    }
    return String(value);
}

/**
 * Defines all operation types that the rendering engine can execute.

 * @enum {string}

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
    INIT_ROUTER: 'INIT_ROUTER'
};

let globalIdCounter = 0;
/**
 * Generates a globally unique ID with a given prefix.

 * @param {string} prefix The prefix for the ID.

 * @returns {string} The generated unique ID.

 */
export const generateId = (prefix) => `${prefix}-${globalIdCounter++}`;

/**
 * @typedef {object} ChainState

 * @property {*} value The current value of the state.

 * @property {function(function(*): *|*): void} update Updates the state's value. It can take a new value or an updater function.

 * @property {function(function(*): void): function(): void} subscribe Subscribes to state changes, returning an unsubscribe function.

 * @property {function(): string} toString Returns the string representation of the state's value.

 * @property {function(function(*): *): ChainState} map Creates a new derived state by applying a mapping function.

 */

/**
 * Creates and manages a reactive state object.

 * @param {*} initialValue The initial value of the state.

 * @returns {ChainState} A state object.

 * @example

 * // Create a state for a counter

 * const count = createState(0);

 *
 * // Subscribe to changes

 * const unsubscribe = count.subscribe(newValue => console.log(`Count is: ${newValue}`));

 *
 * // Update the value directly

 * count.value = 1; // Logs: "Count is: 1"

 *
 * // Update using a function

 * count.update(c => c + 1); // Logs: "Count is: 2"

 *
 * // Unsubscribe when no longer needed

 * unsubscribe();

 */
export function createState(initialValue) {
    let currentValue = initialValue;
    const subscribers = new Set();

    const state = {
        get value() {
            return currentValue;
        },
        set value(newValue) {
            if (Object.is(currentValue, newValue)) return;
            currentValue = newValue;
            subscribers.forEach(sub => sub(currentValue));
        },
        update(updater) {
            this.value = typeof updater === 'function' ? updater(this.value) : updater;
        },
        subscribe(callback) {
            subscribers.add(callback);
            callback(currentValue);
            return () => subscribers.delete(callback);
        },
        toString() {
            return valueToString(currentValue);
        },
        map(mapperFn) {
            const mappedState = createState(mapperFn(currentValue));
            this.subscribe(newValue => {
                mappedState.update(mapperFn(newValue));
            });
            mappedState.isMapped = true;
            return mappedState;
        }
    };
    return state;
}

/**
 * Manages a queue of operations for batch processing of DOM updates.

 */
export class OperationStream {
    constructor() {
        this.operations = [];
    }

    /**
     * Adds an operation to the stream, optimizing consecutive operations.

     * @param {object} operation The operation to add.

     * @modifies {this}

     */
    add(operation) {
        const lastOp = this.operations[this.operations.length - 1];

        // Optimize consecutive SET_ATTRIBUTE operations on the same node and attribute
        if (lastOp &&
            operation.nodeId === lastOp.nodeId &&
            operation.type === OperationType.SET_ATTRIBUTE &&
            lastOp.type === OperationType.SET_ATTRIBUTE &&
            operation.name === lastOp.name) {
            lastOp.value = operation.value;
            return;
        }

        // Optimize consecutive SET_STYLE operations on the same node and property
        if (lastOp &&
            operation.nodeId === lastOp.nodeId &&
            operation.type === OperationType.SET_STYLE &&
            lastOp.type === OperationType.SET_STYLE &&
            operation.property === lastOp.property) {
            lastOp.value = operation.value;
            return;
        }

        this.operations.push(operation);
    }

    getOperations() {
        return this.operations;
    }

    clear() {
        this.operations = [];
    }

    /**
     * Serializes the operation stream to a JSON string for SSR.

     * @returns {string} The serialized JSON string.

     */
    serialize() {
        const serializable = this.operations.map(op => {
            if (op.type === OperationType.ADD_EVENT_LISTENER) {
                const { handler, ...rest } = op;
                return rest;
            }
            return op;
        });
        return JSON.stringify(serializable);
    }

    /**
     * Deserializes an operation stream from a JSON string.

     * @param {string} json The serialized JSON string.

     * @returns {OperationStream} A new OperationStream instance.

     */
    static deserialize(json) {
        const stream = new OperationStream();
        stream.operations = JSON.parse(json);
        return stream;
    }
}

/**
 * Represents a DOM element that can be constructed through chainable method calls.

 */
export class ChainElement {
    /**
     * @param {string} [tagName] The HTML tag name for the element.

     */
    constructor(tagName) {
        this.nodeId = generateId('node');
        this.stream = new OperationStream();
        this.children = [];
        this.eventHandlers = [];

        if (tagName) {
            this.tagName = tagName;
            this.stream.add({ type: OperationType.CREATE_ELEMENT, nodeId: this.nodeId, tagName });
        }
    }

    /**
     * Binds a value (which may be a reactive state) to an update function.

     * @private

     * @param {*} value The value or state to bind.

     * @param {function(any, OperationStream): void} updateFn The function to call on update.

     * @returns {this}

     * @modifies {this}

     */
    _bind(value, updateFn) {
        if (value && typeof value.subscribe === 'function') {
            const stateId = generateId('state');
            updateFn(value.value, this.stream); // Apply initial value immediately
            this.stream.add({
                type: OperationType.BIND_STATE,
                nodeId: this.nodeId,
                stateId,
                updateFn,
                state: value
            });
        } else {
            updateFn(value, this.stream);
        }
        return this;
    }

    /**
     * Sets attributes, styles, or classes on the element in a unified way.

     * @param {string|object} name The attribute name, or an object containing attr, style, and class properties.

     * @param {*} [value] The value to set (when name is a string).

     * @param {'attr'|'style'|'class'} [type] The type of property to set (when name is a string).

     * @returns {this}

     * @modifies {this}

     * @example

     * // Set a single attribute

     * el.set('id', 'my-element');

 *
     * // Set a style property

     * el.set('color', 'red', 'style');

 *
     * // Set a class

     * el.set('active', true, 'class');

 *
     * // Set multiple properties at once

     * el.set({

     *   attr: { id: 'my-element', 'data-value': 42 },

     *   style: { color: 'red', backgroundColor: 'blue' },

     *   class: { active: true, disabled: false }

     * });

 *
     * // Set classes as array

     * el.set({ class: ['class1', 'class2'] });

 *
     * // Set classes as string

     * el.set({ class: 'my-class' });

     */
    set(name, value, type) {
        // Handle object form: set({ attr, style, class })
        if (typeof name === 'object' && name !== null && arguments.length === 1) {
            const config = name;
            
            // Handle attributes
            if (config.attr) {
                Object.entries(config.attr).forEach(([attrName, attrValue]) => {
                    this.set(attrName, attrValue, 'attr');
                });
            }
            
            // Handle styles
            if (config.style) {
                Object.entries(config.style).forEach(([styleName, styleValue]) => {
                    this.set(styleName, styleValue, 'style');
                });
            }
            
            // Handle classes
            if (config.class !== undefined) {
                if (typeof config.class === 'string') {
                    // Single class name
                    this.set(config.class, true, 'class');
                } else if (Array.isArray(config.class)) {
                    // Array of class names
                    config.class.forEach(className => {
                        this.set(className, true, 'class');
                    });
                } else if (typeof config.class === 'object' && config.class !== null) {
                    // Object mapping class names to boolean values
                    Object.entries(config.class).forEach(([className, shouldAdd]) => {
                        this.set(className, shouldAdd, 'class');
                    });
                }
            }
            
            return this;
        }
        
        // Handle string form: set(name, value, type)
        if (typeof name === 'string') {
            // Auto-detect type if not provided
            if (!type) {
                if (name.startsWith('data-') || name.includes('-')) {
                    type = 'attr';
                } else if (name in document.documentElement.style) {
                    type = 'style';
                } else {
                    type = 'attr';
                }
            }
            
            const nodeId = this.nodeId;
            
            switch (type) {
                case 'style':
                    return this._bind(value, function(val, updateStream) {
                        updateStream.add({ type: OperationType.SET_STYLE, nodeId, property: name, value: val });
                    });
                    
                case 'class':
                    if (value === null || value === false) {
                        // Remove class
                        this.stream.add({ type: OperationType.REMOVE_CLASS, nodeId, className: name });
                    } else {
                        // Add class - handle multiple classes separated by space
                        name.split(' ').filter(Boolean).forEach(singleClassName => {
                            this.stream.add({ type: OperationType.ADD_CLASS, nodeId, className: singleClassName });
                        });
                    }
                    return this;
                    
                case 'attr':
                default:
                    // Handle reactive state binding for direct state objects (not mapped)
                    if (value && typeof value.subscribe === 'function' && !value.isMapped) {
                        const initialValue = valueToString(value.value);
                        this.stream.add({ type: OperationType.SET_ATTRIBUTE, nodeId, name, value: initialValue });
                        this.stream.add({
                            type: OperationType.BIND_ATTRIBUTE,
                            nodeId: this.nodeId,
                            name,
                            state: value,
                            stateId: generateId('attr_state')
                        });
                        return this;
                    }
                    
                    // Handle null/undefined values - remove attribute
                    if (value == null) {
                        this.stream.add({ type: OperationType.REMOVE_ATTRIBUTE, nodeId, name });
                        return this;
                    }
                    
                    // Handle static values and mapped states
                    return this._bind(value, function(val, updateStream) {
                        const processedValue = valueToString(val);
                        updateStream.add({ type: OperationType.SET_ATTRIBUTE, nodeId, name, value: processedValue });
                    });
            }
        }
        
        return this;
    }



    /**
     * Adds an event listener to the element.

     * @param {string} eventType The event type (e.g., 'click').

     * @param {(event: Event) => void} handler The event handler function.

     * @returns {this}

     * @modifies {this}

     */
    on(eventType, handler) {
        const actionId = generateId('action');
        this.stream.add({
            type: OperationType.ADD_EVENT_LISTENER,
            nodeId: this.nodeId,
            eventType,
            actionId
        });
        this.eventHandlers.push({ actionId, handler });
        return this;
    }

    /**
     * Appends one or more child elements.

     * @param {...(ChainElement|string|number|ChainState)} children Child elements. Can be ChainElement instances, strings, numbers, or reactive states.

     * @returns {this}

     * @modifies {this}

     */
    child(...children) {
        children.flat().forEach(childNode => {
            if (childNode instanceof ChainElement) {
                this.children.push(childNode);
                this.stream.operations.push(...childNode.stream.getOperations());
                this.stream.add({ type: OperationType.APPEND_CHILD, parentId: this.nodeId, childId: childNode.nodeId });
                this.eventHandlers.push(...childNode.eventHandlers);
            } else if (typeof childNode === 'string' || typeof childNode === 'number' || (childNode && typeof childNode.subscribe === 'function')) {
                // Handle text content directly
                const textNodeId = generateId('text');
                const initialContent = (childNode && typeof childNode.subscribe === 'function') ? childNode.value : childNode;
                const processedContent = valueToString(initialContent);

                this.stream.add({ type: OperationType.CREATE_TEXT_NODE, nodeId: textNodeId, content: processedContent });
                this.stream.add({ type: OperationType.APPEND_CHILD, parentId: this.nodeId, childId: textNodeId });

                if (childNode && typeof childNode.subscribe === 'function') {
                    this.stream.add({
                        type: OperationType.BIND_STATE,
                        nodeId: this.nodeId,
                        stateId: generateId('state'),
                        updateFn: function(val, updateStream) {
                            updateStream.add({ type: OperationType.SET_TEXT_CONTENT, nodeId: textNodeId, content: valueToString(val) });
                        },
                        state: childNode
                    });
                }
            }
        });
        return this;
    }


    /**
     * Mounts the current element to a specified DOM selector.

     * @param {string} selector A CSS selector for the container element.

     */
    mount(selector) {
        this.stream.add({ type: OperationType.MOUNT, nodeId: this.nodeId, selector });
    }

    /**
     * Conditionally renders one of two components based on a reactive state's value.

     * @param {ChainState} state The reactive state to evaluate.

     * @param {() => ChainElement} trueFactory A factory function that returns a component when the state is truthy.

     * @param {() => ChainElement} [falseFactory] A factory function for the falsy case.

     * @param {{keepAlive?: boolean}} [options] Options. If `keepAlive` is true, both components are rendered and toggled via CSS display.

     * @returns {this}

     * @modifies {this}

     */
    when(state, trueFactory, falseFactory, options = {}) {
        const { keepAlive = false } = options;
        
        if (keepAlive) {
            const trueComponent = trueFactory();
            const falseComponent = falseFactory ? falseFactory() : null;
            
            if (trueComponent) {
                trueComponent.style('display', state.map(v => v ? 'block' : 'none'));
                this.child(trueComponent);
            }
            
            if (falseComponent) {
                falseComponent.style('display', state.map(v => v ? 'none' : 'block'));
                this.child(falseComponent);
            }
        } else {
            const placeholder = new ChainElement('div').set('data-chain-placeholder', 'true', 'attr');
            this.child(placeholder);
    
            const updateFn = function(value) {
                const parentNode = this.nodeMap.get(placeholder.nodeId);
                if (!parentNode) return;
                
                const oldChildId = parentNode.dataset.childNodeId;
                if (oldChildId) {
                    const oldChildNode = this.nodeMap.get(oldChildId);
                    if (oldChildNode && parentNode.contains(oldChildNode)) {
                       parentNode.removeChild(oldChildNode);
                    }
                    delete parentNode.dataset.childNodeId;
                }

                const factoryToUse = value ? trueFactory : falseFactory;

                if (factoryToUse) {
                    const newComponent = factoryToUse(value);
                    if (newComponent) {
                        this.execute(newComponent.stream.getOperations(), true);
                        const newNode = this.nodeMap.get(newComponent.nodeId);
                        if (newNode) {
                            parentNode.appendChild(newNode);
                            parentNode.dataset.childNodeId = newComponent.nodeId;
                            newComponent.stream.getOperations()
                                .filter(op => op.type === OperationType.BIND_STATE || op.type === OperationType.BIND_LIST)
                                .forEach(op => this.applyOperation(op));
                            
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
                updateFn: updateFn,
                state: state
            });
        }

        return this;
    }
}

/**
 * The client-side runtime, responsible for executing operation streams to manipulate the real DOM.

 */
export class ChainRuntime {
    constructor() {
        this.nodeMap = new Map();
        this.stateSubscriptions = new Map();
        this.eventDelegator = new EventDelegator(this);
        this.batchQueue = [];
        this.isBatchingScheduled = false;
        this.animationFrameId = null;
    }

    /**
     * Executes a queue of operations.

     * @param {object[]} operations An array of operation objects.

     * @param {boolean} [immediate=false] If true, executes operations immediately instead of batching.

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
     * Schedules batch execution using requestAnimationFrame for performance optimization.

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
     * Applies a single operation to the DOM.

     * @param {object} op The operation object.

     */
    applyOperation(op) {
        const handlers = {
            [OperationType.CREATE_ELEMENT]: () => {
                const el = document.createElement(op.tagName);
                el.dataset.chainId = op.nodeId;
                this.nodeMap.set(op.nodeId, el);
            },
            [OperationType.CREATE_TEXT_NODE]: () => this.nodeMap.set(op.nodeId, document.createTextNode(op.content)),
            [OperationType.SET_TEXT_CONTENT]: () => {
                const node = this.nodeMap.get(op.nodeId);
                if (node) node.textContent = op.content;
            },
            [OperationType.APPEND_CHILD]: () => {
                const parent = this.nodeMap.get(op.parentId);
                const child = this.nodeMap.get(op.childId);
                if (parent && child) parent.appendChild(child);
            },
            [OperationType.SET_ATTRIBUTE]: () => {
                const node = this.nodeMap.get(op.nodeId);
                if (node) {
                    if (op.name === 'value' && (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement)) {
                        node.value = op.value;
                    } else if (op.name === 'disabled' && (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLButtonElement)) {
                        node.disabled = op.value;
                    } else {
                        node.setAttribute(op.name, op.value);
                    }
                }
            },
            [OperationType.SET_STYLE]: () => {
                const node = this.nodeMap.get(op.nodeId);
                if (node) node.style[op.property] = op.value;
            },
            [OperationType.ADD_CLASS]: () => {
                const node = this.nodeMap.get(op.nodeId);
                if (node) node.classList.add(op.className);
            },
            [OperationType.REMOVE_CLASS]: () => {
                const node = this.nodeMap.get(op.nodeId);
                if (node) node.classList.remove(op.className);
            },
            [OperationType.ADD_EVENT_LISTENER]: () => {
                const node = this.nodeMap.get(op.nodeId);
                if (node) {
                    node.setAttribute('data-chain-action', op.actionId);
                    this.eventDelegator.delegate(op.eventType);
                }
            },
            [OperationType.BIND_STATE]: () => {
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
                }
            },
            [OperationType.BIND_ATTRIBUTE]: () => {
                const node = this.nodeMap.get(op.nodeId);
                if (node && op.state && typeof op.state.subscribe === 'function') {
                    const unsubscribe = op.state.subscribe(newValue => {
                        if (op.name === 'disabled' && (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLButtonElement)) {
                            node.disabled = !!newValue;
                        } else {
                            node.setAttribute(op.name, valueToString(newValue));
                        }
                    });
                    this.stateSubscriptions.set(op.stateId, unsubscribe);
                }
            },
            [OperationType.BIND_LIST]: () => {
                if (op.state && typeof op.state.subscribe === 'function') {
                    const unsubscribe = op.state.subscribe(items => {
                        this.reconcileList(op.nodeId, items, op.factory);
                    });
                    this.stateSubscriptions.set(generateId('sub'), unsubscribe);
                }
            },
            [OperationType.MOUNT]: () => {
                const container = document.querySelector(op.selector);
                const node = this.nodeMap.get(op.nodeId);
                if (container && node) {
                    container.innerHTML = '';
                    container.appendChild(node);
                }
            },
            [OperationType.INSERT_BEFORE]: () => {
                const parent = this.nodeMap.get(op.parentId);
                const child = this.nodeMap.get(op.childId);
                const anchor = this.nodeMap.get(op.anchorId);
                if (parent && child && anchor) parent.insertBefore(child, anchor);
            },
            [OperationType.REMOVE_CHILD]: () => {
                const parent = this.nodeMap.get(op.parentId);
                const child = this.nodeMap.get(op.childId);
                if (parent && child) {
                    this.cleanupNodeTree(child);
                    parent.removeChild(child);
                }
            },
            [OperationType.ROUTE_CHANGE]: () => {
                console.log('Route change operation:', op);
            },
            [OperationType.ROUTE_MATCH]: () => {
                console.log('Route match operation:', op);
            },
            [OperationType.INIT_ROUTER]: () => {
                const node = this.nodeMap.get(op.nodeId);
                if (node && op.router) {
                    op.router.init(node);
                }
            }
        };

        const handler = handlers[op.type];
        if (handler) {
            handler();
        }
    }

    /**
     * List reconciliation algorithm for efficiently updating lists of elements.

     * Uses a key-based strategy for minimal DOM operations.

     *
     * Algorithm:

     * 1. Create a map of existing child nodes by their `data-key` attribute.

     * 2. For each new item:

     *    - Generate a key (from `item.id` or index).

     *    - If the key exists in the map, reuse the corresponding DOM node.

     *    - Otherwise, create a new element using the factory function and apply its operations.

     * 3. Remove any old nodes that were not reused.

     * 4. Reorder the DOM nodes to match the new item order.

     *
     * @param {string} parentNodeId The node ID of the list container.

     * @param {any[]} newItems The new array of data items.

     * @param {(item: any, index: number) => ChainElement} factory A factory function to create child elements.

     */
    /**
     * Cleans up a node and its entire subtree before removal.

     * This includes unregistering event handlers and removing nodes from the nodeMap.

     * @param {Node} node The root node of the subtree to clean up.

     */
    cleanupNodeTree(node) {
        if (!node) return;

        this.eventDelegator.clearHandlersForNode(node);

        const nodesToClean = (typeof node.querySelectorAll === 'function') ? [node, ...node.querySelectorAll('[data-chain-id]')] : [];
        
        nodesToClean.forEach(el => {
            if (el.dataset && el.dataset.chainId) {
                this.nodeMap.delete(el.dataset.chainId);
            }
        });
    }

    reconcileList(parentNodeId, newItems, factory) {
        const parentNode = this.nodeMap.get(parentNodeId);
        if (!parentNode) return;

        const oldChildren = Array.from(parentNode.childNodes);
        const oldkeyedNodes = new Map();
        
        for (const node of oldChildren) {
            const element = node;
            if (element.dataset && element.dataset.key) {
                oldkeyedNodes.set(element.dataset.key, node);
            }
        }
        
        const newDomNodes = [];

        for (let i = 0; i < newItems.length; i++) {
            const item = newItems[i];
            const index = i;
            const key = String(item.id ?? index);
            let domNode = oldkeyedNodes.get(key);

            if (domNode) {
                oldkeyedNodes.delete(key);
            } else {
                const newElement = factory(item, index).set('data-key', key, 'attr');
                this.execute(newElement.stream.getOperations(), true);
                domNode = this.nodeMap.get(newElement.nodeId);

                this.eventDelegator.registerHandlers(newElement.eventHandlers);
                newElement.stream.getOperations()
                    .filter(op => op.type === OperationType.BIND_STATE || op.type === OperationType.BIND_LIST)
                    .forEach(op => this.applyOperation(op));
            }
            newDomNodes.push(domNode);
        }

        for (const unusedNode of oldkeyedNodes.values()) {
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
     * Destroys the runtime, cleaning up all subscriptions and references.

     */
    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.batchQueue = [];
        this.isBatchingScheduled = false;

        this.eventDelegator.destroy();
        this.stateSubscriptions.forEach(unsubscribe => unsubscribe());
        this.nodeMap.clear();
        this.stateSubscriptions.clear();
    }
}

/**
 * Handles events efficiently using the event delegation pattern.

 */
export class EventDelegator {
    constructor(runtime) {
        this.runtime = runtime;
        this.delegatedEvents = new Set();
        this.handlerMap = new Map();
    }

    registerHandlers(handlers) {
        handlers.forEach(({ actionId, handler }) => {
            this.handlerMap.set(actionId, handler);
        });
    }

    /**
     * Clears all event handlers associated with a DOM node and its descendants.

     * @param {Node} node The root node of the subtree to clear handlers from.

     */
    clearHandlersForNode(node) {
        if (!node || typeof node.querySelectorAll !== 'function') return;
        const nodesToClean = [node, ...node.querySelectorAll('[data-chain-action]')];
        nodesToClean.forEach(el => {
            if (el.hasAttribute && el.hasAttribute('data-chain-action')) {
                const actionId = el.getAttribute('data-chain-action');
                if (actionId) {
                    this.handlerMap.delete(actionId);
                }
            }
        });
    }

    /**
     * Sets up a delegated event listener on document.body for a specific event type.

     * @param {string} eventType The event type.

     */
    delegate(eventType) {
        if (this.delegatedEvents.has(eventType)) return;
        document.body.addEventListener(eventType, this.handleEvent.bind(this), true);
        this.delegatedEvents.add(eventType);
    }

    handleEvent(e) {
        let target = e.target;
        while (target && target !== document.body) {
            const actionId = target.getAttribute('data-chain-action');
            if (actionId && this.handlerMap.has(actionId)) {
                this.handlerMap.get(actionId)(e);
                return;
            }
            target = target.parentElement;
        }
    }

    destroy() {
        this.delegatedEvents.clear();
        this.handlerMap.clear();
    }
}

/**
 * Factory function for creating ChainElement instances. Syntactic sugar for `new ChainElement(tagName)`.

 * @param {string} tagName The HTML tag name of the element.

 * @returns {ChainElement} A new ChainElement instance.

 * @example

 * // Creates a <div> element

 * const myDiv = h('div');

 */
export function h(tagName) {
    return new ChainElement(tagName);
}


/**
 * Mounts a component to a specified location in the DOM.

 * @param {ChainElement} component The component instance to mount.

 * @param {string} selector The CSS selector for the target container.

 * @param {object} [ssrData] Data provided by server-side rendering for hydration.

 * @returns {ChainRuntime} The created runtime instance.

 */
export function mount(component, selector, ssrData = {}) {
    const runtime = new ChainRuntime();

    runtime.eventDelegator.registerHandlers(component.eventHandlers);

    if (ssrData.state) {
        const states = new Map(Object.entries(ssrData.state));
        component.stream.getOperations()
            .filter(op => op.type === OperationType.BIND_STATE)
            .forEach(op => {
                if (states.has(op.stateId)) {
                    op.state.value = states.get(op.stateId);
                }
            });
    }

    if (ssrData.stream) {
        const stream = OperationStream.deserialize(ssrData.stream);
        runtime.execute(stream.getOperations(), true);
    } else {
        runtime.execute(component.stream.getOperations(), true);
    }
    
    const rootNode = runtime.nodeMap.get(component.nodeId);
    const container = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (container && rootNode) {
        container.innerHTML = '';
        container.appendChild(rootNode);
    }

    component.stream.getOperations()
        .filter(op => op.type === OperationType.BIND_STATE || op.type === OperationType.BIND_LIST)
        .forEach(op => runtime.applyOperation(op));

    return runtime;
}

/**
 * Serializes a component for server-side rendering.

 * @param {function(): ChainElement} componentFactory A factory function that returns the component to render.

 * @returns {{stream: string, state: object, rootId: string}} An object containing the serialized stream, state, and root node ID.

 */
export function renderToStream(componentFactory) {
    const component = componentFactory();
    const { stream } = component;
    const states = {};
    let rootNodeId = null;

    stream.getOperations().forEach(op => {
        if (op.type === OperationType.BIND_STATE) {
            states[op.stateId] = op.state.value;
        }
        if (op.type === OperationType.CREATE_ELEMENT && !rootNodeId) {
            rootNodeId = op.nodeId;
        }
    });

    const serializedStream = stream.serialize();

    return { 
        stream: serializedStream, 
        state: states,
        rootId: rootNodeId 
    };
}

/**
 * Dynamically renders a list of elements from a reactive array state.

 * @param {ChainState} stateArray The reactive state containing an array.

 * @param {(item: any, index: number) => ChainElement} factory A factory function that receives an array item and its index, and returns a ChainElement.

 * @returns {ChainElement} A container element that will manage the list rendering.

 * @example

 * const items = createState([{id: 1, text: 'A'}, {id: 2, text: 'B'}]);

 * const list = map(items, item => h('li').set('data-key', item.id, 'attr').child(item.text));

 * // `list` is a <div> that will contain <li> elements for each item.

 */
export function map(stateArray, factory) {
    const container = new ChainElement('div');

    container.stream.add({
        type: OperationType.BIND_LIST,
        nodeId: container.nodeId,
        state: stateArray,
        factory: factory
    });

    return container;
}

/**
 * Creates a reusable component.

 * @param {string} name The component name, which will be added as a `data-component` attribute to the root element.

 * @param {(...args: any[]) => ChainElement} factory A factory function that creates the component's UI.

 * @returns {(...args: any[]) => ChainElement} A new component function.

 * @example

 * const Button = createComponent('Button', (label) => {

 *   return h('button').child(label).on('click', () => alert('Clicked!'));

 * });

 *
 * const myButton = Button('Click Me');

 */
export function createComponent(name, factory) {
    return (...args) => {
        const componentRoot = factory(...args);
        componentRoot.set('data-component', name, 'attr');
        return componentRoot;
    };
}

/**
 * Abstract History Controller
 * Provides a common interface for managing navigation history in different environments.
 */
export class HistoryController {
  constructor() {
    this.listeners = new Set();
  }

  listen(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(location) {
    this.listeners.forEach(listener => listener(location));
  }

  /**
   * Navigates to a new path. To be implemented by subclasses.
   * @param {string} path The path to navigate to.
   * @param {object} state The state object to associate with the history entry.
   * @param {boolean} replace Whether to replace the current history entry.
   */
  navigate(path, state, replace) { throw new Error("Not implemented"); }
  
  /**
   * Gets the current location. To be implemented by subclasses.
   * @returns {{path: string, state: object}} The current location object.
   */
  getLocation() { throw new Error("Not implemented"); }
  
  /**
   * Navigates back in history. To be implemented by subclasses.
   */
  goBack() { throw new Error("Not implemented"); }
}

/**
 * Browser History Controller
 * Implements history management using the browser's History API.
 */
export class BrowserHistory extends HistoryController {
  constructor() {
    super();
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', (event) => {
        this.notify({
          path: window.location.pathname + window.location.search,
          state: event.state
        });
      });
    }
  }

  /**
   * Navigates to a new path using the browser's History API.
   * @param {string} path The path to navigate to.
   * @param {object} [state={}] The state object to associate with the history entry.
   * @param {boolean} [replace=false] Whether to replace the current history entry.
   */
  navigate(path, state = {}, replace = false) {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath === path) {
        return;
    }
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method](state, '', path);
    this.notify({ path, state });
  }

  /**
   * Gets the current browser location.
   * @returns {{path: string, state: object}} The current location object.
   */
  getLocation() {
    if (typeof window === 'undefined') return { path: '/', state: {} };
    return {
      path: window.location.pathname + window.location.search,
      state: window.history.state || {}
    };
  }

  /**
   * Navigates back in browser history.
   */
  goBack() {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }
}

/**
 * Server/Memory History Controller
 * Implements an in-memory history for non-browser environments (e.g., SSR, testing).
 */
export class ServerHistory extends HistoryController {
  /**
   * @param {string} [initialPath='/'] The initial path for the in-memory history.
   */
  constructor(initialPath = '/') {
    super();
    this.stack = [{ path: initialPath, state: {} }];
    this.index = 0;
  }

  /**
   * Navigates to a new path in the in-memory history.
   * @param {string} path The path to navigate to.
   * @param {object} [state={}] The state object to associate with the history entry.
   * @param {boolean} [replace=false] Whether to replace the current history entry.
   */
  navigate(path, state = {}, replace = false) {
    if (replace) {
      this.stack[this.index] = { path, state };
    } else {
      this.stack = this.stack.slice(0, this.index + 1);
      this.stack.push({ path, state });
      this.index++;
    }
    this.notify(this.stack[this.index]);
  }

  /**
   * Gets the current location from the in-memory history.
   * @returns {{path: string, state: object}} The current location object.
   */
  getLocation() {
    return this.stack[this.index];
  }

  /**
   * Navigates back in the in-memory history.
   */
  goBack() {
    if (this.index > 0) {
      this.index--;
      this.notify(this.stack[this.index]);
    }
  }
}

/**
 * ChainPageRouter manages client-side routing for ChainUI applications.
 * It supports declarative route registration, dynamic path segments, and lifecycle hooks.
 */
export class ChainPageRouter {
  /**
   * @param {object} [options={}] Router options.
   * @param {HistoryController} [options.history] Custom history controller. Defaults to BrowserHistory or ServerHistory.
   * @param {function(string): string} [options.normalizePath] Function to normalize paths.
   * @param {string} [options.initialPath] Initial path for ServerHistory.
   */
  constructor(options = {}) {
    this.pages = new Map();
    this.currentPage = createState({ id: null, params: {} });
    this._runtimeCache = new WeakMap();
    
    this.history = options.history || (typeof window !== 'undefined' ? new BrowserHistory() : new ServerHistory(options.initialPath));
    this.normalizePath = options.normalizePath || ((path) => path);
    
    this._initEventDelegation();
  }

  /**
   * Initializes the router, attaching it to the root container and handling initial page load.
   * @param {Element} rootContainer The root DOM element for the application.
   */
  init(rootContainer) {
    this.root = rootContainer;
    this.root.dataset.chainRouter = 'root';
    let previousPage = { id: null, factory: null };

    this.currentPage.subscribe(({ id: pageId, params }) => {
      if (previousPage.id && previousPage.factory) {
        const oldPageConfig = this.pages.get(previousPage.id);
        const cachedRuntime = this._runtimeCache.get(previousPage.factory);

        if (cachedRuntime && cachedRuntime.runtime) {
          const oldNode = cachedRuntime.runtime.nodeMap.get(cachedRuntime.runtime.rootNodeId);
          if (oldPageConfig && !oldPageConfig.options.keepAlive) {
            if (oldNode && oldNode.parentNode === this.root) {
              this.root.removeChild(oldNode);
            }
            cachedRuntime.runtime.destroy();
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
          cached.runtime.destroy();
          this._runtimeCache.delete(factory);
          cached = null;
        }

        if (!cached) {
          const component = factory(params);
          const runtime = new ChainRuntime();
          runtime.rootNodeId = component.nodeId;
          runtime.eventDelegator.registerHandlers(component.eventHandlers);
          runtime.execute(component.stream.getOperations(), true);

          const newNode = runtime.nodeMap.get(component.nodeId);
          if (this.root && newNode) {
            this.root.appendChild(newNode);
          }

          component.stream.getOperations()
            .filter(op => op.type === OperationType.BIND_STATE || op.type === OperationType.BIND_LIST)
            .forEach(op => runtime.applyOperation(op));

          this._runtimeCache.set(factory, { runtime, params });
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

    this.history.listen((location) => this._handleLocationChange(location));
    this._handleLocationChange(this.history.getLocation());
  }

  /**
   * Registers a new page route.
   * @param {string} path The route path (e.g., '/users/:id').
   * @param {function(object): ChainElement} componentFactory A factory function that returns the component for this route.
   * @param {object} [options] Route options.
   * @param {boolean} [options.keepAlive=false] If true, the page instance is kept alive when navigating away.
   * @param {function(object, object): boolean} [options.beforeEnter] A guard function called before entering the route.
   * @param {function(object, object): void} [options.onLeave] A hook function called when leaving the route.
   */
  register(path, componentFactory, options = {}) {
    if (this.pages.has(path)) {
      console.warn(`Route already registered: ${path}`);
      return;
    }

    const paramNames = [];
    const regexPath = path.replace(/:(\w+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });

    this.pages.set(path, {
      factory: componentFactory,
      options: {
        keepAlive: false,
        ...options
      },
      regex: new RegExp(`^${regexPath}$`),
      paramNames
    });
    return this;
  }

  /**
   * Navigates to a specified route.
   * @param {string} path The target route path.
   * @param {object} [params={}] Parameters for dynamic route segments or query strings.
   * @param {boolean} [replace=false] If true, replaces the current history entry instead of pushing a new one.
   * @returns {this}
   */
  navigate(path, params = {}, replace = false) {
    const { route, resolvedParams } = this._matchRoute(path);
    if (!route) {
      if (this.pages.has(path)) {
          const matchedRoute = this.pages.get(path);
          this.currentPage.value = { id: path, params };
          return;
      }
      throw new Error(`Unknown route: ${path}`);
    }
    
    const finalParams = { ...resolvedParams, ...params };
    const pageId = route.path;

    const currentState = this.currentPage.value;
    if (currentState.id === pageId && JSON.stringify(currentState.params) === JSON.stringify(finalParams)) {
      return this;
    }

    if (route.options.beforeEnter) {
      const canEnter = route.options.beforeEnter(finalParams, currentState);
      if (!canEnter) {
        return this;
      }
    }
    
    if (currentState.id && this.pages.has(currentState.id)) {
        const oldRoute = this.pages.get(currentState.id);
        if (oldRoute.options.onLeave) {
            oldRoute.options.onLeave(currentState.params, { id: pageId, params: finalParams });
        }
    }

    let finalPath = path;
    if (Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams(params);
        finalPath += `?${searchParams.toString()}`;
    }

    this.history.navigate(finalPath, { pageId, params: finalParams }, replace);

    const event = new CustomEvent('chain:pagenavigate', {
      detail: { pageId, params }
    });
    if (typeof document !== 'undefined') {
      document.dispatchEvent(event);
    }
    return this;
  }

  /**
   * Navigates back in history.
   */
  goBack() {
    this.history.goBack();
  }

  /**
   * Closes a specific page by removing it from the cache.
   * @param {string} pageId The ID of the page to close.
   */
  closePage(pageId) {
    const pageInfo = this.pages.get(pageId);
    if (!pageInfo) return;
    
    const runtime = this._runtimeCache.get(pageInfo.factory);
    if (runtime) {
      runtime.destroy();
      this._runtimeCache.delete(pageInfo.factory);
    }
    
    this.pageStack = this.pageStack.filter(id => id !== pageId);
  }

  /**
   * Gets the current page information.
   * @returns {{id: string|null, params: object}} The current page ID and its parameters.
   */
  getCurrentPage() {
    return this.currentPage.value;
  }

  /**
   * Initializes event delegation for router links and back button.
   * @private
   */
  _initEventDelegation() {
    if (typeof document !== 'undefined') {
        document.addEventListener('click', e => {
          const link = e.target.closest('[data-chain-route]');
          if (link) {
            e.preventDefault();
            const path = link.getAttribute('href');
            this.navigate(path);
          }
        });
    }
    
    document.addEventListener('chain:backpress', () => this.goBack());
  }

  /**
   * Matches a given path against registered routes.
   * @param {string} path The path to match.
   * @returns {{route: object|null, resolvedParams: object|null, path: string|null}} The matched route, resolved parameters, and route path.
   * @private
   */
  _matchRoute(path) {
    const [pathname] = path.split('?');
    for (const [routePath, route] of this.pages.entries()) {
      const match = pathname.match(route.regex);
      if (match) {
        const resolvedParams = {};
        route.paramNames.forEach((name, index) => {
          resolvedParams[name] = match[index + 1];
        });
        return { route, resolvedParams, path: routePath };
      }
    }
    return { route: null, resolvedParams: null, path: null };
  }

  /**
   * Handles location changes from the history controller.
   * @param {{path: string, state: object}} location The new location.
   * @private
   */
  _handleLocationChange(location) {
    if (!location || !location.path) return;

    const currentPath = this.normalizePath(location.path);

    const { route, resolvedParams, path: pageId } = this._matchRoute(currentPath);
    
    if (route) {
      const searchParams = new URLSearchParams(location.path.split('?')[1] || '');
      const queryParams = Object.fromEntries(searchParams.entries());
      const finalParams = { ...resolvedParams, ...queryParams };

      const currentPageState = this.currentPage.value;
      if (currentPageState.id === pageId && JSON.stringify(currentPageState.params) === JSON.stringify(finalParams)) {
        return;
      }
      
      this.currentPage.value = { id: pageId, params: finalParams };
    } else {
      console.warn(`No route registered for path: ${location.path}. Navigating to root path '/'.`);
      this.navigate('/', {}, true);
    }
  }

  /**
   * Renders a blank page.
   * @private
   */
  _renderBlank() {
    if (this.root.firstChild) {
      this.root.innerHTML = '';
    }
  }

  /**
   * Renders a fallback 404 page.
   * @private
   */
  _renderFallback() {
    this._renderBlank();
    this.root.innerHTML = '<div>404 - Page not found</div>';
  }

  /**
   * Internal method to close a page and dispatch an event.
   * @param {string} pageId The ID of the page to close.
   * @private
   */
  _closePage(pageId) {
    this.closePage(pageId);
    const event = new CustomEvent('chain:pageclose', {
      detail: { pageId }
    });
    document.dispatchEvent(event);
  }

}

/**
 * Creates and initializes a router instance with a declarative API.
 * @param {object} options - The router configuration.
 * @param {Array<{path: string, component: function, options?: object}>} options.routes - An array of route objects.
 * @param {HistoryController} [options.history] - An optional history controller instance.
 * @param {function(string): string} [options.normalizePath] - A function to normalize paths before matching.
 * @returns {{router: ChainPageRouter, Link: function, PageView: ChainElement}} An object containing the router instance, Link component, and PageView element.
 */
export function createRouter(options = {}) {
    const { routes = [], history, normalizePath, basePath = '' } = options;

    const defaultNormalizePath = (path) => {
        let normalized = path;
        if (basePath && normalized.startsWith(basePath)) {
            normalized = normalized.substring(basePath.length);
        }

        if (normalized === '' || normalized === '/' || normalized === '/index.html') {
            return '/';
        }
        
        if (!normalized.startsWith('/')) {
            normalized = '/' + normalized;
        }
        return normalized;
    };

    const finalNormalizePath = normalizePath || defaultNormalizePath;
    
    const router = new ChainPageRouter({ history, normalizePath: finalNormalizePath });

    routes.forEach(route => {
        if (route.path && route.component) {
            router.register(route.path, route.component, route.options);
        }
    });

    const PageView = h('div').set('data-chain-router-view', true);
    PageView.stream.add({
        type: OperationType.INIT_ROUTER,
        nodeId: PageView.nodeId,
        router: router
    });

    /**
     * Internal helper for Link creation.
     * @param {string} targetPath The target path for the link.
     * @param {object} params Parameters for dynamic route segments or query strings.
     * @param {...(ChainElement|string|number|ChainState)} children Child elements of the link.
     * @returns {ChainElement} An anchor element configured for routing.
     * @private
     */
    function _createRouterLink(targetPath, params, ...children) {
        let finalPath = targetPath;
        const queryParams = { ...params };

        if (params) {
            for (const [key, value] of Object.entries(params)) {
                if (finalPath.includes(`:${key}`)) {
                    finalPath = finalPath.replace(`:${key}`, encodeURIComponent(value));
                    delete queryParams[key];
                }
            }
        }

        const search = new URLSearchParams(queryParams).toString();
        if (search) {
            finalPath += `?${search}`;
        }

        return h('a')
          .set('href', finalPath)
          .set('data-chain-route', targetPath)
          .child(...children);
    }

    /**
     * A component for creating navigation links.
     * @param {object} props - The properties for the Link component.
     * @param {string} props.to - The target route path.
     * @param {object} [props.params] - Parameters for dynamic route segments or query strings.
     * @param {object} [props] - Additional attributes to set on the anchor element.
     * @param {...(ChainElement|string|number|ChainState)} children - Child elements of the link.
     * @returns {ChainElement} An anchor element configured for routing.
     */
    const Link = ({ to, params, ...props }, ...children) => {
        const linkComponent = _createRouterLink(to, params, ...children);
        
        if (props) {
            Object.entries(props).forEach(([key, value]) => {
                linkComponent.set(key, value);
            });
        }
        
        return linkComponent;
    };

    return { router, Link, PageView };
}

const ChainUI = {
    h,
    createState,
    createComponent,
    map,
    createRouter,
    mount,
    renderToStream
};

export default ChainUI;
