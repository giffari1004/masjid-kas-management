# Rencana Kegiatan Minggu 1 — Pengembangan Website Kas Masjid Manbaul Khoir

|                     |                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Proyek**          | Sistem Pengelolaan Kas Masjid Manbaul Khoir                                                                         |
| **Periode**         | Minggu 1 dari 4 minggu (lihat [PRD.md](./PRD.md) §10 Milestone)                                                     |
| **Target Minggu 1** | Setup monorepo (Next.js + Express + Prisma + Supabase), desain database & migration, login Bendahara, CRUD kategori |
| **Status**          | Belum dimulai                                                                                                       |

---

## 1. Sasaran Minggu 1 (Goals)

Di akhir minggu pertama, diharapkan sudah tercapai:

1. ✅ Struktur project **monorepo** berdiri: Frontend Next.js + Backend Express.js, keduanya siap deploy ke Vercel.
2. ✅ Database **PostgreSQL (Supabase)** sudah dibuat, terhubung ke **Prisma ORM**, dan **migration** pertama berhasil dijalankan.
3. ✅ Fitur **login Bendahara** berfungsi (autentikasi, proteksi route, sesi).
4. ✅ Fitur **CRUD kategori transaksi** (kategori bawaan sudah ter-seed ke database) berfungsi.
5. ✅ Development environment siap dikembangkan bersama rekan tim (jika ada).

## 2. Rincian Kegiatan Harian

### 📅 Hari Senin — Setup Monorepo & Lingkungan Dasar

- [x] Inisialisasi Git repository di folder project `cashManagement`.
- [x] Buat struktur **monorepo**, misalnya dengan npm workspaces:

  ```
  cashManagement/
  ├── apps/
  │   ├── web/          # Frontend Next.js (App Router + TypeScript)
  │   └── api/          # Backend Express.js + TypeScript
  ├── packages/
  │   └── shared/       # (opsional) tipe & konstanta bersama
  ├── package.json      # root workspace
  └── README.md
  ```

- [x] Setup **Frontend**: `npx create-next-app@latest apps/web` (TypeScript, App Router, ESLint).
- [x] Setup **Backend**: inisialisasi Express.js + TypeScript di `apps/api` (tsconfig, nodemon/tsx untuk dev, script build).
- [x] Install dependensi utama: `axios` (frontend), `cors`, `dotenv`, `express` (backend), beserta dev deps typescript.
- [x] Konfigurasi environment variable terpisah (`.env` local, dan catat variabel yang dibutuhkan untuk Vercel nanti).
- [x] Verifikasi: jalankan kedua app lokal (`next dev` + `tsx watch src/index.ts`) dan tes endpoint sederhana (mis. `GET /api/health` yang mengembalikan `{"status":"ok"}`) dari frontend via **Axios**.

### 📅 Hari Selasa — Desain Database & Setup Prisma + Supabase

- [x] Buat project **PostgreSQL** di Supabase, catat connection string (DB password disimpan aman, tidak di-commit).
- [x] Setup **Prisma** di `apps/api` (`npx prisma init --datasource-provider postgresql`).
- [x] Tulis skema awal `schema.prisma` sesuai rancangan ERD di PRD §8.3:
  - Model `User` (email, passwordHash, role).
  - Model `Category` (name, type: `masuk` | `keluar`).
  - Model `Transaction` (tanggal, type, categoryId, amount, note, createdBy, timestamps).
  - Model `AuditLog` (transactionId, action, detail, createdAt).
- [x] Konvensi penamaan: tabel `snake_case`, primary key `id` auto-increment, relasi menggunakan foreign key eksplisit.
- [x] Jalankan migration pertama: `npx prisma migrate dev --name init`.
- [x] Verifikasi tabel sudah terbentuk di Supabase Table Editor.
- [x] (Opsional) Coba **Prisma Studio** untuk memastikan bisa melihat data.

### 📅 Rabu — Seed Data Kategori & Setup Axios di Frontend

- [x] Buat **seed script** (`prisma/seed.ts`) berisi kategori bawaan sesuai PRD §5.1:
  - Kas **Masuk**: Infaq Kotak Amal, Infaq Amplop Jumat, Infaq Pengajian Ibu-Ibu, Zakat Maal, Zakat Fitrah, Infaq Idul Fitri, Infaq Idul Adha, Sedekah / Lain-lain.
  - Kas **Keluar**: Kebersihan & Keamanan, Utilitas, Sumbangan / Santunan, Perawatan / Renovasi, Operasional Kegiatan, Lain-lain.
- [x] Jalankan `npx prisma db seed` dan verifikasi data masuk.
- [x] Buat **seed user Bendahara** (1 akun, password di-hash dengan bcrypt — jangan pakai password plaintext).
- [x] Di frontend, buat **Axios instance** terpusat (base URL dari env `NEXT_PUBLIC_API_URL`, siapkan interceptor untuk menyertakan token di request berikutnya).
- [x] Verifikasi: frontend bisa memanggil `GET /api/categories` dan menampilkan daftar kategori (halaman sederhana dulu, styling belum perlu sempurna).

