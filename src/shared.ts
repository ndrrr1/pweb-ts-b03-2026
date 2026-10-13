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
