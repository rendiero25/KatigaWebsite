const mongoose = require("mongoose");

// Without this listener, an 'error' event on the connection (e.g. a dropped
// connection after a successful initial connect) is an unhandled EventEmitter
// error, which Node treats as an uncaught exception and crashes the process —
// fatal on Vercel since it kills the whole serverless function, not just one request.
mongoose.connection.on('error', (error) => {
  console.error(`MongoDB connection error: ${error.message}`);
});

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
};

module.exports = connectDB;
