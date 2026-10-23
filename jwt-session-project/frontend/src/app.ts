// This is the TypeScript source for the browser UI. The compiled JavaScript is served by Spring Boot.
type ApiResult = Record<string, unknown>;

// Keep the access token in memory for this demo, rather than persistent browser storage.
let accessToken: string | null = null;

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Required page element #${id} was not found`);
  return element as T;
};

const usernameInput = byId<HTMLInputElement>('username');
const passwordInput = byId<HTMLInputElement>('password');
const resultBox = byId<HTMLDivElement>('result');
const tokenView = byId<HTMLPreElement>('tokenView');
const statusPill = byId<HTMLSpanElement>('statusPill');
const logoutButton = byId<HTMLButtonElement>('logoutBtn');

function renderSession(username?: string): void {
  statusPill.textContent = accessToken ? `Signed in${username ? ` · ${username}` : ''}` : 'Signed out';
  logoutButton.disabled = !accessToken;
  tokenView.textContent = accessToken ?? 'No token yet.';
}

function showResult(status: number | string, body: unknown): void {
  resultBox.textContent = `${status}
${JSON.stringify(body, null, 2)}`;
}

async function request<T>(path: string, options: RequestInit = {}, includeToken = true): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (includeToken && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(path, { ...options, headers });
  const raw = await response.text();
  let body: unknown = raw;
  try { body = raw ? JSON.parse(raw) as unknown : {}; } catch { /* Keep non-JSON server responses readable. */ }
  showResult(`${response.status} ${response.statusText}`, body);
  if (!response.ok) throw new Error(`Request failed with HTTP ${response.status}`);
  return body as T;
}

async function login(): Promise<void> {
  const body = await request<AuthResponse>('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ username: usernameInput.value.trim(), password: passwordInput.value })
  }, false);
  accessToken = body.token;
  renderSession(body.username);
  passwordInput.value = '';
}

interface AuthResponse { token: string; username: string; role: string; expiresInSeconds: number; tokenType: string; }

async function register(): Promise<void> {
  const body = await request<AuthResponse>('/api/auth/register', {
    method: 'POST', body: JSON.stringify({ username: usernameInput.value.trim(), password: passwordInput.value })
  }, false);
  accessToken = body.token;
  renderSession(body.username);
  passwordInput.value = '';
}

function runSafely(action: () => Promise<unknown>): void {
  void action().catch((error: unknown) => {
    // The API response already appears in the result panel; this is a concise UI hint.
    if (error instanceof Error) resultBox.textContent += `

${error.message}`;
  });
}

byId<HTMLButtonElement>('loginBtn').addEventListener('click', () => runSafely(login));
byId<HTMLButtonElement>('registerBtn').addEventListener('click', () => runSafely(register));
byId<HTMLButtonElement>('profileBtn').addEventListener('click', () => runSafely(() => request('/api/user/me')));
byId<HTMLButtonElement>('adminBtn').addEventListener('click', () => runSafely(() => request('/api/admin/dashboard')));
byId<HTMLButtonElement>('noTokenBtn').addEventListener('click', () => runSafely(() => request('/api/user/me', {}, false)));
logoutButton.addEventListener('click', () => {
  accessToken = null;
  renderSession();
  resultBox.textContent = 'Token discarded from browser memory. Try the protected profile endpoint now.';
});

renderSession();
