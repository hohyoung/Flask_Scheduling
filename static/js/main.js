import { state, setCurrentUser, setAppData } from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';
import { handleLogin, handleSetPassword } from './handlers/authHandlers.js';
import { handleUserIconClick, handleDocumentClickForUserPopup, handleUserPopupListClick } from './handlers/userHandlers.js';
import { handleAddProjectClick, handleCategoryFilterClick, handleProjectItemClick, handleManualProgressChange } from './handlers/projectHandlers.js';
import * as modalHandlers from './handlers/modalHandlers.js';
import * as viewHandlers from './handlers/viewHandlers.js';

Chart.register(ChartDataLabels);

// ===================================================================
// 1. 전역 콜백 (Global Callbacks for Libraries)
// ===================================================================

export function handleDateClick(arg) {
    state.newScheduleDate = arg.dateStr;
    document.getElementById('schedule-form').reset();
    document.getElementById('schedule-modal').showModal();
}
window.handleDateClick = handleDateClick;

export async function handleEventClick(arg) {
    const props = arg.event.extendedProps;
    if (props && props.type === 'schedule') {
        if (confirm(`'${arg.event.title}' 일정을 삭제하시겠습니까?`)) {
            try {
                await api.deleteSchedule(props.scheduleId);
                state.appData.schedules = state.appData.schedules.filter(s => s.id !== props.scheduleId);
                ui.initializeCalendar(handleDateClick, handleEventClick);
                ui.showToast('일정이 삭제되었습니다.');
            } catch (error) {
                ui.showToast(error.error || '일정 삭제에 실패했습니다.');
            }
        }
    }
}
window.handleEventClick = handleEventClick;

window.handleTaskReorder = function (evt) {
    const taskIds = Array.from(evt.target.children).map(el => {
        const input = el.querySelector('.task-content-input');
        return input ? parseInt(input.dataset.taskId) : null;
    }).filter(id => id !== null);
    api.reorderTasks(taskIds).catch(() => ui.showToast('순서 변경 실패'));
};


// ===================================================================
// 2. 이벤트 리스너 설정 (Event Listener Setup)
// ===================================================================

let areAppEventListenersSet = false;

function setupEventListeners() {
    // 이 리스너들은 앱의 메인 UI가 렌더링 된 후 한 번만 설정되어야 합니다.
    if (areAppEventListenersSet) return;

    // Header & User
    document.getElementById('current-user-icon').addEventListener('click', handleUserIconClick);
    document.addEventListener('click', handleDocumentClickForUserPopup);
    document.getElementById('user-popup-list').addEventListener('click', handleUserPopupListClick);
    
    // Main Controls
    document.getElementById('add-project-btn').addEventListener('click', handleAddProjectClick);
    document.getElementById('category-filters').addEventListener('click', handleCategoryFilterClick);
    
    // Project Lists
    document.getElementById('project-list').addEventListener('click', handleProjectItemClick);
    document.getElementById('scheduled-project-list').addEventListener('click', handleProjectItemClick);
    document.getElementById('completed-project-list').addEventListener('click', handleProjectItemClick);
    document.getElementById('project-list').addEventListener('change', handleManualProgressChange);
    document.getElementById('member-project-lists').addEventListener('click', handleProjectItemClick);
    document.getElementById('member-project-lists').addEventListener('change', handleManualProgressChange);

    // Sidebar & Views
    document.getElementById('board-toggle-btn').addEventListener('click', viewHandlers.handleSidebarToggle);
    document.getElementById('sidebar-backdrop').addEventListener('click', viewHandlers.handleSidebarToggle);
    document.getElementById('close-sidebar-btn').addEventListener('click', viewHandlers.handleSidebarToggle);
    document.getElementById('visualization-toggles').addEventListener('click', viewHandlers.handleVisualizationToggle);
    document.getElementById('exclude-di-team-checkbox').addEventListener('change', viewHandlers.handleChartOptionChange);
    document.getElementById('calendar-filters').addEventListener('change', viewHandlers.handleCalendarFilterChange);
    
    // Modals
    setupModalEventListeners();

    areAppEventListenersSet = true;
}

