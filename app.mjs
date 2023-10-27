// Core imports
import path from 'path';
import { fileURLToPath } from 'url';

// Dependencies
import express from 'express';
import https from 'https';
import { engine } from 'express-handlebars';
import esMain from 'es-main';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import expressSession from 'express-session';
import fs from 'fs';
import morgan from 'morgan';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import vhost from 'vhost';

// App Local
import credentials from './config.mjs';
import utilMiddleware from './src/lib/middleware/NinjaCodersUtil.mjs';
import { weatherMiddleware } from './src/lib/middleware/weather.mjs';
import flashMiddleware from './src/lib/middleware/flash.mjs';
import requiresDeposit from './src/lib/middleware/productRequiresDeposit.mjs';
import routes from './routes.mjs';
import apiRoutes from './routes_api.mjs';
import auth from './src/lib/auth.mjs';

// Setup path handlers
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const securePort = process.env.SECUREPORT || 3001;

// Configure Handlebars view engine
app.engine('handlebars', engine({
    defaultLayout: 'main',
    helpers: {
        section: function(name, options) {
            if(!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        },
        ifeq: function(arg1, arg2, options) {
            return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
        },
        ifgt: function(arg1, arg2, options) {
            return (arg1 > arg2) ? options.fn(this) : options.inverse(this);
        }
    }
}));
app.set('view engine', 'handlebars');
app.set('views', 'src/views');

// Middleware
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser(credentials.cookieSecret));
app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret: credentials.cookieSecret
}));

const authService = auth(app, {
    successRedirect: '/account',
    failureRedirect: '/unauthorised',
    baseUrl: process.env.baseUrl,
    providers: credentials.authProviders
});
authService.init();
authService.registerRoutes();

// Subdomain
const admin = express.Router();
const api = express.Router();
switch(app.get('env')) {
    case 'development':
        app.use(vhost('admin.ninjacoders.local', admin));
        app.use(vhost('api.ninjacoders.local', api));
        break;
    case 'production':
        app.use(vhost('admin.coders.ninja', admin));
        app.use(vhost('api.coders.ninja', api));
        break;
}

app.use(utilMiddleware);
app.use(weatherMiddleware);
app.use(flashMiddleware);
app.use(requiresDeposit);

// Logging Middleware
switch(app.get('env')) {
    case 'development':
        app.use(morgan('dev'));
        break;
    case 'production': {
        const stream = fs.createWriteStream(__dirname + '/access.log', { flags: 'a' });
        app.use(morgan('combined', { stream }));
        break;
    }
}

// Routes
routes(app, admin);
apiRoutes(api);

Sentry.init({
    dsn: credentials.sentryDSN,
    integrations: [
        new ProfilingIntegration(),
    ],
    tracesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!
    profilesSampleRate: 1.0, // Capture 100% of the transactions, reduce in production!
});

process.on('uncaughtException', err => {
    console.error('UNCAUGHT EXCEPTION\n', err.stack);
    Sentry.captureException(err);
    process.exit(1);
});

let httpsOptions;
switch(app.get('env')) {
    case 'development':
        httpsOptions = {
            key: fs.readFileSync(__dirname + '/ssl/ninjacoders_dev.pem'),
            cert: fs.readFileSync(__dirname + '/ssl/ninjacoders_dev.crt')
        };
        break;
    case 'production': {
        httpsOptions = {
            key: fs.readFileSync(__dirname + '/ssl/ninjacoders.pem'),
            cert: fs.readFileSync(__dirname + '/ssl/ninjacoders.crt')
        };
        break;
    }
}

if (esMain(import.meta)) {
    https.createServer(httpsOptions, app).listen(securePort, () => {
        console.log(
            `Express started on https://localhost:${securePort} in ${app.get('env')} mode.` + 
            'Press Ctrl-C to terminate.');
    });

    switch(app.get('env')) {
        case 'development':
            app.listen(port, () =>
                console.log(
                    `Express started on http://localhost:${port} in ${app.get('env')} mode.` +
                    'Press Ctrl-C to terminate.'
                )
            );
            break; 
    }
}

export default app;