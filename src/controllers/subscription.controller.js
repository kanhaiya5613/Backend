import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utiles/ApiError.js"
import {ApiResponse} from "../utiles/ApiResponse.js"
import {asyncHandler} from "../utiles/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
     const userId = req.user._id;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    if (channelId === userId.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: userId,
        channel: channelId
    });

    if (existingSubscription) {
        await existingSubscription.deleteOne();
        return res.status(200).json(new ApiResponse(200, {}, "Unsubscribed successfully"));
    }

    await Subscription.create({
        subscriber: userId,
        channel: channelId
    });

    return res.status(201).json(new ApiResponse(201, {}, "Subscribed successfully"));

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const subscribers = await Subscription.find({ channel: channelId })
        .populate("subscriber", "username avatar");

    return res.status(200).json(
        new ApiResponse(200, subscribers.map(s => s.subscriber), "Channel subscribers fetched")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
      const userId = req.user._id;

    const subscriptions = await Subscription.find({ subscriber: userId })
        .populate("channel", "username avatar");

    return res.status(200).json(
        new ApiResponse(200, subscriptions.map(s => s.channel), "Subscribed channels fetched")
    );
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}