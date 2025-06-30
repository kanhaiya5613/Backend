import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utiles/ApiError.js"
import {ApiResponse} from "../utiles/ApiResponse.js"
import {asyncHandler} from "../utiles/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    
    const userId = req.user._id;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const existingLike = await Like.findOne({ video: videoId, user: userId });

    if (existingLike) {
        await existingLike.deleteOne();
        return res.status(200).json(new ApiResponse(200, {}, "Like removed from video"));
    }

    await Like.create({ video: videoId, user: userId });
    return res.status(201).json(new ApiResponse(201, {}, "Video liked"));
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
     
    const userId = req.user._id;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const existingLike = await Like.findOne({ comment: commentId, user: userId });

    if (existingLike) {
        await existingLike.deleteOne();
        return res.status(200).json(new ApiResponse(200, {}, "Like removed from comment"));
    }

    await Like.create({ comment: commentId, user: userId });
    return res.status(201).json(new ApiResponse(201, {}, "Comment liked"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
      const userId = req.user._id;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const existingLike = await Like.findOne({ tweet: tweetId, user: userId });

    if (existingLike) {
        await existingLike.deleteOne();
        return res.status(200).json(new ApiResponse(200, {}, "Like removed from tweet"));
    }

    await Like.create({ tweet: tweetId, user: userId });
    return res.status(201).json(new ApiResponse(201, {}, "Tweet liked"));
    
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

        const userId = req.user._id;

    const likedVideoIds = await Like.find({ user: userId, video: { $exists: true } })
        .select("video")
        .populate({
            path: "video",
            select: "title description thumbnail views createdAt owner",
            populate: {
                path: "owner",
                select: "username avatar"
            }
        });

    const likedVideos = likedVideoIds.map(entry => entry.video);

    return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}