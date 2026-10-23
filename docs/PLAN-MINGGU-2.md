# Rencana Kegiatan Minggu 2 — Pengembangan Website Kas Masjid Manbaul Khoir

|                     |                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| **Proyek**          | Sistem Pengelolaan Kas Masjid Manbaul Khoir                                                      |
| **Periode**         | Minggu 2 dari 4 minggu (lihat [PRD.md](./PRD.md) §10 Milestone)                                  |
| **Target Minggu 2** | CRUD transaksi masuk/keluar, validasi input, halaman dashboard ringkasan saldo                    |
| **Prasyarat**       | [PLAN-MINGGU-1.md](./PLAN-MINGGU-1.md) selesai — login Bendahara & CRUD kategori berjalan        |
| **Status**          | Berjalan — Hari Senin selesai (backend transaksi read + create)                                  |

---

## 1. Sasaran Minggu 2 (Goals)

Di akhir minggu kedua, diharapkan sudah tercapai:

1. ✅ Bendahara bisa **mencatat transaksi kas masuk & keluar** (tanggal, kategori, nominal, keterangan) langsung dari browser.
2. ✅ Transaksi bisa **dibaca, difilter, diedit, dan dihapus** — termasuk kasus salah catat (PRD US-06).
3. ✅ **Validasi input di server** mencegah data kotor: nominal > 0, tanggal wajib, kategori harus aktif dan **jenisnya konsisten** dengan jenis transaksi.
4. ✅ **Dashboard** menampilkan saldo terkini, total masuk/keluar bulan berjalan, dan daftar transaksi terakhir (PRD US-03, FR-04).
5. ✅ Semua perhitungan saldo memakai satu sumber kebenaran di backend, sehingga angka di dashboard, daftar transaksi, dan laporan nanti konsisten.

## 2. Rincian Kegiatan Harian

### 📅 Hari Senin — Backend: Modul Transaksi (Read + Create) — ✅ Selesai

- [x] Buat modul `apps/api/src/modules/transactions/transactions.routes.ts`, dipasang di `/api/transactions` dengan `requireAuth` (pola sama seperti `categories.routes.ts`).
- [x] `GET /api/transactions` — daftar transaksi dengan query opsional:
  - `from` & `to` (rentang tanggal, format `YYYY-MM-DD`).
  - `type` (`MASUK` | `KELUAR`; toleran huruf kecil).
  - `categoryId`.
  - `q` (cari di `note`).
  - `page` & `limit` (default 20, maksimal 100) + kembalikan total data agar frontend bisa paginasi.
  - Sertakan relasi `category { id, name, type }` agar tabel tidak perlu request tambahan.
  - Urutkan `date` terbaru lebih dulu, lalu `createdAt` sebagai penentu.
- [x] `POST /api/transactions` — buat transaksi baru:
  - Field: `date`, `type`, `categoryId`, `amount`, `note` (opsional).
  - `createdById` diisi dari `req.user.id` (hasil middleware), **bukan** dari body.
  - Kembalikan `201` dengan objek transaksi beserta relasi kategorinya.
- [x] Pastikan `date` disimpan sebagai tanggal murni (`@db.Date`); hindari pergeseran zona waktu dengan menormalkan ke `YYYY-MM-DD` + `T00:00:00Z`.
- [x] Verifikasi cepat: buat beberapa transaksi lewat `curl`/skrip, lalu cek `GET` mengembalikan data terurut dan terfilter benar.

**Hasil Hari Senin:**

- File baru: `apps/api/src/modules/transactions/transactions.routes.ts`; `apps/api/src/index.ts` sekarang memasang `app.use("/api/transactions", transactionsRouter)`.
- Karena validasi create/update memakai helper yang sama, `PUT` & `DELETE` ikut selesai lebih awal — keduanya akan diverifikasi ulang hari Selasa.
- `GET /api/transactions/summary` juga sudah dibuat (dibutuhkan hari Jumat) agar angka saldo punya satu sumber kebenaran sejak awal.
- Keputusan teknis:
  - `amount` dikembalikan sebagai **string** `"150000.00"` supaya tidak kehilangan presisi lewat JSON number.
  - `date` dikembalikan `YYYY-MM-DD` (bukan ISO penuh) supaya frontend tidak perlu memotong string.
  - `from`/`to` divalidasi juga urutannya (`from > to` → `400`).
  - "Hari ini" dihitung dengan `Asia/Jakarta`, bukan UTC server, agar transaksi malam tidak tertolak sebagai "masa depan".
- Verifikasi: `npx tsc --noEmit` bersih, skrip uji sementara **39/39 assertion lulus** (login, list+meta, filter `type` huruf kecil, filter tanggal, `q`, `categoryId`, paginasi, 11 kasus validasi `400`, `404` PUT/DELETE, `summary` konsisten `balance = income − expense`), data uji dibersihkan, skrip uji dihapus.

