export const error = {
    notFound(req, res) {
        res.render('404');
    },
    // eslint-disable-next-line no-unused-vars
    serverError(err, req, res, next) {
        console.error(err);
        res.render('500');
    }
};

export default error;