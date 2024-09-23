
const mongoose = require('mongoose');
const colors = require('colors');

const state = {
    db: null
};

const connectDB = async () => {
    try {
        const conn = await mongoose.connect('mongodb://localhost:27017/shopping', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        state.db = conn.connection.db; // Ensure you are accessing the native MongoDB driver
        console.log(`MongoDB connected: ${conn.connection.host}`.cyan.bold.bgCyan);
    } catch (error) {
        console.error(`${error.message}`.red.underline.bold);
        process.exit(1);
    }
};

const getDB = () => {
    if (!state.db) {
        throw new Error('Database not connected!');
    }
    return state.db;
};

module.exports = {
    connectDB,
    getDB
};
