import credentials from '../../config.mjs';
import emailService from '../lib/mailer.mjs';


export const newsletter = {
    newsletterPage(req, res) {
        res.render('newsletter', { csrf: req.csrfToken });
    },
    newsletterArchive(req, res) {
        res.render('newsletter-archive');
    },
    newsletterSignup(req, res) {
        const VALID_EMAIL_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        const name = req.body.name;
        const email = req.body.email;

        if (!VALID_EMAIL_REGEX.test(email)) {
            res.send( { result: 'error', error: 'Email is invalid!' });
            return;
        }

        const mailer = emailService(credentials);
        mailer.send(email, 'NinjaCoders Newsletter Subscription', 
            `Hi ${name}, \nThank you for signing up to the NinjaCoders Newsletter. You'll be hearing from us soon!`)
            .then(() => {
                req.session.flash = {
                    type: 'success',
                    intro: 'Thank you!',
                    message: 'You have now been signed up for the newsletter.'
                };
                res.send({ result: 'success' });
            })
            .catch(err => {
                console.log('Failed to send mail: ', err.message);
                res.send( { result: 'error', error: 'Failed to send email.' });
            });
    }
};

export default newsletter;