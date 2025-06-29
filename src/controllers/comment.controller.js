
import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utiles/ApiError.js"
import {ApiResponse} from "../utiles/ApiResponse.js"
import {asyncHandler} from "../utiles/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    //steps 
    // getting video id from request.param
    // set in one page maximum 10 comments 
    // check the video id is true or not 
    // if true then get all comments for that video
    // if false then return error message
    // if comments are not found then return empty array
    // if comments are found then return comments with pagination
    // send response with status code 200 and comments data

    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const comments = await Comment.find({ video: videoId })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .populate("user", "username avatar");

    const totalComments = await Comment.countDocuments({ video: videoId });

    return res.status(200).json(new ApiResponse(200, {
        comments,
        totalPages: Math.ceil(totalComments / limit),
        currentPage: parseInt(page)
    }, "Comments fetched successfully"));

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    // steps
    // 1. get videoId from request.params
    // 2. get content from request.body
    // 3. validate content is not empty
    // 4. create a new comment with videoId, userId and content
    // 5. save the comment to database
    // 6. return success response with status code 201 and comment data
     const { videoId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
        throw new ApiError(400, "Comment content is required");
    }

    const newComment = await Comment.create({
        video: videoId,
        user: req.user._id,
        content
    });

    return res
    .status(201)
    .json(new ApiResponse(201, newComment, "Comment added successfully"));

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    // steps
    // 1. get commentId from request.params
    // 2. get content from request.body
    // 3. validate content is not empty
    // 4. find the comment by commentId
    // 5. check if the comment exists
    // 6. check if the user is the owner of the comment
    // 7. update the comment content
    // 8. save the comment to database
    // 9. return success response with status code 200 and updated comment data
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
        throw new ApiError(400, "Updated content is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.user.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only update your own comments");
    }

    comment.content = content;
    await comment.save();

    return res.status(200).json(new ApiResponse(200, comment, "Comment updated successfully"));

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    // steps
    // 1. get commentId from request.params
    // 2. find the comment by commentId 
    // 3. check if the comment exists
    // 4. check if the user is the owner of the comment
    // 5. delete the comment
    // 6. return success response with status code 200 and message
     const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.user.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You can only delete your own comments");
    }

    await comment.deleteOne();

    return res.status(200).json(new ApiResponse(200, null, "Comment deleted successfully"));

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
