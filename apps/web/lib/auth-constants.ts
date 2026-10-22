/**
 * Konstanta autentikasi sisi client, dipisah dari `lib/api.ts` agar `proxy.ts`
 * tidak ikut memuat bundel axios.
 */
export const AUTH_TOKEN_KEY = "cash_management_token";

/**
 * Cookie non-httpOnly berisi token yang sama dengan localStorage, dipakai oleh
 * `proxy.ts` untuk pemeriksaan optimistik (hanya cek keberadaan, bukan verifikasi tanda tangan).
 */
export const AUTH_COOKIE_NAME = "cash_management_token";
