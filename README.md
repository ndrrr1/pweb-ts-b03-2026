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

## Penjelasan Kode

### A. File Konfigurasi
#### package.json:
```
{"name":"antrisehat-modul-3","version":"2.0.0","private":true,"description":"Sistem antrian rumah sakit native HTML CSS TypeScript","scripts":{"build":"tsc","watch":"tsc --watch","typecheck":"tsc --noEmit"},"devDependencies":{"typescript":"^5.8.3"}}
```
#### tsconfig.json:
```
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "none",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "lib": ["ES2020", "DOM"],
    "noEmitOnError": true,
    "skipLibCheck": true
  },
  "include": ["src/*.ts"]
}
```
Penjelasan: File `package.json` digunakan untuk mendeklarasikan script kompilasi TypeScript (seperti `tsc --watch`). Sedangkan `tsconfig.json` mengatur aturan kompilasi TypeScript menjadi JavaScript Vanilla (`ES2020`). Direktori input berada di `src/` dan output (hasil kompilasi) diletakkan di `dist/`.

### B. File Styling (CSS)
#### css/style.css:
```
:root{--bg:#f5f8f9;--surface:#fff;--ink:#1d2938;--muted:#728091;--line:#e4eaed;--blue:#135e72;--blue-dark:#174354;--orange:#f5a01e;--orange-hover:#e78e05;--danger:#bb4242;--success:#0a805f;--radius:12px}
*{box-sizing:border-box}html{font-family:Arial,Helvetica,sans-serif;color:var(--ink);background:var(--bg)}
body{margin:0;min-height:100vh}button,input,select{font:inherit}a{text-decoration:none;color:inherit}
/* ... (kode styling lainnya untuk grid, panel, button, dialog, dll) ... */
@media print{body *{visibility:hidden!important}#ticketDialog,#ticketDialog *{visibility:visible!important}#ticketDialog{position:fixed!important;left:0;top:0;margin:0;border:0;box-shadow:none;width:100%}.receipt-actions{display:none}.receipt{border:0}}
```
Penjelasan: Menggunakan CSS Variables (`:root`) untuk mempermudah pengaturan tema warna. Tata letak utama menggunakan CSS Flexbox dan Grid (`display: grid`) agar kartu antrian responsif. Terdapat juga media query `@media print` untuk menyembunyikan semua elemen UI web kecuali struk/karcis ketika dicetak.