function setupModalEventListeners() {
    // Project Create Modal
    const projectModal = document.getElementById('project-modal');
    document.getElementById('close-modal-btn').addEventListener('click', () => projectModal.close());
    document.getElementById('add-task-field-btn').addEventListener('click', () => ui.addModalTaskField());
    document.getElementById('modal-task-list').addEventListener('click', e => {
        if (e.target.classList.contains('delete-task-btn')) {
            e.target.closest('.task-field').remove();
        }
    });
    document.getElementById('project-form').addEventListener('submit', modalHandlers.handleProjectFormSubmit);
    projectModal.querySelectorAll('input[name="status"]').forEach(radio => {
        radio.addEventListener('change', e => {
            document.getElementById('project-deadline').required = e.target.value === 'active';
        });
    });

    // Details Modal
    const detailsModal = document.getElementById('details-modal');
    detailsModal.addEventListener('close', () => { document.getElementById('period-popover').hidden = true; });
    document.getElementById('close-details-modal-btn').addEventListener('click', () => detailsModal.close());
    document.getElementById('add-detail-task-btn').addEventListener('click', modalHandlers.handleAddTask);
    document.getElementById('details-modal-title').addEventListener('click', modalHandlers.handleTitleClick);
    document.getElementById('title-edit-input').addEventListener('blur', modalHandlers.handleTitleEdit);
    document.getElementById('title-edit-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.blur(); });
    document.getElementById('details-user-select').addEventListener('change', (e) => modalHandlers.handleProjectDetailChange({ user_id: parseInt(e.target.value) }));
    document.getElementById('details-priority-select').addEventListener('change', (e) => modalHandlers.handleProjectDetailChange({ priority: parseInt(e.target.value) }));
    document.getElementById('details-category-select').addEventListener('change', (e) => modalHandlers.handleProjectDetailChange({ category: e.target.value }));
    document.getElementById('period-toggle').addEventListener('click', modalHandlers.handlePeriodToggle);
    document.getElementById('period-close-btn').addEventListener('click', () => document.getElementById('period-popover').hidden = true);
    document.getElementById('clear-deadline-btn').addEventListener('click', modalHandlers.handleClearDeadline);
    const taskList = document.getElementById('details-task-list');
    taskList.addEventListener('click', modalHandlers.handleTaskClick);
    taskList.addEventListener('change', modalHandlers.handleTaskChange);
    taskList.addEventListener('blur', modalHandlers.handleTaskBlur, true);
    document.getElementById('add-comment-btn').addEventListener('click', modalHandlers.handleAddComment);
    document.getElementById('comments-list').addEventListener('click', modalHandlers.handleCommentAction);
    document.getElementById('set-status-active-btn').addEventListener('click', () => modalHandlers.handleSetProjectStatus('active'));
    document.getElementById('set-status-scheduled-btn').addEventListener('click', () => modalHandlers.handleSetProjectStatus('scheduled'));
    document.getElementById('complete-project-btn').addEventListener('click', () => modalHandlers.handleSetProjectStatus('completed'));
    document.getElementById('restore-project-btn').addEventListener('click', () => modalHandlers.handleSetProjectStatus('active'));
    document.getElementById('delete-project-btn').addEventListener('click', modalHandlers.handleDeleteProject);
    document.getElementById('confirm-delete-btn').addEventListener('click', modalHandlers.handleConfirmDeleteProject);

    // Post Modals
    document.getElementById('new-post-btn').addEventListener('click', () => ui.openPostModalForNew());
    document.getElementById('post-list').addEventListener('click', (e) => {
        const postItem = e.target.closest('.post-item');
        if (postItem) {
            ui.openPostViewModal(parseInt(postItem.dataset.postId));
        }
    });
    document.getElementById('post-form').addEventListener('submit', modalHandlers.handlePostFormSubmit);
    document.getElementById('close-post-modal-btn').addEventListener('click', () => document.getElementById('post-modal').close());
    document.getElementById('close-post-view-modal-btn').addEventListener('click', () => document.getElementById('post-view-modal').close());
    document.getElementById('edit-post-btn').addEventListener('click', modalHandlers.handleEditPost);
    document.getElementById('delete-post-btn').addEventListener('click', modalHandlers.handleDeletePost);

    // Schedule Modal
    const scheduleModal = document.getElementById('schedule-modal');
    document.getElementById('close-schedule-modal-btn').addEventListener('click', () => scheduleModal.close());
    document.getElementById('schedule-form').addEventListener('submit', modalHandlers.handleScheduleFormSubmit);

    // Generic close-on-backdrop-click for all modals
    ['login-modal', 'project-modal', 'details-modal', 'post-modal', 'post-view-modal', 'schedule-modal'].forEach(id => {
        const modal = document.getElementById(id);
        if(modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === id) e.target.close();
            });
        }
    });
}

// ===================================================================
// 3. 앱 실행 (App Execution)
// ===================================================================

export async function refreshDataAndRender() {
    try {
        const data = await api.fetchData();
        setAppData(data);
        if (!state.currentUser) {
            const savedUserId = localStorage.getItem('currentSchedulerUser');
            let userToSet = null;
            if (savedUserId && state.appData.users.some(u => u.id == savedUserId)) {
                userToSet = state.appData.users.find(u => u.id == savedUserId);
            } else if (state.appData.users.length > 0) {
                userToSet = state.appData.users[0];
            }
            setCurrentUser(userToSet);
        }
        ui.renderAll();
    } catch (error) {
        console.error('데이터 갱신 실패:', error);
        ui.showToast(error.error || '데이터를 불러오는데 실패했습니다.');
        if (error.status === 401 || (error.error && error.error === "Authentication required")) {
            document.getElementById('login-modal').showModal();
        }
    }
}

export async function initializeAppContent() {
    document.getElementById('loading-overlay')?.classList.remove('hidden');
    await refreshDataAndRender();
    setupEventListeners(); // 메인 UI가 렌더링 된 후 리스너 설정
    document.getElementById('loading-overlay')?.classList.add('hidden');
}

async function checkLoginAndInitialize() {
    // 로그인 모달에 대한 리스너는 항상 먼저 설정
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('set-password-form').addEventListener('submit', handleSetPassword);

    document.getElementById('loading-overlay')?.classList.add('hidden');
    const loginModal = document.getElementById('login-modal');
    
    try {
        const user = await api.checkAuthStatus();
        if (user) {
            setCurrentUser(user);
            await initializeAppContent();
        } else {
            loginModal.showModal();
            loginModal.addEventListener('cancel', (e) => e.preventDefault());
        }
    } catch (error) {
        console.error("Auth check failed", error);
        loginModal.showModal();
        loginModal.addEventListener('cancel', (e) => e.preventDefault());
    }
}

document.addEventListener('DOMContentLoaded', checkLoginAndInitialize);