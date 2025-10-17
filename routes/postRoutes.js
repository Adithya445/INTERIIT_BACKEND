const express = require('express');
const router = express.Router();
const { getAllPosts, getPostById, createPost } = require('../controllers/postController');
const { auth, isAdmin } = require('../middleware/auth');

// Post routes
router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.post('/', auth, isAdmin, createPost);

module.exports = router;
