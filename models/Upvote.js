const mongoose = require('mongoose');

const upvoteSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  comment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    required: [true, 'Comment ID is required']
  }
}, {
  timestamps: true
});

// Ensure a user can only upvote a comment once
upvoteSchema.index({ user_id: 1, comment_id: 1 }, { unique: true });

module.exports = mongoose.model('Upvote', upvoteSchema);