import { state, setCurrentUser, setAppData } from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';
Chart.register(ChartDataLabels);

// ===================================================================
// 1. 앱 초기화 (Initialization)
// ===================================================================

document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * 애플리케이션을 시작하는 메인 함수입니다.
 */
async function initializeApp() {
    setupEventListeners();
    await refreshDataAndRender();
    document.getElementById('loading-overlay')?.classList.add('hidden');
}

/**
 * 서버로부터 최신 데이터를 받아와 상태를 업데이트하고 화면 전체를 다시 렌더링합니다.
 */
async function refreshDataAndRender() {
    try {
        const data = await api.fetchData();
        setAppData(data);

        const savedUserId = localStorage.getItem('currentSchedulerUser');
        let userToSet = null;

        if (savedUserId && state.appData.users.some(u => u.id == savedUserId)) {
            userToSet = state.appData.users.find(u => u.id == savedUserId);
        } else if (state.appData.users.length > 0) {
            userToSet = state.appData.users[0];
        }
        setCurrentUser(userToSet);

        ui.renderAll();
    } catch (error) {
        console.error('데이터 갱신 실패:', error);
        ui.showToast('데이터를 불러오는데 실패했습니다.');
    }
}

// ===================================================================
// 2. 이벤트 리스너 설정 (Event Listener Setup)
// ===================================================================

/**
 * 모든 DOM 요소에 이벤트 리스너를 연결합니다.
 */
function setupEventListeners() {
    // --- 헤더: 사용자 관리 ---
    document.getElementById('current-user-icon').addEventListener('click', handleUserIconClick);
    document.addEventListener('click', handleDocumentClickForUserPopup);
    document.getElementById('user-popup-list').addEventListener('click', handleUserPopupListClick);
    document.getElementById('add-user-btn').addEventListener('click', handleUserAdd);

    // --- 헤더: 게시판 ---
    document.getElementById('board-toggle-btn').addEventListener('click', handleSidebarToggle);
    document.getElementById('sidebar-backdrop').addEventListener('click', handleSidebarToggle);
    document.getElementById('close-sidebar-btn').addEventListener('click', handleSidebarToggle);

    // --- 컨트롤: 프로젝트 생성 및 필터링 ---
    document.getElementById('add-project-btn').addEventListener('click', handleAddProjectClick);
    document.getElementById('category-filters').addEventListener('click', handleCategoryFilterClick);

    // --- 메인: 프로젝트 목록 ---
    document.getElementById('project-list').addEventListener('click', handleProjectItemClick);
    document.getElementById('scheduled-project-list').addEventListener('click', handleProjectItemClick);
    document.getElementById('completed-project-list').addEventListener('click', handleProjectItemClick);
    document.getElementById('project-list').addEventListener('change', handleManualProgressChange);

    // --- 메인: 캘린더 필터 ---
    document.getElementById('calendar-filters').addEventListener('change', handleCalendarFilterChange);

    // --- 시각화 섹션 토글 버튼 ---
    document.getElementById('visualization-toggles').addEventListener('click', handleVisualizationToggle);
    document.getElementById('exclude-di-team-checkbox').addEventListener('change', handleChartOptionChange);


    // 시각화 뷰의 팀원별 프로젝트 리스트에도 동일한 이벤트 핸들러를 연결합니다.
    document.getElementById('member-project-lists').addEventListener('click', handleProjectItemClick);
    document.getElementById('member-project-lists').addEventListener('change', handleManualProgressChange);



    // --- 모달: 프로젝트 생성 ---
    setupProjectModalEventListeners();

    // --- 모달: 프로젝트 상세 ---
    setupDetailsModalEventListeners();

    // --- 모달: 게시판 (작성/수정, 보기) ---
    setupPostModalEventListeners();

    // --- 모달: 개인 일정 ---
    setupScheduleModalEventListeners();



    // --- 공통: 모달 외부 클릭 시 닫기 ---
    ['project-modal', 'details-modal', 'post-modal', 'post-view-modal', 'schedule-modal'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            if (e.target.id === id) e.target.close();
        });
    });
}

// ===================================================================
// 3. 이벤트 핸들러: 헤더 및 컨트롤 (Header & Controls)
// ===================================================================

function handleUserIconClick(e) {
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

function handleDocumentClickForUserPopup(e) {
    const userPopup = document.getElementById('user-popup');
    const userIcon = document.getElementById('current-user-icon');
    if (!userPopup.contains(e.target) && !userIcon.contains(e.target)) {
        userPopup.style.display = 'none';
    }
}

async function handleUserPopupListClick(e) {
    const userId = e.target.closest('li')?.dataset.userId;
    if (!userId) return;

    if (e.target.classList.contains('delete-user-btn')) {
        if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) return;
        try {
            await api.deleteUser(userId);
            ui.showToast('사용자가 삭제되었습니다.');
            await refreshDataAndRender();
        } catch (error) {
            ui.showToast('사용자 삭제에 실패했습니다.');
        }
    } else if (e.target.classList.contains('user-position')) {
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
        // 데이터 정합성을 위해 전체 데이터를 다시 로드합니다.
        await refreshDataAndRender();
    } catch (error) {
        ui.showToast('직급 수정에 실패했습니다.');
    }
}

