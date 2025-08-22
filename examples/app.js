import { h, createState, map, createComponent, createApp, mount } from "../src/chainui.js";
const globalCount = createState(0);
const globalItems = createState([
    { id: 1, text: 'First item' },
    { id: 2, text: 'Second item' }
]);
const globalNewItemText = createState('');

const Button = createComponent('Button', (text, onClick, type = 'primary') => {
    const button = h('button')
        .child(text)
        .on('click', onClick)
        .set('class', `btn btn-${type}`);

    return button;
});

const ListItem = createComponent('ListItem', (item, onRemove) => {
    const listItem = h('li')
        .set({
            attr: { 'data-key': item.id },
            class: 'list-item animate-slide-in-left'
        })
        .child(`${item.text} `)
        .child(Button('Remove', onRemove, 'danger'));

    return listItem;
});

const CounterValue = createComponent('CounterValue', (valueState, isChangedState) => {
    const counter = h('div')
        .child(valueState)
        .set('class', isChangedState.map(changed => `counter-value ${changed ? 'animate-scale-pulse' : ''}`));
    return counter;
});

const HomeComponent = () => {
    const FeatureSection = createComponent('FeatureSection', (title, description, code) => {
        const section = h('div').set('class', 'app-section');
        
        return section.child(
            h('h3').child(title),
            h('p').child(description),
            h('pre').child(h('code').child(code))
        );
    });

    return h('div')
        .set('class', 'animate-fade-in')
        .child(
            h('h2').child('Welcome to the Enhanced ChainUI Demo!'),
            h('p').child('This demo showcases the latest features of ChainUI, including componentization, conditional rendering, and dynamic routing.'),
            h('p').child('Explore the different sections to see ChainUI in action.'),

            h('h2').set('class', 'mt-2').child('ChainUI Core Features'),
            FeatureSection(
                'Declarative UI with `h` function',
                'Build your UI using a simple, declarative `h` function that creates DOM nodes. This makes your component structure easy to read and maintain.',
                `import { h } from "../src/chainui.js";\n\nconst MyComponent = () => h('div').child(\n    h('h1').child('Hello ChainUI!'),\n    h('p').child('This is a declarative UI example.')\n);`
            ),
            FeatureSection(
                'Reactive State Management with `createState`',
                'Manage component state effortlessly. Changes to state automatically trigger UI updates, ensuring your view is always in sync with your data.',
                `import { createState, h } from "../src/chainui.js";\n\nconst count = createState(0);\n\nconst Counter = () => h('div').child(\n    h('p').child(count.map(c => \`Count: \${c}\`)),\n    h('button').on('click', () => count.update(c => c + 1)).child('Increment')\n);`
            ),
            FeatureSection(
                'Efficient List Rendering with `map` and Keyed Reconciliation',
                'Render dynamic lists with optimal performance. The `map` function, combined with keyed reconciliation, ensures only necessary DOM elements are updated.',
                `import { h, createState, map } from "../src/chainui.js";\n\nconst items = createState([{ id: 1, text: 'Item 1' }, { id: 2, text: 'Item 2' }]);\n\nconst ItemList = () => h('ul').child(\n    map(items, (item) =>\n        h('li').set('data-key', item.id, 'attr').child(item.text)\n    )\n);\n\n// To add an item:\n// items.update(list => [...list, { id: Date.now(), text: 'New Item' }]);`
            ),
            FeatureSection(
                'Conditional Rendering with `.when()`',
                'Easily show or hide elements based on conditions, allowing for dynamic and responsive UIs. Use `keepAlive: true` to toggle visibility instead of re-creating.',
                `import { h, createState } from "../src/chainui.js";\n\nconst isLoggedIn = createState(false);\n\nconst AuthSection = () => h('div').child(\n    h('button').on('click', () => isLoggedIn.update(v => !v)).child(\n        isLoggedIn.map(v => v ? 'Logout' : 'Login')\n    ),\n    h('div').when(isLoggedIn, \n        () => h('p').child('Welcome back!'),\n        () => h('p').child('Please log in.'),\n        { keepAlive: true } // Optional: keep both components in DOM, toggle visibility\n    )\n);`
            ),
            FeatureSection(
                'Unified Property Setting with `.set()`',
                'ChainUI provides a powerful `.set()` method to manage attributes, styles, and classes in a unified way. It also supports reactive states for dynamic updates.',
                `import { h, createState } from "../src/chainui.js";\n\nconst isActive = createState(true);\nconst bgColor = createState('blue');\n\nh('div').set({\n    attr: { id: 'my-element', 'data-value': 42 },\n    style: { color: 'white', backgroundColor: bgColor.map(c => c) },\n    class: { 'is-active': isActive, 'highlight': true }\n})\n.child('Dynamic Element');\n\n// Change background color dynamically:\n// bgColor.update('green');\n// Toggle active class:\n// isActive.update(false);`
            ),
            FeatureSection(
                'Dynamic Routing with `createApp` and `createRouter`',
                'Create single-page applications with clean URLs and dynamic route parameters. The router handles navigation and component rendering based on the URL. `createApp` simplifies the setup.',
                `import { createApp, h } from "../src/chainui.js";\n\nconst HomeComponent = () => h('h1').child('Home Page');\nconst AboutComponent = () => h('h1').child('About Page');\n\nconst app = createApp({\n    mount: '#app-root',\n    mode: 'history', // or 'hash'\n    routes: [\n        { path: '/', component: HomeComponent },\n        { path: '/about', component: AboutComponent }\n    ]\n});\n\n// Use app.Link for navigation:\n// app.Link({ to: '/about' }).child('Go to About');`
            )
        );
};

