import {h, createState, map, createComponent, mount, createRouter} from "../build/esm/chainui.min.js";
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
        .set('class', isChangedState.map(changed => `counter-value ${changed ? 'animate-scale-pulse' : ''}`)); // Conditionally apply animation class
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
                `h('div').child(\n    h('h1').child('Hello'),\n    h('p').child('World')\n);`
            ),
            FeatureSection(
                'Reactive State Management with `createState`',
                'Manage component state effortlessly. Changes to state automatically trigger UI updates, ensuring your view is always in sync with your data.',
                `const count = createState(0);\nh('button').on('click', () => count.update(c => c + 1));`
            ),
            FeatureSection(
                'Efficient List Rendering with `map` and Keyed Reconciliation',
                'Render dynamic lists with optimal performance. The `map` function, combined with keyed reconciliation, ensures only necessary DOM elements are updated.',
                `map(items, (item) =>\n    h('li').set('data-key', item.id, 'attr').child(item.name)\n);`
            ),
            FeatureSection(
                'Conditional Rendering with `.when()`',
                'Easily show or hide elements based on conditions, allowing for dynamic and responsive UIs.',
                `h('div').when(isLoggedIn, () =>\n    h('p').child('Welcome back!')\n);`
            ),
            FeatureSection(
                'Unified Property Setting with `.set()`',
                'ChainUI provides a powerful `.set()` method to manage attributes, styles, and classes in a unified way.',
                `h('div').set({\n    attr: { id: 'my-element', 'data-value': 42 },\n    style: { color: 'blue', backgroundColor: 'lightblue' },\n    class: { 'is-active': true, 'is-disabled': false }\n});\n\nh('div').set('class', ['class1', 'class2']);\n\nh('div').set('my-class', true, 'class');`
            ),
            FeatureSection(
                'Dynamic Routing with `createRouter`',
                'Create single-page applications with clean URLs and dynamic route parameters. The router handles navigation and component rendering based on the URL. Now simplified with `createRouter`!',
                `const { router, Link, PageView } = createRouter({\n    routes: [\n        { path: '/', component: HomeComponent },\n        { path: '/user/:name', component: UserComponent }\n    ]\n});\nmount(PageView, '#app-outlet');`
            )
        );
};

const DemosComponent = () => {
    const isHigh = globalCount.map(c => c > 5);
    
    const animatedCount = createState({ value: 0, changed: false });
    
    globalCount.subscribe(value => {
        animatedCount.update(prev => ({
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
                        .set('type', 'text', 'attr')
                        .set('placeholder', 'Enter a new item', 'attr')
                        .set('value', globalNewItemText, 'attr')
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
            Link({ to: '/' }).child('Back to Home')
        );
};

const { Link, PageView } = createRouter({
    basePath: '/examples',
    routes: [
        { path: '/', component: HomeComponent },
        {
            path: '/demos',
            component: DemosComponent,
        },
        { path: '/user/:name', component: UserComponent, options: { keepAlive: true } }
    ]
});

mount(PageView, '#app-outlet');

const NavBar = createComponent('NavBar', () => {
    const navLinks = [
        { to: '/', text: 'Home' },
        { to: '/demos', text: 'Demos' },
        { to: '/user/:name', text: 'User Profile', params: { name: 'Alice' },keepAlive: true },
        { to: '/user/:name', text: 'Another User', params: { name: 'Bob' } , keepAlive: true }
    ];

    return h('nav').child(
        ...navLinks.map(link =>
            Link({ ...link, class: 'nav-link' })
                .child(link.text)
        )
    );
});

mount(NavBar(), '#nav-outlet');
