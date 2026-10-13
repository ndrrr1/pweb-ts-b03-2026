# AntriSehat — Praktikum Modul 3

Website antrian rumah sakit berbasis **HTML, CSS, dan TypeScript murni** tanpa framework, library UI, atau template.

## Jalankan

1. Buka folder proyek ini di VS Code.
2. Jalankan **Live Server** pada `login.html`. Berkas `dist/*.js` sudah disertakan (tidak perlu kompilasi untuk mencoba).
3. Masuk dengan akun DummyJSON, misalnya akun admin `emilys` / `emilyspass`. Tombol **isi contoh admin** otomatis mengisi kedua kolom, lalu tekan **Masuk**. Login membutuhkan internet.
4. Admin dapat mengatur layanan di Dashboard, menerbitkan tiket manual, dan menggunakan Operator. User dapat mengakses Ambil Nomor dan Layar Antrian.

**Cadangan:** berkas HTML/JS juga dibuat sebagai skrip klasik (`defer`, bukan ES modules) supaya tombol dan logika tetap berjalan ketika proyek dibuka langsung melalui `file://`. Tetapi API login memerlukan akses CORS ke DummyJSON; bila browser membatasi origin lokal, gunakan Live Server.

## Kompilasi TypeScript

- `npm install` (hanya jika TypeScript belum tersedia secara global)
- `npx tsc` atau `tsc` untuk membangun semua `src/*.ts` ke `dist/*.js`
- `npx tsc --watch` saat melakukan pengembangan.

## Fitur

- Login API `POST https://dummyjson.com/auth/login`, verifikasi role dari respons API, `/auth/me`, atau `/users/{id}` jika diperlukan; sesi tersimpan Local Storage.
- Auth guard: semua halaman login wajib; Dashboard/Operator hanya untuk admin/moderator. Logout hanya menghapus sesi, bukan tiket.
- Dashboard: tambah layanan (kode 1 huruf, nama unik case-insensitive), nonaktifkan/aktifkan, hapus, tiket manual, reset tiket & nomor, ringkasan.
- Operator: prioritas VIP > Disabilitas > Lansia > Normal; FIFO per prioritas; Panggil Berikutnya menyelesaikan yang sebelumnya; Lewati meletakkan tiket di belakang antrian; Selesai tidak memanggil berikutnya. Suara panggilan opsional.
- Ambil Nomor: setiap layanan aktif dan prioritas, nomor K-001, tiket bisa dicetak; layanan baru muncul otomatis.
- Layar: nomor yang sedang dipanggil dan jumlah menunggu tiap layanan aktif, pembaruan otomatis setiap 2,5 detik, Fullscreen API.
- Semua data layanan/tiket/counter di Local Storage; antar-tab sinkron melalui Storage Event.

**Catatan:** Local Storage hanya dibagi oleh halaman yang menggunakan *origin* yang sama. Buka seluruh halaman dari alamat Live Server yang sama. Sinkronisasi berbeda laptop/perangkat membutuhkan server database dan berada di luar cakupan soal. Autentikasi API DummyJSON bergantung pada internet dan ketersediaan layanan.

## Alur panggilan

**Ambil tiket tidak memanggil tiket secara otomatis.** Setelah pengunjung menekan Ambil nomor, tiket berstatus *Menunggu*. Admin atau operator membuka `operator.html` dan menekan **Panggil berikutnya** pada layanan tersebut. Tiket terpilih sesuai prioritas berubah menjadi *Dipanggil* dan tampil di `layar.html` (tab lain otomatis sinkron). Tombol **Selesai** menutup tiket tanpa memanggil otomatis; tombol **Lewati** meletakkannya di belakang urutan menunggu.