### C. Utilitas & State Management Global
#### src/shared.ts:
```
/** AntriSehat — native TypeScript shared application logic. No runtime dependencies. */
namespace Antri {
  export type Role = 'admin' | 'moderator' | 'user';
  export type Priority = 'normal' | 'lansia' | 'disabilitas' | 'vip';
  export type Status = 'Menunggu' | 'Dipanggil' | 'Selesai';
  export interface Session { accessToken: string; role: Role; firstName: string; username: string }
  export interface Service { code: string; name: string; active: boolean }
  export interface Ticket { id: string; code: string; number: number; priority: Priority; status: Status; order: number; createdAt: number; calledAt?: number; finishedAt?: number; skipped?: boolean }
  export interface State { services: Service[]; tickets: Ticket[]; counters: Record<string, number>; order: number }
  export const priorities: Record<Priority, number> = { vip: 0, disabilitas: 1, lansia: 2, normal: 3 };
  export const labels: Record<Priority, string> = { vip: 'VIP', disabilitas: 'Disabilitas', lansia: 'Lansia', normal: 'Normal' };
  const DATA_KEY = 'antrisehat:state:v3';
  const SESSION_KEY = 'antrisehat:session:v3';
  export const seed: Service[] = [
    { code:'A',name:'UMUM-1',active:true },{ code:'B',name:'UMUM-2',active:true },
    { code:'C',name:'UMUM-3',active:true },{ code:'G',name:'GIGI',active:true },
    { code:'F',name:'FARMASI',active:true },{ code:'P',name:'PSIKOLOG',active:true }
  ];
  function parse<T>(text: string | null): T | null {
    if (text === null) return null;
    try { return JSON.parse(text) as T; } catch { return null; }
  }
  export function readState(): State {
    const old = parse<State>(localStorage.getItem(DATA_KEY));
    if (old && Array.isArray(old.services) && Array.isArray(old.tickets) && old.counters && typeof old.counters === 'object') {
      return { services: old.services, tickets: old.tickets, counters: old.counters, order: Number(old.order) || 0 };
    }
    const first: State = { services: seed.map(s => ({...s})), tickets: [], counters: {}, order: 0 };
    localStorage.setItem(DATA_KEY, JSON.stringify(first));
    return first;
  }
  export function writeState(state: State): void {
    localStorage.setItem(DATA_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('antrisehat-update'));
  }
  export function readSession(): Session | null {
    const s = parse<Session>(localStorage.getItem(SESSION_KEY));
    return s && typeof s.accessToken === 'string' && Boolean(s.accessToken) && typeof s.username === 'string' && Boolean(s.firstName) && (s.role === 'admin' || s.role === 'moderator' || s.role === 'user') ? s : null;
  }
  export function saveSession(s: Session): void { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
  export function isStaff(role: Role): boolean { return role === 'admin' || role === 'moderator'; }
  export function landing(session: Session): string { return isStaff(session.role) ? 'index.html' : 'ambil-antrian.html'; }
  export function guard(staffOnly = false): Session | null {
    const s = readSession();
    if (!s || (staffOnly && !isStaff(s.role))) { window.location.replace('login.html'); return null; }
    document.body.classList.remove('auth-pending');
    const who = document.getElementById('accountName');
    if (who) who.textContent = `${s.firstName} · ${s.role === 'user' ? 'User' : s.role === 'admin' ? 'Admin' : 'Moderator'}`;
    document.querySelectorAll<HTMLElement>('[data-staff-only]').forEach(n => { n.hidden = !isStaff(s.role); });
    const logoutButton = document.getElementById('logoutButton');
    logoutButton?.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem(SESSION_KEY); location.href = 'login.html'; });
    window.addEventListener('storage', e => {
      if (e.key === SESSION_KEY && (!readSession() || (staffOnly && !isStaff(readSession()!.role)))) location.replace('login.html');
    });
    return s;
  }
  export function format(ticket: Ticket): string { return `${ticket.code}-${String(ticket.number).padStart(3,'0')}`; }
  export function allWaiting(state: State, code: string): Ticket[] {
    return state.tickets.filter(t => t.code === code && t.status === 'Menunggu').sort((a,b) =>
      (a.skipped ? 4 : priorities[a.priority]) - (b.skipped ? 4 : priorities[b.priority]) || a.order - b.order);
  }
  export function current(state: State, code: string): Ticket | undefined {
    return state.tickets.find(t => t.code === code && t.status === 'Dipanggil');
  }
  export function issue(code: string, priority: Priority): Ticket {
    const s = readState();
    if (!s.services.some(x => x.code === code && x.active)) throw Error('Layanan ini sedang tidak tersedia.');
    if (!Object.prototype.hasOwnProperty.call(priorities, priority)) throw Error('Pilihan prioritas tidak valid.');
    const last = Math.max(s.counters[code] || 0, ...s.tickets.filter(t => t.code === code).map(t => t.number), 0);
    if (last >= 999) throw Error('Nomor telah mencapai 999. Hubungi admin untuk reset.');
    const number = last + 1;
    const ticket: Ticket = { id: `${code}-${number}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, code, number, priority, status:'Menunggu', order: ++s.order, createdAt:Date.now() };
    s.counters[code] = number;
    s.tickets.push(ticket);
    writeState(s);
    return ticket;
  }
  export function addService(rawCode: string, rawName: string): void {
    const code = rawCode.trim().toUpperCase();
    const name = rawName.trim().replace(/\s+/g, ' ');
    if (!/^[A-Z]$/.test(code)) throw Error('Kode harus tepat satu huruf A–Z.');
    if (name.length < 2 || name.length > 60) throw Error('Nama layanan harus 2–60 karakter.');
    const s = readState();
    if (s.services.some(x => x.code.toLowerCase() === code.toLowerCase())) throw Error('Kode layanan sudah digunakan.');
    if (s.services.some(x => x.name.toLowerCase() === name.toLowerCase())) throw Error('Nama layanan sudah digunakan.');
    s.services.push({code,name,active:true});
    writeState(s);
  }
  export function toggleService(code: string): void {
    const s = readState(); const service = s.services.find(x => x.code === code);
    if (!service) throw Error('Layanan tidak ditemukan.');
    service.active = !service.active; writeState(s);
  }
  export function deleteService(code: string): void {
    const s = readState();
    s.services = s.services.filter(x => x.code !== code);
    s.tickets = s.tickets.filter(x => x.code !== code);
    delete s.counters[code]; writeState(s);
  }
  export function reset(): void { const s = readState(); s.tickets = []; s.counters = {}; s.order = 0; writeState(s); }
  export function callNext(code: string): Ticket | null {
    const s = readState(); const next = allWaiting(s,code)[0]; if (!next) return null;
    const previous = current(s,code);
    if (previous) { previous.status = 'Selesai'; previous.finishedAt = Date.now(); }
    next.status = 'Dipanggil'; next.calledAt = Date.now(); next.skipped = false;
    writeState(s); return next;
  }
  export function finish(code: string): boolean {
    const s = readState(); const t = current(s,code); if (!t) return false;
    t.status = 'Selesai'; t.finishedAt = Date.now(); writeState(s); return true;
  }
  export function skip(code: string): boolean {
    const s = readState(); const t = current(s,code); if (!t) return false;
    t.status = 'Menunggu'; t.skipped = true; t.order = ++s.order; t.calledAt = undefined;
    writeState(s); return true;
  }
  export function observe(callback: () => void): void {
    window.addEventListener('storage', event => { if (event.key === DATA_KEY) callback(); });
    window.addEventListener('antrisehat-update', callback);
    window.setInterval(callback, 2500);
  }
  export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
    const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
  }
  export function $<T extends HTMLElement>(id: string): T { const item = document.getElementById(id); if (!item) throw Error(`Elemen tidak ditemukan: ${id}`); return item as T; }
  export function feedback(id: string, value: string, success = false): void {
    const p = $<HTMLElement>(id); p.textContent = value; p.hidden = !value; p.classList.toggle('is-success',success);
  }
  export function serviceName(s: State, code: string): string { return s.services.find(x => x.code === code)?.name || code; }
}
```
Penjelasan: `shared.ts` adalah core engine aplikasi. Membungkus seluruh logika CRUD, sinkronisasi state (`localStorage`), dan utilitas dalam namespace `Antri`. Berisi algoritma pengurutan prioritas (`allWaiting`), pembuatan nomor karcis (`issue`), manipulasi siklus tiket (`callNext`, `skip`, `finish`), serta `guard()` untuk melarang akses bagi user yang belum login.

### D. Fitur Autentikasi Login
#### login.html:
```
<!-- HTML Structure (Potongan) -->
<form id="loginForm" class="login-form">
  <div class="field"><label for="username">Username</label><input type="text" id="username" required></div>
  <div class="field"><label for="password">Password</label><input type="password" id="password" required></div>
  <p class="feedback" id="loginError" hidden></p>
  <button class="btn btn-primary" type="submit" id="loginSubmit">Masuk</button>
