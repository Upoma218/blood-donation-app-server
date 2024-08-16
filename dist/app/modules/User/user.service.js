"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const date_fns_1 = require("date-fns");
const http_status_1 = __importDefault(require("http-status"));
const client_1 = require("../../../../prisma/generated/client");
const config_1 = __importDefault(require("../../../config"));
const jwtToken_1 = require("../../constants/jwtToken");
const pagination_1 = require("../../constants/pagination");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const prisma_1 = __importDefault(require("../../shared/prisma"));
const user_constant_1 = require("./user.constant");
const registerUserIntoDB = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const hashedPassword = yield bcrypt_1.default.hash(req.body.password, 12);
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
    const result = yield prisma_1.default.$transaction((transactionClient) => __awaiter(void 0, void 0, void 0, function* () {
        const user = yield transactionClient.user.create({
            data: userData,
        });
        yield transactionClient.userProfile.create({
            data: Object.assign(Object.assign({}, userProfileData), { userId: user.id }),
        });
        const userWithProfile = yield transactionClient.user.findUnique({
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
    }));
    return result;
});
const getAllDonarFromDB = (params, options) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit, skip, sortBy, sortOrder } = pagination_1.pagination.calculatePagination(options);
    const { availability, searchTerm } = params, filterData = __rest(params, ["availability", "searchTerm"]);
    const andConditions = [];
    if (searchTerm) {
        andConditions.push({
            OR: user_constant_1.searchableFields.map((field) => ({
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
                    equals: filterData[key],
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
                equals: client_1.UserRole.donor,
            },
        },
    });
    const whereConditions = andConditions.length > 0 ? { AND: andConditions } : {};
    const result = yield prisma_1.default.user.findMany({
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
    const total = yield prisma_1.default.user.count({
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
});
const getSingleUserFromDB = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma_1.default.user.findUnique({
        where: {
            id,
        },
    });
    return result;
});
const getAllUserFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield prisma_1.default.user.findMany();
    return result;
});
const createDonationRequestIntoDB = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.headers.authorization;
    if (!token) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized Access!");
    }
    const decodedToken = jwtToken_1.jwtToken.verifyToken(token, config_1.default.jwt.jwt_secret);
    console.log(decodedToken);
    if (!decodedToken) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized Access!");
    }
    const requestData = Object.assign(Object.assign({}, req.body), { requesterId: decodedToken.id });
    const result = yield prisma_1.default.request.create({
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
});
const getDonationRequestsForDonorFromDB = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.headers.authorization;
    if (!token) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized Access!");
    }
    // Decoding the token to get the donor's details
    const decodedToken = jwtToken_1.jwtToken.verifyToken(token, config_1.default.jwt.jwt_secret);
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
    const includeOption = (decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.role) === "donor" ? donor : requester;
    const whereOption = (decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.role) === "donor" ? donorData : requesterData;
    const result = yield prisma_1.default.request.findMany({
        where: Object.assign({}, whereOption),
        include: Object.assign({}, includeOption),
    });
    console.log(result, decodedToken);
    return result;
});
const updateRequestStatusIntoDB = (req, requestId, status) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.headers.authorization;
    if (!token) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized Access!");
    }
    // Decoding the token to get the donor's details
    const decodedToken = jwtToken_1.jwtToken.verifyToken(token, config_1.default.jwt.jwt_secret);
    const request = yield prisma_1.default.request.findUnique({
        where: {
            id: requestId,
        },
        select: {
            donorId: true,
        },
    });
    if (!request || request.donorId !== decodedToken.id) {
        throw new ApiError_1.default(http_status_1.default.FORBIDDEN, "You are not authorized to update this request status!");
    }
    // Updating the request status
    const updatedRequest = yield prisma_1.default.request.update({
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
});
const getUserProfileFromDB = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.headers.authorization;
    if (!token) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized Access!");
    }
    // Decoding the token to get the donor's details
    const decodedToken = jwtToken_1.jwtToken.verifyToken(token, config_1.default.jwt.jwt_secret);
    const result = yield prisma_1.default.user.findUnique({
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
});
const updateUserProfileIntoDB = (req, data) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.headers.authorization;
    if (!token) {
        throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized Access!");
    }
    // Decoding the token to get the user's details
    const decodedToken = jwtToken_1.jwtToken.verifyToken(token, config_1.default.jwt.jwt_secret);
    // Update user profile in the database based on the decoded user ID
    const updatedProfile = yield prisma_1.default.userProfile.update({
        where: {
            userId: decodedToken.id,
        },
        data,
    });
    return updatedProfile;
});
const updateUserRoleStatusIntoDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const updateData = {};
    console.log(payload);
    if (payload.status !== undefined) {
        updateData.status = payload.status;
    }
    if (payload.role !== undefined) {
        updateData.role = payload.role;
    }
    const updatedProfile = yield prisma_1.default.user.update({
        where: {
            id: payload.id,
        },
        data: updateData,
    });
    console.log(updatedProfile);
    return updatedProfile;
});
/* All stats */
// Helper function for donor/requester donation stats with full date range
/* All stats */
const getDonationsWithFullDateRange = (userId_1, role_1, ...args_1) => __awaiter(void 0, [userId_1, role_1, ...args_1], void 0, function* (userId, role, daysBack = 30) {
    // Step 1: Generate the complete date range
    const endDate = new Date();
    const startDate = (0, date_fns_1.subDays)(endDate, daysBack);
    const fullDateRange = (0, date_fns_1.eachDayOfInterval)({
        start: startDate,
        end: endDate,
    });
    // Step 2: Query donation counts by date where donations exist
    const donations = yield prisma_1.default.request.groupBy({
        by: ["dateOfDonation"],
        where: {
            [role === client_1.UserRole.donor ? "donorId" : "requesterId"]: userId,
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
    const donationsMap = donations.reduce((acc, curr) => {
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
});
// For Donor Stats
const getDonorStats = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const totalRequests = yield prisma_1.default.request.count({
        where: { donorId: userId },
    });
    const totalPendingRequests = yield prisma_1.default.request.count({
        where: {
            donorId: userId,
            requestStatus: client_1.RequestStatus.PENDING,
        },
    });
    const totalApprovedRequests = yield prisma_1.default.request.count({
        where: {
            donorId: userId,
            requestStatus: client_1.RequestStatus.APPROVED,
        },
    });
    const totalRejectedRequests = yield prisma_1.default.request.count({
        where: {
            donorId: userId,
            requestStatus: client_1.RequestStatus.REJECTED,
        },
    });
    // Call the helper function to get donations with full date range
    const donations = yield getDonationsWithFullDateRange(userId, client_1.UserRole.donor);
    return {
        totalRequests,
        totalPendingRequests,
        totalApprovedRequests,
        totalRejectedRequests,
        donations,
    };
});
// For Requester Stats
const getRequesterStats = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const totalRequests = yield prisma_1.default.request.count({
        where: { requesterId: userId },
    });
    const totalPendingRequests = yield prisma_1.default.request.count({
        where: {
            requesterId: userId,
            requestStatus: client_1.RequestStatus.PENDING,
        },
    });
    const totalApprovedRequests = yield prisma_1.default.request.count({
        where: {
            requesterId: userId,
            requestStatus: client_1.RequestStatus.APPROVED,
        },
    });
    const totalRejectedRequests = yield prisma_1.default.request.count({
        where: {
            requesterId: userId,
            requestStatus: client_1.RequestStatus.REJECTED,
        },
    });
    // Call the helper function to get donations with full date range
    const donations = yield getDonationsWithFullDateRange(userId, client_1.UserRole.requester);
    return {
        totalRequests,
        totalPendingRequests,
        totalApprovedRequests,
        totalRejectedRequests,
        donations,
    };
});
// For Admin Stats
const getAdminStats = () => __awaiter(void 0, void 0, void 0, function* () {
    const totalUsers = yield prisma_1.default.user.count();
    const totalDonors = yield prisma_1.default.user.count({
        where: { role: client_1.UserRole.donor },
    });
    const totalRequesters = yield prisma_1.default.user.count({
        where: { role: client_1.UserRole.requester },
    });
    const totalAvailableDonors = yield prisma_1.default.user.count({
        where: { role: client_1.UserRole.donor, availability: true },
    });
    const totalActiveUsers = yield prisma_1.default.user.count({
        where: { status: client_1.Status.active },
    });
    const totalDeactivatedUsers = yield prisma_1.default.user.count({
        where: { status: client_1.Status.deactive },
    });
    return {
        totalUsers,
        totalDonors,
        totalRequesters,
        totalAvailableDonors,
        totalActiveUsers,
        totalDeactivatedUsers,
    };
});
// Aggregate getStatsFromDB for different roles
const getStatsFromDB = (role, userId, token) => __awaiter(void 0, void 0, void 0, function* () {
    // Decode the token if provided
    // Decode token utility function
    const decodeToken = (token) => {
        try {
            return jwtToken_1.jwtToken.verifyToken(token, config_1.default.jwt.jwt_secret);
        }
        catch (error) {
            throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "Invalid token.");
        }
    };
    switch (role) {
        case client_1.UserRole.donor:
            if (!userId) {
                throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "User ID is required for donor stats.");
            }
            return yield getDonorStats(userId);
        case client_1.UserRole.requester:
            if (!userId) {
                throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "User ID is required for requester stats.");
            }
            return yield getRequesterStats(userId);
        case client_1.UserRole.admin:
            return yield getAdminStats();
        default:
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid role specified.");
    }
});
exports.UserService = {
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
