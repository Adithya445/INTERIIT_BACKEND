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
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(d => d.trim())
    : ['http://localhost:5173', 'http://localhost:3000']; // Default for local dev

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin OR if the origin is in our whitelist
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('This origin is not allowed by CORS'));
        }
    },
    credentials: true
};

app.use(cors(corsOptions));
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