import { asyncHandler } from "../utiles/asyncHandler.js";
import { ApiError } from "../utiles/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utiles/cloudinary.js";
import { ApiResponse } from "../utiles/ApiResponse.js";
import { trusted } from "mongoose";
import jwt from "jsonwebtoken";

// generating refresh and access token
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating refresh and access Token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user detailes from frontend
    // validation - not empty
    // check if user already exist: username, email
    // check for image, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    // geeting user details
    const { fullName, email, username, password } = req.body
    console.log("email: ", email);

    // validation
    if (
        [fullName, email, username, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are Required");
    }

    // check if user exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exist");

    }
    // console.log(req.files);
    // Check for image and avatar

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }
    // upload them to cloudinary

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!(avatar.url)) {
        throw new ApiError(400, "Avatar file is Required");
    }

    // create user object - create entry in db

    const user = await User.create({
  fullName,
  avatar: {
    public_id: avatar.public_id,
    url: avatar.url
  },
  coverImage: coverImage
    ? {
        public_id: coverImage.public_id,
        url: coverImage.url
      }
    : undefined,
  email,
  password,
  username: username.toLowerCase()
})
    // remove password and refresh token field from response

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user ")
    }

    // return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

// Login User
const loginUser = asyncHandler(async (req, res) => {
    // steps  

    // get the username or email and password from user   // req body -> data
    // check in db user exists or not   // find the user
    // password check
    // access and refresh token
    // send cookie


    // get data from request body
    const { email, username, password } = req.body

    if (!(username || email)) {
        throw new ApiError(400, "username or email is required")
    }

    // checks user in database
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }
    // password check
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user Credentials")
    }
    // access and refresh token
    // generate access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken ")

    const options = {
        httpOnly: true,
        secure: trusted
    }
    return res
        .status(200)
        .cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User Logged in Successfully"
            )
        )

})


// Logout User
// steps
// get the user from request
// update the refresh token to undefined
// clear the cookies
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: trusted
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

//refresh access token endpoint
//steps
// get the refresh token from request body or cookies
// verify the refresh token
// if valid, get the user from db
// if user exists, generate new access token and refresh token
// send the new access token and refresh token in cookies
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "invalid refresh token")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, " refresh token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newrefreshToken } = await generateAccessAndRefreshTokens(user._id)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newrefreshToken
                    },
                    "Access Token Refreshed Successfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

// Change Current Paassword
//steps
// get the old password and new password from request body
// get the user from request
// check if the old password is correct
// if correct, update the password in db
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
})

// getting current user
//steps
// get the user from request
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully "))
})

// update account details
//steps
// get the user from request
// get the fullName and email from request body
// check if fullName and email are not empty
// update the user in db
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are Required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json(new ApiResponse(200, User, "Account details updated successfully"))
})

// Updating avatar
//steps
// get the user from request
// get the avatar file from request
// check if the avatar file is present
// upload the avatar file to cloudinary
// update the user in db with the new avatar url
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // Get the user from DB to fetch old public_id
  const user = await User.findById(req.user._id);
  const oldAvatarPublicId = user?.avatar?.public_id;

  // Upload new avatar to Cloudinary
  const uploadedAvatar = await uploadOnCloudinary(avatarLocalPath);

  if (!uploadedAvatar?.url || !uploadedAvatar?.public_id) {
    throw new ApiError(400, "Error while uploading avatar on cloudinary");
  }

  // Update user with new avatar object (url + public_id)
  user.avatar = {
    url: uploadedAvatar.url,
    public_id: uploadedAvatar.public_id,
  };

  await user.save({ validateBeforeSave: false });

  // Delete old avatar from Cloudinary
  if (oldAvatarPublicId) {
    await deleteFromCloudinary(oldAvatarPublicId);
  }

  return res.status(200).json(
    new ApiResponse(200, user, "Avatar updated successfully")
  );
});

// updating coverImage
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath= req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // Get the user from DB to fetch old public_id
  const user = await User.findById(req.user._id);
  const oldCoverImagePublicId = user?.coverImage?.public_id;

  // Upload new avatar to Cloudinary
  const uploadedCoverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!uploadedCoverImage?.url || !uploadedCoverImage?.public_id) {
    throw new ApiError(400, "Error while uploading Cover Image on cloudinary");
  }

  // Update user with new avatar object (url + public_id)
  user.avatar = {
    url: uploadedCoverImage.url,
    public_id: uploadedCoverImage.public_id,
  };

  await user.save({ validateBeforeSave: false });

  // Delete old avatar from Cloudinary
  if (oldCoverImagePublicId) {
    await deleteFromCloudinary(oldCoverImagePublicId);
  }

  return res.status(200).json(
    new ApiResponse(200, user, "Cover Image updated successfully")
  );
});

// getting user channel profile
// steps
// get the username from request params
// check if username is not empty
// find the user in db with the username
// if user exists, get the subscribers count and subscribedTo count
 
const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: { $size: "$subscribers" },
                channelSubscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    if: {
                        $in: [req.user?._id, "$subscribedTo.subscriber"]
                    },
                    then: true,
                    else: false
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                email: 1,
            }
        }

    ])
    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exist")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "Channel profile fetched successfully")
    )
})

// get watch history
// steps
// get the user from request
// get the watchHistory from user

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField:"watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project:{
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                       $addFields:{
                        owner:{
                            $first: "$owner"
                        }
                       } 
                    }
                ]
            }
        }
    ])
    return res
        .status(200)
        .json(
            new ApiResponse(200,
                 user[0]?.watchHistory , "Watch history fetched successfully")
        )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}