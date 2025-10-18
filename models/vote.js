const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  comment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    required: true,
  },
  // Type of vote: 1 for upvote, -1 for downvote
  vote_type: {
    type: Number,
    required: true,
    enum: [1, -1],
  },
}, { timestamps: true });

// A user can only have one vote (either up or down) per comment
voteSchema.index({ user_id: 1, comment_id: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
