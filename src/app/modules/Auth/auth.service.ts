import bcrypt from "bcrypt";
import { Secret } from "jsonwebtoken";
import { Status } from "../../../../prisma/generated/client";
import config from "../../../config";
import { jwtToken } from "../../constants/jwtToken";
import prisma from "../../shared/prisma";

const loginUser = async (payload: { email: string; password: string }) => {
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
      status: Status.active,
    },
  });
  const isCorrectPassword: boolean = await bcrypt.compare(
    payload.password,
    userData.password
  );

  if (!isCorrectPassword) {
    throw new Error("Password incorrect!");
  }
  const accessToken = jwtToken.generateToken(
    {
      id: userData.id,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.expires_in as string
  );

  const refreshToken = jwtToken.generateToken(
    {
      id: userData.id,
      email: userData.email,
      role: userData.role,
    },
    config.jwt.refresh_token_secret as Secret,
    config.jwt.refresh_token_expires_in as string
  );

  return {
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (token: string) => {
  let decodedData;
  try {
    decodedData = jwtToken.verifyToken(
      token,
      config.jwt.refresh_token_secret as Secret
    );
  } catch (err) {
    throw new Error("You are not authorized!");
  }

  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: decodedData.email,
      status: Status.active,
    },
  });

  const accessToken = jwtToken.generateToken(
    {
      email: userData.email,
      role: userData.role,
    },
    config.jwt.jwt_secret as Secret,
    config.jwt.expires_in as string
  );

  return {
    accessToken,
  };
};

const changePassword = async (user: any, payload: any) => {
  console.log({ payload });
  const userData = await prisma.user.findUniqueOrThrow({
    where: {
      email: user.email,
      status: Status.active,
    },
  });

  const isCorrectPassword: boolean = await bcrypt.compare(
    payload.currentPassword,
    userData.password
  );
  console.log({ isCorrectPassword, payload, userData });
  if (!isCorrectPassword) {
    throw new Error("Password incorrect!");
  }

  const hashedPassword: string = await bcrypt.hash(payload.newPassword, 12);

  await prisma.user.update({
    where: {
      email: userData.email,
    },
    data: {
      password: hashedPassword,
    },
  });
  console.log("cahnge");
  return {
    message: "Password changed successfully!",
  };
};

export const AuthServices = {
  loginUser,
  refreshToken,
  changePassword,
};