const DemosComponent = () => {
    const isHigh = globalCount.map(c => c > 5);
    
    const animatedCount = createState({ value: 0, changed: false });
    
    globalCount.subscribe(value => {
        animatedCount.update(({
            value: value,
            changed: true
        }));
        
        setTimeout(() => {
            animatedCount.update(prev => ({
                ...prev,
                changed: false
            }));
        }, 500);
    });

    const addItem = () => {
        if (globalNewItemText.value.trim() === '') return;
        globalItems.update(list => [...list, { id: Date.now(), text: globalNewItemText.value }]);
        globalNewItemText.value = '';
    };

    const DemoSection = createComponent('DemoSection', (title, content) => {
        const section = h('div').set('class', 'app-section');
        
        return section.child(
            h('h3').child(title),
            content
        );
    });

    return h('div')
        .child(
            h('h2').child('Interactive Demos'),
            
            DemoSection(
                'Counter Demo',
                h('div').child(
                    CounterValue(
                        animatedCount.map(c => c.value),
                        animatedCount.map(c => c.changed)
                    ),
                    Button('Increment', () => globalCount.update(c => c + 1), 'primary'),
                    Button('Decrement', () => globalCount.update(c => c - 1), 'secondary'),
                    h('div').when(isHigh, () =>
                        h('p').set('style', 'color: red').child('Warning: Count is greater than 5!')
                    )
                )
            ),

            DemoSection(
                'Dynamic List with Keyed Reconciliation',
                h('div').set('class', 'mt-2').child(
                    h('p').child('The list now uses an efficient keyed update algorithm.'),
                    h('input')
                        .set('type', 'text')
                        .set('placeholder', 'Enter a new item')
                        .set('value', globalNewItemText)
                        .on('input', e => globalNewItemText.value = e.target.value),
                    Button('Add Item', addItem, 'primary'),
                    h('ul').child(
                        map(globalItems, (item) =>
                            ListItem(item, () => {
                                globalItems.update(list => list.filter(i => i.id !== item.id));
                            })
                        )
                    )
                )
            ),
        );
};


const UserComponent = (params) => {
    const name = params.name || 'Unknown';
    return h('div')
        .child(
            h('h2').child('User Profile Page'),
            h('p').child(`This profile belongs to: ${name}.`),
            h('a')
                .set('href', '/')
                .on('click', (e) => {
                    e.preventDefault();
                    if (typeof window !== 'undefined' && window.chainApp && window.chainApp.router) {
                        window.chainApp.router.navigate('/');
                    }
                })
                .child('Back to Home')
        );
};

const SSRLinkComponent = () => {
    return h('div')
        .child(
            h('h2').child('CSR Page with SSR Link'),
            h('p').child('This is a client-side rendered page.'),
            h('a')
                .set('href', '/ssr')
                .on('click', (e) => {
                    e.preventDefault();
                    window.location.href = '/ssr';
                })
                .child('Go to SSR Home Page')
        );
};

const NavBar = (Link) => createComponent('NavBar', () => {
    const navLinks = [
        { to: '/', text: 'Home' },
        { to: '/demos', text: 'Demos' },
        { to: '/user/:name', text: 'User Profile', params: { name: 'Alice' } },
        { to: '/user/:name', text: 'User Bob', params: { name: 'Bob' } },
        { to: '/ssr-link', text: 'SSR Link Page' },
    ];

    return h('nav').child(
        ...navLinks.map(({ text, ...linkProps }) =>
            Link({ ...linkProps, class: 'nav-link' }).child(text)
        )
    );
});

const app = createApp({
    mount: '#app',
    mode: 'hash',
    routes: [
        { path: '/', component: HomeComponent },
        { path: '/demos', component: DemosComponent },
        { path: '/user/:name', component: (params) => UserComponent(params), options: { keepAlive: true } },
        { path: '/ssr-link', component: SSRLinkComponent }
    ]
});

mount('#nav', NavBar(app.Link)());
