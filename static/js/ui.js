import { state } from './state.js';

// ===================================================================
// 0. DOM 요소 캐싱 (DOM Element Caching)
// ===================================================================
// 자주 사용하는 DOM 요소를 미리 찾아 변수에 할당합니다.
const projectListEl = document.getElementById('project-list');
const completedProjectListEl = document.getElementById('completed-project-list');
const scheduledProjectListEl = document.getElementById('scheduled-project-list');
const completedProjectsSection = document.getElementById('completed-projects-section');
const scheduledProjectsSection = document.getElementById('scheduled-projects-section');
const activeProjectsSection = document.getElementById('active-projects-section');
const calendarEl = document.getElementById('calendar');
const currentUserIcon = document.getElementById('current-user-icon');
const userPopupList = document.getElementById('user-popup-list');
const detailsModal = document.getElementById('details-modal');
const detailsModalTitle = document.getElementById('details-modal-title');
const detailsPrioritySelect = document.getElementById('details-priority-select');
const detailsCategorySelect = document.getElementById('details-category-select');
const detailsTaskList = document.getElementById('details-task-list');
const projectCalendarEl = document.getElementById('project-calendar');
const commentsList = document.getElementById('comments-list');
const boardToggleBtn = document.getElementById('board-toggle-btn');
const postListEl = document.getElementById('post-list');
const detailsUserSelect = document.getElementById('details-user-select');


// ===================================================================
// 1. 전역 UI 렌더링 (Global UI Rendering)
// ===================================================================
// 이 섹션의 함수들은 여러 컴포넌트를 조합하여 화면 전체를 다시 그립니다.

/**
 * 애플리케이션의 모든 UI 컴포넌트를 현재 상태에 맞게 다시 렌더링합니다.
 */
export function renderAll() {
    renderCurrentUserIcon();
    renderProjects();
    // main.js에서 핸들러를 전달받아 캘린더를 초기화해야 합니다.
    // 이 예시에서는 전역에 핸들러가 있다고 가정합니다.
    initializeCalendar(window.handleDateClick, window.handleEventClick);
    renderSidebar();
    renderCalendarFilters();
    const loadCalculationView = document.getElementById('load-calculation-view');
    if (loadCalculationView && loadCalculationView.classList.contains('active')) {
        renderLoadCalculationView();
    }

    if (state.appData.has_new_posts) {
        boardToggleBtn.classList.add('has-notification');
    } else {
        boardToggleBtn.classList.remove('has-notification');
    }

    if (detailsModal.open) {
        renderDetailsModal();
    }
}


// ===================================================================
// 2. 컴포넌트 렌더링 (Component Rendering)
// ===================================================================
// 이 섹션의 함수들은 특정 UI 영역(예: 헤더, 프로젝트 목록, 모달)을 그리는 역할을 합니다.

/**
 * 헤더의 현재 사용자 아이콘을 렌더링합니다.
 */
export function renderCurrentUserIcon() {
    if (!state.currentUser) {
        currentUserIcon.style.display = 'none';
        return;
    }
    currentUserIcon.style.display = 'flex';
    currentUserIcon.textContent = getShortName(state.currentUser.name);
    currentUserIcon.style.backgroundColor = getUserColor(state.currentUser.id);
}

/**
 * 사용자 목록 팝업을 렌더링합니다.
 */
export function renderUserPopup() {
    userPopupList.innerHTML = '';
    state.appData.users.forEach(user => {
        const li = document.createElement('li');
        li.dataset.userId = user.id;
        const isDITeam = user.name === 'DI 팀';
        const positionText = user.position ? user.position : '직급 없음';

        li.innerHTML = `
            <div class="user-info">
                <div class="small-icon" style="background-color:${getUserColor(user.id)}">${getShortName(user.name)}</div>
                <span>
                    ${user.name}
                    ${!isDITeam ? `<span class="user-position" style="color: #6c757d; font-size: 0.9em; cursor: pointer; margin-left: 5px;">${positionText}</span>` : ''}
                </span>
            </div>
            ${!isDITeam ? `<button class="delete-user-btn" data-user-id="${user.id}">×</button>` : ''}
        `;
        userPopupList.appendChild(li);
    });
}

