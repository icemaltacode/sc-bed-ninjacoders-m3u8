import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multiparty from 'multiparty';
import db from '../../db.mjs';
import mongoose from 'mongoose';
import Jwt from 'jsonwebtoken';
import credentials from '../../config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isLoggedIn(req) {
    return req.session && req.session.user;
}

export const admin = {
    dashboard(req, res) {
        if (isLoggedIn(req)) {
            res.render('admin/dashboard');
        } else {
            res.render('admin/login', { layout: null, redirect: 'admin/dashboard'});
        }
    },
    mastodonCode(req, res) {
        res.render('admin/mastodoncode');
    },
    products(req, res) {
        if (isLoggedIn(req)) {
            res.render('admin/products');
        } else {
            res.render('admin/login', { layout: null, redirect: 'admin/products'});
        }
    },
    showcases(req, res) {
        if (isLoggedIn(req)) {
            res.render('admin/showcases');
        } else {
            res.render('admin/login', { layout: null, redirect: 'admin/showcases'});
        }
    },
    async checkLogin(req, res) {
        const email = req.body.email;
        const password = req.body.password;
        const redirect = req.body.redirect;

        const loginResult = await db.checkLogin(email, password);
        
        if (loginResult.validLogin && loginResult.isAdmin) {
            // Login is valid, generate a new token
            const tokenSecret = credentials.tokenSecret;
            const token = Jwt.sign({ email }, tokenSecret, { expiresIn: '15m' });
            const refreshToken = Jwt.sign({ email }, tokenSecret, { expiresIn: '1h' });
            db.updateUserToken(email, token, refreshToken);

            req.session.user = {
                email: email,
                token: token,
                refreshToken: refreshToken
            };
            res.render(redirect ? redirect : 'admin/dashboard', { context: { user: req.session.user } });
        } else {
            res.render('admin/login', { layout: null, error: 'Invalid username or password.' });
        }
    },
    api_getProducts(req, res) {
        if (!isLoggedIn(req)) res.status(301);
        db.getProducts()
            .then(products => {
                const result = {
                    products: products.map(product => {
                        return {
                            id: product._id,
                            sku: product.sku,
                            name: product.name,
                            description: product.description,
                            featuredImage: product.featuredImage,
                            requiresDeposit: product.requiresDeposit,
                            price: product.getDisplayPrice('€')
                        };
                    })
                };
                res.json(result);
            })
            .catch(error => console.error(error));
    },
    api_getProduct(req, res) {
        if (!isLoggedIn(req)) res.status(301);
        db.getProductById(req.params.id)
            .then(product => res.json(product));
    },
    api_upsertProduct(req, res) {
        if (!isLoggedIn(req)) res.status(301);
        const form = new multiparty.Form();
        form.parse(req, (err, fields, files) => {
            if (err) res.send( { result: 'error', error: err.message });

            const uploadedFile = files.prod_featured_image[0];
            const tmp_path = uploadedFile.path;
            const target_dir = `${__dirname}/../../public/img/masterclass/`;

            if (!fs.existsSync(target_dir)){
                fs.mkdirSync(target_dir, { recursive: true });
            }

            fs.rename(tmp_path, `${target_dir}/${uploadedFile.originalFilename}`, function(err) {
                if (err) {
                    res.send( { result: 'error', error: err.message });
                    return;
                }
                fs.unlink(tmp_path, function(err) {
                    if (err) {
                        res.send( { result: 'error', error: err.message });
                        return;
                    }
                    res.send( { result: 'success' });
                });
            });

            const product_id = fields.prod_id[0] === '' ? new mongoose.Types.ObjectId() : fields.prod_id[0]; 
            const product = {
                sku: fields.prod_sku[0],
                name: fields.prod_name[0],
                price: fields.prod_price[0],
                description: fields.prod_description[0],
                requiresDeposit: 'prod_requires_deposit' in fields
            };
            if (uploadedFile.originalFilename) {
                product.featuredImage = uploadedFile.originalFilename;
            }
            db.upsertProduct(product_id, product);
        });   
    },
    api_deleteProduct(req, res) {
        if (!isLoggedIn(req)) res.status(301);
        db.deleteProduct(req.params.id)
            .then(res.send( { result: 'success' }));
    }
};

export default admin;