# LAPORAN PRAKTIKUM PEMROGRAMAN WEB
## MODUL 3 — SISTEM ANTRIAN RUMAH SAKIT
### KELOMPOK B03 · 2026

**Topik praktikum:** Pengembangan aplikasi antrian rumah sakit menggunakan HTML, CSS, dan TypeScript *native*  
**Nama aplikasi yang dikembangkan:** AntriSehat  
**Metode:** Implementasi antarmuka multi-halaman, autentikasi API, pengelolaan data dengan Local Storage, dan pengujian fungsi antrian.

> **Ruang lingkup laporan:** Dokumen ini membahas kebutuhan dalam *Soal Praktikum Modul 3*, penerapannya pada kode kelompok B03, alur kerja setiap fitur, serta hasil pemeriksaan kesesuaian. Status fitur dibedakan antara **tersedia pada kode**, **sudah diperiksa logikanya**, dan **masih perlu pengujian langsung**. Dengan demikian, laporan tidak menyamakan keberadaan kode dengan jaminan bebas *bug*.

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Analisis Soal dan Ketentuan Praktikum](#2-analisis-soal-dan-ketentuan-praktikum)
3. [Perancangan dan Struktur Program](#3-perancangan-dan-struktur-program)
4. [Implementasi Kode dan Pembahasan Fitur](#4-implementasi-kode-dan-pembahasan-fitur)
5. [Alur Penggunaan dan Mekanisme Antrian](#5-alur-penggunaan-dan-mekanisme-antrian)
6. [Hasil Tampilan Antarmuka](#6-hasil-tampilan-antarmuka)
7. [Evaluasi Kesesuaian dengan Soal](#7-evaluasi-kesesuaian-dengan-soal)
8. [Hasil Pengujian dan Verifikasi](#8-hasil-pengujian-dan-verifikasi)
9. [Kendala, Keterbatasan, dan Evaluasi](#9-kendala-keterbatasan-dan-evaluasi)
10. [Cara Menjalankan dan Mengompilasi Proyek](#10-cara-menjalankan-dan-mengompilasi-proyek)
11. [Kesimpulan](#11-kesimpulan)

---

## 1. Pendahuluan

### 1.1 Latar Belakang

Sistem antrian diperlukan agar proses pelayanan dapat berlangsung tertib. Dalam contoh kasus rumah sakit, pengunjung memilih layanan dan memperoleh nomor tiket, sementara operator menentukan nomor yang dipanggil sesuai urutan pelayanan. Kondisi ini dapat disimulasikan melalui aplikasi web yang memiliki beberapa halaman dengan fungsi berbeda tetapi menggunakan data antrian yang sama.

Berdasarkan **Soal Praktikum Modul 3**, Kelompok B03 mengembangkan aplikasi yang mencakup proses login, pengelolaan jenis antrian oleh admin, pengambilan tiket oleh pengguna, pemanggilan tiket oleh operator, dan penayangan nomor antrian secara otomatis. Seluruh logika utama ditulis dengan **TypeScript**, dikompilasi menjadi JavaScript, dan dijalankan tanpa *framework* front-end.

### 1.2 Tujuan Praktikum

Tujuan pengerjaan praktikum ini adalah:

1. Membangun aplikasi web multi-halaman menggunakan HTML, CSS, dan TypeScript murni.
2. Mengimplementasikan login melalui API DummyJSON dan pembatasan hak akses berdasarkan *role*.
3. Membuat fitur pengelolaan jenis layanan serta penerbitan tiket antrian.
4. Menerapkan sistem prioritas dan perubahan status antrian pada panel operator.
5. Menampilkan panggilan antrian yang diperbarui tanpa memuat ulang halaman.
6. Menyimpan sesi dan data antrian secara persisten menggunakan Local Storage.
7. Mengevaluasi keterkaitan antara ketentuan soal, implementasi kode, dan hasil pengujian.

## 2. Analisis Soal dan Ketentuan Praktikum

### 2.1 Ketentuan Umum

Soal meminta aplikasi **native from scratch**, bukan hasil *template* atau penggunaan React, Vue, jQuery, Bootstrap, Tailwind, maupun *framework/library* CSS dan JavaScript sejenis. Source code wajib menggunakan `.ts`, memiliki `tsconfig.json`, dan hasil kompilasinya berupa file `.js` yang dipanggil melalui atribut `defer` pada HTML.

Ketentuan integrasi datanya sebagai berikut:

- **Autentikasi:** `POST https://dummyjson.com/auth/login`.
- **Referensi role pengguna:** endpoint filter DummyJSON untuk `admin` dan `user`.
- **Persistensi:** token, role, nama pengguna, daftar jenis antrian, dan tiket disimpan di **Local Storage**.
- **Pembaruan data:** halaman dapat membaca perubahan status tiket tanpa *refresh* manual.

**Catatan revisi soal (13 Oktober 2026):** `ambil-antrian.html` dan `layar.html` **bukan halaman publik tanpa login**. Semua pengguna wajib login. User hanya dapat mengakses dua halaman tersebut, sedangkan admin/moderator dapat mengakses semua halaman operasional. Ketentuan revisi ini digunakan sebagai acuan ketika terdapat redaksi lama di bagian ilustrasi soal yang masih menyebut “akses publik”.

### 2.2 Pembagian Hak Akses

| Halaman/Fungsi | User | Admin | Moderator |
|---|:---:|:---:|:---:|
| Login | ✅ | ✅ | ✅ |
| Ambil nomor (`ambil-antrian.html`) | ✅ | ✅ | ✅ |
| Layar antrian (`layar.html`) | ✅ | ✅ | ✅ |
| Dashboard (`index.html`) | ❌ | ✅ | ✅ |
| Operator (`operator.html`) | ❌ | ✅ | ✅ |
| Kelola layanan, terbitkan tiket manual, reset | ❌ | ✅ | ✅ |

Dalam implementasi, moderator diperlakukan setara admin sebagaimana disyaratkan soal.

### 2.3 Lima Halaman Utama

**Login:** menerima kredensial, memproses permintaan API, memberi umpan balik ketika terjadi kesalahan, menyimpan sesi, dan mengarahkan pengguna berdasarkan role.

**Dashboard Admin:** menyediakan data layanan, form tambah layanan, aktif/nonaktif, hapus, penerbitan tiket manual, dan reset antrian.

**Operator:** menampilkan tiket yang dipanggil serta tiket berikutnya untuk setiap layanan; menyediakan aksi panggil, lewati, dan selesai.

**Ambil Antrian:** menampilkan layanan aktif dan memungkinkan pengunjung memilih prioritas, mengambil nomor, serta melihat tiket yang dibuat.

**Layar Antrian:** menampilkan nomor yang sedang dipanggil, jumlah tiket menunggu, pembaruan berkala, dan mode layar penuh.

## 3. Perancangan dan Struktur Program

### 3.1 Arsitektur Aplikasi

Aplikasi dibuat dengan pendekatan *multi-page application*. Setiap halaman menggunakan HTML untuk struktur antarmuka, satu file CSS untuk konsistensi tampilan, serta file JavaScript hasil kompilasi TypeScript yang sesuai dengan fungsi halaman.

Fungsi umum seperti tipe data, Local Storage, validasi, pengurutan antrian, perubahan status tiket, dan pengecekan login ditempatkan dalam `src/shared.ts`. Dengan pemisahan ini, aturan sistem digunakan secara konsisten oleh Dashboard, Operator, Ambil Antrian, dan Layar Antrian.

```text
HTML (struktur halaman) + CSS (tampilan)
                    │
                    ▼
       JavaScript dalam dist/
        (kompilasi src/*.ts)
                    │
       ┌────────────┴────────────┐
       ▼                         ▼
 DummyJSON Auth API       Local Storage
   (verifikasi login)   (sesi, layanan, tiket)
                                 │
                                 ▼
                       Operator & Layar
                       membaca data sama
```

### 3.2 Struktur Repository

```text
.
├── login.html
├── index.html
├── operator.html
├── ambil-antrian.html
├── layar.html
├── css/
│   └── style.css
├── src/
│   ├── shared.ts            # Model data, Local Storage, auth guard, logika antrian
│   ├── login.ts             # Login API, error handling, redirect berdasarkan role
│   ├── admin.ts             # Pengelolaan layanan, tiket manual, reset
│   ├── operator.ts          # Panggil, lewati, selesai, panggilan suara
│   ├── ambil-antrian.ts     # Penerbitan dan tampilan tiket pengunjung
│   └── layar.ts             # Layar monitor, polling, fullscreen
├── dist/                    # Hasil kompilasi JavaScript untuk setiap file TypeScript
├── docs/
│   └── screenshots/         # Dokumentasi tampilan untuk laporan
├── tsconfig.json
├── package.json
└── README.md
```

### 3.3 Teknologi yang Digunakan

- **HTML5:** struktur halaman, form, navigasi, dan elemen `<dialog>`.
- **CSS3:** tata letak menggunakan *grid/flexbox*, komponen kartu, dialog, tampilan responsif, dan aturan cetak tiket.
- **TypeScript:** tipe data, validasi input, manipulasi DOM, pengelolaan status tiket, dan integrasi API.
- **Fetch API:** request login ke DummyJSON.
- **Local Storage:** penyimpanan data tanpa backend atau database eksternal.
- **Storage Event + interval:** pembaruan antartab dan pemeriksaan data setiap 2,5 detik.
- **Fullscreen API:** membuka tampilan layar antrian secara penuh.
- **Web Speech API:** fitur tambahan berupa suara pemanggilan tiket.

TypeScript dipakai untuk proses pengembangan, **bukan sebagai framework pada browser**. Runtime aplikasi tetap menggunakan JavaScript bawaan browser tanpa dependensi UI eksternal.

## 4. Implementasi Kode dan Pembahasan Fitur

### 4.1 TypeScript dan Hasil Kompilasi

Ketentuan soal meminta file TypeScript dikompilasi lebih dahulu menjadi JavaScript dan dihubungkan ke HTML dengan `defer`. Berikut contoh pada halaman login:

```html
<script src="dist/shared.js" defer></script>
<script src="dist/login.js" defer></script>
```

Konfigurasi yang digunakan pada `tsconfig.json` mencakup `target: ES2020`, `rootDir: ./src`, `outDir: ./dist`, `strict: true`, dan `noEmitOnError: true`. Artinya, compiler memeriksa tipe data dengan aturan ketat dan tidak menghasilkan output ketika terjadi error kompilasi.

**Berkas terkait:** [`tsconfig.json`](tsconfig.json), [`login.html`](login.html), [`src/shared.ts`](src/shared.ts).

### 4.2 Login API dan Validasi Hak Akses

Pada [`src/login.ts`](src/login.ts), form login menangani kejadian `submit`, mengambil username dan password, kemudian mengirim request ke endpoint autentikasi.

```ts
const result = await apiJSON('https://dummyjson.com/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: username.value.trim(),
    password: password.value,
    expiresInMins: 60
  })
});
```

Ketika permintaan diproses, tombol login dinonaktifkan dan labelnya berubah menjadi **Memproses...**. Penanganan kegagalan dilakukan dengan `try...catch`, termasuk kredensial salah, batas waktu koneksi, dan server tidak dapat dihubungi.

Role akun dibaca dari respons server; apabila diperlukan, kode mencoba verifikasi tambahan melalui `auth/me` atau data pengguna berdasarkan ID. Session disimpan ke Local Storage kemudian diarahkan ke halaman awal sesuai role:

```ts
export function isStaff(role: Role): boolean {
  return role === 'admin' || role === 'moderator';
}

export function landing(session: Session): string {
  return isStaff(session.role) ? 'index.html' : 'ambil-antrian.html';
}
```

Fungsi `guard()` di [`src/shared.ts`](src/shared.ts) digunakan untuk menolak akses tanpa login; pada Dashboard dan Operator dipanggil dengan `guard(true)` sehingga akun user biasa tidak dapat membuka halaman admin. Pada Ambil Antrian dan Layar dipanggil dengan `guard()` sehingga **tetap perlu login** tetapi tidak terbatas pada role admin.

Tombol **isi contoh admin** hanya mengisi form dengan akun contoh DummyJSON; tombol ini **tidak melewati proses verifikasi API**.

**Penilaian kesesuaian:** mekanisme API, loading, pesan kesalahan, penyimpanan sesi, *role guard*, dan redirect terlihat dalam kode. **Keberhasilan login langsung ke server DummyJSON perlu diuji di browser dengan koneksi internet**.

### 4.3 Penyimpanan Data dan Manajemen Layanan

Data utama aplikasi didefinisikan pada [`src/shared.ts`](src/shared.ts):

```ts
export interface Service {
  code: string;
  name: string;
  active: boolean;
}

export interface Ticket {
  id: string;
  code: string;
  number: number;
  priority: Priority;
  status: Status;
  order: number;
  createdAt: number;
  calledAt?: number;
  finishedAt?: number;
  skipped?: boolean;
}
```

Data disimpan dalam dua key utama: `antrisehat:session:v3` (sesi) dan `antrisehat:state:v3` (layanan, tiket, pencacah nomor, dan urutan penerbitan). Saat data antrian belum ada, sistem menginisialisasi contoh enam jenis layanan: UMUM-1, UMUM-2, UMUM-3, GIGI, FARMASI, dan PSIKOLOG.

Pada Dashboard, fungsi `addService()` memastikan kode layanan terdiri dari **tepat satu huruf A–Z**, nama layanan terisi, serta kode dan nama belum digunakan. Pengecekan duplikasi dilakukan tanpa membedakan huruf besar dan kecil:

```ts
if (!/^[A-Z]$/.test(code)) throw Error('Kode harus tepat satu huruf A–Z.');
if (s.services.some(x => x.code.toLowerCase() === code.toLowerCase())) {
  throw Error('Kode layanan sudah digunakan.');
}
if (s.services.some(x => x.name.toLowerCase() === name.toLowerCase())) {
  throw Error('Nama layanan sudah digunakan.');
}
```

Selain menambah layanan, admin dapat **mengaktifkan/nonaktifkan**, **menghapus layanan** (beserta tiket yang terkait), **menerbitkan tiket manual**, dan **reset**. Reset menghapus tiket dan pencacah nomor, tetapi **tidak menghapus jenis layanan**.

**Berkas terkait:** [`src/admin.ts`](src/admin.ts), [`src/shared.ts`](src/shared.ts), [`index.html`](index.html).

### 4.4 Pengambilan Tiket dan Format Nomor

Halaman [`ambil-antrian.html`](ambil-antrian.html) menyediakan kartu layanan aktif. Pengunjung memilih prioritas **Normal, Lansia, Disabilitas, atau VIP**, lalu menekan tombol **Ambil nomor**.

Penerbitan tiket diproses oleh fungsi `issue()` dalam `src/shared.ts`. Fungsi ini memastikan layanan tersedia, memvalidasi prioritas, menentukan nomor berikutnya per layanan, lalu menyimpan tiket baru dengan status **Menunggu**.

Nomor tampil dengan format **Kode–3 Digit** melalui fungsi berikut:

```ts
export function format(ticket: Ticket): string {
  return `${ticket.code}-${String(ticket.number).padStart(3, '0')}`;
}
```

Contohnya, tiket pertama pada layanan A adalah `A-001`, tiket kedua `A-002`, sedangkan layanan B memiliki pencacah sendiri dimulai dari `B-001`. Setelah tiket diterbitkan, sistem menampilkan dialog tiket, informasi prioritas, tanggal penerbitan, dan opsi cetak.

Daftar layanan serta jumlah menunggu diperbarui secara berkala dari Local Storage. Oleh karena itu, layanan yang baru ditambah atau dinonaktifkan admin akan tercermin di halaman pengunjung tanpa *refresh* manual, sepanjang kedua halaman berbagi penyimpanan browser yang sama.

**Berkas terkait:** [`src/ambil-antrian.ts`](src/ambil-antrian.ts), [`src/shared.ts`](src/shared.ts).

### 4.5 Logika Prioritas dan Panel Operator

Soal mengharuskan tiket berkategori VIP, Disabilitas, dan Lansia didahulukan daripada Normal. Pada kode, urutan prioritas ditetapkan sebagai:

**VIP → Disabilitas → Lansia → Normal**.

```ts
export const priorities: Record<Priority, number> = {
  vip: 0,
  disabilitas: 1,
  lansia: 2,
  normal: 3
};
```

Fungsi `allWaiting()` mengurutkan tiket dengan prioritas lebih tinggi terlebih dahulu; jika tingkat prioritas sama, urutan penerbitan tiket digunakan sebagai pembanding.

Terdapat tiga aksi utama pada [`src/operator.ts`](src/operator.ts):

1. **Panggil berikutnya:** memilih tiket menunggu dengan prioritas tertinggi untuk layanan tersebut. Tiket yang sebelumnya sedang dipanggil pada layanan yang sama diberi status **Selesai** sebelum tiket baru menjadi **Dipanggil**.
2. **Lewati:** jika pemegang tiket tidak hadir, tiket aktif dikembalikan ke status **Menunggu** dan dipindahkan ke belakang antrian.
3. **Selesai:** menyelesaikan tiket yang sedang dipanggil **tanpa otomatis memanggil tiket lain**.

Penentuan status tersebut berada di fungsi `callNext()`, `skip()`, dan `finish()` pada `src/shared.ts`. Ketika operator menekan panggil, fitur opsional *speech synthesis* dapat membacakan nomor tiket jika opsi suara diaktifkan.

**Penting:** tiket **tidak langsung dipanggil setelah dibuat**. Penerbitan tiket dan pemanggilan adalah dua tindakan terpisah, sesuai alur pada soal.

### 4.6 Layar Antrian, Sinkronisasi, dan Fullscreen

Halaman [`layar.html`](layar.html) menampilkan setiap layanan aktif, nomor yang berstatus **Dipanggil**, dan jumlah tiket **Menunggu**. Kode layar mengambil data yang sama dari Local Storage dan memperbarui tampilan melalui fungsi `observe()`.

```ts
export function observe(callback: () => void): void {
  window.addEventListener('storage', event => {
    if (event.key === DATA_KEY) callback();
  });
  window.addEventListener('antrisehat-update', callback);
  window.setInterval(callback, 2500);
}
```

Interval `2500` milidetik setara dengan **2,5 detik**, sehingga sesuai ketentuan polling 2–3 detik. Pembaruan tidak memerlukan reload halaman. Tombol layar penuh memakai `requestFullscreen()` dan `exitFullscreen()` pada **Fullscreen API**.

**Catatan teknis:** sinkronisasi ini berlaku pada tab/halaman yang menggunakan **origin dan Local Storage browser yang sama**, bukan otomatis pada perangkat atau komputer berbeda.

### 4.7 Desain HTML dan CSS

Seluruh halaman menggunakan [`css/style.css`](css/style.css) agar konsisten dalam tipografi, jarak, navigasi, warna, tombol, form, kartu informasi, dan dialog. Komponen ditampilkan dengan desain sederhana yang mengutamakan informasi layanan, nomor tiket, dan aksi utama dibanding tabel yang panjang.

CSS menyertakan aturan responsif pada lebar layar 930 px dan 650 px. Terdapat pula `@media print` untuk menyederhanakan hasil cetak tiket. Halaman yang memerlukan autentikasi menggunakan class `auth-pending` untuk menyembunyikan konten hingga pemeriksaan sesi selesai.

## 5. Alur Penggunaan dan Mekanisme Antrian

### 5.1 Alur Utama

```text
Pengguna login melalui DummyJSON
               │
               ▼
     Memilih layanan aktif
       dan tingkat prioritas
               │
               ▼
      Menekan "Ambil nomor"
               │
               ▼
      Tiket dibuat: A-001
        Status: MENUNGGU
               │
               ▼
  Operator menekan "Panggil berikutnya"
               │
               ▼
        Status: DIPANGGIL
               │
               ▼
    Nomor tampil di layar antrian
               │
       ┌───────┴────────┐
       ▼                ▼
     Selesai           Lewati
       │                │
       ▼                ▼
 Status: SELESAI    Kembali menunggu
                    pada akhir antrian
```

### 5.2 Contoh Kasus Pengurutan

Misalnya, pada layanan UMUM-1 terdapat tiga tiket menunggu dengan urutan penerbitan sebagai berikut:

- `A-001` — Normal.
- `A-002` — Lansia.
- `A-003` — VIP.

Jika operator belum memanggil satu pun tiket, tombol **Panggil berikutnya** akan memilih `A-003` terlebih dahulu, dilanjutkan `A-002`, lalu `A-001`. Hal ini karena **tingkat prioritas lebih dahulu dibanding urutan nomor**, sementara nomor tiket tetap menunjukkan urutan penerbitan.

Jika operator menekan **Selesai**, nomor tersebut ditutup dan layar kembali menunjukkan belum ada panggilan untuk layanan tersebut sampai operator memanggil nomor berikutnya.

### 5.3 Perbedaan Alur User dan Admin

Pengunjung masuk ke halaman Ambil Nomor untuk membuat tiket dan dapat membuka Layar Antrian. Admin atau moderator dapat membuka Dashboard untuk mengatur layanan, menerbitkan tiket secara manual, serta mengoperasikan pemanggilan. Semua halaman membaca data dari tempat penyimpanan lokal yang sama.

## 6. Hasil Tampilan Antarmuka

Dokumentasi gambar disediakan di dalam folder `docs/screenshots/` sehingga dapat ditampilkan langsung pada halaman repository GitHub.

**Dashboard Admin**

![Tampilan Dashboard Admin](docs/screenshots/dashboard.png)

**Halaman Ambil Nomor**

![Tampilan Ambil Nomor](docs/screenshots/ambil-nomor.png)

**Tampilan Responsif pada Layar Ponsel**

<img src="docs/screenshots/mobile.png" alt="Tampilan responsif pada perangkat seluler" width="320" />

Gambar ini merupakan dokumentasi tampilan. Verifikasi fungsi tombol dan interaksi tetap membutuhkan pengujian aplikasi, bukan hanya pemeriksaan screenshot.

## 7. Evaluasi Kesesuaian dengan Soal

Tabel berikut memetakan poin wajib pada **Soal Praktikum Modul 3** dengan file pelaksanaannya. Status **“Ada pada kode”** berarti implementasi terkait dapat ditemukan pada source code; tidak otomatis berarti sudah lolos semua kondisi penggunaan nyata.

| No. | Ketentuan Soal | Bukti Implementasi | Status Pemeriksaan |
|---:|---|---|---|
| 1 | Tanpa framework/template CSS atau JS | HTML, `css/style.css`, `src/*.ts` | ✅ Ada pada kode |
| 2 | Kode program TypeScript | Seluruh logika aplikasi berada di `src/*.ts` | ✅ Sesuai struktur |
| 3 | Hasil `.js` disisipkan memakai `defer` | `dist/*.js` dan lima halaman HTML | ✅ Ada pada kode |
| 4 | File konfigurasi kompilasi | `tsconfig.json` | ✅ Diperiksa |
| 5 | Login POST ke DummyJSON | `src/login.ts` | ⚠️ Kode ada; uji API langsung diperlukan |
| 6 | Loading dan pesan kesalahan login | `src/login.ts`, `login.html` | ✅ Ada pada kode |
| 7 | Role admin, moderator, user | `resolveRole()`, `isStaff()`, `landing()` | ✅ Ada pada kode |
| 8 | Simpan sesi di Local Storage | `saveSession()`, `readSession()` | ✅ Ada pada kode |
| 9 | Semua halaman operasional dilindungi login | `guard()` di semua halaman operasional | ✅ Ada pada kode |
| 10 | Dashboard & Operator hanya admin/moderator | `guard(true)` | ✅ Ada pada kode |
| 11 | Tampilkan nama, role, dan logout | `guard()`, navbar HTML | ✅ Ada pada kode |
| 12 | Tambah layanan: kode satu huruf, nama unik | `addService()` | ✅ Logika diperiksa |
| 13 | Aktif/nonaktif serta hapus layanan | `toggleService()`, `deleteService()` | ✅ Logika diperiksa |
| 14 | Reset antrian dan nomor mulai ulang | `reset()` | ✅ Logika diperiksa |
| 15 | Penerbitan tiket manual + prioritas | `src/admin.ts`, `issue()` | ✅ Ada pada kode |
| 16 | Ambil tiket mandiri + 4 prioritas | `src/ambil-antrian.ts` | ✅ Ada pada kode |
| 17 | Nomor tiket `A-001`, dst. | `issue()`, `format()` | ✅ Logika diperiksa |
| 18 | Nonaktif tidak bisa dipilih untuk tiket baru | Filter layanan aktif dan validasi `issue()` | ✅ Logika diperiksa |
| 19 | Urutan antrian berdasarkan prioritas | `priorities`, `allWaiting()` | ✅ Logika diperiksa |
| 20 | Operator: panggil, lewati, selesai | `callNext()`, `skip()`, `finish()` | ✅ Logika diperiksa |
| 21 | Layar otomatis berubah setiap 2–3 detik | `observe()` = 2500 ms | ✅ Ada pada kode |
| 22 | Layar memuat nomor dipanggil dan sisa antrian | `src/layar.ts` | ✅ Ada pada kode |
| 23 | Toggle layar penuh | `requestFullscreen()`, `exitFullscreen()` | ✅ Ada pada kode |
| 24 | Penambahan layanan tampil tanpa refresh manual | `observe()`, `renderVisitor()` | ✅ Ada pada kode |
| 25 | Penyimpanan layanan dan tiket tetap ada setelah refresh | `readState()`, `writeState()` | ✅ Logika diperiksa |
| 26 | Bonus tampilan dan suara | CSS responsif, `speechSynthesis` | ✅ Ada pada kode; dukungan suara tergantung browser |

**Interpretasi:** semua kelompok persyaratan utama telah memiliki implementasi yang dapat ditelusuri di source code. Namun, bukti implementasi dan keberhasilan kompilasi **bukan bukti bahwa setiap skenario browser/API telah lolos uji end-to-end**.

## 8. Hasil Pengujian dan Verifikasi

### 8.1 Pemeriksaan yang Dilakukan pada Source Code

Pemeriksaan laporan ini menggunakan berkas program yang tersedia pada versi proyek terakhir. Verifikasi yang dilakukan meliputi:

- **Struktur proyek:** lima halaman HTML, enam file TypeScript, file hasil kompilasi pada `dist/`, CSS, `tsconfig.json`, dan `package.json` tersedia.
- **Kompilasi TypeScript:** perintah `tsc --noEmit -p tsconfig.json` dijalankan dan **berhasil tanpa error**.
- **Uji logika terisolasi:** JavaScript hasil kompilasi (`dist/shared.js`) diuji dengan penyimpanan lokal tiruan untuk memeriksa inisialisasi layanan, tambah layanan, penolakan duplikasi, aktif/nonaktif, penolakan tiket pada layanan nonaktif, penomoran, prioritas, panggil, lewati, selesai, reset, dan hapus layanan. **Seluruh 17 pemeriksaan berhasil**.

Pengujian terisolasi tersebut memeriksa logika fungsi, **bukan** klik pada seluruh tombol di browser sungguhan.

### 8.2 Skenario Pengujian Browser yang Harus Dikonfirmasi

Agar laporan akhir dan presentasi praktikum akurat, gunakan checklist ini ketika menguji lewat Live Server:

- [ ] Login dengan akun admin DummyJSON asli sampai masuk ke Dashboard.
- [ ] Tombol **isi contoh admin** mengisi kedua field dan login tetap diproses melalui API.
- [ ] Login dengan akun user masuk ke halaman Ambil Nomor.
- [ ] Password salah atau gangguan jaringan menampilkan pesan error.
- [ ] User tidak dapat membuka Dashboard dan Operator melalui URL langsung.
- [ ] Halaman Ambil Nomor dan Layar meminta login ketika sesi dihapus.
- [ ] Admin menambah layanan dengan kode dan nama unik; input duplikat ditolak.
- [ ] Layanan nonaktif tidak tersedia untuk penerbitan tiket baru.
- [ ] Pengambilan tiket menghasilkan nomor `A-001`, `A-002`, dst. dengan benar.
- [ ] Tiket yang baru dibuat berstatus **Menunggu**, belum muncul sebagai panggilan.
- [ ] Operator menekan **Panggil berikutnya** dan nomor terlihat pada Layar.
- [ ] Prioritas VIP/Disabilitas/Lansia diproses sebelum Normal.
- [ ] Tombol **Lewati** mengembalikan tiket ke belakang antrian.
- [ ] Tombol **Selesai** tidak otomatis memanggil tiket berikutnya.
- [ ] Penambahan layanan dan pemanggilan terlihat di tab lain tanpa refresh.
- [ ] Layar penuh dapat dibuka dan ditutup.
- [ ] Refresh halaman tidak menghapus data tiket dan layanan.
- [ ] Reset menghapus tiket dan memulai nomor lagi dari `001`.
- [ ] Pencetakan tiket dan opsi suara bekerja di browser yang dipakai.
- [ ] Tampilan tetap terbaca dengan baik pada lebar layar ponsel.

**Status pengujian langsung:** koneksi login ke server DummyJSON dan uji browser end-to-end **belum dapat dinyatakan terverifikasi dalam pemeriksaan laporan ini**. Karena itu, checklist di atas sengaja tidak dicentang tanpa bukti uji langsung.

### 8.3 Contoh Skenario Demonstrasi Saat Praktikum

1. Masuk sebagai admin, tambah layanan `D` dengan nama `LABORATORIUM`.
2. Buka halaman Ambil Nomor pada tab lain dengan sesi yang sama, lalu pastikan LABORATORIUM muncul.
3. Buat tiket Normal dan VIP pada layanan yang sama.
4. Masuk ke Operator, tekan **Panggil berikutnya**, lalu periksa tiket VIP dipanggil terlebih dahulu.
5. Buka Layar Antrian dan periksa nomor yang sedang dipanggil.
6. Uji **Lewati**, **Selesai**, **Nonaktifkan layanan**, serta **Reset antrian**.
7. Refresh halaman untuk membuktikan penyimpanan Local Storage.

## 9. Kendala, Keterbatasan, dan Evaluasi

**Pertama, dependensi autentikasi eksternal.** Login membutuhkan jaringan dan respons DummyJSON yang valid. Tombol isi contoh admin berfungsi untuk memudahkan pengisian, bukan sebagai akses login tanpa API. Kegagalan jaringan harus dibedakan dari kesalahan username/password saat demonstrasi.

**Kedua, penggunaan Local Storage.** Penyimpanan ini memenuhi instruksi soal, tetapi bukan database terpusat. Nomor tiket pada dua perangkat dengan penyimpanan berbeda tidak otomatis tersinkron. Untuk demonstrasi silang halaman, gunakan browser dan origin yang sama.

**Ketiga, hak akses masih berbasis front-end.** `guard()` memeriksa sesi dan role yang tersimpan dalam browser. Pendekatan ini sesuai cakupan latihan front-end, tetapi bukan sistem keamanan produksi karena Local Storage dapat dimodifikasi secara manual.

**Keempat, pengujian runtime.** Kompilasi berhasil dan fungsi antrian lolos uji logika, tetapi interaksi yang bergantung pada API, Fullscreen API, Web Speech API, dan perilaku browser masih membutuhkan pengujian pada perangkat pengguna.

**Kelima, aturan prioritas.** Dalam implementasi, tiket yang dilewati ditempatkan pada akhir seluruh daftar menunggu, bukan hanya pada akhir kelompok prioritas semula. Pendekatan ini sesuai salah satu alternatif pada soal, yaitu memindahkan tiket tidak hadir ke akhir antrian.

## 10. Cara Menjalankan dan Mengompilasi Proyek

Instruksi teknis berikut ditempatkan **di README GitHub**, bukan pada tampilan aplikasi.

1. Unduh atau *clone* repository.
2. Buka folder proyek di Visual Studio Code.
3. Jalankan `login.html` melalui ekstensi **Live Server**.
4. Gunakan kredensial akun uji DummyJSON yang sesuai dengan role yang akan diperiksa.
5. Coba alur Ambil Nomor → Operator → Layar Antrian sesuai skenario pada bagian 8.

Untuk pengujian admin, akun contoh DummyJSON yang dapat dicoba:

```text
Username : emilys
Password : emilyspass
```

Contoh tersebut merupakan akun uji layanan publik DummyJSON, **bukan** akun milik rumah sakit.

Berkas `dist/*.js` sudah tersedia sehingga aplikasi dapat dibuka melalui Live Server tanpa harus mengompilasi ulang terlebih dahulu. Jika mengubah file dalam folder `src/`, jalankan:

```bash
npm install
npm run build
```

Perintah kompilasi otomatis saat pengembangan:

```bash
npm run watch
```

Untuk hanya mengecek tipe data:

```bash
npm run typecheck
```

Kompilasi ulang penting karena browser menjalankan file pada `dist/`, **bukan** file `.ts` secara langsung.

## 11. Kesimpulan

Praktikum Modul 3 Kelompok B03 menghasilkan aplikasi antrian rumah sakit berbasis HTML, CSS, dan TypeScript murni dengan lima halaman utama: Login, Dashboard Admin, Operator, Ambil Antrian, dan Layar Antrian.

Analisis source code menunjukkan bahwa kebutuhan utama pada soal telah dipetakan ke implementasi, yaitu autentikasi DummyJSON, validasi role, manajemen jenis antrian, penerbitan nomor, urutan prioritas, perubahan status oleh operator, tampilan antrian yang diperbarui secara berkala, fullscreen, dan persistensi Local Storage. TypeScript berhasil melewati pemeriksaan kompilasi, sedangkan 17 pemeriksaan logika antrian berhasil pada pengujian terisolasi.

**Kesimpulan kesesuaian:** secara struktur dan implementasi kode, proyek **telah mencakup ketentuan utama Soal Praktikum Modul 3**, termasuk revisi akses halaman pada 13 Oktober 2026. Klaim bahwa **semua fitur bebas bug dan berfungsi pada seluruh browser** tetap memerlukan pengujian langsung sesuai checklist bagian 8, khususnya untuk login API dan interaksi antarmuka.

---

**Laporan Praktikum Pemrograman Web — Modul 3**  
**Kelompok B03**  
**Studi Kasus:** Sistem Antrian Rumah Sakit  
**Acuan:** *Soal Praktikum Modul 3* beserta catatan revisi tanggal 13 Oktober 2026.