### 📅 Hari Selasa — Backend: Validasi, Update, Delete & Ringkasan Saldo — ✅ Selesai

> Sebagian besar sudah terimplementasi hari Senin karena memakai helper `validatePayload()` yang sama. Sisa hari Selasa: verifikasi ulang terpisah + audit log.

- [x] Validasi terpusat di server (dipakai `POST` dan `PUT`) — PRD §7 "validasi input di server":
  - `date` wajib, format valid, dan **tidak boleh di masa depan**.
  - `type` hanya `MASUK` | `KELUAR`.
  - `categoryId` wajib, harus ada, dan `isActive === true`.
  - **Jenis kategori harus sama dengan jenis transaksi** → `400` dengan pesan jelas bila beda (mis. kategori "Sumbangan / Santunan" bertipe KELUAR tidak boleh dipakai untuk transaksi MASUK).
  - `amount` wajib angka, > 0, maksimal 2 desimal, dan tidak melebihi batas `Decimal(15,2)`.
  - `note` opsional, maksimal 255 karakter, di-trim.
- [x] `PUT /api/transactions/:id` — ubah transaksi: validasi sama seperti create, `404` bila tidak ada, tidak boleh mengubah `createdById`.
- [x] `DELETE /api/transactions/:id` — hapus transaksi, `404` bila tidak ada.
- [x] `GET /api/transactions/summary` — ringkasan untuk dashboard, satu endpoint berisi:
  - `balance` (saldo sampai hari ini) = total `MASUK` − total `KELUAR` (PRD FR-04).
  - `currentMonth { income, expense, balance }` untuk bulan berjalan.
  - `today { income, expense }` dan `lastFriday` rekap infaq Jumat (persiapan laporan minggu 3).
  - `recentTransactions` (5 transaksi terakhir, sudah termasuk nama kategori).
  - Hitung dengan `prisma.transaction.groupBy` — **tidak** menarik semua baris ke aplikasi lalu dijumlahkan.
- [x] Tulis `AuditLog` (`CREATE` / `UPDATE` / `DELETE`) di setiap perubahan transaksi — model & enum `AuditAction` sudah ada di schema.
- [ ] Verifikasi angka saldo manual: buat transaksi uji, hitung dengan kalkulator, cocokkan dengan response `summary`.

**Hasil Audit Log (Selasa):**

- Helper di `transactions.routes.ts`: `snapshotOf()` (bidang yang layak dicatat: `date`, `type`, `categoryId`, `categoryName`, `amount`, `note`), `diff()` (hanya field yang berubah), `writeAudit()`.
- Setiap tulis audit dibungkus `prisma.$transaction` bersama perubahan datanya → **tidak mungkin ada perubahan transaksi tanpa jejak audit**.
- Bentuk `detail`:

| Action   | `detail`                                                                     |
| -------- | ---------------------------------------------------------------------------- |
| `CREATE` | `{ "after": { date, type, categoryId, categoryName, amount, note } }`        |
| `UPDATE` | `{ "changed": ["amount","note"], "before": {...}, "after": {...} }`          |
| `DELETE` | `{ "deletedTransactionId": "…", "before": { ... } }`                          |

- `UPDATE` tanpa nilai yang benar-benar berubah **tidak** menulis baris audit (hindari jejak palsu); validasi gagal juga tidak menulis audit.
- `DELETE` menulis audit lebih dulu, lalu menghapus transaksi — FK `transactionId` jadi `null` (`onDelete: SetNull`), sehingga id asli disimpan di `detail.deletedTransactionId`. Jejak `CREATE`/`UPDATE` lama tetap utuh.
- Verifikasi: `npx tsc --noEmit` bersih, **21/21 assertion lulus** (audit CREATE/UPDATE/DELETE terbentuk, `performedById` = user login, `diff` hanya field berubah, no-op & validasi gagal tidak menulis audit, total audit naik tepat 3 baris), skrip uji dihapus.


### 📅 Hari Rabu — Frontend: Halaman Daftar Transaksi — ✅ Selesai

- [x] Tambah service `apps/web/lib/services/transactions.ts`: `getTransactions`, `createTransaction`, `updateTransaction`, `deleteTransaction`, `getSummary`, beserta tipe di `apps/web/types/transaction.ts`.
- [x] Buat halaman `/transactions` (proteksi sudah ditangani `proxy.ts`):
  - Tabel transaksi: tanggal, kategori, keterangan, kas masuk, kas keluar.
  - Nominal diformat Rupiah (`Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" })`), kolom masuk berwarna hijau & keluar merah.
  - **Filter bar**: rentang tanggal (`from`/`to`), jenis, kategori, dan kotak pencarian keterangan — semua mengirim query ke API (bukan filter di browser).
  - **Paginasi** dengan tombol Sebelumnya/Berikutnya dan info "menampilkan X–Y dari N".
  - Empty state dan pesan error yang ramah (pakai `ApiError`).
