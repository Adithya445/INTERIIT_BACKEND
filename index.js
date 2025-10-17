const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const path = require("path");
console.log("Resolved path:", path.resolve(__dirname, "config/database.js"));
const dbConnect = require(path.resolve(__dirname, "config/database.js"));

const app = express();
const PORT = process.env.PORT || 5000;
// Middleware
app.use(cors({
  origin: 'http://localhost:5173/', // Your frontend URL
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/posts', require('./routes/postRoutes'));
app.use('/api/v1/comments', require('./routes/commentRoutes'));

// Default route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Inter IIT Tech 14.0 - Commenting System API',
    version: '1.0.0'
  });
});

// Connect to database and start server
dbConnect().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to connect to database:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('Unhandled Rejection! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});