const Comment = require('../models/Comment');
const Vote = require('../models/vote'); // Use the new lowercase 'vote' model
const Post = require('../models/Post');

// Helper to recalculate vote counts for a comment
const updateVoteCounts = async (commentId) => {
    if (!commentId) return;
    const upvotes = await Vote.countDocuments({ comment_id: commentId, vote_type: 1 });
    const downvotes = await Vote.countDocuments({ comment_id: commentId, vote_type: -1 });
    await Comment.findByIdAndUpdate(commentId, { upvotes, downvotes });
};

// --- NEW: Unified Vote Function ---
exports.voteComment = async (req, res) => {
    try {
        const { id } = req.params; // This is the commentId
        const { vote_type } = req.body; // Expects 1 for upvote, -1 for downvote
        const user_id = req.user.id;

        if (![1, -1].includes(vote_type)) {
            return res.status(400).json({ success: false, message: 'Invalid vote type.' });
        }

        const existingVote = await Vote.findOne({ user_id, comment_id: id });

        if (existingVote) {
            // If user is clicking the same vote button again, remove their vote
            if (existingVote.vote_type === vote_type) {
                await Vote.findByIdAndDelete(existingVote._id);
            } else {
                // If user is changing their vote (e.g., from upvote to downvote)
                existingVote.vote_type = vote_type;
                await existingVote.save();
            }
        } else {
            // If the user has not voted on this comment before, create a new vote
            await Vote.create({ user_id, comment_id: id, vote_type });
        }

        // After any vote change, recalculate the totals for the comment
        await updateVoteCounts(id);
        const updatedComment = await Comment.findById(id);

        res.status(200).json({ 
            success: true, 
            message: 'Vote registered successfully.',
            data: { 
                upvotes: updatedComment.upvotes, 
                downvotes: updatedComment.downvotes 
            }
        });
    } catch (error) {
        console.error("Vote Error:", error);
        res.status(500).json({ success: false, message: 'Error processing vote.' });
    }
};

// --- Other controller functions (get, create, delete) remain the same ---
exports.getCommentsByPostId = async (req, res) => {
    try {
        const { post_id, sortBy } = req.query;
        if (!post_id) return res.status(400).json({ success: false, message: 'post_id is required' });

        let sortOptions = { createdAt: -1 }; // Default: newest
        if (sortBy === 'oldest') sortOptions = { createdAt: 1 };
        if (sortBy === 'upvotes') sortOptions = { upvotes: -1, createdAt: -1 };
        
        const comments = await Comment.find({ post_id })
            .populate('user_id', 'name email avatar')
            .sort(sortOptions);
        
        res.status(200).json({ success: true, count: comments.length, data: comments });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching comments' });
    }
};

exports.createComment = async (req, res) => {
    try {
        const { text, post_id, parent_id } = req.body;
        const user_id = req.user.id;
        const comment = await Comment.create({ text, post_id, parent_id, user_id });
        const populatedComment = await Comment.findById(comment._id).populate('user_id', 'name avatar');
        res.status(201).json({ success: true, data: populatedComment });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating comment' });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;
        const isAdmin = req.user.isAdmin;

        const comment = await Comment.findById(id);
        if (!comment) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        if (comment.user_id.toString() !== user_id && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
        }

        // Helper to recursively delete all replies
        const deleteReplies = async (commentId) => {
            const replies = await Comment.find({ parent_id: commentId });
            for (const reply of replies) {
                await deleteReplies(reply._id);
            }
            await Vote.deleteMany({ comment_id: commentId });
            await Comment.findByIdAndDelete(commentId);
        };

        await deleteReplies(id);
        res.status(200).json({ success: true, message: 'Comment and replies deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting comment' });
    }
};

