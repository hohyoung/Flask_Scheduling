import { state, setCurrentUser, setAppData } from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';

Chart.register(ChartDataLabels);

// ===================================================================
// 1. 이벤트 핸들러 함수 정의 (Event Handlers)
// ===================================================================

// --- 핸들러: 헤더 및 컨트롤 ---

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

// --- 핸들러: 메인 콘텐츠 ---

function handleProjectItemClick(e) {
    if (e.target.classList.contains('manual-progress-slider')) return;
    const projectItem = e.target.closest('.project-item');
    if (projectItem) {
        state.currentOpenProjectId = parseInt(projectItem.dataset.projectId);
        ui.renderDetailsModal();
        document.getElementById('details-modal').showModal();
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
    project.progress = value;
    ui.renderProjects();
    try {
        await api.updateProject(projectId, { progress: value });
    } catch (error) {
        ui.showToast("진행도 업데이트 실패");
        project.progress = originalProgress;
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
window.handleDateClick = handleDateClick; // 캘린더 콜백용으로 전역 스코프에 할당

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
window.handleEventClick = handleEventClick; // 캘린더 콜백용으로 전역 스코프에 할당

function handleVisualizationToggle(e) {
    if (e.target.tagName !== 'BUTTON') return;
    const viewName = e.target.dataset.view;
    document.querySelectorAll('#visualization-toggles .filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.visualization-view').forEach(view => view.classList.remove('active'));
    e.target.classList.add('active');
    document.getElementById(`${viewName}-view`).classList.add('active');
    if (viewName === 'calendar') {
        ui.initializeCalendar(handleDateClick, handleEventClick);
    } else if (viewName === 'load-calculation') {
        ui.renderLoadCalculationView();
    }
}

function handleChartOptionChange(e) {
    const isChecked = e.target.checked;
    state.chartOptions.excludeDITeam = isChecked;
    ui.renderLoadCalculationView();
}

// --- 핸들러: 모달 ---

async function handleProjectFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const tasks = Array.from(document.querySelectorAll('#modal-task-list .task-field')).map(field => {
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

async function handleAddTask() {
    if (!state.currentOpenProjectId) return;
    try {
        const newTask = await api.addTask(state.currentOpenProjectId);
        const project = state.appData.projects.find(p => p.id === state.currentOpenProjectId);
        if (project) {
            project.tasks.push(newTask);
            ui.renderDetailsModal();
        }
    } catch (error) {
        ui.showToast('업무 추가에 실패했습니다.');
    }
}

async function handleSetProjectStatus(status) {
    if (!state.currentOpenProjectId) return;
    try {
        await api.setProjectStatus(state.currentOpenProjectId, status);
        await refreshDataAndRender();
        document.getElementById('details-modal').close();
        ui.showToast(`프로젝트가 '${status}' 상태로 변경되었습니다.`);
    } catch (error) {
        ui.showToast('상태 변경에 실패했습니다.');
    }
}

async function handleProjectDetailChange(dataToUpdate) {
    if (!state.currentOpenProjectId) return null;
    try {
        const updatedProject = await api.updateProject(state.currentOpenProjectId, dataToUpdate);
        const projectIndex = state.appData.projects.findIndex(p => p.id === state.currentOpenProjectId);
        if (projectIndex !== -1) {
            state.appData.projects[projectIndex] = updatedProject;
        }
        ui.renderAll();
        return updatedProject;
    } catch (error) {
        ui.showToast('정보 업데이트에 실패했습니다.');
        return null;
    }
}

function handleTitleClick(e) {
    const titleEl = e.target;
    const inputEl = document.getElementById('title-edit-input');
    inputEl.value = titleEl.textContent;
    titleEl.style.display = 'none';
    inputEl.style.display = 'block';
    inputEl.focus();
}

async function handleTitleEdit(e) {
    const inputEl = e.target;
    const titleEl = document.getElementById('details-modal-title');
    const newName = inputEl.value.trim();
    const originalName = titleEl.textContent;
    if (newName && newName !== originalName) {
        await handleProjectDetailChange({ name: newName });
    }
    inputEl.style.display = 'none';
    titleEl.style.display = 'block';
}

function handlePeriodToggle() {
    const popover = document.getElementById('period-popover');
    popover.hidden = !popover.hidden;
    if (!popover.hidden) {
        const project = state.appData.projects.find(p => p.id === state.currentOpenProjectId);
        if (project) {
            ui.renderPeriodCalendars(project, (key, value) => {
                handleProjectDetailChange({ [key]: value }).then(updatedProject => {
                    if (updatedProject) {
                        const newProject = state.appData.projects.find(p => p.id === state.currentOpenProjectId);
                        ui.renderPeriodCalendars(newProject, () => { });
                    }
                });
            });
        }
    }
}

async function handleClearDeadline() {
    await handleProjectDetailChange({ deadline: null });
    document.getElementById('period-popover').hidden = true;
}

async function handleTaskClick(e) {
    if (e.target.classList.contains('delete-task-btn')) {
        const taskId = parseInt(e.target.dataset.taskId);
        if (confirm('이 업무를 삭제하시겠습니까?')) {
            try {
                await api.deleteTask(taskId);
                const project = state.appData.projects.find(p => p.id === state.currentOpenProjectId);
                if (project) {
                    project.tasks = project.tasks.filter(t => t.id !== taskId);
                    ui.updateProjectProgress(project.id);
                    ui.renderDetailsModal();
                    ui.renderProjects();
                }
            } catch (error) {
                ui.showToast('업무 삭제 실패');
            }
        }
    }
}

function handleTaskChange(e) {
    const taskId = parseInt(e.target.dataset.taskId);
    if (!taskId) return;
    if (e.target.classList.contains('deadline-input')) {
        api.updateTask(taskId, { deadline: e.target.value }).catch(() => ui.showToast('마감일 업데이트 실패'));
    } else if (e.target.type === 'range') {
        const progress = parseInt(e.target.value);
        e.target.nextElementSibling.textContent = `${progress}%`;
        const project = state.appData.projects.find(p => p.id === state.currentOpenProjectId);
        const task = project?.tasks.find(t => t.id === taskId);
        if (task) task.progress = progress;
        api.updateTask(taskId, { progress: progress }).then(() => {
            ui.updateProjectProgress(project.id);
            ui.renderProjects();
        }).catch(() => ui.showToast('진행도 업데이트 실패'));
    }
}

function handleTaskBlur(e) {
    if (e.target.classList.contains('task-content-input')) {
        const taskId = parseInt(e.target.dataset.taskId);
        const newContent = e.target.value.trim();
        const project = state.appData.projects.find(p => p.id === state.currentOpenProjectId);
        const task = project?.tasks.find(t => t.id === taskId);
        if (task && newContent !== task.content) {
            task.content = newContent;
            api.updateTask(taskId, { content: newContent }).catch(() => ui.showToast('업무 내용 업데이트 실패'));
        }
    }
}
window.handleTaskReorder = function (evt) { // Sortable.js 콜백용으로 전역 스코프에 할당
    const taskIds = Array.from(evt.target.children).map(el => {
        const input = el.querySelector('.task-content-input');
        return input ? parseInt(input.dataset.taskId) : null;
    }).filter(id => id !== null);
    api.reorderTasks(taskIds).catch(() => ui.showToast('순서 변경 실패'));
};

async function handleAddComment() {
    const input = document.getElementById('comment-input');
    const content = input.value.trim();
    if (!content || !state.currentOpenProjectId || !state.currentUser) return;
    try {
        const newComment = await api.addComment(state.currentOpenProjectId, { author_name: state.currentUser.name, content });
        const project = state.appData.projects.find(p => p.id === state.currentOpenProjectId);
        if (project) {
            project.comments.push(newComment);
            ui.renderDetailsModal();
            input.value = '';
        }
    } catch (error) {
        ui.showToast('코멘트 추가 실패');
    }
}

async function handleCommentAction(e) {
    const commentItem = e.target.closest('.comment-item');
    if (!commentItem) return;
    const commentId = parseInt(commentItem.dataset.commentId);
    const project = state.appData.projects.find(p => p.id === state.currentOpenProjectId);
    if (e.target.classList.contains('delete-comment-btn')) {
        if (confirm('코멘트를 삭제하시겠습니까?')) {
            await api.deleteComment(commentId);
            project.comments = project.comments.filter(c => c.id !== commentId);
            ui.renderDetailsModal();
        }
    } else if (e.target.classList.contains('edit-comment-btn')) {
        const comment = project?.comments.find(c => c.id === commentId);
        const newContent = prompt('코멘트 수정:', comment.content);
        if (newContent && newContent.trim() !== comment.content) {
            await api.updateComment(commentId, { content: newContent.trim() });
            comment.content = newContent.trim();
            ui.renderDetailsModal();
        }
    }
}

function handleDeleteProject() {
    document.querySelector('.footer-buttons-right').style.display = 'none';
    document.getElementById('confirm-delete-btn').style.display = 'block';
}

async function handleConfirmDeleteProject() {
    if (!state.currentOpenProjectId) return;
    try {
        await api.deleteProject(state.currentOpenProjectId);
        await refreshDataAndRender();
        document.getElementById('details-modal').close();
        ui.showToast('프로젝트가 삭제되었습니다.');
    } catch (error) {
        ui.showToast('프로젝트 삭제에 실패했습니다.');
    }
}

async function handlePostFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '저장 중...';

    const postId = document.getElementById('post-id-input').value;
    const postData = {
        title: document.getElementById('post-title-input').value,
        content: document.getElementById('post-content-textarea').value,
        user_id: state.currentUser.id
    };

    try {
        if (postId) {
            // 수정
            const updatedPost = await api.updatePost(postId, postData);
            const index = state.appData.posts.findIndex(p => p.id == postId);
            if (index !== -1) state.appData.posts[index] = updatedPost;
        } else {
            // 생성
            const newPost = await api.createPost(postData);
            state.appData.posts.unshift(newPost);
        }
        ui.renderSidebar();
        document.getElementById('post-modal').close();
    } catch (error) {
        ui.showToast('게시글 저장에 실패했습니다.');
    } finally {
        // 요청이 성공하든 실패하든 항상 버튼을 원래 상태로 복구합니다.
        submitBtn.disabled = false;
        submitBtn.textContent = '저장';
    }
}

function handleEditPost() {
    const post = state.appData.posts.find(p => p.id === state.currentOpenPostId);
    if (post) {
        document.getElementById('post-view-modal').close();
        ui.openPostModalForEdit(post);
    }
}

async function handleDeletePost() {
    const postId = state.currentOpenPostId;
    if (postId && confirm('게시글을 삭제하시겠습니까?')) {
        try {
            await api.deletePost(postId);
            state.appData.posts = state.appData.posts.filter(p => p.id !== postId);
            ui.renderSidebar();
            document.getElementById('post-view-modal').close();
            ui.showToast('게시글이 삭제되었습니다.');
        } catch (error) {
            ui.showToast('게시글 삭제에 실패했습니다.');
        }
    }
}

// ===================================================================
// 2. 이벤트 리스너 설정 (Event Listener Setup)
// ===================================================================

function setupEventListeners() {
    document.getElementById('current-user-icon').addEventListener('click', handleUserIconClick);
    document.addEventListener('click', handleDocumentClickForUserPopup);
    document.getElementById('user-popup-list').addEventListener('click', handleUserPopupListClick);
    document.getElementById('add-user-btn').addEventListener('click', handleUserAdd);
    document.getElementById('board-toggle-btn').addEventListener('click', handleSidebarToggle);
    document.getElementById('sidebar-backdrop').addEventListener('click', handleSidebarToggle);
    document.getElementById('close-sidebar-btn').addEventListener('click', handleSidebarToggle);
    document.getElementById('add-project-btn').addEventListener('click', handleAddProjectClick);
    document.getElementById('category-filters').addEventListener('click', handleCategoryFilterClick);
    document.getElementById('project-list').addEventListener('click', handleProjectItemClick);
    document.getElementById('scheduled-project-list').addEventListener('click', handleProjectItemClick);
    document.getElementById('completed-project-list').addEventListener('click', handleProjectItemClick);
    document.getElementById('project-list').addEventListener('change', handleManualProgressChange);
    document.getElementById('member-project-lists').addEventListener('click', handleProjectItemClick);
    document.getElementById('member-project-lists').addEventListener('change', handleManualProgressChange);
    document.getElementById('visualization-toggles').addEventListener('click', handleVisualizationToggle);
    document.getElementById('exclude-di-team-checkbox').addEventListener('change', handleChartOptionChange);
    document.getElementById('calendar-filters').addEventListener('change', handleCalendarFilterChange);
    setupProjectModalEventListeners();
    setupDetailsModalEventListeners();
    setupPostModalEventListeners();
    setupScheduleModalEventListeners();
    ['project-modal', 'details-modal', 'post-modal', 'post-view-modal', 'schedule-modal'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', (e) => {
            if (e.target.id === id) e.target.close();
        });
    });
}

function setupProjectModalEventListeners() {
    const modal = document.getElementById('project-modal');
    document.getElementById('close-modal-btn').addEventListener('click', () => modal.close());
    document.getElementById('add-task-field-btn').addEventListener('click', () => ui.addModalTaskField());
    document.getElementById('modal-task-list').addEventListener('click', e => {
        if (e.target.classList.contains('delete-task-btn')) {
            e.target.closest('.task-field').remove();
        }
    });
    document.getElementById('project-form').addEventListener('submit', handleProjectFormSubmit);
    modal.querySelectorAll('input[name="status"]').forEach(radio => {
        radio.addEventListener('change', e => {
            document.getElementById('project-deadline').required = e.target.value === 'active';
        });
    });
}

function setupDetailsModalEventListeners() {
    const modal = document.getElementById('details-modal');
    modal.addEventListener('close', () => {
        document.getElementById('period-popover').hidden = true;
    });
    document.getElementById('close-details-modal-btn').addEventListener('click', () => modal.close());
    document.getElementById('add-detail-task-btn').addEventListener('click', handleAddTask);
    document.getElementById('details-modal-title').addEventListener('click', handleTitleClick);
    document.getElementById('title-edit-input').addEventListener('blur', handleTitleEdit);
    document.getElementById('title-edit-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') e.target.blur();
    });
    document.getElementById('details-user-select').addEventListener('change', (e) => handleProjectDetailChange({ user_id: parseInt(e.target.value) }));
    document.getElementById('details-priority-select').addEventListener('change', (e) => handleProjectDetailChange({ priority: parseInt(e.target.value) }));
    document.getElementById('details-category-select').addEventListener('change', (e) => handleProjectDetailChange({ category: e.target.value }));
    document.getElementById('period-toggle').addEventListener('click', handlePeriodToggle);
    document.getElementById('period-close-btn').addEventListener('click', () => document.getElementById('period-popover').hidden = true);
    document.getElementById('clear-deadline-btn').addEventListener('click', handleClearDeadline);
    const taskList = document.getElementById('details-task-list');
    taskList.addEventListener('click', handleTaskClick);
    taskList.addEventListener('change', handleTaskChange);
    taskList.addEventListener('blur', handleTaskBlur, true);
    document.getElementById('add-comment-btn').addEventListener('click', handleAddComment);
    document.getElementById('comments-list').addEventListener('click', handleCommentAction);
    document.getElementById('set-status-active-btn').addEventListener('click', () => handleSetProjectStatus('active'));
    document.getElementById('set-status-scheduled-btn').addEventListener('click', () => handleSetProjectStatus('scheduled'));
    document.getElementById('complete-project-btn').addEventListener('click', () => handleSetProjectStatus('completed'));
    document.getElementById('restore-project-btn').addEventListener('click', () => handleSetProjectStatus('active'));
    document.getElementById('delete-project-btn').addEventListener('click', handleDeleteProject);
    document.getElementById('confirm-delete-btn').addEventListener('click', handleConfirmDeleteProject);
}

