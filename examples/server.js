import express from 'express';
import { h, render, resetGlobalIdCounter} from '../src/chainui.js';
const HomePage = () => {
    return h('div')
        .set('class', 'container')
        .child(
            h('h2').child('Welcome to ChainUI SSR App'),
            h('p').child('This page is generated via server-side rendering'),
            h('button')
                .set('class', 'btn btn-primary')
                .child('Click Me')
                .on('click', () => {
                    alert('Hello from server-side rendered button!');
                }),
            h('br'),
            h('a')
                .set('href', '/')
                .child('Back to CSR Home')
        );
};

const AboutPage = () => {
    const FeatureSection = (title, description, code) => {
        const section = h('div').set('class', 'app-section');
        
        return section.child(
            h('h3').child(title),
            h('p').child(description),
        );
    };

    return h('div')
        .set('class', 'container animate-fade-in')
        .child(
            h('h2').child('About Us'),
            FeatureSection(
                'ChainUI SSR Application',
                'This is a server-side rendered application using ChainUI, aiming to demonstrate ChainUI\'s capabilities in server-side rendering.',
            ),
            FeatureSection(
                'Core Advantages',
                'Through SSR, we can provide faster initial page load speeds, better SEO, and a more consistent user experience.'
            )
        );
};


const app = express();
const PORT = 3000;

app.use(express.static('examples'));
app.use('/src', express.static('src'));
function renderPage(res, title, componentFactory) {
    try {
        resetGlobalIdCounter();
        const { html: renderedHtml, clientEventHandlers } = render(componentFactory);
        console.log('Event Handlers:', clientEventHandlers);
        const compactEventHandlers = JSON.stringify(clientEventHandlers);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <header>
        <h1>ChainUI Demo</h1>
    </header>
    <div id="nav">
        <nav>
            <a href="/ssr" class="nav-link">Home</a>
            <a href="/ssr/about" class="nav-link">About</a>
        </nav>
    </div>
    <div id="app" data-chain-id="node-0">
        ${renderedHtml}
    </div>
    <script type="module">
        // Import ChainUI
        import { mount } from '/src/chainui.js';
        
        // Inject event data from server, including event handlers and function code
        const eventData = {
            eventHandlers: ${compactEventHandlers}
        };

        // Use mount function to bind event handlers
        mount('#app', eventData);
    </script>
</body>
</html>`;        
        res.send(html);
    } catch (error) {
        console.error('Server rendering error:', error);
        res.status(500).send('Internal Server Error');
    }
}

const routes = [
    { path: '/ssr', component: HomePage, title: 'ChainUI SSR App' },
    { path: '/ssr/about', component: AboutPage, title: 'About Us - ChainUI SSR App' }
];

routes.forEach(route => {
    app.get(route.path, async (req, res) => {
        renderPage(res, route.title, route.component);
    });
});

app.use((req, res) => {
    renderPage(res, 'Page Not Found - ChainUI SSR App', () => 
        h('div').set('class', 'container').child(
            h('h1').child('404 - Page Not Found'),
            h('p').child('Sorry, the page you are looking for does not exist.'),
            h('a').set('href', '/').child('Return to Home')
        )
    );
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