/**
 * 상태별(진행, 예정, 종료) 프로젝트 목록 전체를 렌더링합니다.
 */
export function renderProjects() {
    projectListEl.innerHTML = '';
    scheduledProjectListEl.innerHTML = '';
    completedProjectListEl.innerHTML = '';

    const filteredProjects = state.appData.projects.filter(p => {
        if (state.currentCategoryFilter === '전체') return true;
        return p.category === state.currentCategoryFilter;
    });
    filteredProjects.sort((a, b) => a.priority - b.priority);

    const activeProjects = filteredProjects.filter(p => p.status === 'active');
    const scheduledProjects = filteredProjects.filter(p => p.status === 'scheduled');
    const completedProjects = filteredProjects.filter(p => p.status === 'completed');

    activeProjects.forEach(p => projectListEl.appendChild(createProjectElement(p)));
    scheduledProjects.forEach(p => scheduledProjectListEl.appendChild(createProjectElement(p)));
    completedProjects.forEach(p => {
        const el = createProjectElement(p);
        el.classList.add('completed');
        completedProjectListEl.appendChild(el);
    });

    activeProjectsSection.style.display = activeProjects.length > 0 ? 'block' : 'none';
    scheduledProjectsSection.style.display = scheduledProjects.length > 0 ? 'block' : 'none';
    completedProjectsSection.style.display = completedProjects.length > 0 ? 'block' : 'none';
}

/**
 * 게시판 사이드바의 게시글 목록을 렌더링합니다.
 */
export function renderSidebar() {
    postListEl.innerHTML = '';
    (state.appData.posts || []).forEach(post => {
        const postEl = document.createElement('div');
        postEl.className = 'post-item';
        postEl.dataset.postId = post.id;
        let preview = post.content.substring(0, 200);
        if (post.content.length > 200) preview += '...';
        postEl.innerHTML = `
            <h3>${post.title}</h3>
            <p class="post-preview">${preview}</p>
            <p>작성자: ${post.author_name} / 최종 수정: ${new Date(post.updated_at).toLocaleDateString()}</p>
        `;
        postListEl.appendChild(postEl);
    });
}

/**
 * 캘린더 하단의 필터 UI를 렌더링합니다.
 */
export function renderCalendarFilters() {
    const filtersEl = document.getElementById('calendar-filters');
    if (!filtersEl) return;

    const userFiltersHTML = state.appData.users
        .filter(u => u.name !== 'DI 팀')
        .map(user => `
            <label>
                <input type="checkbox" class="calendar-filter-user" value="${user.id}" ${state.calendarFilters.selectedUsers.has(user.id) ? 'checked' : ''}>
                <span>${user.name}</span>
            </label>
        `).join('');

    filtersEl.innerHTML = `
        <div class="filter-group">
            <label>
                <input type="checkbox" class="calendar-filter-type" value="di-team" ${state.calendarFilters.showDITeam ? 'checked' : ''}>
                <span><strong>DI팀</strong></span>
            </label>
        </div>
        <div class="filter-group">
            <label>
                <input type="checkbox" class="calendar-filter-type" value="projects" ${state.calendarFilters.showProjects ? 'checked' : ''}>
                <span>프로젝트</span>
            </label>
            <label>
                <input type="checkbox" class="calendar-filter-type" value="tasks" ${state.calendarFilters.showTasks ? 'checked' : ''}>
                <span>세부업무</span>
            </label>
            <label> 
                <input type="checkbox" class="calendar-filter-type" value="schedules" ${state.calendarFilters.showSchedules ? 'checked' : ''}>
                <span>개인일정</span>
            </label>
        </div>
        <div class="filter-group user-filters">
            ${userFiltersHTML}
        </div>
    `;
}

/**
 * 프로젝트 상세 정보 모달의 전체 내용을 렌더링합니다.
 */
