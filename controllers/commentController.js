const Comment = require('../models/Comment');
const Upvote = require('../models/Upvote');
const Post = require('../models/Post');

// Get all comments for a post
exports.getCommentsByPostId = async (req, res) => {
  try {
    const { post_id, sortBy } = req.query;

    if (!post_id) {
      return res.status(400).json({ success: false, message: 'post_id is required' });
    }

    // --- NEW: DYNAMIC SORTING LOGIC ---
    let sortOptions = { createdAt: -1 }; // Default to newest
    switch (sortBy) {
        case 'oldest':
            sortOptions = { createdAt: 1 };
            break;
        case 'upvotes':
            sortOptions = { upvotes: -1, createdAt: -1 }; // Sort by upvotes, then newest
            break;
        case 'newest':
        default:
            sortOptions = { createdAt: -1 };
            break;
    }

    const comments = await Comment.find({ post_id })
      .populate('user_id', 'name email avatar')
      .sort(sortOptions); // Use the dynamic sort options

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ success: false, message: 'Error fetching comments' });
  }
};

// Create new comment
exports.createComment = async (req, res) => {
  try {
    const { text, post_id, parent_id } = req.body;
    const user_id = req.user.id;

    // Validate required fields
    if (!text || !post_id) {
      return res.status(400).json({
        success: false,
        message: 'text and post_id are required'
      });
    }

    // Check if post exists
    const post = await Post.findById(post_id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Create comment
    const comment = await Comment.create({
      text,
      post_id,
      parent_id: parent_id || null,
      user_id
    });

    // Populate user data
    const populatedComment = await Comment.findById(comment._id)
      .populate('user_id', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      data: populatedComment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating comment',
      error: error.message
    });
  }
};

// Update comment
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const user_id = req.user.id;

    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Text is required'
      });
    }

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user is owner
    if (comment.user_id.toString() !== user_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment'
      });
    }

    comment.text = text;
    await comment.save();

    const updatedComment = await Comment.findById(id)
      .populate('user_id', 'name email avatar');

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: updatedComment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating comment',
      error: error.message
    });
  }
};

// Delete comment (Owner or Admin)
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;
    const isAdmin = req.user.isAdmin;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user is owner or admin
    if (comment.user_id.toString() !== user_id && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    // Delete all child comments recursively
    await deleteCommentAndReplies(id);

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting comment',
      error: error.message
    });
  }
};

// Helper function to delete comment and its replies recursively
async function deleteCommentAndReplies(commentId) {
  // Find all replies to this comment
  const replies = await Comment.find({ parent_id: commentId });
  
  // Recursively delete all replies
  for (const reply of replies) {
    await deleteCommentAndReplies(reply._id);
  }
  
  // Delete all upvotes for this comment
  await Upvote.deleteMany({ comment_id: commentId });
  
  // Delete the comment itself
  await Comment.findByIdAndDelete(commentId);
}

// Upvote a comment
exports.upvoteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if already upvoted
    const existingUpvote = await Upvote.findOne({
      user_id,
      comment_id: id
    });

    if (existingUpvote) {
      return res.status(400).json({
        success: false,
        message: 'Already upvoted this comment'
      });
    }

    // Create upvote
    await Upvote.create({
      user_id,
      comment_id: id
    });

    // Increment upvote count
    comment.upvotes += 1;
    await comment.save();

    res.status(200).json({
      success: true,
      message: 'Comment upvoted successfully',
      upvotes: comment.upvotes
    });
  } catch (error) {
    console.error('Upvote comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error upvoting comment',
      error: error.message
    });
  }
};

// Remove upvote from comment
exports.removeUpvote = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Find upvote
    const upvote = await Upvote.findOne({
      user_id,
      comment_id: id
    });

    if (!upvote) {
      return res.status(400).json({
        success: false,
        message: 'Comment not upvoted'
      });
    }

    // Delete upvote
    await Upvote.findByIdAndDelete(upvote._id);

    // Decrement upvote count
    comment.upvotes = Math.max(0, comment.upvotes - 1);
    await comment.save();

    res.status(200).json({
      success: true,
      message: 'Upvote removed successfully',
      upvotes: comment.upvotes
    });
  } catch (error) {
    console.error('Remove upvote error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing upvote',
      error: error.message
    });
  }
};