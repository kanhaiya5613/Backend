import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utiles/ApiError.js"
import {ApiResponse} from "../utiles/ApiResponse.js"
import {asyncHandler} from "../utiles/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body;
    const userId = req.user._id;

    if (!content?.trim()) {
        throw new ApiError(400, "Tweet content cannot be empty");
    }

    const tweet = await Tweet.create({
        content,
        author: userId
    });

    return res.status(201).json(new ApiResponse(201, tweet, "Tweet created successfully"));

})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
      const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const tweets = await Tweet.find({ author: userId })
        .sort({ createdAt: -1 })
        .populate("author", "username avatar");

    return res.status(200).json(new ApiResponse(200, tweets, "User tweets fetched successfully"));

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
      const { tweetId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (!tweet.author.equals(userId)) {
        throw new ApiError(403, "You are not allowed to update this tweet");
    }

    if (!content?.trim()) {
        throw new ApiError(400, "Tweet content cannot be empty");
    }

    tweet.content = content;
    await tweet.save();

    return res.status(200).json(new ApiResponse(200, tweet, "Tweet updated successfully"));

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
     const { tweetId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (!tweet.author.equals(userId)) {
        throw new ApiError(403, "You are not allowed to delete this tweet");
    }

    await Tweet.findByIdAndDelete(tweetId);

    return res.status(200).json(new ApiResponse(200, {}, "Tweet deleted successfully"));

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}