export function renderDetailsModal() {
    const project = state.appData.projects.find(p => p.id === state.currentOpenProjectId);
    if (!project) {
        detailsModal.close();
        return;
    }

    // --- 버튼 상태 관리 ---
    const rightButtons = document.querySelector('.footer-buttons-right');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const deleteProjectBtn = document.getElementById('delete-project-btn');
    const completeProjectBtn = document.getElementById('complete-project-btn');
    const restoreProjectBtn = document.getElementById('restore-project-btn');
    const setStatusActiveBtn = document.getElementById('set-status-active-btn');
    const setStatusScheduledBtn = document.getElementById('set-status-scheduled-btn');

    rightButtons.style.display = 'flex';
    confirmDeleteBtn.style.display = 'none';
    deleteProjectBtn.style.display = 'block';

    [completeProjectBtn, restoreProjectBtn, setStatusActiveBtn, setStatusScheduledBtn].forEach(btn => {
        if (btn) btn.style.display = 'none';
    });

    switch (project.status) {
        case 'scheduled': setStatusActiveBtn.style.display = 'block'; break;
        case 'active':
            completeProjectBtn.style.display = 'block';
            setStatusScheduledBtn.style.display = 'block';
            break;
        case 'completed': restoreProjectBtn.style.display = 'block'; break;
    }

    // --- 기본 정보 렌더링 ---
    detailsModalTitle.textContent = project.name;
    detailsPrioritySelect.value = project.priority;
    detailsCategorySelect.value = project.category;
    detailsUserSelect.innerHTML = state.appData.users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    detailsUserSelect.value = project.user_id || '';
    setPeriodLabel(project);

    // --- 세부 업무 리스트 렌더링 ---
    detailsTaskList.innerHTML = '';
    project.tasks.forEach(task => {
        const taskEl = document.createElement('div');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isOverdue = task.deadline && new Date(task.deadline) < today && task.progress < 100;
        taskEl.className = `task-item-popup ${isOverdue ? 'task-item-overdue' : ''}`;
        const deadlineValue = task.deadline ? `value="${formatDateToYYYYMMDD(task.deadline)}"` : '';
        taskEl.innerHTML = `
            <div class="task-item-header">
                <textarea class="task-content-input" data-task-id="${task.id}" rows="1">${task.content}</textarea>
                <button class="delete-task-btn" data-task-id="${task.id}">&times;</button>
            </div>
            <div class="task-item-footer">
                <input type="date" class="deadline-input" ${deadlineValue} data-task-id="${task.id}">
                <div class="task-progress-container">
                    <input type="range" data-task-id="${task.id}" value="${task.progress}" min="0" max="100">
                    <span>${task.progress}%</span>
                </div>
            </div>
        `;
        detailsTaskList.appendChild(taskEl);
        const textarea = taskEl.querySelector('textarea');
        textarea.addEventListener('input', autoResizeTextarea);
        autoResizeTextarea({ target: textarea });
    });

    // --- 코멘트 렌더링 ---
    commentsList.innerHTML = '';
    project.comments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';
        commentEl.dataset.commentId = comment.id;
        commentEl.innerHTML = `
            <div class="comment-text-content">
                <span class="author">${comment.author_name}:</span>
                <span>${comment.content}</span>
            </div>
            <div class="comment-actions">
                <button class="edit-comment-btn">수정</button>
                <button class="delete-comment-btn">삭제</button>
            </div>
        `;
        commentsList.appendChild(commentEl);
    });

    // --- 드래그 정렬 및 미니 캘린더 초기화 ---
    if (state.dom.sortable_tasks) state.dom.sortable_tasks.destroy();
    // onEnd 핸들러는 main.js에서 주입받아야 합니다.
    state.dom.sortable_tasks = new Sortable(detailsTaskList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: window.handleTaskReorder, // main.js에 정의된 핸들러 연결
        filter: 'input[type="range"]',
        preventOnFilter: false
    });

    initializeProjectCalendar(project);
}

// 차트 인스턴스를 저장할 변수 (한 번만 선언)
let loadPieChart = null;
let loadBarChart = null;

