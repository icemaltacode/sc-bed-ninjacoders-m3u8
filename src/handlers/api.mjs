import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multiparty from 'multiparty';
import mongoose from 'mongoose';
import Jwt from 'jsonwebtoken';
import db from '../../db.mjs';
import credentials from '../../config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getJwt(userEmail, loginResult) {
    const tokenSecret = credentials.tokenSecret;
    let newToken = false;

    if (!loginResult.jwt) newToken = true;

    Jwt.verify(loginResult.jwt, tokenSecret, (err) => {
        if (err) newToken = true;
    });

    if (newToken) {
        const token = Jwt.sign({ userEmail }, tokenSecret, { expiresIn: '15m' });
        const refreshToken = Jwt.sign({ userEmail }, tokenSecret, { expiresIn: '1h' });
        db.updateUserToken(userEmail, token, refreshToken);
        return {
            token: token,
            refreshToken: refreshToken
        };
    }
    return {
        token: loginResult.jwt,
        refreshToken: loginResult.refreshToken
    };
}

function verifyJwt(req) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return false;

    const tokenSecret = credentials.tokenSecret;
    const result = Jwt.verify(token, tokenSecret, (err, decoded) => {
        if (err) {
            return {
                status: false,
                result: `Error: ${err.message}`,
                data: err
            };
        } else {
            return {
                status: true,
                result: 'Token valid.',
                data: decoded
            };
        }
    });
    return result;
}

async function refreshJwt(req) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const refreshToken = req.header('refreshToken');
    const userEmail = req.header('username');
    const tokenSecret = credentials.tokenSecret;

    if (token == null) return {
        status: false,
        result: 'Token could not be refreshed',
        data: null
    };
    const result = await db.isUserTokenValid(token, refreshToken)
        .then(isValid => {
            if (isValid) {
                const newToken = Jwt.sign({ userEmail }, tokenSecret, { expiresIn: '15m' });
                const newRefreshToken = Jwt.sign({ userEmail }, tokenSecret, { expiresIn: '1h' });
                db.updateUserToken(userEmail, newToken, newRefreshToken);
                return {
                    status: true,
                    result: 'Token refreshed successfully',
                    data: {
                        token: newToken,
                        refreshToken: newRefreshToken,
                        tokenExpires: new Date(Date.now() + 15 * 60000),
                        refreshTokenExpires: new Date(Date.now() + 60 * 60000)
                    }
                };
            } else {
                return {
                    status: false,
                    result: 'Token could not be refreshed',
                    data: null
                };
            }
        });
    return result;
}

