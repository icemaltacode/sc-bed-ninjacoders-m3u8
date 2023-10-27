import credentials from '../../config.mjs';
import db from '../../db.mjs';
import emailService from '../lib/mailer.mjs';

export const cart = {
    async cartPage(req, res) {
        db.getCartById(req.session.cart)
            .then(cart => {
                const context = {
                    cartSize: cart.items.length,
                    cart: {
                        total: cart.total,
                        items: cart.items.map(item => {
                            return {
                                product: {
                                    id: item.product._id,
                                    sku: item.product.sku,
                                    name: item.product.name,
                                    description: item.product.description,
                                    featuredImage: item.product.featuredImage,
                                    requiresDeposit: item.product.requiresDeposit,
                                    price: item.product.price
                                },
                                qty: item.qty,
                                subtotal: item.subtotal
                            };       
                        })
                    }
                };
                res.render('cart', context);
            })
            .catch(error => console.error(error));
    },
    async addToCart(req, res) {
        if (!req.session.cart) {
            await db.createCart()
                .then(cartId => req.session.cart = cartId );
        }
    
        const cartId = req.session.cart;
        const productId = req.body.productId;
        await db.addToCart(cartId, productId);
        res.redirect('/cart');
    },
    async changeCartItemQty(req, res) {
        const cartId = req.session.cart;
        const productId = req.body.productId;
        const qty = req.body.qty;
        
        await db.changeCartItemQty(cartId, productId, qty);  
        res.redirect('/cart');
    },
    async deleteFromCart(req, res) {
        const cartId = req.session.cart;
        const productId = req.body.productId;
    
        await db.deleteFromCart(cartId, productId);
        res.redirect('/cart');
    },
    async checkout(req, res) {
        const cartId = req.session.cart;
        const email = req.body.email;
    
        db.checkout(cartId, email)
            .then(cart => {
                const context = {
                    total: cart.total,
                    items: cart.items.map(item => {
                        return {
                            product: {
                                name: item.product.name,
                                featuredImage: item.product.featuredImage,
                            },
                            qty: item.qty,
                            subtotal: item.subtotal
                        };       
                    })
                };
                res.render('email/cart-thank-you', { layout: null, cart: context }, (err,html) => {
                    if (err) console.log('Error in email template.');
            
                    const mailer = emailService(credentials);
                    mailer.send(email, 'NinjaCoders - Thank You For Your Purchase', 
                        html)
                        .then(info => {
                            console.log('Sent: ', info);
                            req.session.cart = { items: [] };
                            res.render('cart-thank-you', { email: email });
                        })
                        .catch(err => {
                            console.error('Unable to send confirmation: ', err.message);
                        });
                });
            });
    }
};

export default cart;
