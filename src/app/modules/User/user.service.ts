import bcrypt from "bcrypt";
import { eachDayOfInterval, subDays } from "date-fns";
import { Request } from "express";
import httpStatus from "http-status";
import { Secret } from "jsonwebtoken";
import {
  Prisma,
  RequestStatus,
  Status,
  UserProfile,
  UserRole,
} from "../../../../prisma/generated/client";
import config from "../../../config";
import { jwtToken } from "../../constants/jwtToken";
import { pagination } from "../../constants/pagination";
import ApiError from "../../errors/ApiError";
import { TPaginationOptions } from "../../interfaces/pagination";
import prisma from "../../shared/prisma";
import { searchableFields } from "./user.constant";

const registerUserIntoDB = async (req: Request): Promise<any> => {
  const hashedPassword: string = await bcrypt.hash(req.body.password, 12);
  const userData = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    password: hashedPassword,
    bloodType: req.body.bloodType,
    location: req.body.location,
  };

  const userProfileData = {
    bio: req.body.bio,
    age: req.body.age,
    lastDonationDate: req.body.lastDonationDate,
  };

  const result = await prisma.$transaction(async (transactionClient) => {
    const user = await transactionClient.user.create({
      data: userData,
    });
    await transactionClient.userProfile.create({
      data: {
        ...userProfileData,
        userId: user.id,
      },
    });

    const userWithProfile = await transactionClient.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        role: true,
        bloodType: true,
        location: true,
        availability: true,
        createdAt: true,
        updatedAt: true,
        userProfile: true,
      },
    });

    return userWithProfile;
  });
  return result;
};

const getAllDonarFromDB = async (params: any, options: TPaginationOptions) => {
  const { page, limit, skip, sortBy, sortOrder } =
    pagination.calculatePagination(options);
  const { availability, searchTerm, ...filterData } = params;
  const andConditions: Prisma.UserWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
          mode: "insensitive",
        },
      })),
    });
  }

  if (availability === true || availability === false) {
    andConditions.push({
      AND: [
        {
          availability: {
            equals: availability,
          },
        },
      ],
    });
  }
  andConditions.push({
    AND: {
      role: {
        equals: UserRole.donor,
      },
    },
  });

  const whereConditions: Prisma.UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};
  const result = await prisma.user.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      role: true,
      bloodType: true,
      location: true,
      availability: true,
      createdAt: true,
      updatedAt: true,
      userProfile: true,
    },
  });

  const total = await prisma.user.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};
const getSingleUserFromDB = async (id: string) => {
  const result = await prisma.user.findUnique({
    where: {
      id,
    },
  });
  return result;
};
const getAllUserFromDB = async () => {
  const result = await prisma.user.findMany();
  return result;
};

const createDonationRequestIntoDB = async (req: Request): Promise<any> => {
  const token = req.headers.authorization;

  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized Access!");
  }

  const decodedToken = jwtToken.verifyToken(
    token,
    config.jwt.jwt_secret as Secret
  ) as {
    id: string;
    name: string;
    email: string;
  };
  console.log(decodedToken);
  if (!decodedToken) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized Access!");
  }
  const requestData = {
    ...req.body,
    requesterId: decodedToken.id,
  };
  const result = await prisma.request.create({
    data: requestData,
    select: {
      id: true,
      donorId: true,
      dateOfDonation: true,
      hospitalName: true,
      hospitalAddress: true,
      reason: true,
      requestStatus: true,
      createdAt: true,
      updatedAt: true,
      donor: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          role: true,
          bloodType: true,
          location: true,
          availability: true,
          createdAt: true,
          updatedAt: true,
          userProfile: true,
        },
      },
    },
  });
  console.log(result);
  return result;
};

