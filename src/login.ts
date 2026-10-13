const form = Antri.$<HTMLFormElement>('loginForm');
const username = Antri.$<HTMLInputElement>('username');
const password = Antri.$<HTMLInputElement>('password');
const submitButton = Antri.$<HTMLButtonElement>('loginSubmit');
const submitLabel = Antri.$<HTMLElement>('loginSubmitLabel');
const spinner = Antri.$<HTMLElement>('loginSpinner');
const loginStatus = Antri.$<HTMLElement>('loginStatus');
const passwordToggle = Antri.$<HTMLButtonElement>('passwordToggle');
const previousSession = Antri.readSession();
if (previousSession) location.replace(Antri.landing(previousSession));
passwordToggle.addEventListener('click', () => {
  const visible = password.type === 'password';
  password.type = visible ? 'text' : 'password';
  passwordToggle.textContent = visible ? 'Tutup' : 'Lihat';
  passwordToggle.setAttribute('aria-pressed', String(visible));
  passwordToggle.setAttribute('aria-label', visible ? 'Sembunyikan password' : 'Tampilkan password');
});
function setLoading(loading: boolean): void {
  submitButton.disabled = loading;
  username.readOnly = loading;
  password.readOnly = loading;
  form.setAttribute('aria-busy', String(loading));
  spinner.hidden = !loading;
  submitLabel.textContent = loading ? 'Sedang masuk...' : 'Masuk';
  loginStatus.textContent = loading ? 'Memverifikasi akun Anda...' : '';
  loginStatus.hidden = !loading;
}
function account(data: unknown): Record<string, unknown> | null {
  return data !== null && typeof data === 'object' && !Array.isArray(data) ? data as Record<string,unknown> : null;
}
function validRole(value: unknown): value is Antri.Role { return value === 'admin' || value === 'moderator' || value === 'user'; }
async function apiJSON(url: string, options: RequestInit = {}): Promise<{ok:boolean;status:number;data:Record<string,unknown>}> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = account(await response.json());
    return {ok:response.ok,status:response.status,data:data || {}};
  } finally { clearTimeout(timer); }
}
async function resolveRole(data: Record<string,unknown>, token: string): Promise<Antri.Role> {
  if (validRole(data.role)) return data.role;
  try {
    const me = await apiJSON('https://dummyjson.com/auth/me', {headers:{Authorization:`Bearer ${token}`}});
    if (me.ok && validRole(me.data.role)) return me.data.role;
  } catch { /* Try next endpoint. */ }
  if (typeof data.id === 'number' && Number.isSafeInteger(data.id)) {
    const user = await apiJSON(`https://dummyjson.com/users/${data.id}`);
    if (user.ok && validRole(user.data.role) && user.data.id === data.id) return user.data.role;
  }
  throw Error('Role akun tidak dapat diverifikasi. Silakan coba masuk kembali.');
}
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (submitButton.disabled) return;
  Antri.feedback('loginError','');
  if (!username.value.trim() || !password.value) { Antri.feedback('loginError','Isi username dan password.'); return; }
  setLoading(true);
  let redirecting = false;
  try {
    const result = await apiJSON('https://dummyjson.com/auth/login', {
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username:username.value.trim(),password:password.value,expiresInMins:60})
    });
    if (!result.ok) throw Error(result.status === 400 || result.status === 401 ? 'Username atau password salah.' : `Login gagal (HTTP ${result.status}).`);
    const token = result.data.accessToken ?? result.data.token;
    if (typeof token !== 'string' || !token) throw Error('Token tidak diberikan oleh server.');
    const role = await resolveRole(result.data,token);
    const session: Antri.Session = {
      accessToken:token,role,
      firstName: typeof result.data.firstName === 'string' && result.data.firstName.trim() ? result.data.firstName : username.value.trim(),
      username: typeof result.data.username === 'string' ? result.data.username : username.value.trim()
    };
    Antri.saveSession(session);
    location.replace(Antri.landing(session));
    redirecting = true;
  } catch (error) {
    let message = error instanceof Error ? error.message : 'Login gagal. Coba kembali.';
    if (error instanceof DOMException && error.name === 'AbortError') message = 'Koneksi terlalu lambat. Coba kembali.';
    else if (error instanceof TypeError) message = 'Tidak dapat menghubungi server. Periksa koneksi internet.';
    Antri.feedback('loginError',message);
  } finally {
    if (!redirecting) setLoading(false);
  }
});
