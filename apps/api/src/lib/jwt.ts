import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { UserRole } from "@prisma/client";

export type AuthUser = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
};

const PLACEHOLDER_SECRET = "change-me-to-a-long-random-string";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ??
  "8h") as SignOptions["expiresIn"];

function getSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret || secret === PLACEHOLDER_SECRET) {
    throw new Error(
      "JWT_SECRET belum diatur di apps/api/.env (atau masih placeholder)."
    );
  }

  return secret;
}

export function signAuthToken(user: AuthUser): string {
  return jwt.sign(user, getSecret(), {
    expiresIn: JWT_EXPIRES_IN,
    issuer: "masjid-kas-management",
  });
}

export function verifyAuthToken(token: string): AuthUser {
  const decoded = jwt.verify(token, getSecret(), {
    issuer: "masjid-kas-management",
  });

  if (typeof decoded === "string") {
    throw new Error("Payload token tidak valid.");
  }

  const payload = decoded as JwtPayload & Partial<AuthUser>;

  if (
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.name !== "string" ||
    (payload.role !== "BENDAHARA" && payload.role !== "KETUA_DKM")
  ) {
    throw new Error("Payload token tidak lengkap.");
  }

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };
}
