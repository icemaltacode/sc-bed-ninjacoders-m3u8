import { doubleCsrf } from 'csrf-csrf';

import error from './src/handlers/error.mjs';
import main from './src/handlers/main.mjs';
import newsletter from './src/handlers/newsletter.mjs';
import photoContest from './src/handlers/photocontest.mjs';
import cart from './src/handlers/cart.mjs';
import admin from './src/handlers/admin.mjs';
import auth from './src/handlers/auth.mjs';

import credentials from './config.mjs';

const { doubleCsrfProtection } = doubleCsrf({
    getSecret: () => credentials.csrfSecret
});

const checkAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('login');
};

export default (app, adminRoute) => {
    // Admin
    // Admin >>> Main
    adminRoute.get('/', admin.dashboard);
    
    // Admin >>> Product Management
    adminRoute.get('/products', admin.products);
    adminRoute.get('/api/product/:id', admin.api_getProduct);
    adminRoute.get('/api/products', admin.api_getProducts);
    adminRoute.put('/api/product', admin.api_upsertProduct);
    adminRoute.delete('/api/product/:id', admin.api_deleteProduct);

    // Admin >> Showcase Management
    adminRoute.get('/showcases', admin.showcases);

    // Admin >>> Login
    adminRoute.post('/login', admin.checkLogin);

    // Admin >>> Mastodon
    adminRoute.get('/mastodoncode', admin.mastodonCode);

    // Main Routes
    app.get('/', main.home);
    app.get('/about', main.about);
    app.get('/colormode/:mode', main.colorMode);
    app.get('/masterclass', main.masterclass);
    app.get('/showcases', main.showcases);
    app.get('/contact', main.contact);

    // Cart Routes
    app.get('/cart', cart.cartPage);
    app.post('/add-to-cart', cart.addToCart);
    app.post('/change-cart-item-qty', cart.changeCartItemQty);
    app.post('/delete-from-cart', cart.deleteFromCart);
    app.post('/checkout', cart.checkout);

    // Newsletter Routes
    app.get('/newsletter', doubleCsrfProtection, newsletter.newsletterPage);
    app.post('/api/newsletter-signup', doubleCsrfProtection, newsletter.newsletterSignup);
    app.get('/newsletter/archive', newsletter.newsletterArchive);

    // Setup Photo Contest Routes
    app.get('/contest/setup-photo', photoContest.setupPhotoContestPage);
    app.post('/api/setup-photo-contest/:year/:month', photoContest.setupPhotoContest);

    // User Account
    app.get('/login', auth.loginPage);
    app.get('/unauthorised', auth.unauthorised);
    app.get('/account', checkAuthenticated, auth.accountPage);

    // Error handling
    app.use(error.notFound);
    app.use(error.serverError); 
};