</form>
```
#### src/login.ts:
```
// src/login.ts
const form = Antri.$<HTMLFormElement>('loginForm');
const username = Antri.$<HTMLInputElement>('username');
const password = Antri.$<HTMLInputElement>('password');
const submitButton = Antri.$<HTMLButtonElement>('loginSubmit');
const submitLabel = Antri.$<HTMLElement>('loginSubmitLabel');

async function apiJSON(url: string, options: RequestInit = {}): Promise<{ok:boolean;status:number;data:Record<string,unknown>}> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = account(await response.json());
    return {ok:response.ok,status:response.status,data:data || {}};
  } finally { clearTimeout(timer); }
}
form.addEventListener('submit', async e => {
  e.preventDefault(); Antri.feedback('loginError','');
  if (!username.value.trim() || !password.value) return;
  submitButton.disabled = true; submitLabel.textContent = 'Memproses...';
  try {
    const result = await apiJSON('https://dummyjson.com/auth/login', {
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username:username.value.trim(),password:password.value,expiresInMins:60})
    });
    if (!result.ok) throw Error('Username atau password salah.');
    const token = result.data.accessToken ?? result.data.token;
    const role = await resolveRole(result.data,token as string);
    const session: Antri.Session = {
      accessToken: token as string, role,
      firstName: result.data.firstName as string, username: username.value.trim()
    };
    Antri.saveSession(session);
    location.replace(Antri.landing(session));
  } catch (error) {
    Antri.feedback('loginError', error instanceof Error ? error.message : 'Login gagal.');
  } finally {
    submitButton.disabled = false; submitLabel.textContent = 'Masuk';
  }
});
```
Penjelasan: Kode ini bertugas mengirim kredensial login (HTTP POST) ke API DummyJSON. Jika berhasil (`HTTP 200 OK`), sistem mengambil `accessToken` dan atribut `role`, menyimpannya ke `localStorage` via fungsi `saveSession`, lalu mengarahkan pengguna ke halaman terkait.

### E. Dashboard Admin
#### index.html:
```
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Dashboard — AntriSehat</title>
  <link rel="stylesheet" href="css/style.css">
  <script defer src="dist/shared.js"></script>
  <script defer src="dist/admin.js"></script>
