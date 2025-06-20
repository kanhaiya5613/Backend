import {asyncHandler} from "../utiles/asyncHandler.js";
import {ApiError} from "../utiles/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utiles/cloudinary.js";
import { ApiResponse } from "../utiles/ApiResponse.js";
import { trusted } from "mongoose";
import jwt from "jsonwebtoken";

// generating refresh and access token
const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await User.findById(userId)
       const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}

    }catch(error){
        throw new ApiError(500,"something went wrong while generating refresh and access Token")
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
   const {fullName, email, username, password } = req.body
   console.log("email: " , email);

    // validation
    if(
        [fullName,email,username,password].some((field) =>  
        field?.trim() === "" )
    ){
        throw new ApiError(400, "All fields are Required");
    }

    // check if user exists
    const existedUser = await User.findOne({     
        $or: [{ username },{ email }]
    })

    if(existedUser) {
        throw new ApiError(409, "User with email or username already exist");

    }
    // console.log(req.files);
   // Check for image and avatar

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;
  
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required");
    }
 // upload them to cloudinary

   const avatar = await uploadOnCloudinary(avatarLocalPath) 
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(!(avatar.url)){
    throw new ApiError(400, "Avatar file is Required");
   }
  
// create user object - create entry in db

const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
})
   // remove password and refresh token field from response

const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)
if(!createdUser) {
    throw new ApiError(500,"Something went wrong while registering the user ")
}

// return res
return res.status(201).json(
    new ApiResponse(200,createdUser,"User registered Successfully")
)

})

const loginUser = asyncHandler(async (req, res) => {
     // steps 

   // get the username or email and password from user   // req body -> data
   // check in db user exists or not   // find the user
   // password check
   // access and refresh token
   // send cookie
   
   
    // get data from request body
    const {email, username , password} = req.body

    if(!(username || email)){
        throw new ApiError(400, "username or email is required")
    }
     
    // checks user in database
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user) {
        throw new ApiError (404, "User does not exist")
    }

    const isPasswordValid =  await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user Credentials")
    }

    const {accessToken,refreshToken} =await generateAccessAndRefreshTokens(user._id)

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken ")

   const options = {
    httpOnly: true,
    secure:trusted
   }
   return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken,options)
   .json(
    new ApiResponse(
        200,
        {
            user: loggedInUser,accessToken,refreshToken
        },
        "User Logged in Successfully"
    )
   )

})


// Logout User

const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure:trusted
       }

       return res.status(200)
       .clearCookie("accessToken",options)
       .clearCookie("refreshToken",options)
       .json(new ApiResponse(200,{}, "User logged Out"))
})

// refresh token handler

   const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }

   try {
     const decodedToken =jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
     )
 
     const user = await user.findById(decodedToken?._id)
 
     if(!user){
         throw new ApiError(401, "invalid refresh token")
     }
     if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401, " refresh token is expired or used")   
     }
 
     const options = {
         httpOnly: true,
         secure:true
     }
 
     const {accessToken,newrefreshToken} =await generateAccessAndRefreshTokens(user._id)
 
     return res.status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", newrefreshToken, options)
     .json(
         new ApiResponse(
             200,
             {
                 accessToken,
                 refreshToken:newrefreshToken
             },
             "Access Token Refreshed Successfully"
         )
     )
   } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
   }
})



export {
     registerUser,
     loginUser,
    logoutUser,
    refreshAccessToken
    }