const getDonationRequestsForDonorFromDB = async (
  req: Request
): Promise<any> => {
  const token = req.headers.authorization;

  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized Access!");
  }

  // Decoding the token to get the donor's details
  const decodedToken = jwtToken.verifyToken(
    token,
    config.jwt.jwt_secret as Secret
  ) as {
    id: string;
    role: string;
  };
  const donor = {
    requester: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        bloodType: true,
        availability: true,
      },
    },
  };
  const requester = {
    donor: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        bloodType: true,
        availability: true,
      },
    },
  };
  console.log(decodedToken);

  const requesterData = { requesterId: decodedToken.id };
  const donorData = { donorId: decodedToken.id };
  const includeOption = decodedToken?.role === "donor" ? donor : requester;
  const whereOption =
    decodedToken?.role === "donor" ? donorData : requesterData;

  const result = await prisma.request.findMany({
    where: {
      // donorId: decodedToken.id,
      ...whereOption,
    },
    include: {
      ...includeOption,
      // requester: {
      //   select: {
      //     id: true,
      //     name: true,
      //     email: true,
      //     phone: true,
      //     location: true,
      //     bloodType: true,
      //     availability: true,
      //   },
      // },
    },
  });

  console.log(result, decodedToken);

  return result;
};

const updateRequestStatusIntoDB = async (
  req: Request,
  requestId: string,
  status: RequestStatus
): Promise<any> => {
  const token = req.headers.authorization;

  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized Access!");
  }

  // Decoding the token to get the donor's details
  const decodedToken = jwtToken.verifyToken(
    token,
    config.jwt.jwt_secret as Secret
  ) as {
    id: string;
  };

  const request = await prisma.request.findUnique({
    where: {
      id: requestId,
    },
    select: {
      donorId: true,
    },
  });

  if (!request || request.donorId !== decodedToken.id) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not authorized to update this request status!"
    );
  }

  // Updating the request status
  const updatedRequest = await prisma.request.update({
    where: {
      id: requestId,
    },
    data: {
      requestStatus: status,
    },
    select: {
      id: true,
      donorId: true,
      requesterId: true,
      dateOfDonation: true,
      hospitalName: true,
      hospitalAddress: true,
      reason: true,
      requestStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return updatedRequest;
};

const getUserProfileFromDB = async (req: Request): Promise<any> => {
  const token = req.headers.authorization;

  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized Access!");
  }

  // Decoding the token to get the donor's details
  const decodedToken = jwtToken.verifyToken(
    token,
    config.jwt.jwt_secret as Secret
  ) as {
    id: string;
  };

  const result = await prisma.user.findUnique({
    where: {
      id: decodedToken.id,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      isDonateBlood: true,
      bloodType: true,
      location: true,
      availability: true,
      createdAt: true,
      updatedAt: true,
      userProfile: true,
    },
  });

  return result;
};

const updateUserProfileIntoDB = async (
  req: Request,
  data: Partial<UserProfile>
): Promise<UserProfile> => {
  const token = req.headers.authorization;

  if (!token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized Access!");
  }

  // Decoding the token to get the user's details
  const decodedToken = jwtToken.verifyToken(
    token,
    config.jwt.jwt_secret as Secret
  ) as {
    id: string;
  };

  // Update user profile in the database based on the decoded user ID
  const updatedProfile = await prisma.userProfile.update({
    where: {
      userId: decodedToken.id,
    },
    data,
  });

  return updatedProfile;
};

type UpdateUser = {
  id: string;
  status?: Status;
  role?: UserRole;
};

const updateUserRoleStatusIntoDB = async (payload: UpdateUser) => {
  const updateData: Partial<UpdateUser> = {};
  console.log(payload);

  if (payload.status !== undefined) {
    updateData.status = payload.status;
  }

  if (payload.role !== undefined) {
    updateData.role = payload.role;
  }

  const updatedProfile = await prisma.user.update({
    where: {
      id: payload.id,
    },
    data: updateData,
  });
  console.log(updatedProfile);
  return updatedProfile;
};

/* All stats */

// Helper function for donor/requester donation stats with full date range

/* All stats */

const getDonationsWithFullDateRange = async (
  userId: string,
  role: UserRole,
  daysBack: number = 30
) => {
  // Step 1: Generate the complete date range
  const endDate = new Date();
  const startDate = subDays(endDate, daysBack);

  const fullDateRange = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  // Step 2: Query donation counts by date where donations exist
  const donations = await prisma.request.groupBy({
    by: ["dateOfDonation"],
    where: {
      [role === UserRole.donor ? "donorId" : "requesterId"]: userId,
      dateOfDonation: {
        gte: startDate.toISOString(), // Convert Date to ISO string
        lte: endDate.toISOString(),
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      dateOfDonation: "asc",
    },
  });

  // Step 3: Merge the full date range with the donations result
  const donationsMap = donations.reduce((acc: any, curr: any) => {
    acc[curr.dateOfDonation.toISOString().split("T")[0]] = curr._count.id;
    return acc;
  }, {});

  const donationsWithAllDates = fullDateRange.map((date) => {
    const dateKey = date.toISOString().split("T")[0]; // Get date in YYYY-MM-DD format
    return {
      date: dateKey,
      count: donationsMap[dateKey] || 0, // Fill in with 0 if no donation exists for that date
    };
  });

  return donationsWithAllDates;
};

// For Donor Stats
const getDonorStats = async (userId: string) => {
  const totalRequests = await prisma.request.count({
    where: { donorId: userId },
  });

  const totalPendingRequests = await prisma.request.count({
    where: {
      donorId: userId,
      requestStatus: RequestStatus.PENDING,
    },
  });

  const totalApprovedRequests = await prisma.request.count({
    where: {
      donorId: userId,
      requestStatus: RequestStatus.APPROVED,
    },
  });

  const totalRejectedRequests = await prisma.request.count({
    where: {
      donorId: userId,
      requestStatus: RequestStatus.REJECTED,
    },
  });

  // Call the helper function to get donations with full date range
  const donations = await getDonationsWithFullDateRange(userId, UserRole.donor);

  return {
    totalRequests,
    totalPendingRequests,
    totalApprovedRequests,
    totalRejectedRequests,
    donations,
  };
};

// For Requester Stats
const getRequesterStats = async (userId: string) => {
  const totalRequests = await prisma.request.count({
    where: { requesterId: userId },
  });

  const totalPendingRequests = await prisma.request.count({
    where: {
      requesterId: userId,
      requestStatus: RequestStatus.PENDING,
    },
  });

  const totalApprovedRequests = await prisma.request.count({
    where: {
      requesterId: userId,
      requestStatus: RequestStatus.APPROVED,
    },
  });

  const totalRejectedRequests = await prisma.request.count({
    where: {
      requesterId: userId,
      requestStatus: RequestStatus.REJECTED,
    },
  });

  // Call the helper function to get donations with full date range
  const donations = await getDonationsWithFullDateRange(
    userId,
    UserRole.requester
  );

  return {
    totalRequests,
    totalPendingRequests,
    totalApprovedRequests,
    totalRejectedRequests,
    donations,
  };
};

// For Admin Stats
const getAdminStats = async () => {
  const totalUsers = await prisma.user.count();
  const totalDonors = await prisma.user.count({
    where: { role: UserRole.donor },
  });
  const totalRequesters = await prisma.user.count({
    where: { role: UserRole.requester },
  });
  const totalAvailableDonors = await prisma.user.count({
    where: { role: UserRole.donor, availability: true },
  });
  const totalActiveUsers = await prisma.user.count({
    where: { status: Status.active },
  });
  const totalDeactivatedUsers = await prisma.user.count({
    where: { status: Status.deactive },
  });

  return {
    totalUsers,
    totalDonors,
    totalRequesters,
    totalAvailableDonors,
    totalActiveUsers,
    totalDeactivatedUsers,
  };
};

// Aggregate getStatsFromDB for different roles
const getStatsFromDB = async (
  role: UserRole,
  userId: string,
  token?: string
): Promise<any> => {
  // Decode the token if provided
  // Decode token utility function
  const decodeToken = (token: string) => {
    try {
      return jwtToken.verifyToken(token, config.jwt.jwt_secret as Secret) as {
        id: string;
        role: UserRole;
      };
    } catch (error) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid token.");
    }
  };

  switch (role) {
    case UserRole.donor:
      if (!userId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "User ID is required for donor stats."
        );
      }
      return await getDonorStats(userId);

    case UserRole.requester:
      if (!userId) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "User ID is required for requester stats."
        );
      }
      return await getRequesterStats(userId);

    case UserRole.admin:
      return await getAdminStats();

    default:
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid role specified.");
  }
};

export const UserService = {
  registerUserIntoDB,
  getAllDonarFromDB,
  createDonationRequestIntoDB,
  getDonationRequestsForDonorFromDB,
  updateRequestStatusIntoDB,
  getUserProfileFromDB,
  updateUserProfileIntoDB,
  getSingleUserFromDB,
  updateUserRoleStatusIntoDB,
  getAllUserFromDB,
  getStatsFromDB,
  getDonationsWithFullDateRange,
  getDonorStats,
  getAdminStats,
  getRequesterStats,
};