- [x] Navigasi: tambah tautan Dashboard ↔ Transaksi ↔ Kategori (layout sederhana + tombol keluar sudah ada di dashboard).

> Hasil: halaman terverifikasi di browser (filter, paginasi, 14 kategori seed di dropdown). Bug hydration `new Date()` saat render awal client component diperbaiki — default filter tanggal kini di-set via `useEffect`.

### 📅 Hari Kamis — Frontend: Form Input Cepat + Edit/Hapus — ✅ Selesai

- [x] Form **Tambah Transaksi** yang cepat dipakai (target PRD: input < 2 detik setelah submit):
  - Field: tanggal (default hari ini), jenis (toggle MASUK/KELUAR), kategori (**dropdown terfilter otomatis mengikuti jenis yang dipilih**), nominal, keterangan.
  - Nominal: input angka dengan pemisah ribuan saat mengetik, kirim angka murni ke API.
  - Simpan → form reset untuk input berikutnya, tampilkan notifikasi sukses, dan muat ulang daftar.
  - Mobile-first: field full-width, tombol besar, mudah dipakai dari HP (PRD §7 Responsif).
- [x] **Edit**: buka form yang sama dalam mode edit, terisi data lama, tombol "Simpan Perubahan".
- [x] **Hapus**: konfirmasi `window.confirm` yang menyebut tanggal + nominal + kategori, lalu hapus dan muat ulang.
- [x] Tangani error validasi server per field bila memungkinkan (mis. "Nominal harus lebih besar dari 0"), minimal tampilkan pesan dari API apa adanya.
- [x] Cegah double-submit dengan state `saving`.

> Hasil: E2E di browser lolos — tambah (Rp 1.250.000 tampil di daftar, form reset), edit (Rp 1.750.000, tombol berubah jadi "Simpan Perubahan", "Batal edit" tersedia), hapus (confirm menyebut tanggal + kategori + nominal, daftar kosong kembali). Uji lebar 375 px: tanpa horizontal scroll, form full-width. Komponen baru: `components/transaction-form.tsx`.

### 📅 Hari Jumat — Dashboard Ringkasan + Review Mingguan

- [ ] Ubah `apps/web/app/dashboard/page.tsx` menjadi dashboard fungsional:
  - Kartu ringkasan: **Saldo saat ini**, **Total masuk bulan ini**, **Total keluar bulan ini**.
  - Daftar **transaksi terakhir** (5–10 baris) dengan tautan "Lihat semua" ke `/transactions`.
  - **Grafik sederhana**: batang masuk vs keluar per bulan (6 bulan terakhir) — cukup CSS/SVG tanpa menambah library bila memungkinkan.
  - Tampilkan tanggal & jam data diambil agar bendahara tahu kesegaran angka.
- [ ] Pastikan angka dashboard **berasal dari `GET /api/transactions/summary`**, tidak dihitung ulang di frontend.
- [ ] **Review akhir minggu**:
  - [ ] Alur end-to-end: login → tambah transaksi → lihat di daftar → filter → edit → hapus → cek saldo dashboard berubah sesuai.
  - [ ] Uji kasus negatif: nominal 0/negatif, tanggal masa depan, kategori nonaktif, jenis kategori tidak cocok, hapus/ubah id yang tidak ada, akses tanpa token (`401`).
  - [ ] Uji tampilan di lebar HP (≤ 400px) — tidak ada horizontal scroll yang mengganggu pada form.
  - [ ] `tsc --noEmit` bersih di `apps/api` & `apps/web`, `next build` sukses.
  - [ ] Cek tidak ada `.env`/rahasia yang ter-commit; working tree bersih.
  - [ ] Commit di branch `feature/crud-transaksi`, merge `--no-ff` ke `main`, push ke GitHub.

## 3. Checklist Kelengkapan Minggu 2 (Definition of Done)

