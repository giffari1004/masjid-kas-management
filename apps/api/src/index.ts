import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(503).json({
      status: "error",
      database: "disconnected",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.get("/api/categories", async (req, res) => {
  const type = req.query.type;

  if (type !== undefined && type !== "MASUK" && type !== "KELUAR") {
    res.status(400).json({
      message: "Parameter type harus 'MASUK' atau 'KELUAR'.",
    });
    return;
  }

  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        ...(type ? { type } : {}),
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

const server = app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down...`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
