const express = require('express');
const router = express.Router();
const {
  getCommentsByPostId,
  createComment,
  deleteComment,
  voteComment // Import the new, unified vote function
} = require('../controllers/commentController');
const { auth } = require('../middleware/auth');

// Comment routes
router.get('/', getCommentsByPostId);
router.post('/', auth, createComment);
router.delete('/:id', auth, deleteComment);

// This single new route handles both upvotes and downvotes
router.post('/:id/vote', auth, voteComment);

module.exports = router;

