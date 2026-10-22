import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL / DIRECT_URL tidak diset di apps/api/.env");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const [users, categories, transactions] = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.transaction.count(),
  ]);

  console.log("✅ Koneksi database OK");
  console.log(`   users        : ${users}`);
  console.log(`   categories   : ${categories}`);
  console.log(`   transactions : ${transactions}`);

  const list = await prisma.category.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { name: true, type: true },
  });

  console.table(list);
}

main()
  .catch((e) => {
    console.error("❌ Gagal konek ke database:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