export const api = {
    getToken(req, res) {
        const email = req.header('username');
        const password = req.header('password');

        db.checkLogin(email, password)
            .then(loginResult => {
                if (loginResult.validLogin && loginResult.apiAccess) {
                    const tokenData = getJwt(email, loginResult);
                    res.status(200).json({
                        status: true,
                        result: `Successfully logged in with email ${email}.`,
                        data: {
                            token: tokenData.token,
                            refreshToken: tokenData.refreshToken,
                            tokenExpires: new Date(Date.now() + 15 * 60000),
                            refreshTokenExpires: new Date(Date.now() + 60 * 60000)
                        }
                    });
                } else {
                    res.status(403).json({
                        status: false,
                        return: `Unauthorised. Failed to login with email ${email}.`,
                        data: null
                    });
                }
            });
    },
    async refreshToken(req, res) {
        const auth = await refreshJwt(req);
        if (auth.status) {
            return res.status(200).json(auth);
        } else {
            return res.status(403).json(auth);
        }
    },
    getShowcases(req, res) {
        db.getShowcases() 
            .then(showcases => {
                if (showcases.length > 0) {
                    res.status(200).json({
                        status: true,
                        result: `Retrieved ${showcases.length} showcases.`,
                        data: showcases
                    });
                } else {
                    res.status(404).json({
                        status: false,
                        result: 'No showcases found.',
                        data: null
                    });
                }
            })
            .catch(error => {
                res.status(500).json({
                    status: false,
                    result: `A server error occurred: ${error.message}`,
                    data: error
                });
            });
    },
    getShowcase(req, res) {
        db.getShowcaseById(req.params.id)
            .then(showcase => {
                if (showcase) {
                    res.status(200).json({
                        status: true,
                        result: `Retrieved showcase with id ${showcase._id}.`,
                        data: showcase
                    });
                } else {
                    res.status(404).json({
                        status: false,
                        result: `No showcase with id ${req.params.id}.`,
                        data: null
                    });
                }
            })
            .catch(error => {
                res.status(500).json({
                    status: false,
                    result: `A server error occurred: ${error.message}`,
                    data: error
                });
            });
    },
    upsertShowcase(req, res) {
        const auth = verifyJwt(req);
        if (!auth.status) return res.status(401).json(auth);

        const form = new multiparty.Form();
        form.parse(req, (err, fields, files) => {
            if (err) {
                console.error(err.message);
                return res.status(500).json({
                    status: false,
                    error: err.message
                });
            }

            // Featured Image
            let featuredImage = null;
            if (files.featuredImage && files.featuredImage.originalFilename !== '') {
                featuredImage = files.featuredImage[0];
                const featuredImageTmpPath = featuredImage.path;
                const featuredImageDir = `${__dirname}/../../public/img/showcase/`;
                if (!fs.existsSync(featuredImageDir)){
                    fs.mkdirSync(featuredImageDir, { recursive: true });
                }
                fs.rename(featuredImageTmpPath, `${featuredImageDir}/${featuredImage.originalFilename}`, function(err) {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).json({
                            status: false,
                            error: err.message
                        });
                    }
                });
            }

            // Avatars
            if (files.avatar) {
                const avatarDir = `${__dirname}/../../public/img/avatar/`;
                if (!fs.existsSync(avatarDir)){
                    fs.mkdirSync(avatarDir, { recursive: true });
                }
                const avatars = files.avatar;
                for (const avatar of avatars) {
                    if (avatar.originalFilename === '') continue;
                    const tmp_path = avatar.path;
                    fs.rename(tmp_path, `${avatarDir}/${avatar.originalFilename}`, function(err) {
                        if (err) {
                            console.error(err.message);
                            return res.status(500).json({
                                status: false,
                                error: err.message
                            });
                        }
                    });
                }
            }
            
            const newItem = fields.id[0] === '';
            const showcase_id = newItem ? new mongoose.Types.ObjectId() : fields.id[0];

            const authors = [];
            for (const author of fields.author) {
                const data = JSON.parse(author);
                const newAuthor = {
                    fullName: data.fullName,
                    email: data.email
                };
                if (data.avatar !== '') {
                    newAuthor.avatar = data.avatar;
                }
                authors.push(newAuthor);
            }
            
            const showcase = {
                title: fields.title[0],
                authors: authors,
                description: fields.description[0],
                techUsed: fields.techUsed,
                sourceLink: fields.sourceLink[0]
            };
            if (featuredImage !== null) {
                showcase.featuredImage = featuredImage.originalFilename;
            }
            
            db.upsertShowcase(showcase_id, showcase)
                .then(data => {
                    return res.status(newItem ? 201 : 202).json({
                        status: true,
                        result: `Showcase with id ${data._id} has been ${newItem ? 'added' : 'updated'}.`,
                        data: data
                    });
                })
                .catch(error => {
                    res.status(500).json({
                        status: false,
                        result: `A server error occurred: ${error.message}`,
                        data: error
                    });
                });
        });
    },
    deleteShowcase(req, res) {
        const auth = verifyJwt(req);
        if (!auth.status) return res.status(401).json(auth);

        if (!req.params.id) {
            return res.status(400).json({
                status: false,
                result: 'Bad Request. Showcase id was not provided.',
                data: null
            });
        }

        db.deleteShowcase(req.params.id)
            .then(data => {
                if (data) {
                    return res.status(204).json({
                        status: true,
                        result: `Showcase with id ${data._id} has been deleted.`,
                        data: data
                    });
                } else {
                    return res.status(404).json({
                        status: false,
                        result: `No showcase with id ${req.params.id}.`,
                        data: data
                    });
                }
            })
            .catch(error => {
                res.status(500).json({
                    status: false,
                    result: `A server error occurred: ${error.message}`,
                    data: error
                });
            });
    }
};

export default api;