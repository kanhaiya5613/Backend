import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utiles/ApiError.js"
import {ApiResponse} from "../utiles/ApiResponse.js"
import {asyncHandler} from "../utiles/asyncHandler.js"
import {uploadOnCloudinary} from "../utiles/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const filter = {};
    if (query) {
        filter.title = { $regex: query, $options: "i" };
    }
    if (userId && isValidObjectId(userId)) {
        filter.owner = userId;
    }

    const sort = { [sortBy]: sortType === "asc" ? 1 : -1 };

    const videos = await Video.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("owner", "username avatar");

    const total = await Video.countDocuments(filter);

    return res.status(200).json(
        new ApiResponse(200, { total, page: parseInt(page), videos }, "Videos fetched successfully")
    );
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
     const userId = req.user._id;

    if (!req.files || !req.files.video || !req.files.thumbnail) {
        throw new ApiError(400, "Both video and thumbnail files are required");
    }

    const videoUpload = await uploadOnCloudinary(req.files.video.tempFilePath);
    const thumbnailUpload = await uploadOnCloudinary(req.files.thumbnail.tempFilePath);

    if (!videoUpload?.url || !thumbnailUpload?.url) {
        throw new ApiError(500, "Video or thumbnail upload failed");
    }

    const video = await Video.create({
        title,
        description,
        owner: userId,
        videoUrl: videoUpload.url,
        thumbnail: thumbnailUpload.url
     });

    return res.status(201).json(new ApiResponse(201, video, "Video published successfully"));

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
     if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId)
        .populate("owner", "username avatar");

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    return res.status(200).json(new ApiResponse(200, video, "Video fetched successfully"));

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title, description } = req.body;
    const userId = req.user._id;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    if (!video.owner.equals(userId)) {
        throw new ApiError(403, "You are not allowed to update this video");
    }

    if (title) video.title = title;
    if (description) video.description = description;

    if (req.files?.thumbnail) {
        const thumbnailUpload = await uploadOnCloudinary(req.files.thumbnail.tempFilePath);
        if (thumbnailUpload?.url) {
            video.thumbnail = thumbnailUpload.url;
        }
    }

    await video.save();
    return res.status(200).json(new ApiResponse(200, video, "Video updated successfully"));

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
     const userId = req.user._id;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    if (!video.owner.equals(userId)) {
        throw new ApiError(403, "You are not allowed to delete this video");
    }

    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(new ApiResponse(200, {}, "Video deleted successfully"));

})
// controller to toggle publish status of a video
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user._id;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    if (!video.owner.equals(userId)) {
        throw new ApiError(403, "You are not allowed to update this video");
    }

    video.isPublished = !video.isPublished;
    await video.save();

    return res.status(200).json(new ApiResponse(200, video, `Video ${video.isPublished ? "published" : "unpublished"} successfully`));

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}