function setupPostModalEventListeners() {
    document.getElementById('new-post-btn').addEventListener('click', () => ui.openPostModalForNew());
    document.getElementById('post-list').addEventListener('click', (e) => {
        const postItem = e.target.closest('.post-item');
        if (postItem) {
            ui.openPostViewModal(parseInt(postItem.dataset.postId));
        }
    });
    document.getElementById('post-form').addEventListener('submit', handlePostFormSubmit);
    document.getElementById('close-post-modal-btn').addEventListener('click', () => document.getElementById('post-modal').close());
    document.getElementById('close-post-view-modal-btn').addEventListener('click', () => document.getElementById('post-view-modal').close());
    document.getElementById('edit-post-btn').addEventListener('click', handleEditPost);
    document.getElementById('delete-post-btn').addEventListener('click', handleDeletePost);
}

function setupScheduleModalEventListeners() {
    const modal = document.getElementById('schedule-modal');
    document.getElementById('close-schedule-modal-btn').addEventListener('click', () => modal.close());
    document.getElementById('schedule-form').addEventListener('submit', handleScheduleFormSubmit);
}

// ===================================================================
// 3. 앱 실행 (App Execution)
// ===================================================================

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

async function initializeApp() {
    setupEventListeners();
    await refreshDataAndRender();
    document.getElementById('loading-overlay')?.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', initializeApp);