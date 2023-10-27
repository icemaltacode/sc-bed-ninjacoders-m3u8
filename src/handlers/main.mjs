import { getTagline } from '../lib/tagline.mjs';
import db from '../../db.mjs';

export const main = {
    home(req, res) {
        res.render('home');
    },
    about(req, res) {
        res.render('about', { tagline: getTagline() });
    },
    contact(req, res) {
        res.render('contact');
    },
    colorMode(req, res) {
        res.cookie('color_mode', req.params.mode, {maxAge: 30 * 24 * 60 * 60 * 1000});
        res.redirect(req.get('referer'));
    },
    masterclass(req, res) {
        db.getProducts()
            .then(products => {
                const context = {
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
                res.render('masterclass', context);
            })
            .catch(error => console.error(error));
    },
    showcases(req, res) {
        db.getShowcases() 
            .then(showcases => {
                const context = {
                    showcases: showcases.map(showcase => {
                        return {
                            id: showcase._id,
                            title: showcase.title,
                            description: showcase.description,
                            featuredImage: showcase.featuredImage,
                            sourceLink: showcase.sourceLink,
                            techUsed: showcase.techUsed,
                            authors: showcase.authors.map(author => {
                                return {
                                    fullName: author.fullName,
                                    email: author.email,
                                    avatar: author.avatar
                                };
                            })
                        };
                    })
                };
                res.render('showcases', context);
            })
            .catch(error => console.error(error));
    }
};

export default main;