function handleUserSwitch(userId) {
    const userToSet = state.appData.users.find(u => u.id == userId);
    setCurrentUser(userToSet);
    ui.renderCurrentUserIcon();
    ui.renderProjects();
    document.getElementById('user-popup').style.display = 'none';
}

async function handleUserAdd() {
    const name = prompt("새 팀원의 이름을 입력하세요:");
    if (!name?.trim()) return;
    const position = prompt("새 팀원의 직급을 입력하세요 (선택사항):");

    try {
        const newUser = await api.addUser(name.trim(), position?.trim() || null);
        state.appData.users.push(newUser);
        state.calendarFilters.selectedUsers.add(newUser.id);
        ui.renderUserPopup();
        ui.renderCalendarFilters();
        ui.initializeCalendar(handleDateClick, handleEventClick);
    } catch (error) {
        ui.showToast('사용자 추가에 실패했습니다.');
    }
}

function handleSidebarToggle() {
    const sidebar = document.getElementById('board-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const isOpen = sidebar.classList.contains('open');
    if (!isOpen && document.getElementById('board-toggle-btn').classList.contains('has-notification')) {
        api.markPostsAsRead();
        state.appData.has_new_posts = false;
    }
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('visible');
}

function handleAddProjectClick() {
    const modal = document.getElementById('project-modal');
    const form = document.getElementById('project-form');
    form.reset();
    document.getElementById('project-start-date').valueAsDate = new Date();
    const userSelect = document.getElementById('project-user-select');
    userSelect.innerHTML = state.appData.users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    if (state.currentUser) userSelect.value = state.currentUser.id;
    document.getElementById('modal-task-list').innerHTML = '';
    // addModalTaskField(); // ui.js 로 옮기거나 여기서 DOM 생성
    document.getElementById('project-deadline').required = false;
    modal.showModal();
}

function handleCategoryFilterClick(e) {
    if (e.target.tagName !== 'BUTTON') return;
    state.currentCategoryFilter = e.target.dataset.category;
    document.querySelectorAll('#category-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    ui.renderProjects();
}

// ===================================================================
// 4. 이벤트 핸들러: 메인 콘텐츠 (Main Content)
// ===================================================================

function handleProjectItemClick(e) {
    if (e.target.classList.contains('manual-progress-slider')) return;
    const projectItem = e.target.closest('.project-item');
    if (projectItem) {
        state.currentOpenProjectId = parseInt(projectItem.dataset.projectId);
        ui.renderDetailsModal();
        document.getElementById('details-modal').showModal();
        // 모달이 완전히 표시된 후 캘린더 렌더링 및 텍스트 영역 크기 조절
        setTimeout(() => {
            const project = state.appData.projects.find(p => p.id === state.currentOpenProjectId);
            if (project) ui.initializeProjectCalendar(project);
            document.querySelectorAll('#details-task-list .task-content-input').forEach(textarea => ui.autoResizeTextarea({ target: textarea }));
        }, 0);
    }
}

async function handleManualProgressChange(e) {
    if (!e.target.classList.contains('manual-progress-slider')) return;
    const projectId = e.target.dataset.projectId;
    const value = parseInt(e.target.value);

    const project = state.appData.projects.find(p => p.id == projectId);
    if (!project) return;

    const originalProgress = project.progress;
    project.progress = value; // 낙관적 업데이트
    ui.renderProjects(); // UI 즉시 반영

    try {
        await api.updateProject(projectId, { progress: value });
    } catch (error) {
        ui.showToast("진행도 업데이트 실패");
        project.progress = originalProgress; // 롤백
        ui.renderProjects();
    }
}

function handleCalendarFilterChange(e) {
    if (e.target.type !== 'checkbox') return;
    const filters = state.calendarFilters;
    const value = e.target.value;

    if (e.target.classList.contains('calendar-filter-type')) {
        if (value === 'di-team') filters.showDITeam = e.target.checked;
        if (value === 'projects') filters.showProjects = e.target.checked;
        if (value === 'tasks') filters.showTasks = e.target.checked;
        if (value === 'schedules') filters.showSchedules = e.target.checked;
    }

    if (e.target.classList.contains('calendar-filter-user')) {
        const userId = parseInt(value);
        if (e.target.checked) filters.selectedUsers.add(userId);
        else filters.selectedUsers.delete(userId);
    }

    ui.initializeCalendar(handleDateClick, handleEventClick);
}

function handleDateClick(arg) {
    state.newScheduleDate = arg.dateStr;
    document.getElementById('schedule-form').reset();
    document.getElementById('schedule-modal').showModal();
}

async function handleEventClick(arg) {
    const props = arg.event.extendedProps;
    if (props && props.type === 'schedule') {
        if (confirm(`'${arg.event.title}' 일정을 삭제하시겠습니까?`)) {
            try {
                await api.deleteSchedule(props.scheduleId);
                state.appData.schedules = state.appData.schedules.filter(s => s.id !== props.scheduleId);
                ui.initializeCalendar(handleDateClick, handleEventClick);
                ui.showToast('일정이 삭제되었습니다.');
            } catch (error) {
                ui.showToast('일정 삭제에 실패했습니다.');
            }
        }
    }
}

function handleVisualizationToggle(e) {
    if (e.target.tagName !== 'BUTTON') return;

    const viewName = e.target.dataset.view;

    // 모든 버튼과 뷰에서 active 클래스 제거
    document.querySelectorAll('#visualization-toggles .filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.visualization-view').forEach(view => view.classList.remove('active'));

    // 클릭된 버튼과 해당 뷰에 active 클래스 추가
    e.target.classList.add('active');
    document.getElementById(`${viewName}-view`).classList.add('active');

    // 만약 캘린더 뷰가 활성화되면, 캘린더를 다시 그려줌 (리사이즈 등 이슈 방지)
    if (viewName === 'calendar') {
        ui.initializeCalendar(handleDateClick, handleEventClick);
    } else if (viewName === 'load-calculation') {
        ui.renderLoadCalculationView();
    }
}

function handleChartOptionChange(e) {
    const isChecked = e.target.checked;
    // state.js에 저장된 상태 값을 업데이트합니다.
    state.chartOptions.excludeDITeam = isChecked;

    // 변경된 상태를 반영하여 차트 뷰를 즉시 다시 렌더링합니다.
    ui.renderLoadCalculationView();
}


// ===================================================================
// 5. 이벤트 핸들러: 모달 (Modals)
// ===================================================================

function setupProjectModalEventListeners() {
    const modal = document.getElementById('project-modal');
    document.getElementById('close-modal-btn').addEventListener('click', () => modal.close());
    // document.getElementById('add-task-field-btn').addEventListener('click', ui.addModalTaskField);
    document.getElementById('modal-task-list').addEventListener('click', e => {
        if (e.target.classList.contains('delete-task-btn')) e.target.parentElement.remove();
    });
    document.getElementById('project-form').addEventListener('submit', handleProjectFormSubmit);
    modal.querySelectorAll('input[name="status"]').forEach(radio => {
        radio.addEventListener('change', e => {
            document.getElementById('project-deadline').required = e.target.value === 'active';
        });
    });
}

async function handleProjectFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const tasks = Array.from(document.querySelectorAll('#modal-task-list > div')).map(field => {
        return {
            content: field.querySelector('.task-content-input').value.trim(),
            deadline: field.querySelector('.modal-task-deadline').value || null
        };
    }).filter(t => t.content);

    const newProjectData = {
        name: document.getElementById('project-name-input').value,
        user_id: parseInt(document.getElementById('project-user-select').value),
        priority: parseInt(document.getElementById('project-priority-select').value),
        status: form.querySelector('input[name="status"]:checked').value,
        category: document.getElementById('project-category-select').value,
        start_date: document.getElementById('project-start-date').value,
        deadline: document.getElementById('project-deadline').value || null,
        tasks
    };

    submitBtn.disabled = true;
    submitBtn.textContent = '생성 중...';
    try {
        const newProject = await api.createProject(newProjectData);
        state.appData.projects.push(newProject);
        ui.renderAll();
        document.getElementById('project-modal').close();
    } catch (error) {
        ui.showToast('프로젝트 생성에 실패했습니다.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '생성';
    }
}

function setupDetailsModalEventListeners() {
    // 여기에 기존 setupEventListeners 함수의 "상세 모달 이벤트" 부분을 옮겨와
    // 위와 같은 패턴으로 핸들러 함수를 분리하고 연결합니다.
    // 예: document.getElementById('close-details-modal-btn').addEventListener('click', () => {...});
}

function setupPostModalEventListeners() {
    // 여기에 기존 setupEventListeners 함수의 "게시판" 관련 부분을 옮겨와
    // 핸들러 함수를 분리하고 연결합니다.
}

function setupScheduleModalEventListeners() {
    const modal = document.getElementById('schedule-modal');
    document.getElementById('close-schedule-modal-btn').addEventListener('click', () => modal.close());
    document.getElementById('schedule-form').addEventListener('submit', handleScheduleFormSubmit);
}

async function handleScheduleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    const scheduleData = {
        user_id: state.currentUser.id,
        content: document.getElementById('schedule-content-input').value.trim(),
        schedule_date: state.newScheduleDate,
        schedule_type: document.getElementById('schedule-type-select').value
    };

    if (!scheduleData.content || !scheduleData.schedule_date) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '저장 중...';
    try {
        const newSchedule = await api.createSchedule(scheduleData);
        state.appData.schedules.push(newSchedule);
        ui.initializeCalendar(handleDateClick, handleEventClick);
        ui.showToast('새로운 일정이 추가되었습니다.');
        form.parentElement.close();
    } catch (error) {
        ui.showToast('일정 추가에 실패했습니다.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '저장';
    }
}