| No  | Item                                                                                  | Status |
| --- | ------------------------------------------------------------------------------------- | ------ |
| 1   | `GET /api/transactions` mendukung filter tanggal/jenis/kategori/pencarian + paginasi   | ☑️     |
| 2   | `POST /api/transactions` membuat transaksi dengan `createdById` dari token             | ☑️     |
| 3   | `PUT` & `DELETE /api/transactions/:id` berfungsi dengan `404` yang benar               | ☑️     |
| 4   | Validasi server menolak nominal ≤ 0, tanggal masa depan, kategori nonaktif/tidak cocok | ☑️     |
| 5   | `GET /api/transactions/summary` mengembalikan saldo, bulan berjalan, transaksi terakhir | ☑️     |
| 6   | Halaman `/transactions` menampilkan tabel + filter + paginasi berfungsi                | ☑️     |
| 7   | Form tambah/edit transaksi cepat dipakai & responsif di HP                             | ☑️     |
| 8   | Hapus transaksi memakai konfirmasi yang jelas                                          | ☑️     |
| 9   | Dashboard menampilkan saldo, total masuk/keluar bulan ini, transaksi terakhir, grafik  | ☐      |
| 10  | Kode di-merge ke `main`, build & typecheck sukses, tidak ada rahasia ter-commit        | ☐      |

## 4. Kontrak API yang Disepakati (Minggu 2)

| Method | Endpoint                        | Keterangan                                                    |
| ------ | ------------------------------- | ------------------------------------------------------------- |
| GET    | `/api/transactions`             | Daftar + filter (`from`, `to`, `type`, `categoryId`, `q`, `page`, `limit`) |
| GET    | `/api/transactions/summary`     | Ringkasan saldo & transaksi terakhir untuk dashboard          |
| POST   | `/api/transactions`             | Tambah transaksi (`date`, `type`, `categoryId`, `amount`, `note`) |
| PUT    | `/api/transactions/:id`         | Ubah transaksi                                                |
| DELETE | `/api/transactions/:id`         | Hapus transaksi                                               |

Bentuk response ringkasan (yang sudah diimplementasi — nominal berupa **string** desimal agar presisi tidak hilang):

```json
{
  "balance": "1250000.00",
  "totalIncome": "1800000.00",
  "totalExpense": "550000.00",
  "currentMonth": {
    "month": "2026-10",
    "income": "800000.00",
    "expense": "250000.00",
    "balance": "550000.00"
  },
  "today": { "income": "150000.00", "expense": "0.00" },
  "lastFriday": { "date": "2026-10-16", "income": "450000.00" },
  "recentTransactions": [
    {
      "id": "…",
      "date": "2026-10-22",
      "type": "MASUK",
      "amount": "150000.00",
      "note": "Infaq Jumat",
      "categoryId": "…",
      "category": { "id": "…", "name": "Infaq Amplop Jumat", "type": "MASUK" },
      "createdById": "…",
      "createdAt": "2026-10-22T04:12:00.000Z",
      "updatedAt": "2026-10-22T04:12:00.000Z"
    }
  ]
}
```

> `monthlyTrend` (grafik 6 bulan) ditambahkan hari Jumat saat grafik dashboard dikerjakan.

## 5. Risiko & Catatan Minggu 2

| Risiko                                                        | Mitigasi                                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Perbedaan zona waktu membuat tanggal transaksi bergeser 1 hari | Simpan `date` sebagai tanggal murni; normalisasi input ke `T00:00:00Z` dan format tampilan konsisten `id-ID`         |
| Saldo dashboard berbeda dengan hitungan manual bendahara      | Satu sumber kebenaran di `summary`; uji dengan kalkulator setiap kali menambah transaksi                             |
| Nominal desimal/Rupiah salah format                           | Simpan `Decimal(15,2)` di DB, kirim angka murni dari frontend, format hanya saat ditampilkan                        |
| Query lambat saat data menumpuk (ribuan baris)                | Wajib paginasi + manfaatkan `@@index([date])`, `@@index([type])`, `@@index([categoryId])` yang sudah ada di schema   |
| Menambah library grafik/chart                                 | Hindari bila tidak perlu; CSS/SVG cukup untuk grafik batang sederhana, kurangi risiko bundle & dependensi           |

## 6. Rencana Persiapan Minggu 3

Agar modul laporan minggu depan tidak mengulang pekerjaan:

- Pastikan endpoint daftar transaksi **sudah mendukung filter rentang tanggal** — laporan harian/bulanan/tahunan akan memakai kontrak yang sama.
- Simpan perhitungan agregat di backend (bukan frontend) agar laporan Jumat, bulanan, dan tahunan tinggal menambah parameter.
- Kumpulkan kebutuhan cetak (kop masjid, kolom tanda tangan) dengan bendahara saat review Jumat, sebelum masuk ke template A4.

---

**Lanjut ke:** [PLAN-MINGGU-3.md](./PLAN-MINGGU-3.md) — modul laporan (harian, khusus Jumat, bulanan, tahunan), template cetak A4, ekspor PDF/Excel _(dibuat menyusul)_.

**Sebelumnya:** [PLAN-MINGGU-1.md](./PLAN-MINGGU-1.md) — setup monorepo, database, login Bendahara, CRUD kategori.
