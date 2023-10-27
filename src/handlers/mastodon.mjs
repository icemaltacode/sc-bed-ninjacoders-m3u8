import multiparty from 'multiparty';
import fs from 'fs';
import credentials from '../../config.mjs';

const mast = credentials.mastodon;

async function uploadMedia(media, token) {
    const fd = new FormData();
    fd.append('file', new Blob([fs.readFileSync(media.path)]));
    const uploadURL = `${mast.server}/api/v2/media`;
    const uploadedMedia = await fetch(uploadURL, {
        method: 'POST',
        headers: {
            Authorization: 'Bearer ' + token
        },
        body: fd
    });
    return (await uploadedMedia.json()).id;
}

export const mastodonApi = {
    async getNinjaCodersPosts(req, res) {
        const URL = `${mast.server}/api/v1/accounts/${mast.accountId}/statuses`;
        fetch(URL)
            .then((result) => result.json())
            .then((result) => res.json(result))
            .catch((err) => res.status(500).json({ error: err }));
    },
    async getPostsByTag(req, res) {
        const tag = req.query.tag;
        const limit = req.query.limit;
        const URL = `${mast.server}/api/v1/timelines/tag/${tag}?limit=${limit}`;
        fetch(URL)
            .then((result) => result.json())
            .then((result) => res.json(result))
            .catch((err) => res.status(500).json({ error: err }));
    },
    async verifyToken(req, res) {
        const token = req.query.token;
        const URL = `${mast.server}/api/v1/accounts/verify_credentials`;
        fetch(URL, {
            headers: {
                Authorization: 'Bearer ' + token
            }
        })
            .then((response) =>
                res.status(response.status).json(response.json())
            )
            .catch((err) => res.status(500).json({ error: err }));
    },
    async getClientToken(req, res) {
        const code = req.query.code;
        const URL = `${mast.server}/oauth/token`;

        const body = new FormData();
        body.append('client_id', mast.clientId);
        body.append('client_secret', mast.clientSecret);
        body.append('redirect_uri', mast.redirectURI);
        body.append('grant_type', 'authorization_code');
        body.append('code', code);
        body.append('scope', 'read write push');

        const tokenResponse = await fetch(URL, {
            method: 'POST',
            body
        }).catch((err) => res.status(500).json({ error: err }));
        const tokenResponseStatus = tokenResponse.status;
        const tokenResult = await tokenResponse.json();
        res.status(tokenResponseStatus).json(tokenResult);
    },
    async postStatus(req, res) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        const form = new multiparty.Form();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error(err);
                res.status(500).json({ error: err });
            }

            // Media Upload
            let mediaId = null;
            if (files.featuredImage && files.featuredImage.originalFilename !== '') {
                const image = files.featuredImage[0];
                mediaId = await uploadMedia(image, token);
            }

            // Status Post
            const body = new FormData();
            body.append('status', fields.status[0]);
            body.append('media_ids[]', mediaId);

            const URL = `${mast.server}/api/v1/statuses`;
            let status = 0;
            fetch(URL, {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + token
                },
                body
            })
                .then((response) => { status = response.status; return response.json(); })
                .then((response) =>
                    res.status(status).json(response)
                )
                .catch((err) => {
                    console.log(err);
                    res.status(500).json({ error: err });
                });
        });
    }
};

export default mastodonApi;
