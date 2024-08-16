import { Request, Response } from "express";
import httpStatus from "http-status";
import { Secret } from "jsonwebtoken";
import { UserRole } from "../../../../prisma/generated/client";
import config from "../../../config";
import { jwtToken } from "../../constants/jwtToken";
import ApiError from "../../errors/ApiError";
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

const getAllUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAllUserFromDB();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Users successfully found",
    data: result,
  });
});

const getSingleUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.getSingleUserFromDB(id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Donor successfully found",
    data: result,
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

const updateUserRoleStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await UserService.updateUserRoleStatusIntoDB({
    id,
    ...req.body,
  });
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User role status updated successfully",
    data: result,
  });
});

const getStats = catchAsync(async (req: Request, res: Response) => {
  const token = req.headers.authorization;
  const decodedToken = jwtToken.verifyToken(
    token as string,
    config.jwt.jwt_secret as Secret
  );

  const role = decodedToken.role;
  const userId = decodedToken.id;

  console.log("decodedToken", decodedToken, role, userId);
  if (!role) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Role is required.");
  }

  if (role === UserRole.donor || role === UserRole.requester) {
    if (!userId) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "User ID is required for donor or requester stats."
      );
    }

    const result = await UserService.getStatsFromDB(
      role as UserRole,
      userId as string,
      token
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: `${role} stats retrieved successfully`,
      data: result,
    });
  } else if (role === UserRole.admin) {
    const result = await UserService.getStatsFromDB(
      role as UserRole,
      "",
      token
    ); // Admin role does not need userId
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Admin stats retrieved successfully",
      data: result,
    });
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid role specified.");
  }
});

export const UserController = {
  registerUser,
  getAllDoner,
  createDonationRequest,
  getDonationRequestsForDonor,
  updateRequestStatus,
  getUserProfile,
  updateUserProfile,
  getSingleUser,
  updateUserRoleStatus,
  getAllUser,
  getStats,
};
