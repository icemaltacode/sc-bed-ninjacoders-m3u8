import mongoose from 'mongoose';

const authorSchema = mongoose.Schema({
    fullName: String,
    email: String,
    avatar: String
});

export const showcaseSchema = mongoose.Schema({
    title: String,
    authors: [authorSchema],
    description: String,
    featuredImage: String,
    techUsed: [String],
    sourceLink: String
});

export const Showcase = mongoose.model('Showcase', showcaseSchema);

export default Showcase;