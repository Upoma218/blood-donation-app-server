import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import pick from "../../shared/pick";
import sendResponse from "../../shared/sendResponse";
import { filterableFields } from "./user.constant";
import { UserService } from "./user.service";

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.registerUserIntoDB(req);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "User registered successfully",
    data: result,
  });
});

const getAllDoner = catchAsync(async (req: Request, res: Response) => {
  if (req.query.sortBy === "age") {
    req.query.sortBy = "userProfile";
    req.query.sortOrder = {
      age: req.query.sortOrder,
    };
  } else if (req.query.sortBy === "lastDonationDate") {
    req.query.sortBy = "userProfile";
    req.query.sortOrder = {
      lastDonationDate: req.query.sortOrder,
    };
  }

  if (req.query.availability === "true") {
    req.query.availability = true as unknown as string;
  } else if (req.query.availability === "false") {
    req.query.availability = false as unknown as string;
  }
  const filters = pick(req.query, filterableFields);
  console.log(filters);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await UserService.getAllDonarFromDB(filters, options);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Donors successfully found",
    meta: result.meta,
    data: result.data,
  });
});

const createDonationRequest = catchAsync(
  async (req: Request, res: Response) => {
    const result = await UserService.createDonationRequestIntoDB(req);
    sendResponse(res, {
      success: true,
      statusCode: 201,
      message: "Request successfully made",
      data: result,
    });
  }
);

const getDonationRequestsForDonor = catchAsync(
  async (req: Request, res: Response) => {
    const result = await UserService.getDonationRequestsForDonorFromDB(req);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Donation requests retrieved successfully",
      data: result,
    });
  }
);

const updateRequestStatus = catchAsync(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const { status } = req.body;
  const result = await UserService.updateRequestStatusIntoDB(
    req,
    requestId,
    status
  );

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Donation request status successfully updated",
    data: result,
  });
});

const getUserProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getUserProfileFromDB(req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Profile retrieved successfully",
    data: result,
  });
});

const updateUserProfile = catchAsync(async (req: Request, res: Response) => {
  const { bio, age, lastDonationDate } = req.body;

  // Call the service to update the user profile
  const result = await UserService.updateUserProfileIntoDB(req, {
    bio,
    age,
    lastDonationDate,
  });
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User profile updated successfully",
    data: result,
  });
});

export const UserController = {
  registerUser,
  getAllDoner,
  createDonationRequest,
  getDonationRequestsForDonor,
  updateRequestStatus,
  getUserProfile,
  updateUserProfile,
};