/**
 * 시각화 섹션의 '부하 계산' 뷰를 렌더링합니다.
 */
export function renderLoadCalculationView() {
    // 0. 초기화
    const allActiveProjects = state.appData.projects.filter(p => p.status === 'active');
    const memberProjectListsEl = document.getElementById('member-project-lists');
    memberProjectListsEl.innerHTML = '';

    // 1. 'DI 팀 제외' 필터에 따라 차트에 표시할 사용자 목록을 결정합니다.
    let targetUsers = state.appData.users;
    if (state.chartOptions.excludeDITeam) {
        targetUsers = state.appData.users.filter(user => user.name !== 'DI 팀');
    }
    const targetUserIds = new Set(targetUsers.map(u => u.id));

    // 2. 결정된 사용자에 해당하는 프로젝트만 필터링하여 '차트용 프로젝트' 목록을 만듭니다.
    const chartProjects = allActiveProjects.filter(p => targetUserIds.has(p.user_id));

    // 3. 필터링된 '차트용 프로젝트' 개수로 제목을 동적으로 업데이트합니다.
    const pieChartTitle = document.querySelector('#load-pie-chart-container h3');
    if (pieChartTitle) {
        pieChartTitle.textContent = `팀원별 프로젝트 개수 (전체 ${chartProjects.length}개)`;
    }

    // 4. 차트 데이터를 계산합니다.
    const projectCounts = {};
    const progressData = {};

    targetUsers.forEach(user => {
        projectCounts[user.name] = 0;
        progressData[user.name] = { totalProgress: 0, count: 0 };
    });

    chartProjects.forEach(p => {
        const user = state.appData.users.find(u => u.id === p.user_id);
        if (user && projectCounts.hasOwnProperty(user.name)) {
            projectCounts[user.name]++;
            progressData[user.name].totalProgress += p.progress;
            progressData[user.name].count++;
        }
    });

    const userNames = Object.keys(projectCounts);
    const chartColors = userNames.map((name, index) => getUserColor(index + 1));

    // 5. 파이 차트를 렌더링합니다. (데이터 레이블 포함)
    const pieCtx = document.getElementById('load-pie-chart').getContext('2d');
    if (loadPieChart) loadPieChart.destroy();
    loadPieChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: userNames,
            datasets: [{
                label: '프로젝트 개수',
                data: Object.values(projectCounts),
                backgroundColor: chartColors,
            }]
        },
        options: {
            plugins: {
                datalabels: {
                    formatter: (value, ctx) => {
                        const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                        const percentage = total > 0 ? (value / total * 100).toFixed(1) + '%' : '0%';
                        return `${value}개\n(${percentage})`;
                    },
                    color: '#fff',
                    font: { weight: 'bold' }
                }
            }
        }
    });

    // 6. 막대 차트를 렌더링합니다. (데이터 레이블 포함)
    const barCtx = document.getElementById('load-bar-chart').getContext('2d');
    const avgProgress = userNames.map(name => {
        const data = progressData[name];
        return data.count > 0 ? Math.round(data.totalProgress / data.count) : 0;
    });
    if (loadBarChart) loadBarChart.destroy();
    loadBarChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: userNames,
            datasets: [{
                label: '평균 진행도 (%)',
                data: avgProgress,
                backgroundColor: chartColors,
            }]
        },
        options: {
            scales: { y: { beginAtZero: true, max: 100 } },
            plugins: {
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    formatter: (value) => value + '%',
                    color: '#495057'
                }
            }
        }
    });

    // 7. 팀원별 프로젝트 목록을 렌더링합니다. (필터링과 무관하게 전체 사용자를 기준으로 표시)
    state.appData.users.forEach(user => {
        const userProjects = allActiveProjects.filter(p => p.user_id === user.id);
        if (userProjects.length > 0) {
            const userSection = document.createElement('div');
            userSection.innerHTML = `<h3>${user.name} (${userProjects.length}개)</h3>`;
            const listContainer = document.createElement('div');
            listContainer.className = 'project-list';
            userProjects.forEach(p => {
                listContainer.appendChild(createProjectElement(p));
            });
            userSection.appendChild(listContainer);
            memberProjectListsEl.appendChild(userSection);
        }
    });
}


