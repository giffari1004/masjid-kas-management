import { Router, type Response } from "express";
import { Prisma, type Transaction } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";

export const transactionsRouter = Router();

transactionsRouter.use(requireAuth);

const TRANSACTION_TYPES = ["MASUK", "KELUAR"] as const;
type TransactionType = (typeof TRANSACTION_TYPES)[number];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
const MAX_INTEGER_DIGITS = 13; // Decimal(15,2) -> 13 digit bulat + 2 desimal
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function isTransactionType(value: unknown): value is TransactionType {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toUpperCase();
  return normalized === "MASUK" || normalized === "KELUAR";
}

function toTransactionType(value: string): TransactionType {
  return value.trim().toUpperCase() === "MASUK" ? "MASUK" : "KELUAR";
}

/** Tanggal hari ini (YYYY-MM-DD) menurut zona waktu masjid, bukan UTC server. */
function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

/**
 * Terima hanya `YYYY-MM-DD` yang benar-benar ada (menolak 2026-02-31) dan
 * simpan sebagai tengah malam UTC agar `@db.Date` tidak bergeser hari.
 */
function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (!DATE_PATTERN.test(raw)) return null;

  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== raw) return null;

  return date;
}

/** Nominal: angka > 0, maksimal 2 desimal, muat di Decimal(15,2). */
function parseAmount(value: unknown): string | null {
  const raw =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : "";

  if (!AMOUNT_PATTERN.test(raw)) return null;

  const [integerPart] = raw.split(".");
  if (integerPart.replace(/^0+(?=\d)/, "").length > MAX_INTEGER_DIGITS) {
    return null;
  }

  if (!(Number(raw) > 0)) return null;

  return raw;
}

/** `undefined` berarti tidak valid (bukan tipe string / kepanjangan). */
function normalizeNote(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;

  const note = value.trim();
  if (note.length > 255) return undefined;

  return note.length > 0 ? note : null;
}

type TransactionWithCategory = Transaction & {
  category: { id: string; name: string; type: TransactionType };
};

function serialize(transaction: TransactionWithCategory) {
  return {
    id: transaction.id,
    date: transaction.date.toISOString().slice(0, 10),
    type: transaction.type,
    amount: transaction.amount.toFixed(2),
    note: transaction.note,
    categoryId: transaction.categoryId,
    category: transaction.category,
    createdById: transaction.createdById,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

type ExistingTransaction = {
  type: TransactionType;
  categoryId: string;
  date: Date;
  amount: Prisma.Decimal;
  note: string | null;
};

type ValidPayload = {
  date: Date;
  type: TransactionType;
  categoryId: string;
  amount: string;
  note: string | null;
};

/**
 * Validasi body create/update. Field yang tidak dikirim saat PUT memakai
 * nilai lama dari `existing` — pola patch parsial.
 */
async function validatePayload(
  body: Record<string, unknown>,
  existing?: ExistingTransaction
): Promise<{ data: ValidPayload } | { error: string }> {
  const {
    date: rawDate,
    type: rawType,
    categoryId: rawCategoryId,
    amount: rawAmount,
    note: rawNote,
  } = body;

  const date =
    rawDate === undefined && existing ? existing.date : parseDate(rawDate);
  if (!date) {
    return {
      error: "Tanggal wajib diisi dengan format YYYY-MM-DD.",
    };
  }

  if (date.toISOString().slice(0, 10) > todayJakarta()) {
    return { error: "Tanggal transaksi tidak boleh di masa depan." };
  }

  const type =
    rawType === undefined && existing
      ? existing.type
      : isTransactionType(rawType)
        ? toTransactionType(rawType)
        : null;
  if (!type) {
    return { error: "Jenis transaksi harus 'MASUK' atau 'KELUAR'." };
  }

  const categoryId =
    rawCategoryId === undefined && existing
      ? existing.categoryId
      : typeof rawCategoryId === "string"
        ? rawCategoryId.trim()
        : "";
  if (!categoryId) {
    return { error: "Kategori wajib dipilih." };
  }

  const amount =
    rawAmount === undefined && existing
      ? existing.amount.toFixed(2)
      : parseAmount(rawAmount);
  if (!amount) {
    return {
      error: "Nominal harus angka lebih besar dari 0 dengan maksimal 2 desimal.",
    };
  }

  const note =
    rawNote === undefined && existing ? existing.note : normalizeNote(rawNote);
  if (note === undefined) {
    return { error: "Keterangan maksimal 255 karakter." };
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) {
    return { error: "Kategori tidak ditemukan." };
  }
  if (!category.isActive) {
    return { error: `Kategori "${category.name}" sudah nonaktif.` };
  }
  if (category.type !== type) {
    return {
      error: `Kategori "${category.name}" bertipe ${category.type}, tidak cocok untuk transaksi ${type}.`,
    };
  }

  return { data: { date, type, categoryId, amount, note } };
}

function handleError(error: unknown, res: Response, fallback: string) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    res.status(404).json({ message: "Transaksi tidak ditemukan." });
    return;
  }

  res.status(500).json({
    message: error instanceof Error ? error.message : fallback,
  });
}

