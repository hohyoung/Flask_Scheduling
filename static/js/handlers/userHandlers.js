
import * as api from '../api.js';
import { state, setCurrentUser } from '../state.js';
import * as ui from '../ui.js';
import { refreshDataAndRender } from '../main.js';
import { handleLogout } from './authHandlers.js';

export function handleUserIconClick(e) {
    e.stopPropagation();
    const userPopup = document.getElementById('user-popup');
    const isHidden = userPopup.style.display === 'none' || userPopup.style.display === '';
    if (isHidden) {
        ui.renderUserPopup();
        userPopup.style.display = 'block';
    } else {
        userPopup.style.display = 'none';
    }
}

export function handleDocumentClickForUserPopup(e) {
    const userPopup = document.getElementById('user-popup');
    const userIcon = document.getElementById('current-user-icon');
    if (userPopup && userIcon && !userPopup.contains(e.target) && !userIcon.contains(e.target)) {
        userPopup.style.display = 'none';
    }
}

export async function handleUserPopupListClick(e) {
    const targetLi = e.target.closest('li');
    if (!targetLi) return;

    if (targetLi.id === 'logout-btn') {
        handleLogout();
        return;
    }

    const userId = targetLi.dataset.userId;
    if (!userId) return;

    if (e.target.classList.contains('user-position')) {
        handleUserPositionEdit(userId);
    } else {
        handleUserSwitch(userId);
    }
}

async function handleUserPositionEdit(userId) {
    const user = state.appData.users.find(u => u.id == userId);
    if (!user) return;
    const newPosition = prompt('새 직급을 입력하세요:', user.position || '');
    if (newPosition === null || newPosition.trim() === (user.position || '')) return;

    try {
        await api.updateUser(userId, { position: newPosition.trim() });
        await refreshDataAndRender();
    } catch (error) {
        ui.showToast(error.error || '직급 수정에 실패했습니다.');
    }
}

function handleUserSwitch(userId) {
    const userToSet = state.appData.users.find(u => u.id == userId);
    setCurrentUser(userToSet);
    ui.renderCurrentUserIcon();
    ui.renderProjects();
    document.getElementById('user-popup').style.display = 'none';
}