// ===================================================================
// 3. 캘린더 렌더링 (Calendar Rendering)
// ===================================================================
// 이 섹션의 함수들은 FullCalendar 라이브러리와 관련된 모든 로직을 담당합니다.

/**
 * 메인 캘린더를 초기화하고 렌더링합니다.
 * @param {Function} dateClickHandler - 날짜 클릭 시 실행될 콜백 함수
 * @param {Function} eventClickHandler - 이벤트 클릭 시 실행될 콜백 함수
 */
export function initializeCalendar(dateClickHandler, eventClickHandler) {
    const filteredEvents = generateCalendarEvents();
    if (state.dom.calendar) state.dom.calendar.destroy();
    state.dom.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
        events: filteredEvents,
        locale: 'ko',
        height: '70vh',
        dateClick: dateClickHandler,
        eventClick: eventClickHandler
    });
    state.dom.calendar.render();
}

/**
 * 프로젝트 상세 모달 내의 미니 캘린더를 초기화하고 렌더링합니다.
 * @param {object} project - 현재 프로젝트 객체
 */
export function initializeProjectCalendar(project) {
    const events = [];
    project.tasks.forEach(task => {
        const tDate = formatDateToYYYYMMDD(task.deadline);
        if (tDate) {
            events.push({
                title: task.content,
                start: tDate,
                allDay: true,
                backgroundColor: getProjectColor(project.id).main
            });
        }
    });
    if (state.dom.projectCalendar) state.dom.projectCalendar.destroy();
    state.dom.projectCalendar = new FullCalendar.Calendar(projectCalendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev,next', center: 'title', right: 'dayGridMonth' },
        events: events,
        locale: 'ko',
        height: '100%'
    });
    state.dom.projectCalendar.render();
}

/**
 * 상세 모달의 기간 선택 팝업 내 듀얼 캘린더를 렌더링합니다.
 * @param {object} project - 현재 프로젝트 객체
 * @param {Function} onDateChange - 날짜 변경 시 실행될 콜백 함수
 */
export function renderPeriodCalendars(project, onDateChange) {
    const startCalEl = document.getElementById('start-date-calendar');
    const deadlineCalEl = document.getElementById('deadline-calendar');

    if (state.dom.startDateCalendar) state.dom.startDateCalendar.destroy();
    if (state.dom.deadlineCalendar) state.dom.deadlineCalendar.destroy();

    const startInit = toValidDateOrNull(project.start_date) ?? new Date();
    state.dom.startDateCalendar = new FullCalendar.Calendar(startCalEl, {
        initialDate: startInit,
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev', center: 'title', right: 'next' },
        locale: 'ko',
        dayCellDidMount(arg) {
            if (project.start_date && toValidDateOrNull(project.start_date)) {
                if (formatDateToYYYYMMDD(arg.date) === formatDateToYYYYMMDD(project.start_date)) {
                    arg.el.classList.add('selected-date');
                }
            }
        },
        dateClick(arg) { onDateChange('start_date', arg.dateStr); }
    });
    state.dom.startDateCalendar.render();

    const deadlineInit = toValidDateOrNull(project.deadline) ?? toValidDateOrNull(project.start_date) ?? new Date();
    state.dom.deadlineCalendar = new FullCalendar.Calendar(deadlineCalEl, {
        initialDate: deadlineInit,
        initialView: 'dayGridMonth',
        headerToolbar: { left: 'prev', center: 'title', right: 'next' },
        locale: 'ko',
        dayCellDidMount(arg) {
            if (project.deadline && toValidDateOrNull(project.deadline)) {
                if (formatDateToYYYYMMDD(arg.date) === formatDateToYYYYMMDD(project.deadline)) {
                    arg.el.classList.add('selected-date');
                }
            }
        },
        dateClick(arg) { onDateChange('deadline', arg.dateStr); }
    });
    state.dom.deadlineCalendar.render();
}

