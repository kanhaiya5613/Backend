import {asyncHandler} from "../utiles/asyncHandler.js";
import {ApiError} from "../utiles/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utiles/cloudinary.js";
import { ApiResponse } from "../utiles/ApiResponse.js";


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
    const existedUser = User.findOne({
        $or: [{ username },{ email }]
    })

    if(existedUser) {
        throw new ApiError(409, "User with email or username already exist");

    }
   // Check for image and avatar

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required");
    }
 // upload them to cloudinary

   const avatar = await uploadOnCloudinary(avatarLocalPath) 
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(!avatar){
    throw new ApiError(400, "Avatar file is Required");
   }

// create user object - create entry in db

const user = User.create({
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


export { registerUser}