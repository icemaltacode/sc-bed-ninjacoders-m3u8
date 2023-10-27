import api from './src/handlers/api.mjs';
import mastodonApi from './src/handlers/mastodon.mjs';
import cors from 'cors';

const allowedOrigins = [
    'http://admin.ninjacoders.local:3000',
    'http://localhost:3000',
    'https://coders.ninja',
    'https://admin.coders.ninja'
];

const corsOptions = {
    'origin': function (origin, callback) {
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    'credentials': true,
    'methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
    'preflightContinue': false,
    'optionsSuccessStatus': 204
};

export default (apiRoute) => {
    // CORS
    apiRoute.options('*', cors(corsOptions));

    // JWT
    apiRoute.get('/token', cors(corsOptions), api.getToken);
    apiRoute.patch('/token/refresh', cors(corsOptions), api.refreshToken);

    // Showcase API
    apiRoute.get('/showcase', cors(corsOptions), api.getShowcases);
    apiRoute.get('/showcase/:id', cors(corsOptions), api.getShowcase);
    apiRoute.put('/showcase', cors(corsOptions), api.upsertShowcase);
    apiRoute.delete('/showcase/:id', cors(corsOptions), api.deleteShowcase);  

    // Mastodon API
    apiRoute.get('/mastodon/ourposts', cors(corsOptions), mastodonApi.getNinjaCodersPosts);
    apiRoute.get('/mastodon/poststag', cors(corsOptions), mastodonApi.getPostsByTag);
    apiRoute.get('/mastodon/verify', cors(corsOptions), mastodonApi.verifyToken);
    apiRoute.post('/mastodon/post', cors(corsOptions), mastodonApi.postStatus);
    apiRoute.get('/mastodon/token', cors(corsOptions), mastodonApi.getClientToken);
};