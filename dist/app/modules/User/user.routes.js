"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoutes = void 0;
const express_1 = __importDefault(require("express"));
const client_1 = require("../../../../prisma/generated/client");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const user_controller_1 = require("./user.controller");
const user_validation_1 = require("./user.validation");
const router = express_1.default.Router();
router.get("/donors", user_controller_1.UserController.getAllDoner);
router.get("/user/:id", user_controller_1.UserController.getSingleUser);
router.get("/users", user_controller_1.UserController.getAllUser);
router.get("/donation-request", (0, auth_1.default)(client_1.UserRole.admin, client_1.UserRole.donor, client_1.UserRole.requester), user_controller_1.UserController.getDonationRequestsForDonor);
router.get("/my-profile", (0, auth_1.default)(client_1.UserRole.admin, client_1.UserRole.donor, client_1.UserRole.requester), user_controller_1.UserController.getUserProfile);
router.put("/my-profile", (0, auth_1.default)(client_1.UserRole.admin, client_1.UserRole.donor, client_1.UserRole.requester), (0, validateRequest_1.default)(user_validation_1.UserValidation.updateUserProfileSchema), user_controller_1.UserController.updateUserProfile);
router.post("/register", (0, validateRequest_1.default)(user_validation_1.UserValidation.registerUserSchema), user_controller_1.UserController.registerUser);
router.post("/donation-request", (0, auth_1.default)(client_1.UserRole.requester), (0, validateRequest_1.default)(user_validation_1.UserValidation.donationRequestSchema), user_controller_1.UserController.createDonationRequest);
router.put("/donation-request/:requestId", (0, auth_1.default)(client_1.UserRole.admin, client_1.UserRole.donor), (0, validateRequest_1.default)(user_validation_1.UserValidation.updateRequestStatusSchema), user_controller_1.UserController.updateRequestStatus);
router.patch("/manage-user/:id", (0, auth_1.default)(client_1.UserRole.admin), (0, validateRequest_1.default)(user_validation_1.UserValidation.updateUserRoleStatusSchema), user_controller_1.UserController.updateUserRoleStatus);
// Stats routes
router.get("/stats", (0, auth_1.default)(client_1.UserRole.admin, client_1.UserRole.donor, client_1.UserRole.requester), user_controller_1.UserController.getStats);
exports.UserRoutes = router;