### 📅 Kamis — Fitur Login Bendahara

- [ ] Backend — modul auth:
  - `POST /api/auth/login` (validasi email + password, hashing cek dengan bcrypt).
  - Buat **JWT** (atau session) sebagai token, simpan role `bendahara`.
  - Middleware proteksi route (`requireAuth`) untuk semua endpoint transaksi/kategori nanti.
- [ ] Frontend — halaman login (`/login`):
  - Form email + password, kirim via Axios ke endpoint login.
  - Simpan token di cookie (httponly disarankan) atau localStorage (sementara).
  - Redirect ke dashboard setelah berhasil; tampilkan pesan error yang jelas bila gagal.
- [ ] **Proteksi route**: halaman utama/dashboard tidak bisa diakses tanpa token (middleware Next.js).
- [ ] Verifikasi tes: login berhasil → akses terproteksi OK; token dihapus → redirect ke `/login`.

### 📅 Jumat — CRUD Kategori Transaksi + Review Mingguan

- [ ] Backend — endpoint kategori (semua di belakang `requireAuth`):
  - `GET /api/categories` — daftar kategori (filter opsional `?type=masuk|keluar`).
  - `POST /api/categories` — tambah kategori baru.
  - `PUT /api/categories/:id` — ubah nama/jenis kategori.
  - `DELETE /api/categories` — hapus kategori (cek dulu: tolak bila masih dipakai transaksi, atau beri peringatan).
- [ ] Validasi input di server (contoh: nama wajib diisi & unik per jenis, type hanya `masuk`/`keluar`).
- [ ] Frontend — halaman **Manajemen Kategori** (`/kategori`):
  - Tabel daftar kategori + tombol tambah, ubah, hapus.
  - Form modal/haluskan untuk tambah & ubah; konfirmasi sebelum hapus.
- [ ] **Review akhir minggu**:
  - [ ] Jalankan semua alur end-to-end: login → lihat kategori → tambah → ubah → hapus.
  - [ ] Cek tidak ada variabel rahaya (password Supabase, JWT secret) yang ter-commit ke Git.
  - [ ] Push kode ke branch `main`/`develop`; pastikan build lokal sukses (`next build` + `tsc`).
  - [ ] Catat kendala & rencana minggu 2 (CRUD transaksi, dashboard — lihat PRD §10).

## 3. Checklist Kelengkapan Minggu 1 (Definition of Done)

| No  | Item                                                                            | Status |
| --- | ------------------------------------------------------------------------------- | ------ |
| 1   | Monorepo `apps/web` (Next.js) & `apps/api` (Express) berjalan lokal tanpa error | ☐      |
| 2   | Database Supabase terhubung Prisma; migration `init` sukses                     | ☐      |
| 3   | Tabel User, Category, Transaction, AuditLog sudah terbentuk                     | ☐      |
| 4   | Kategori bawaan (PRD §5.1) sudah ter-seed di database                           | ☐      |
| 5   | Login Bendahara berfungsi (hash password + token + proteksi route)              | ☐      |
| 6   | CRUD kategori (backend API + frontend UI) berfungsi penuh                       | ☐      |
| 7   | Axios instance frontend terkonfigurasi dengan environment variable              | ☐      |
| 8   | Kode tersimpan di Git, tidak ada rahasia yang ter-commit                        | ☐      |

## 4. Daftar Environment Variable (dicatat saat setup)

| Variabel              | Digunakan di      | Keterangan                            |
| --------------------- | ----------------- | ------------------------------------- |
| `DATABASE_URL`        | apps/api (Prisma) | Connection string PostgreSQL Supabase |
| `JWT_SECRET`          | apps/api          | Secret untuk menandatangani token     |
| `PORT`                | apps/api          | Port backend saat development         |
| `NEXT_PUBLIC_API_URL` | apps/web          | Base URL API untuk Axios              |

## 5. Risiko & Catatan Minggu 1

| Risiko                                                      | Mitigasi                                                                                                                                           |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kendala serverless Express di Vercel (dicek sedini mungkin) | Karena deployment target Vercel, siapkan fallback: pindahkan endpoint ke **Next.js Route Handlers** bila kompatibilitas bermasalah (lihat PRD §12) |
| Password/b secret ter-commit                                | Gunakan `.gitignore` untuk `.env`, saling review sebelum push                                                                                      |
| Prisma migration gagal / drift                              | Gunakan `prisma migrate reset` hanya di database development, jangan production                                                                    |

---

**Lanjut ke:** [PLAN-MINGGU-2.md](./PLAN-MINGGU-2.md) — CRUD transaksi masuk/keluar & halaman dashboard _(dibuat menyusul)_.