</head>
<body class="auth-pending">
  <header class="app-header">
    <div class="header-inner">
      <a class="brand" href="index.html"><span class="brand-mark">+</span>AntriSehat</a>
      <nav class="nav">
        <a class="active" href="index.html">Dashboard</a>
        <a href="operator.html">Operator</a>
        <a href="ambil-antrian.html">Ambil Nomor</a>
        <a href="layar.html">Layar Antrian</a>
      </nav>
      <div class="user-tools">
        <span id="accountName" class="account-name"></span>
        <a href="login.html" class="logout-link" id="logoutButton">Keluar</a>
      </div>
    </div>
  </header>

  <main class="container">
    <div class="page-head">
      <div>
        <h1>Dashboard Admin</h1>
        <p>Kelola jenis layanan dan nomor antrian.</p>
      </div>
      <button id="openReset" type="button" class="btn btn-outline">Reset antrian</button>
    </div>

    <!-- Ringkasan Statistik -->
    <section class="summary" aria-label="Ringkasan">
      <div class="panel stat"><small>Layanan aktif</small><strong id="statServices">0</strong></div>
      <div class="panel stat"><small>Tiket menunggu</small><strong id="statWaiting">0</strong></div>
      <div class="panel stat"><small>Sedang dipanggil</small><strong id="statCalled">0</strong></div>
    </section>

    <div class="dashboard-grid">
      <!-- Panel Kiri: Tambah/Kelola Jenis Antrian -->
      <section class="panel">
        <div class="panel-header"><h2>Jenis antrian</h2></div>
        <form id="serviceForm" class="service-form">
          <div class="field">
            <label for="serviceCode" class="input-label">Kode</label>
            <input id="serviceCode" class="input" maxlength="1" placeholder="D" required>
          </div>
          <div class="field">
            <label for="serviceName" class="input-label">Nama layanan</label>
            <input id="serviceName" class="input" placeholder="Contoh: Laboratorium" maxlength="60" required>
          </div>
          <button type="submit" class="btn btn-primary">+ Tambah</button>
        </form>
        <p class="feedback" id="serviceError" role="alert" hidden></p>
        <div id="serviceList" class="service-list"></div>
      </section>

      <div class="stack">
        <!-- Panel Kanan Atas: Terbitkan Tiket Manual -->
        <section class="panel">
          <div class="panel-header"><h2>Terbitkan tiket manual</h2></div>
          <form id="manualForm" class="manual-form">
            <div class="fields-2">
              <div class="field">
                <label class="input-label" for="manualService">Layanan</label>
                <select class="input" id="manualService" required>
                  <option value="">Pilih layanan</option>
                </select>
              </div>
              <div class="field">
                <label class="input-label" for="manualPriority">Prioritas</label>
                <select class="input" id="manualPriority">
                  <option value="normal">Normal</option>
                  <option value="lansia">Lansia</option>
                  <option value="disabilitas">Disabilitas</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
            </div>
            <button class="btn btn-primary" type="submit">Terbitkan tiket</button>
          </form>
          <p class="feedback" id="manualFeedback" role="status" hidden></p>
        </section>

        <!-- Panel Kanan Bawah: History Tiket -->
        <section class="panel">
          <div class="panel-header">
            <h2>Tiket terbaru</h2><small>9 terakhir</small>
          </div>
          <div id="ticketList" class="ticket-list"></div>
        </section>
      </div>
    </div>
  </main>

  <!-- Modal Konfirmasi Reset -->
  <dialog id="resetDialog" class="dialog" aria-labelledby="resetTitle">
    <h2 id="resetTitle">Reset seluruh antrian?</h2>
    <p>Semua tiket akan terhapus dan nomor tiket akan dimulai lagi dari 001. Jenis layanan tetap tersimpan.</p>
    <div class="dialog-actions">
      <button type="button" id="cancelReset" class="btn btn-outline">Batal</button>
      <button type="button" id="confirmReset" class="btn btn-danger">Ya, reset</button>
    </div>
  </dialog>
