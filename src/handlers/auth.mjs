export const auth = {
    unauthorised(req, res) {
        res.status(403).render('unauthorised');
    },
    accountPage(req, res) {
        res.render('account', { user: req.user });
    },
    loginPage(req, res) {
        res.render('login', { layout: null, error: req.session.messages });
    }
};

export default auth;