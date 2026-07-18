const mongoose = require("mongoose");

let connectionPromise = null;

// Without this listener, an 'error' event on the connection (e.g. a dropped
// connection after a successful initial connect) is an unhandled EventEmitter
// error, which Node treats as an uncaught exception and crashes the process —
// fatal on Vercel since it kills the whole serverless function, not just one request.
mongoose.connection.on('error', (error) => {
  console.error(`MongoDB connection error: ${error.message}`);
});

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }

  connectionPromise = mongoose
    .connect(process.env.MONGODB_URI, {
      maxPoolSize: 5,
      minPoolSize: 0,
    })
    .then((conn) => {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    })
    .finally(() => {
      connectionPromise = null;
    });

  return connectionPromise;
};

module.exports = connectDB;
