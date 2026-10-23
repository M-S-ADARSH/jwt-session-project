"use strict";
// Keep the access token in memory for this demo, rather than persistent browser storage.
let accessToken = null;
const byId = (id) => {
    const element = document.getElementById(id);
    if (!element)
        throw new Error(`Required page element #${id} was not found`);
    return element;
};
const usernameInput = byId('username');
const passwordInput = byId('password');
const resultBox = byId('result');
const tokenView = byId('tokenView');
const statusPill = byId('statusPill');
const logoutButton = byId('logoutBtn');
function renderSession(username) {
    statusPill.textContent = accessToken ? `Signed in${username ? ` · ${username}` : ''}` : 'Signed out';
    logoutButton.disabled = !accessToken;
    tokenView.textContent = accessToken ?? 'No token yet.';
}
function showResult(status, body) {
    resultBox.textContent = `${status}
${JSON.stringify(body, null, 2)}`;
}
async function request(path, options = {}, includeToken = true) {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    if (includeToken && accessToken)
        headers.set('Authorization', `Bearer ${accessToken}`);
    const response = await fetch(path, { ...options, headers });
    const raw = await response.text();
    let body = raw;
    try {
        body = raw ? JSON.parse(raw) : {};
    }
    catch { /* Keep non-JSON server responses readable. */ }
    showResult(`${response.status} ${response.statusText}`, body);
    if (!response.ok)
        throw new Error(`Request failed with HTTP ${response.status}`);
    return body;
}
async function login() {
    const body = await request('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ username: usernameInput.value.trim(), password: passwordInput.value })
    }, false);
    accessToken = body.token;
    renderSession(body.username);
    passwordInput.value = '';
}
async function register() {
    const body = await request('/api/auth/register', {
        method: 'POST', body: JSON.stringify({ username: usernameInput.value.trim(), password: passwordInput.value })
    }, false);
    accessToken = body.token;
    renderSession(body.username);
    passwordInput.value = '';
}
function runSafely(action) {
    void action().catch((error) => {
        // The API response already appears in the result panel; this is a concise UI hint.
        if (error instanceof Error)
            resultBox.textContent += `

${error.message}`;
    });
}
byId('loginBtn').addEventListener('click', () => runSafely(login));
byId('registerBtn').addEventListener('click', () => runSafely(register));
byId('profileBtn').addEventListener('click', () => runSafely(() => request('/api/user/me')));
byId('adminBtn').addEventListener('click', () => runSafely(() => request('/api/admin/dashboard')));
byId('noTokenBtn').addEventListener('click', () => runSafely(() => request('/api/user/me', {}, false)));
logoutButton.addEventListener('click', () => {
    accessToken = null;
    renderSession();
    resultBox.textContent = 'Token discarded from browser memory. Try the protected profile endpoint now.';
});
renderSession();
