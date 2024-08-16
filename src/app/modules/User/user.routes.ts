import express from "express";
import { UserRole } from "../../../../prisma/generated/client";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = express.Router();

router.get("/donors", UserController.getAllDoner);
router.get("/user/:id", UserController.getSingleUser);
router.get("/users", UserController.getAllUser);

router.get(
  "/donation-request",
  auth(UserRole.admin, UserRole.donor, UserRole.requester),
  UserController.getDonationRequestsForDonor
);

router.get(
  "/my-profile",
  auth(UserRole.admin, UserRole.donor, UserRole.requester),
  UserController.getUserProfile
);

router.put(
  "/my-profile",
  auth(UserRole.admin, UserRole.donor, UserRole.requester),
  validateRequest(UserValidation.updateUserProfileSchema),
  UserController.updateUserProfile
);

router.post(
  "/register",
  validateRequest(UserValidation.registerUserSchema),
  UserController.registerUser
);

router.post(
  "/donation-request",
  auth(UserRole.requester),
  validateRequest(UserValidation.donationRequestSchema),
  UserController.createDonationRequest
);

router.put(
  "/donation-request/:requestId",
  auth(UserRole.admin, UserRole.donor),
  validateRequest(UserValidation.updateRequestStatusSchema),
  UserController.updateRequestStatus
);

router.patch(
  "/manage-user/:id",
  auth(UserRole.admin),
  validateRequest(UserValidation.updateUserRoleStatusSchema),
  UserController.updateUserRoleStatus
);

// Stats routes
router.get(
  "/stats",
  auth(UserRole.admin, UserRole.donor, UserRole.requester),
  UserController.getStats
);

export const UserRoutes = router;
