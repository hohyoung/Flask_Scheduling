import * as api from '../api.js';
import { state, setCurrentUser } from '../state.js';
import * as ui from '../ui.js';
import { initializeAppContent } from '../main.js';

export async function handleLogin(e) {
    e.preventDefault();
    const name = document.getElementById('login-name-input').value;
    const password = document.getElementById('login-password-input').value;
    const errorMsgEl = document.getElementById('login-error-msg');

    try {
        errorMsgEl.textContent = '';
        const user = await api.login(name, password);
        setCurrentUser(user);
        document.getElementById('login-modal').close();
        await initializeAppContent();
    } catch (error) {
        errorMsgEl.textContent = error.error || '로그인에 실패했습니다.';
    }
}

export async function handleSetPassword(e) {
    e.preventDefault();
    const name = document.getElementById('set-password-name-input').value;
    const password = document.getElementById('set-password-password-input').value;
    const msgEl = document.getElementById('set-password-msg');

    try {
        msgEl.className = 'success-message';
        msgEl.textContent = '요청 중...';
        const result = await api.setPassword(name, password);
        msgEl.textContent = result.message || '비밀번호가 설정되었습니다. 이제 로그인하세요.';
        e.target.reset();
    } catch (error) {
        msgEl.className = 'error-message';
        msgEl.textContent = error.error || '비밀번호 설정에 실패했습니다.';
    }
}

export async function handleLogout() {
    try {
        await api.logout();
        setCurrentUser(null);
        // Show login modal instead of reloading
        document.getElementById('user-popup').style.display = 'none';
        document.getElementById('login-modal').showModal();
    } catch (error) {
        ui.showToast('로그아웃 실패');
    }
}