/**
 * 현재 상태와 필터에 따라 캘린더에 표시될 이벤트 목록을 생성합니다.
 * @returns {Array} FullCalendar 이벤트 객체 배열
 */
function generateCalendarEvents() {
    const events = [];
    const diTeamUser = state.appData.users.find(u => u.name === 'DI 팀');
    const diTeamId = diTeamUser ? diTeamUser.id : -1;

    // 프로젝트 및 세부업무 이벤트 생성
    state.appData.projects.forEach(project => {
        const isDITeamProject = project.user_id === diTeamId;
        const isUserSelected = state.calendarFilters.selectedUsers.has(project.user_id);
        let shouldShowEventBase = isDITeamProject ? state.calendarFilters.showDITeam : isUserSelected;

        if (state.calendarFilters.showProjects && shouldShowEventBase && project.deadline) {
            const assignee = state.appData.users.find(u => u.id === project.user_id);
            events.push({
                title: `[P ${assignee ? assignee.name : ''}] ${project.name}`,
                start: formatDateToYYYYMMDD(project.start_date || project.deadline),
                end: formatDateToYYYYMMDD(project.deadline),
                backgroundColor: getProjectColor(project.id).main,
                borderColor: getProjectColor(project.id).main
            });
        }
        if (state.calendarFilters.showTasks && shouldShowEventBase) {
            project.tasks.forEach(task => {
                if (task.deadline) {
                    events.push({ title: `[업무] ${task.content}`, start: formatDateToYYYYMMDD(task.deadline), allDay: true, backgroundColor: '#4895EF' });
                }
            });
        }
    });

    // 개인 일정 이벤트 생성
    if (state.calendarFilters.showSchedules) {
        (state.appData.schedules || []).forEach(schedule => {
            if (state.calendarFilters.selectedUsers.has(schedule.user_id)) {
                let prefix = `[S ${schedule.user_name}]`;
                if (schedule.schedule_type === 'team') prefix = '[S DI 팀]';
                if (schedule.schedule_type === 'company') prefix = '[S 수산]';

                events.push({
                    id: `schedule-${schedule.id}`,
                    title: `${prefix} ${schedule.content}`,
                    start: formatDateToYYYYMMDD(schedule.schedule_date),
                    allDay: true,
                    backgroundColor: '#495057',
                    borderColor: '#495057',
                    extendedProps: { type: 'schedule', scheduleId: schedule.id }
                });
            }
        });
    }
    return events;
}


// ===================================================================
// 4. UI 헬퍼 함수 (UI Helper Functions)
// ===================================================================
// 이 섹션의 함수들은 다른 UI 함수들을 돕는 작은 유틸리티 함수들입니다.

/**
 * 단일 프로젝트 아이템 DOM 요소를 생성합니다.
 * @param {object} project - 프로젝트 데이터
 * @returns {HTMLElement} 생성된 프로젝트 아이템 div 요소
 */
function createProjectElement(project) {
    const assignee = state.appData.users.find(u => u.id === project.user_id);
    const assigneeText = assignee ? `${assignee.name} ${assignee.position || ''}`.trim() : '미지정';
    const projectEl = document.createElement('div');
    projectEl.className = 'project-item';
    projectEl.dataset.projectId = project.id;

    if (state.currentUser && project.user_id === state.currentUser.id) {
        projectEl.classList.add('is-mine');
    }

    const projectColors = getProjectColor(project.id);
    projectEl.style.backgroundColor = 'var(--color-surface)';
    projectEl.style.borderLeftColor = projectColors.main;

    const dDayData = calculateDday(project.deadline);
    let progressDisplayHTML = (project.tasks.length > 0) ? `
        <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${project.progress}%; background-color: ${projectColors.main};"></div>
        </div>` : `
        <div class="manual-progress-slider-container">
            <input type="range" class="manual-progress-slider" data-project-id="${project.id}" value="${project.progress}" min="0" max="100">
        </div>`;

    projectEl.innerHTML = `
        <div class="priority-indicator" style="background-color: ${project.priority === 1 ? 'var(--priority-high)' : project.priority === 2 ? 'var(--priority-medium)' : 'var(--priority-low)'};"></div>
        <div class="project-details">
            <div class="project-header">
                <span class="project-name">${project.name}</span>
                <span class="project-d-day ${dDayData.isUrgent ? 'd-day-urgent' : ''}">${dDayData.text}</span>
            </div>
            ${progressDisplayHTML}
            <div class="project-footer">
               <p class="project-assignee">담당: ${assigneeText}</p>
               <span class="project-progress-text" style="color: ${projectColors.main};">${project.progress}%</span>
            </div>
        </div>
    `;
    return projectEl;
}

