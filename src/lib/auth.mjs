import passport from 'passport';
import LocalStrategy from 'passport-local';
import FacebookStrategy from 'passport-facebook';
import db from '../../db.mjs';

passport.serializeUser(function(user, done) {
    done(null, user._id);
});

passport.deserializeUser(function(id, done) {
    db.getUser(id)
        .then(user => {
            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                isAdmin: user.is_admin,
                apiAccess: user.api_access,
                authId: user.authId,
                created: user.created
            };
        })
        .then(user => done(null, user));
});

export default function(app, options) {
    options.successRedirect ?? '/account';
    options.failureRedirect ?? '/login';

    return {
        init: function() { 
            const config = options.providers;

            passport.use(
                new LocalStrategy(function verify(username, password, cb) {
                    db.checkLogin(username, password).then((user) => {
                        if (user.validLogin) {
                            return cb(null, user);
                        }
                        return cb(null, false, {
                            message: 'Incorrect username or password.'
                        });
                    });
                })
            );

            passport.use(
                new FacebookStrategy({
                    clientID: config.facebook.appId,
                    clientSecret: config.facebook.appSecret,
                    callbackURL: (options.baseUrl || '') + '/auth/facebook/callback'
                }, function(accessToken, refreshToken, profile, done) {
                    const authId = 'facebook:' + profile.id;
                    db.getUserByAuthId(authId).then(user => {
                        if (user) return done(null, user);
                        db.registerUser(profile.displayName, authId);
                    });  
                })
            );

            app.use(passport.initialize());
            app.use(passport.session());
        },
        registerRoutes: function() {
            app.post('/auth/local',
                passport.authenticate('local', { failureRedirect: '/login', failureMessage: 'Incorrect username or password' }),
                function(req, res) {
                    res.redirect('/account');
                }
            );
            app.get('/auth/facebook', function(req, res, next) {
                if (req.query.redirect) req.session.authRedirect = req.query.redirect;
                passport.authenticate('facebook')(req, res, next);
            });
            app.get('/auth/facebook/callback', 
                passport.authenticate('facebook', { failureRedirect: options.failureRedirect }),
                function(req, res) {
                    const redirect = req.session.authRedirect;
                    if (redirect) delete req.session.authRedirect;
                    res.redirect(303, redirect || options.successRedirect);
                }
            );
        }
    };
}

