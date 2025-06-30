import {ApiError} from "../utiles/ApiError.js"
import {ApiResponse} from "../utiles/ApiResponse.js"
import {asyncHandler} from "../utiles/asyncHandler.js"


const healthcheck = asyncHandler(async (req, res) => {
    //TODO: build a healthcheck response that simply returns the OK status as json with a message
     return res
     .status(200)
     .json(new ApiResponse(200, { status: "OK" }, "Server is healthy")
    );
});

export {
    healthcheck
    }
    