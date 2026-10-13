"use strict";
const form = Antri.$('loginForm');
const username = Antri.$('username');
const password = Antri.$('password');
const submitButton = Antri.$('loginSubmit');
const submitLabel = Antri.$('loginSubmitLabel');
const exampleButton = Antri.$('exampleAdmin');
const previousSession = Antri.readSession();
if (previousSession)
    location.replace(Antri.landing(previousSession));
exampleButton.addEventListener('click', () => {
    username.value = 'emilys';
    password.value = 'emilyspass';
    Antri.feedback('loginError', '');
    password.focus();
});
function account(data) {
    return data !== null && typeof data === 'object' && !Array.isArray(data) ? data : null;
}
function validRole(value) { return value === 'admin' || value === 'moderator' || value === 'user'; }
async function apiJSON(url, options = {}) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12000);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        const data = account(await response.json());
        return { ok: response.ok, status: response.status, data: data || {} };
    }
    finally {
        clearTimeout(timer);
    }
}
async function resolveRole(data, token) {
    if (validRole(data.role))
        return data.role;
    try {
        const me = await apiJSON('https://dummyjson.com/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (me.ok && validRole(me.data.role))
            return me.data.role;
    }
    catch { /* Try next endpoint. */ }
    if (typeof data.id === 'number' && Number.isSafeInteger(data.id)) {
        const user = await apiJSON(`https://dummyjson.com/users/${data.id}`);
        if (user.ok && validRole(user.data.role) && user.data.id === data.id)
            return user.data.role;
    }
    throw Error('Role akun tidak dapat diverifikasi. Silakan coba masuk kembali.');
}
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Antri.feedback('loginError', '');
    if (!username.value.trim() || !password.value) {
        Antri.feedback('loginError', 'Isi username dan password.');
        return;
    }
    submitButton.disabled = true;
    exampleButton.disabled = true;
    username.readOnly = true;
    password.readOnly = true;
    submitLabel.textContent = 'Memproses...';
    try {
        const result = await apiJSON('https://dummyjson.com/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username.value.trim(), password: password.value, expiresInMins: 60 })
        });
        if (!result.ok)
            throw Error(result.status === 400 || result.status === 401 ? 'Username atau password salah.' : `Login gagal (HTTP ${result.status}).`);
        const token = result.data.accessToken ?? result.data.token;
        if (typeof token !== 'string' || !token)
            throw Error('Token tidak diberikan oleh server.');
        const role = await resolveRole(result.data, token);
        const session = {
            accessToken: token, role,
            firstName: typeof result.data.firstName === 'string' && result.data.firstName.trim() ? result.data.firstName : username.value.trim(),
            username: typeof result.data.username === 'string' ? result.data.username : username.value.trim()
        };
        Antri.saveSession(session);
        location.replace(Antri.landing(session));
    }
    catch (error) {
        let message = error instanceof Error ? error.message : 'Login gagal. Coba kembali.';
        if (error instanceof DOMException && error.name === 'AbortError')
            message = 'Koneksi terlalu lambat. Coba kembali.';
        else if (error instanceof TypeError)
            message = 'Tidak dapat menghubungi server. Periksa koneksi internet.';
        Antri.feedback('loginError', message);
    }
    finally {
        submitButton.disabled = false;
        exampleButton.disabled = false;
        username.readOnly = false;
        password.readOnly = false;
        submitLabel.textContent = 'Masuk';
    }
});
