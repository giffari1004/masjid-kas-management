import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken, type AuthUser } from "../lib/jwt.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Memproteksi route: wajib header `Authorization: Bearer <token>` yang valid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token autentikasi tidak ditemukan." });
    return;
  }

  const token = header.slice("Bearer ".length).trim();

  if (!token) {
    res.status(401).json({ message: "Token autentikasi tidak ditemukan." });
    return;
  }

  try {
    req.user = verifyAuthToken(token);
    next();
  } catch {
    res
      .status(401)
      .json({ message: "Sesi tidak valid atau sudah kedaluwarsa." });
  }
}
