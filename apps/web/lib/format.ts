const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const shortDate = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** `"150000.50"` → `"Rp 150.000,5"`. */
export function formatRupiah(value: string | number): string {
  return rupiah.format(Number(value));
}

/** `"2026-10-22"` → `"22 Okt 2026"`. */
export function formatDate(value: string): string {
  return shortDate.format(new Date(`${value}T00:00:00Z`));
}

/** Tanggal hari ini menurut zona waktu masjid, `YYYY-MM-DD`. */
export function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

/** `"2026-10-22"` → `"2026-10"`, dipakai untuk default rentang bulan. */
export function currentMonth(): string {
  return todayJakarta().slice(0, 7);
}
