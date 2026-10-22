import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL / DIRECT_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const KATEGORI_MASUK = [
  "Infaq Kotak Amal",
  "Infaq Amplop Jumat",
  "Infaq Pengajian Ibu-Ibu",
  "Zakat Maal",
  "Zakat Fitrah",
  "Infaq Idul Fitri",
  "Infaq Idul Adha",
  "Sedekah / Lain-lain",
];

const KATEGORI_KELUAR = [
  "Kebersihan & Keamanan",
  "Utilitas (Listrik, Air, Internet)",
  "Sumbangan / Santunan",
  "Perawatan / Renovasi",
  "Operasional Kegiatan / Program Kerja",
  "Lain-lain",
];

async function main() {
  // Seed user Bendahara (password akan di-hash saat fitur login dikerjakan)
  const bendahara = await prisma.user.upsert({
    where: { email: "bendahara@manbaulkhoir.id" },
    update: { name: "Bendahara Masjid", role: "BENDAHARA" },
    create: {
      email: "bendahara@manbaulkhoir.id",
      name: "Bendahara Masjid",
      role: "BENDAHARA",
      passwordHash: "placeholder-hash",
    },
  });

  // Seed kategori masuk
  for (const name of KATEGORI_MASUK) {
    await prisma.category.upsert({
      where: { name_type: { name, type: "MASUK" } },
      update: { isActive: true },
      create: { name, type: "MASUK" },
    });
  }

  // Seed kategori keluar
  for (const name of KATEGORI_KELUAR) {
    await prisma.category.upsert({
      where: { name_type: { name, type: "KELUAR" } },
      update: { isActive: true },
      create: { name, type: "KELUAR" },
    });
  }

  console.log("Seed selesai. User:", bendahara.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