</body>
</html>
```
#### src/admin.ts:
```
// src/admin.ts
const adminSession = Antri.guard(true);
const serviceForm = Antri.$<HTMLFormElement>('serviceForm');
const codeInput = Antri.$<HTMLInputElement>('serviceCode');
const nameInput = Antri.$<HTMLInputElement>('serviceName');
const serviceList = Antri.$<HTMLElement>('serviceList');
// ... inisialisasi elemen lain

function renderAdmin(): void {
  if (!adminSession) return;
  const s = Antri.readState();
  Antri.$('statServices').textContent = `${s.services.filter(v => v.active).length}`;
  Antri.$('statWaiting').textContent = `${s.tickets.filter(v => v.status === 'Menunggu').length}`;
  
  const list = s.services.map(service => {
    const row = Antri.el('div','service-row'); row.dataset.code = service.code;
    const main = Antri.el('div','service-info');
    main.append(Antri.el('strong','',service.name), Antri.el('small','',service.active ? 'Aktif' : 'Nonaktif'));
    
    const buttons = Antri.el('div','inline-actions');
    const del = Antri.el('button','btn btn-small btn-text-danger','Hapus');
    del.type='button'; del.dataset.action='delete';
    buttons.append(del); row.append(main,buttons); return row;
  });
  serviceList.replaceChildren(...(list.length ? list : [Antri.el('p','empty-msg','Belum ada layanan.') ]));
}

serviceForm.addEventListener('submit', e => {
  e.preventDefault();
  try { 
      Antri.addService(codeInput.value,nameInput.value); 
      serviceForm.reset(); renderAdmin(); 
  } catch (error) { Antri.feedback('serviceError', error instanceof Error ? error.message : 'Gagal.'); }
});

renderAdmin(); Antri.observe(renderAdmin);
```
Penjelasan: Halaman `admin.ts` membaca data sesi dengan peran strict (`staffOnly = true`). Jika lolos validasi, fungsi `renderAdmin()` akan memperbarui statistik dasbor secara reaktif. File ini juga memproses form penambahan poli dengan memanggil fungsi `Antri.addService()`.

### F. Panel Operator
#### src/operator.ts:
```
const operatorSession = Antri.guard(true);
const operatorBoard = Antri.$<HTMLElement>('operatorBoard');

