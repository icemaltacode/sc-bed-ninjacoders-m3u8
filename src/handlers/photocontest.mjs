import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multiparty from 'multiparty';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const photoContest = {
    setupPhotoContestPage(req, res) {
        const now = new Date();
        res.render('contest/setup-photo', { year: now.getFullYear(), month: now.getMonth() });
    },
    setupPhotoContest(req, res) {
        const form = new multiparty.Form();
        form.parse(req, (err, fields, files) => {
            if (err) return this.setupPhotoContestError(req, res, err.message);
            this.setupPhotoContestSuccess(req, res, fields, files);
        });
    },
    setupPhotoContestSuccess(req, res, fields, files) {
        const uploadedFile = files.photo[0];
        const tmp_path = uploadedFile.path;
        const target_dir = `${__dirname}/../../public/contest-uploads/${req.params.year}/${req.params.month}`;

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
    },
    setupPhotoContestError: (req, res, message) => {
        res.send( { result: 'error', error: message });
    }
};

export default photoContest;