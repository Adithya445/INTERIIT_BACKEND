const express = require('express');
const router = express.Router();
const {
  getCommentsByPostId,
  createComment,
  updateComment,
  deleteComment,
  upvoteComment,
  removeUpvote
} = require('../controllers/commentController');
const { auth } = require('../middleware/auth');

// Comment routes
router.get('/', getCommentsByPostId);
router.post('/', auth, createComment);
router.put('/:id', auth, updateComment);
router.delete('/:id', auth, deleteComment);
router.post('/:id/upvote', auth, upvoteComment);
router.delete('/:id/upvote', auth, removeUpvote);

module.exports = router;