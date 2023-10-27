import mongoose from 'mongoose';

export const userSchema = mongoose.Schema({
    email: String,
    password: String,
    is_admin: Boolean,
    api_access: Boolean,
    jwt: String,
    refresh_token: String,
    authId: String,
    created: Date,
    name: String
});

export const User = mongoose.model('User', userSchema);
export default User;