function renderOperator(): void {
  if (!operatorSession) return;
  const s = Antri.readState();
  const display = s.services.filter(x => x.active || s.tickets.some(t => t.code === x.code && t.status !== 'Selesai'));
  
  const cards = display.map(service => {
    const current = Antri.current(s,service.code); 
    const waiting = Antri.allWaiting(s,service.code); 
    const next = waiting[0];
    
    const card = Antri.el('article','panel operator-card'); card.dataset.code = service.code;
    // ... Elemen DOM creation (Panggil, Lewati, Selesai)
    return card;
  });
  operatorBoard.replaceChildren(...(cards.length ? cards : [Antri.el('p','empty-msg','Belum ada layanan.') ]));
}

operatorBoard.addEventListener('click', e => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  const code = btn?.closest<HTMLElement>('[data-code]')?.dataset.code; 
  if (!btn || !code) return;
  
  try {
    if (btn.dataset.action === 'call') {
      const t = Antri.callNext(code);
      if (t) speak(t); // Web Speech API
    } else if (btn.dataset.action === 'skip') {
      Antri.skip(code);
    } else if (btn.dataset.action === 'finish') {
      Antri.finish(code);
    }
  } catch (error) {}
  renderOperator();
});
renderOperator(); Antri.observe(renderOperator);
```
Penjelasan: `operator.ts` digunakan oleh staf loket untuk memanggil tiket berdasarkan prioritas menggunakan event-delegation pada tombol `[data-action]`. Memanggil Antri.callNext akan otomatis memajukan antrean, dan opsi `speak` akan bersuara melalui `speechSynthesis` API.

### G. Pengambilan Tiket
#### src/ambil-antrian.ts:
```
const visitorSession = Antri.guard(); // Memerlukan login sebagai user/admin
const visitorBoard = Antri.$<HTMLElement>('visitorBoard');
const ticketDialog = Antri.$<HTMLDialogElement>('ticketDialog');

function renderVisitor(): void {
  if (!visitorSession) return;
  const s = Antri.readState(); 
  const services = s.services.filter(service => service.active);
  // ... render select dropdown priority dan button "Ambil Nomor"
}

visitorBoard.addEventListener('click',e => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action="take"]');
  const card = button?.closest<HTMLElement>('[data-code]');
  if (!visitorSession || !button || !card) return;
  try {
    const priority = card.querySelector<HTMLSelectElement>('select')!.value as Antri.Priority;
    const ticket = Antri.issue(card.dataset.code!,priority);
    
    // Tampilkan di modal
    receipt(ticket); 
    ticketDialog.showModal();
  } catch(error) {}
});
```
Penjelasan: Halaman ini memfasilitasi antarmuka untuk pengunjung menekan tombol "Ambil nomor" (Self-Service). Menggunakan `ticketDialog.showModal()` untuk menampilkan elemen HTML `<dialog>` yang memuat detail nomor tiket setelah dicetak.

### H. Layar Antrian Real-time
#### src/layar.ts:
```
const screenSession = Antri.guard();
const screenBoard = Antri.$<HTMLElement>('screenBoard');
const fullButton = Antri.$<HTMLButtonElement>('fullscreenButton');

function renderScreen(): void {
  if (!screenSession) return;
  const s = Antri.readState();
  const visible = s.services.filter(x => x.active);
  
  const cards = visible.map(service => {
    const t = Antri.current(s,service.code); 
    const waiting = Antri.allWaiting(s,service.code).length;
    // ... Renders screen-number
    return card;
  });
  screenBoard.replaceChildren(...cards);
}