/**
 * 텍스트 영역(textarea)의 높이를 내용에 맞게 자동 조절합니다.
 */
export function autoResizeTextarea(event) {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

/**
 * 화면 우측 하단에 잠시 나타났다 사라지는 알림 메시지(토스트)를 표시합니다.
 * @param {string} message - 표시할 메시지
 */
export function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

/**
 * 프로젝트 상세 모달의 기간 표시 버튼 텍스트를 설정합니다.
 * @param {object} project - 현재 프로젝트 객체
 */
export function setPeriodLabel(project) {
    const btn = document.getElementById('period-toggle');
    if (!btn) return;
    const s = formatDateToMMDD(project.start_date);
    const e = formatDateToMMDD(project.deadline);
    if (!s && !e) { btn.textContent = '기간 선택'; return; }
    if (s && e) { btn.textContent = `${s} ~ ${e}`; return; }
    if (s) { btn.textContent = `${s} ~`; return; }
    btn.textContent = `~ ${e}`;
}

/**
 * 프로젝트의 진행률을 세부 업무들의 평균값으로 업데이트합니다.
 * @param {number} projectId - 프로젝트 ID
 */
export function updateProjectProgress(projectId) {
    const project = state.appData.projects.find(p => p.id === projectId);
    if (!project || project.tasks.length === 0) {
        if (project) project.progress = 0;
        return;
    }
    const totalProgress = project.tasks.reduce((sum, t) => sum + t.progress, 0);
    project.progress = Math.round(totalProgress / project.tasks.length);
}

// --- 포맷팅 및 계산 유틸리티 ---

function getShortName(name) {
    if (name === 'DI 팀') return 'DI';
    if (name && name.length > 1) return name.substring(1).trim().replace(/\s/g, '');
    return name;
}

function getUserColor(userId) {
    const colors = ['#6d6875', '#b5838d', '#e5989b', '#ffb4a2', '#ffcdb2'];
    return colors[((userId || 0) - 1 + colors.length) % colors.length];
}

function getProjectColor(projectId) {
    const colors = [{ main: '#20c997', background: '#e9fbf5' }, { main: '#fd7e14', background: '#fff4e7' }, { main: '#6610f2', background: '#f0e7fd' }, { main: '#0d6efd', background: '#e7f0ff' }, { main: '#d63384', background: '#faeaf1' }, { main: '#198754', background: '#e8f3ee' }];
    return colors[((projectId || 0) - 1 + colors.length) % colors.length];
}

function calculateDday(deadline) {
    if (!deadline) return { text: '미정', isUrgent: false };
    const today = new Date();
    const deadlineDate = new Date(deadline);
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { text: 'D-Day', isUrgent: true };
    if (diffDays < 0) return { text: `D+${Math.abs(diffDays)}`, isUrgent: false };
    return { text: `D-${diffDays}`, isUrgent: diffDays <= 7 };
}

function formatDateToMMDD(input) {
    const d = toValidDateOrNull(input);
    if (!d) return '';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${mm}-${dd}`;
}

function formatDateToYYYYMMDD(input) {
    if (!input) return '';
    const d = (input instanceof Date) ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function toValidDateOrNull(input) {
    if (!input) return null;
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
}