type Snapshot = Record<string, string | null>;

/** Bidang yang layak dicatat di audit log — ID internal & timestamp diabaikan. */
function snapshotOf(transaction: TransactionWithCategory): Snapshot {
  return {
    date: transaction.date.toISOString().slice(0, 10),
    type: transaction.type,
    categoryId: transaction.categoryId,
    categoryName: transaction.category.name,
    amount: transaction.amount.toFixed(2),
    note: transaction.note,
  };
}

function diff(before: Snapshot, after: Snapshot) {
  const changed = Object.keys(after).filter((key) => before[key] !== after[key]);

  return {
    changed,
    before: Object.fromEntries(changed.map((key) => [key, before[key]])),
    after: Object.fromEntries(changed.map((key) => [key, after[key]])),
  };
}

/**
 * Audit log ditulis di transaksi DB yang sama dengan perubahan datanya, jadi
 * tidak mungkin ada perubahan tanpa jejak. `transactionId` dikosongkan untuk
 * DELETE karena FK memakai `onDelete: SetNull` — id aslinya disimpan di detail.
 */
async function writeAudit(
  tx: Prisma.TransactionClient,
  input: {
    action: "CREATE" | "UPDATE" | "DELETE";
    transactionId: string | null;
    performedById: string;
    detail: Prisma.InputJsonValue;
  }
) {
  await tx.auditLog.create({
    data: {
      action: input.action,
      transactionId: input.transactionId,
      performedById: input.performedById,
      detail: input.detail,
    },
  });
}

type Overview = { income: Prisma.Decimal; expense: Prisma.Decimal };

async function sumByType(
  where: Prisma.TransactionWhereInput
): Promise<Overview> {
  const grouped = await prisma.transaction.groupBy({
    by: ["type"],
    where,
    _sum: { amount: true },
  });

  const find = (type: TransactionType) =>
    grouped.find((group) => group.type === type)?._sum.amount ??
    new Prisma.Decimal(0);

  return { income: find("MASUK"), expense: find("KELUAR") };
}

function rupiah(value: Prisma.Decimal): string {
  return value.toFixed(2);
}

// GET /api/transactions/summary — satu sumber kebenaran angka saldo (FR-04).
transactionsRouter.get("/summary", async (_req, res) => {
  try {
    const today = todayJakarta();
    const todayDate = new Date(`${today}T00:00:00.000Z`);
    const monthStart = new Date(`${today.slice(0, 7)}-01T00:00:00.000Z`);
    const nextMonthStart = new Date(monthStart);
    nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);

    // Hari Jumat terakhir (termasuk hari ini bila Jumat) untuk rekap infaq.
    const lastFriday = new Date(todayDate);
    lastFriday.setUTCDate(
      lastFriday.getUTCDate() - ((todayDate.getUTCDay() + 2) % 7)
    );
    const lastFridayEnd = new Date(lastFriday);
    lastFridayEnd.setUTCDate(lastFridayEnd.getUTCDate() + 1);

    const [
      overall,
      currentMonth,
      todayTotals,
      lastFridayTotals,
      recentTransactions,
    ] = await Promise.all([
      sumByType({}),
      sumByType({ date: { gte: monthStart, lt: nextMonthStart } }),
      sumByType({ date: todayDate }),
      sumByType({ type: "MASUK", date: { gte: lastFriday, lt: lastFridayEnd } }),
      prisma.transaction.findMany({
        take: 5,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        include: {
          category: { select: { id: true, name: true, type: true } },
        },
      }),
    ]);

    res.json({
      balance: rupiah(overall.income.minus(overall.expense)),
      totalIncome: rupiah(overall.income),
      totalExpense: rupiah(overall.expense),
      currentMonth: {
        month: today.slice(0, 7),
        income: rupiah(currentMonth.income),
        expense: rupiah(currentMonth.expense),
        balance: rupiah(currentMonth.income.minus(currentMonth.expense)),
      },
      today: {
        income: rupiah(todayTotals.income),
        expense: rupiah(todayTotals.expense),
      },
      lastFriday: {
        date: lastFriday.toISOString().slice(0, 10),
        income: rupiah(lastFridayTotals.income),
      },
      recentTransactions: recentTransactions.map(serialize),
    });
  } catch (error) {
    handleError(error, res, "Gagal mengambil ringkasan kas.");
  }
});