fullButton.addEventListener('click',async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await Antri.$('screenMain').requestFullscreen();
});
renderScreen(); Antri.observe(() => { showClock(); renderScreen(); });
```
Penjelasan: Layar antrian (kiosk) untuk memantau status secara visual. Terdapat tombol yang memanggil requestFullscreen() dari HTML5 API agar tampilan menjadi layar penuh.

## KODE REQUIREMENT SOAL

### 1. Autentikasi dan Proteksi Halaman (Auth Guard & Role Guard)
#### Pengguna wajib melakukan login untuk mengakses halaman. Pengguna dengan role admin/moderator memiliki akses ke dasbor, sedangkan pengguna biasa (user) hanya mengakses halaman Ambil Antrian dan Layar.
Implementasi Kode (shared.ts):
```
export function guard(staffOnly = false): Session | null {
  const s = readSession(); // Membaca data token dan role dari Local Storage
  
  // Jika tidak ada sesi aktif, atau halaman butuh akses staf tapi rolenya bukan staf
  if (!s || (staffOnly && !isStaff(s.role))) { 
     window.location.replace('login.html'); // Paksa redirect ke halaman login
     return null; 
  }
  
  // Menampilkan nama pengguna di Header jika lolos guard
  const who = document.getElementById('accountName');
  if (who) who.textContent = `${s.firstName} · ${s.role === 'user' ? 'User' : s.role === 'admin' ? 'Admin' : 'Moderator'}`;
  
  return s;
}
```
Penjelasan: Sistem keamanan frontend (Auth Guard) dibangun menggunakan fungsi `guard()`. Pada halaman khusus seperti Dashboard dan Operator, fungsi ini dipanggil dengan parameter `true` (`Antri.guard(true)`), yang berarti `staffOnly` bernilai benar. Logika `!isStaff(s.role)` akan mengevaluasi apakah peran pengguna saat ini adalah user biasa; jika iya, maka skrip `window.location.replace` akan segera menendang pengguna tersebut kembali ke `login.html`.

### 2. Autentikasi POST Endpoint DummyJSON
#### Aplikasi harus menembak API `[https://dummyjson.com/auth/login](https://dummyjson.com/auth/login)` dengan payload username dan password.
Implementasi Kode (login.ts):
```
const result = await apiJSON('https://dummyjson.com/auth/login', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
      username: username.value.trim(), 
      password: password.value, 
      expiresInMins: 60 
  })
});

if (!result.ok) throw Error('Username atau password salah.');
const token = result.data.accessToken ?? result.data.token;
```
Penjelasan: Sistem menangkap input dari form login, kemudian membungkusnya menggunakan `JSON.stringify` untuk dikirimkan melalui HTTP POST menggunakan Fetch API. Terdapat pengaturan header `'Content-Type': 'application/json'` agar server DummyJSON mengerti bahwa data yang dikirim adalah objek JSON. Setelah API merespons dengan kode `HTTP 200 OK`, token sesi diambil dan diteruskan ke fungsi `saveSession()` untuk disimpan.

### 3. Penyimpanan Persistensi (Local Storage)
#### Seluruh data sesi (token, role, nama), daftar Jenis Antrian, dan daftar Tiket wajib disimpan di Local Storage agar data tidak hilang.
Implementasi Kode (shared.ts):
```
const DATA_KEY = 'antrisehat:state:v3';

export function writeState(state: State): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(state)); // Menyimpan string JSON
  window.dispatchEvent(new CustomEvent('antrisehat-update')); // Memicu sinkronisasi
}
```
Penjelasan: Karena browser tidak bisa menyimpan objek TypeScript secara langsung di Local Storage, fungsi `JSON.stringify(state)` digunakan untuk mengubah seluruh data layanan dan riwayat array tiket menjadi sebuah teks/string panjang. Setiap kali ada tiket baru, tiket dipanggil, atau layanan diubah, fungsi `writeState` dieksekusi.

### 4. Algoritma Urutan Prioritas Antrian
#### Pemanggilan tiket oleh operator harus didasarkan pada urutan prioritas (VIP, Disabilitas, Lansia didahulukan dari Normal).
Implementasi Kode (shared.ts):
```
export const priorities: Record<Priority, number> = { vip: 0, disabilitas: 1, lansia: 2, normal: 3 };

export function allWaiting(state: State, code: string): Ticket[] {
  return state.tickets.filter(t => t.code === code && t.status === 'Menunggu')
    .sort((a,b) => (a.skipped ? 4 : priorities[a.priority]) - (b.skipped ? 4 : priorities[b.priority]) || a.order - b.order);
}
```
Penjelasan: Penyortiran antrian menggunakan fungsi bawaan `Array.prototype.sort()`. Algoritmanya bekerja dengan memberikan "Bobot Prioritas" berupa angka: VIP = 0 (paling berat/utama), hingga Normal = 3.
1. Kondisi `priorities[a.priority] - priorities[b.priority]` memastikan tiket dengan bobot lebih kecil akan pindah ke indeks depan (prioritas lebih tinggi).
2. Terdapat pengecekan `.skipped ? 4` yang berarti jika tiket pernah ditekan "Lewati" oleh operator, bobotnya diturunkan paksa menjadi 4 (kasta terendah) sehingga otomatis terlempar ke antrian paling belakang.
3. Logika `|| a.order - b.order` berfungsi jika tingkat prioritasnya sama, maka sistem akan menggunakan urutan waktu pengambilan (First-In First-Out).

### 5. Pembaruan Real-time Layar Tanpa Reload (Polling)
#### Mengolah pembaruan data secara otomatis (polling interval 2-3 detik) tanpa reload halaman.
Implementasi Kode (shared.ts & layar.ts):
```
// Di dalam shared.ts
export function observe(callback: () => void): void {
  // Mendengarkan perubahan dari tab lain
  window.addEventListener('storage', event => { if (event.key === DATA_KEY) callback(); });
  
  // Polling sesuai ketentuan modul
  window.setInterval(callback, 2500); 
}

// Di dalam layar.ts
Antri.observe(() => { showClock(); renderScreen(); });
```
Penjelasan: Sistem menggunakan `setInterval()` yang mengeksekusi fungsi render setiap 2500 milidetik (2,5 detik). Pendekatan ini dinamakan metode Polling. Selain itu, diimplementasikan juga pendengar acara bawaan `window.addEventListener('storage')`, yang otomatis terpicu secara instan kapan pun ada tab lain (seperti tab Operator) yang melakukan `localStorage.setItem`. Hal ini memberikan efek real-time ganda yang sangat responsif.

### 6. Format Nomor Tiket Tiga Digit
#### Nomor tiket dicetak dengan format Kode-Nomor 3 Digit (contoh: A-001).
Implementasi Kode (shared.ts):
```
export function format(ticket: Ticket): string { 
   return `${ticket.code}-${String(ticket.number).padStart(3,'0')}`; 
}
```
Penjelasan: Fungsi `padStart(3, '0')` merupakan fungsi asli string JavaScript. Fungsi ini bekerja dengan mengecek panjang karakter angka (misal angka `1`). Karena panjang karakter hanya 1, kurang dari 3, maka string tersebut akan ditambahkan karakter `'0'` berulang kali di depannya (sebelah kiri) hingga panjang totalnya menjadi tepat 3 karakter (menghasilkan `'001'`).

### 7. Layar Penuh (Fullscreen API)
#### Ketentuan Soal: Sediakan tombol toggle Layar Penuh menggunakan JavaScript Fullscreen API.
Implementasi Kode (layar.ts):
```
fullButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen(); // Keluar mode fullscreen
    } else {
      await Antri.$('screenMain').requestFullscreen(); // Masuk mode fullscreen
    }
  } catch { 
    Antri.feedback('screenError','Layar penuh tidak diizinkan oleh browser.'); 
  }
});
```
Penjelasan: Kode ini membaca properti standar W3C `document.fullscreenElement`. Jika halaman saat ini sudah dalam keadaan layar penuh (mengembalikan nilai `true`), maka eksekusi `document.exitFullscreen()` dijalankan. Sebaliknya, metode `.requestFullscreen()` akan membuat kontainer ID `screenMain` membentang menutupi seluruh layar monitor komputer. Blok `try...catch` digunakan karena beberapa browser terkadang memblokir API layar penuh dengan alasan keamanan.
