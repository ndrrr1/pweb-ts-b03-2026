"use strict";
/** AntriSehat — native TypeScript shared application logic. No runtime dependencies. */
var Antri;
(function (Antri) {
    Antri.priorities = { vip: 0, disabilitas: 1, lansia: 2, normal: 3 };
    Antri.labels = { vip: 'VIP', disabilitas: 'Disabilitas', lansia: 'Lansia', normal: 'Normal' };
    const DATA_KEY = 'antrisehat:state:v3';
    const SESSION_KEY = 'antrisehat:session:v3';
    Antri.seed = [
        { code: 'A', name: 'UMUM-1', active: true }, { code: 'B', name: 'UMUM-2', active: true },
        { code: 'C', name: 'UMUM-3', active: true }, { code: 'G', name: 'GIGI', active: true },
        { code: 'F', name: 'FARMASI', active: true }, { code: 'P', name: 'PSIKOLOG', active: true }
    ];
    function parse(text) {
        if (text === null)
            return null;
        try {
            return JSON.parse(text);
        }
        catch {
            return null;
        }
    }
    function readState() {
        const old = parse(localStorage.getItem(DATA_KEY));
        if (old && Array.isArray(old.services) && Array.isArray(old.tickets) && old.counters && typeof old.counters === 'object') {
            return { services: old.services, tickets: old.tickets, counters: old.counters, order: Number(old.order) || 0 };
        }
        const first = { services: Antri.seed.map(s => ({ ...s })), tickets: [], counters: {}, order: 0 };
        localStorage.setItem(DATA_KEY, JSON.stringify(first));
        return first;
    }
    Antri.readState = readState;
    function writeState(state) {
        localStorage.setItem(DATA_KEY, JSON.stringify(state));
        window.dispatchEvent(new CustomEvent('antrisehat-update'));
    }
    Antri.writeState = writeState;
    function readSession() {
        const s = parse(localStorage.getItem(SESSION_KEY));
        return s && typeof s.accessToken === 'string' && Boolean(s.accessToken) && typeof s.username === 'string' && Boolean(s.firstName) && (s.role === 'admin' || s.role === 'moderator' || s.role === 'user') ? s : null;
    }
    Antri.readSession = readSession;
    function saveSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
    Antri.saveSession = saveSession;
    function isStaff(role) { return role === 'admin' || role === 'moderator'; }
    Antri.isStaff = isStaff;
    function landing(session) { return isStaff(session.role) ? 'index.html' : 'ambil-antrian.html'; }
    Antri.landing = landing;
    function guard(staffOnly = false) {
        const s = readSession();
        if (!s || (staffOnly && !isStaff(s.role))) {
            window.location.replace('login.html');
            return null;
        }
        document.body.classList.remove('auth-pending');
        const who = document.getElementById('accountName');
        if (who)
            who.textContent = `${s.firstName} · ${s.role === 'user' ? 'User' : s.role === 'admin' ? 'Admin' : 'Moderator'}`;
        document.querySelectorAll('[data-staff-only]').forEach(n => { n.hidden = !isStaff(s.role); });
        const logoutButton = document.getElementById('logoutButton');
        logoutButton?.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem(SESSION_KEY); location.href = 'login.html'; });
        window.addEventListener('storage', e => {
            if (e.key === SESSION_KEY && (!readSession() || (staffOnly && !isStaff(readSession().role))))
                location.replace('login.html');
        });
        return s;
    }
    Antri.guard = guard;
    function format(ticket) { return `${ticket.code}-${String(ticket.number).padStart(3, '0')}`; }
    Antri.format = format;
    function allWaiting(state, code) {
        return state.tickets.filter(t => t.code === code && t.status === 'Menunggu').sort((a, b) => (a.skipped ? 4 : Antri.priorities[a.priority]) - (b.skipped ? 4 : Antri.priorities[b.priority]) || a.order - b.order);
    }
    Antri.allWaiting = allWaiting;
    function current(state, code) {
        return state.tickets.find(t => t.code === code && t.status === 'Dipanggil');
    }
    Antri.current = current;
    function issue(code, priority) {
        const s = readState();
        if (!s.services.some(x => x.code === code && x.active))
            throw Error('Layanan ini sedang tidak tersedia.');
        if (!Object.prototype.hasOwnProperty.call(Antri.priorities, priority))
            throw Error('Pilihan prioritas tidak valid.');
        const last = Math.max(s.counters[code] || 0, ...s.tickets.filter(t => t.code === code).map(t => t.number), 0);
        if (last >= 999)
            throw Error('Nomor telah mencapai 999. Hubungi admin untuk reset.');
        const number = last + 1;
        const ticket = { id: `${code}-${number}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, code, number, priority, status: 'Menunggu', order: ++s.order, createdAt: Date.now() };
        s.counters[code] = number;
        s.tickets.push(ticket);
        writeState(s);
        return ticket;
    }
    Antri.issue = issue;
    function addService(rawCode, rawName) {
        const code = rawCode.trim().toUpperCase();
        const name = rawName.trim().replace(/\s+/g, ' ');
        if (!/^[A-Z]$/.test(code))
            throw Error('Kode harus tepat satu huruf A–Z.');
        if (name.length < 2 || name.length > 60)
            throw Error('Nama layanan harus 2–60 karakter.');
        const s = readState();
        if (s.services.some(x => x.code.toLowerCase() === code.toLowerCase()))
            throw Error('Kode layanan sudah digunakan.');
        if (s.services.some(x => x.name.toLowerCase() === name.toLowerCase()))
            throw Error('Nama layanan sudah digunakan.');
        s.services.push({ code, name, active: true });
        writeState(s);
    }
    Antri.addService = addService;
    function toggleService(code) {
        const s = readState();
        const service = s.services.find(x => x.code === code);
        if (!service)
            throw Error('Layanan tidak ditemukan.');
        service.active = !service.active;
        writeState(s);
    }
    Antri.toggleService = toggleService;
    function deleteService(code) {
        const s = readState();
        s.services = s.services.filter(x => x.code !== code);
        s.tickets = s.tickets.filter(x => x.code !== code);
        delete s.counters[code];
        writeState(s);
    }
    Antri.deleteService = deleteService;
    function reset() { const s = readState(); s.tickets = []; s.counters = {}; s.order = 0; writeState(s); }
    Antri.reset = reset;
    function callNext(code) {
        const s = readState();
        const next = allWaiting(s, code)[0];
        if (!next)
            return null;
        const previous = current(s, code);
        if (previous) {
            previous.status = 'Selesai';
            previous.finishedAt = Date.now();
        }
        next.status = 'Dipanggil';
        next.calledAt = Date.now();
        next.skipped = false;
        writeState(s);
        return next;
    }
    Antri.callNext = callNext;
    function finish(code) {
        const s = readState();
        const t = current(s, code);
        if (!t)
            return false;
        t.status = 'Selesai';
        t.finishedAt = Date.now();
        writeState(s);
        return true;
    }
    Antri.finish = finish;
    function skip(code) {
        const s = readState();
        const t = current(s, code);
        if (!t)
            return false;
        t.status = 'Menunggu';
        t.skipped = true;
        t.order = ++s.order;
        t.calledAt = undefined;
        writeState(s);
        return true;
    }
    Antri.skip = skip;
    function observe(callback) {
        window.addEventListener('storage', event => { if (event.key === DATA_KEY)
            callback(); });
        window.addEventListener('antrisehat-update', callback);
        window.setInterval(callback, 2500);
    }
    Antri.observe = observe;
    function el(tag, className = '', text = '') {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = text;
        return element;
    }
    Antri.el = el;
    function $(id) { const item = document.getElementById(id); if (!item)
        throw Error(`Elemen tidak ditemukan: ${id}`); return item; }
    Antri.$ = $;
    function feedback(id, value, success = false) {
        const p = $(id);
        p.textContent = value;
        p.hidden = !value;
        p.classList.toggle('is-success', success);
    }
    Antri.feedback = feedback;
    function serviceName(s, code) { return s.services.find(x => x.code === code)?.name || code; }
    Antri.serviceName = serviceName;
})(Antri || (Antri = {}));
