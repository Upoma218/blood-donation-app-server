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
};
