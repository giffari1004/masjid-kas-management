import { Router, type Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

const TRANSACTION_TYPES = ["MASUK", "KELUAR"] as const;
type TransactionType = (typeof TRANSACTION_TYPES)[number];

function isTransactionType(value: unknown): value is TransactionType {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toUpperCase();
  return normalized === "MASUK" || normalized === "KELUAR";
}

function toTransactionType(value: string): TransactionType {
  return value.trim().toUpperCase() === "MASUK" ? "MASUK" : "KELUAR";
}

/**
 * Normalisasi input nama: wajib string, trim, dan buang spasi berlebih.
 */
function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const name = value.trim().replace(/\s+/g, " ");
  return name.length > 0 ? name : null;
}

function handleError(error: unknown, res: Response, fallback: string) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    res.status(409).json({
      message: "Nama kategori sudah dipakai untuk jenis yang sama.",
    });
    return;
  }

  res.status(500).json({
    message: error instanceof Error ? error.message : fallback,
  });
}

// GET /api/categories?type=MASUK|KELUAR
categoriesRouter.get("/", async (req, res) => {
  const type = req.query.type;

  if (type !== undefined && !isTransactionType(type)) {
    res.status(400).json({
      message: "Parameter type harus 'MASUK' atau 'KELUAR'.",
    });
    return;
  }

  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        ...(typeof type === "string" ? { type: toTransactionType(type) } : {}),
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({
      message:
        error instanceof Error ? error.message : "Gagal mengambil kategori.",
    });
  }
});

// POST /api/categories
categoriesRouter.post("/", async (req, res) => {
  const { name: rawName, type } = (req.body ?? {}) as {
    name?: unknown;
    type?: unknown;
  };

  const name = normalizeName(rawName);

  if (!name) {
    res.status(400).json({ message: "Nama kategori wajib diisi." });
    return;
  }

  if (!isTransactionType(type)) {
    res.status(400).json({
      message: "Jenis kategori harus 'MASUK' atau 'KELUAR'.",
    });
    return;
  }

  if (name.length > 100) {
    res.status(400).json({ message: "Nama kategori maksimal 100 karakter." });
    return;
  }

  try {
    const category = await prisma.category.create({
      data: { name, type: toTransactionType(type) },
    });

    res.status(201).json(category);
  } catch (error) {
    handleError(error, res, "Gagal menambah kategori.");
  }
});

// PUT /api/categories/:id
categoriesRouter.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name: rawName, type, isActive } = (req.body ?? {}) as {
    name?: unknown;
    type?: unknown;
    isActive?: unknown;
  };

  const data: { name?: string; type?: TransactionType; isActive?: boolean } =
    {};

  if (rawName !== undefined) {
    const name = normalizeName(rawName);

    if (!name) {
      res.status(400).json({ message: "Nama kategori wajib diisi." });
      return;
    }

    if (name.length > 100) {
      res
        .status(400)
        .json({ message: "Nama kategori maksimal 100 karakter." });
      return;
    }

    data.name = name;
  }

  if (type !== undefined) {
    if (!isTransactionType(type)) {
      res.status(400).json({
        message: "Jenis kategori harus 'MASUK' atau 'KELUAR'.",
      });
      return;
    }
    data.type = toTransactionType(type);
  }

  if (isActive !== undefined) {
    if (typeof isActive !== "boolean") {
      res.status(400).json({ message: "isActive harus berupa boolean." });
      return;
    }
    data.isActive = isActive;
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({
      message: "Tidak ada data yang diubah (kirim name, type, atau isActive).",
    });
    return;
  }

  try {
    const existing = await prisma.category.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ message: "Kategori tidak ditemukan." });
      return;
    }

    const category = await prisma.category.update({ where: { id }, data });

    res.json(category);
  } catch (error) {
    handleError(error, res, "Gagal mengubah kategori.");
  }
});

// DELETE /api/categories/:id
categoriesRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true } } },
    });

    if (!existing) {
      res.status(404).json({ message: "Kategori tidak ditemukan." });
      return;
    }

    const usedCount = existing._count.transactions;

    if (usedCount > 0) {
      res.status(409).json({
        message: `Kategori "${existing.name}" masih dipakai oleh ${usedCount} transaksi, jadi tidak bisa dihapus. Nonaktifkan saja bila tidak dipakai lagi.`,
        usedCount,
      });
      return;
    }

    await prisma.category.delete({ where: { id } });

    res.json({ message: "Kategori berhasil dihapus.", id });
  } catch (error) {
    handleError(error, res, "Gagal menghapus kategori.");
  }
});