// GET /api/transactions?from&to&type&categoryId&q&page&limit
transactionsRouter.get("/", async (req, res) => {
  const { from, to, type, categoryId, q, page, limit } = req.query;

  const where: Prisma.TransactionWhereInput = {};
  let dateFilter: Prisma.DateTimeFilter = {};

  if (from !== undefined) {
    const date = parseDate(from);
    if (!date) {
      res
        .status(400)
        .json({ message: "Parameter from harus berformat YYYY-MM-DD." });
      return;
    }
    dateFilter.gte = date;
  }

  if (to !== undefined) {
    const date = parseDate(to);
    if (!date) {
      res
        .status(400)
        .json({ message: "Parameter to harus berformat YYYY-MM-DD." });
      return;
    }
    dateFilter.lte = date;
  }

  if (dateFilter.gte && dateFilter.lte && dateFilter.gte > dateFilter.lte) {
    res.status(400).json({
      message: "Parameter from tidak boleh lebih besar dari to.",
    });
    return;
  }

  if (Object.keys(dateFilter).length > 0) {
    where.date = dateFilter;
  }

  if (type !== undefined) {
    if (!isTransactionType(type)) {
      res
        .status(400)
        .json({ message: "Parameter type harus 'MASUK' atau 'KELUAR'." });
      return;
    }
    where.type = toTransactionType(type);
  }

  if (categoryId !== undefined) {
    if (typeof categoryId !== "string" || !categoryId.trim()) {
      res.status(400).json({ message: "Parameter categoryId tidak valid." });
      return;
    }
    where.categoryId = categoryId.trim();
  }

  if (q !== undefined) {
    if (typeof q !== "string") {
      res.status(400).json({ message: "Parameter q tidak valid." });
      return;
    }
    if (q.trim()) {
      where.note = { contains: q.trim(), mode: "insensitive" };
    }
  }

  const parsedPage = Number(page ?? 1);
  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    res
      .status(400)
      .json({ message: "Parameter page harus bilangan bulat >= 1." });
    return;
  }

  const parsedLimit = Number(limit ?? DEFAULT_LIMIT);
  if (
    !Number.isInteger(parsedLimit) ||
    parsedLimit < 1 ||
    parsedLimit > MAX_LIMIT
  ) {
    res.status(400).json({ message: `Parameter limit harus 1-${MAX_LIMIT}.` });
    return;
  }

  try {
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip: (parsedPage - 1) * parsedLimit,
        take: parsedLimit,
        include: {
          category: { select: { id: true, name: true, type: true } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      data: transactions.map(serialize),
      meta: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / parsedLimit)),
      },
    });
  } catch (error) {
    handleError(error, res, "Gagal mengambil transaksi.");
  }
});

// POST /api/transactions — createdById diambil dari token, bukan body.
transactionsRouter.post("/", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const result = await validatePayload(body);

  if ("error" in result) {
    res.status(400).json({ message: result.error });
    return;
  }

  try {
    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: { ...result.data, createdById: req.user!.sub },
        include: {
          category: { select: { id: true, name: true, type: true } },
        },
      });

      await writeAudit(tx, {
        action: "CREATE",
        transactionId: created.id,
        performedById: req.user!.sub,
        detail: { after: snapshotOf(created) },
      });

      return created;
    });

    res.status(201).json(serialize(transaction));
  } catch (error) {
    handleError(error, res, "Gagal menyimpan transaksi.");
  }
});

// PUT /api/transactions/:id — patch parsial, createdById tidak bisa diubah.
transactionsRouter.put("/:id", async (req, res) => {
  const { id } = req.params;
  const body = (req.body ?? {}) as Record<string, unknown>;

  try {
    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, type: true } },
      },
    });

    if (!existing) {
      res.status(404).json({ message: "Transaksi tidak ditemukan." });
      return;
    }

    if (Object.keys(body).length === 0) {
      res.status(400).json({
        message:
          "Tidak ada data yang diubah (kirim date, type, categoryId, amount, atau note).",
      });
      return;
    }

    const result = await validatePayload(body, existing);

    if ("error" in result) {
      res.status(400).json({ message: result.error });
      return;
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: result.data,
        include: {
          category: { select: { id: true, name: true, type: true } },
        },
      });

      const changes = diff(snapshotOf(existing), snapshotOf(updated));

      // Tidak ada nilai yang benar-benar berubah → tidak perlu jejak audit.
      if (changes.changed.length > 0) {
        await writeAudit(tx, {
          action: "UPDATE",
          transactionId: updated.id,
          performedById: req.user!.sub,
          detail: changes,
        });
      }

      return updated;
    });

    res.json(serialize(transaction));
  } catch (error) {
    handleError(error, res, "Gagal mengubah transaksi.");
  }
});

// DELETE /api/transactions/:id
transactionsRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, type: true } },
      },
    });

    if (!existing) {
      res.status(404).json({ message: "Transaksi tidak ditemukan." });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Detail ditulis lebih dulu supaya transaksi DB masih punya datanya
      // (FK `transactionId` di-set null oleh DB saat baris dihapus).
      await writeAudit(tx, {
        action: "DELETE",
        transactionId: existing.id,
        performedById: req.user!.sub,
        detail: { deletedTransactionId: existing.id, before: snapshotOf(existing) },
      });

      await tx.transaction.delete({ where: { id } });
    });

    res.json({ message: "Transaksi berhasil dihapus.", id });
  } catch (error) {
    handleError(error, res, "Gagal menghapus transaksi.");
  }
});
