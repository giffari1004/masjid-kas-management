import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma.js";
import { signAuthToken } from "../../lib/jwt.js";
import { requireAuth } from "../../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { email, password } = (req.body ?? {}) as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ message: "Email dan password wajib diisi." });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password) {
    res.status(400).json({ message: "Email dan password wajib diisi." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ message: "Email atau password salah." });
      return;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      res.status(401).json({ message: "Email atau password salah." });
      return;
    }

    const token = signAuthToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : "Gagal melakukan login.",
    });
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const authUser = req.user;

  if (!authUser) {
    res.status(401).json({ message: "Sesi tidak valid." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: authUser.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ message: "Akun tidak ditemukan atau nonaktif." });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Gagal mengambil data user.",
    });
  }
});
