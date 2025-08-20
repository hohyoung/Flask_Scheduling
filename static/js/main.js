document.addEventListener('DOMContentLoaded', () => {

    // --- 1. 전역 변수 및 DOM 요소 ---
    let appData = { users: [], projects: [], posts: [] };
    let currentUser = null;
    let calendar = null;
    let projectCalendar = null;
    let currentOpenProjectId = null;
    let currentOpenPostId = null;
    let currentCategoryFilter = '전체';
    let sortable_tasks = null;

    const projectListEl = document.getElementById('project-list');
    const completedProjectListEl = document.getElementById('completed-project-list');
    const scheduledProjectListEl = document.getElementById('scheduled-project-list');
    const completedProjectsSection = document.getElementById('completed-projects-section');
    const scheduledProjectsSection = document.getElementById('scheduled-projects-section');
    const activeProjectsSection = document.getElementById('active-projects-section');
    const calendarEl = document.getElementById('calendar');
    const currentUserIcon = document.getElementById('current-user-icon');
    const userPopup = document.getElementById('user-popup');
    const userPopupList = document.getElementById('user-popup-list');
    const newUserNameInput = document.getElementById('new-user-name');
    const addUserBtn = document.getElementById('add-user-btn');
    const addProjectBtn = document.getElementById('add-project-btn');
    const projectModal = document.getElementById('project-modal');
    const projectForm = document.getElementById('project-form');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addTaskFieldBtn = document.getElementById('add-task-field-btn');
    const modalTaskListEl = document.getElementById('modal-task-list');
    const detailsModal = document.getElementById('details-modal');
    const detailsModalTitle = document.getElementById('details-modal-title');
    const detailsPrioritySelect = document.getElementById('details-priority-select');
    const detailsDeadlineInput = document.getElementById('details-deadline-input');
    const detailsCategorySelect = document.getElementById('details-category-select');
    const detailsTaskList = document.getElementById('details-task-list');
    const projectCalendarEl = document.getElementById('project-calendar');
    const commentsList = document.getElementById('comments-list');
    const commentInput = document.getElementById('comment-input');
    const addCommentBtn = document.getElementById('add-comment-btn');
    const closeDetailsModalBtn = document.getElementById('close-details-modal-btn');
    const completeProjectBtn = document.getElementById('complete-project-btn');
    const restoreProjectBtn = document.getElementById('restore-project-btn');
    const setStatusActiveBtn = document.getElementById('set-status-active-btn');
    const setStatusScheduledBtn = document.getElementById('set-status-scheduled-btn');
    const deleteProjectBtn = document.getElementById('delete-project-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const addDetailTaskBtn = document.getElementById('add-detail-task-btn');
    const boardToggleBtn = document.getElementById('board-toggle-btn');
    const sidebar = document.getElementById('board-sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const postListEl = document.getElementById('post-list');
    const newPostBtn = document.getElementById('new-post-btn');
    const postModal = document.getElementById('post-modal');
    const postModalTitle = document.getElementById('post-modal-title');
    const postForm = document.getElementById('post-form');
    const postIdInput = document.getElementById('post-id-input');
    const postTitleInput = document.getElementById('post-title-input');
    const postContentTextarea = document.getElementById('post-content-textarea');
    const closePostModalBtn = document.getElementById('close-post-modal-btn');
    const postViewModal = document.getElementById('post-view-modal');
    const closePostViewModalBtn = document.getElementById('close-post-view-modal-btn');
    const editPostBtn = document.getElementById('edit-post-btn');
    const deletePostBtn = document.getElementById('delete-post-btn');
    const categoryFiltersEl = document.getElementById('category-filters');
    const detailsModalTitleInput = document.getElementById('title-edit-input');
    const detailsUserSelect = document.getElementById('details-user-select');




    // --- 2. 초기화 및 데이터 갱신 ---
    async function initializeApp() {
        const savedUserId = localStorage.getItem('currentSchedulerUser');
        setupEventListeners();
        await refreshDataAndRender(savedUserId);
    }

    async function refreshDataAndRender(savedUserId = null) {
        try {
            const headers = {};
            if (currentUser) {
                headers['X-Current-User-ID'] = currentUser.id;
            }
            const response = await fetch('/api/data', { headers });
            if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);
            appData = await response.json();

            if (savedUserId && appData.users.some(u => u.id == savedUserId)) {
                currentUser = appData.users.find(u => u.id == savedUserId);
            } else if ((!currentUser || !appData.users.some(u => u.id === currentUser.id)) && appData.users.length > 0) {
                currentUser = appData.users[0];
            }

            renderAll();
        } catch (error) { console.error('데이터 갱신 실패:', error); }
    }

    function renderAll() {
        renderCurrentUserIcon();
        renderProjects();
        initializeCalendar();
        renderSidebar();

        if (appData.has_new_posts) {
            boardToggleBtn.classList.add('has-notification');
        } else {
            boardToggleBtn.classList.remove('has-notification');
        }

        if (detailsModal.open) {
            renderDetailsModal();
        }
    }

    // --- 3. 렌더링 함수 ---
    function renderCurrentUserIcon() {
        if (!currentUser) { currentUserIcon.style.display = 'none'; return; };
        currentUserIcon.style.display = 'flex';
        currentUserIcon.textContent = getShortName(currentUser.name);
        currentUserIcon.style.backgroundColor = getUserColor(currentUser.id);
    }

    function renderUserPopup() {
        userPopupList.innerHTML = '';
        appData.users.forEach(user => {
            const li = document.createElement('li');
            li.dataset.userId = user.id;
            li.innerHTML = `
                <div class="user-info">
                    <div class="small-icon" style="background-color:${getUserColor(user.id)}">${getShortName(user.name)}</div>
                    <span>${user.name}</span>
                </div>
                <button class="delete-user-btn" data-user-id="${user.id}">×</button>
            `;
            userPopupList.appendChild(li);
        });
    }

    function createProjectElement(project) {
        const assignee = appData.users.find(u => u.id === project.user_id)?.name || '미지정';
        const projectEl = document.createElement('div');
        projectEl.className = 'project-item';
        projectEl.dataset.projectId = project.id;

        if (currentUser && project.user_id === currentUser.id) {
            projectEl.classList.add('is-mine');
        }

        const projectColors = getProjectColor(project.id);
        projectEl.style.backgroundColor = 'var(--color-surface)';
        projectEl.style.borderLeftColor = projectColors.main;

        const dDayData = calculateDday(project.deadline);

        let progressDisplayHTML = '';
        if (project.tasks.length > 0) {
            progressDisplayHTML = `
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${project.progress}%; background-color: ${projectColors.main};"></div>
                </div>
            `;
        } else {
            progressDisplayHTML = `
                <div class="manual-progress-slider-container">
                    <input type="range" class="manual-progress-slider" data-project-id="${project.id}" value="${project.progress}" min="0" max="100">
                </div>
            `;
        }

        projectEl.innerHTML = `
            <div class="priority-indicator" style="background-color: ${project.priority === 1 ? 'var(--priority-high)' : project.priority === 2 ? 'var(--priority-medium)' : 'var(--priority-low)'};"></div>
            <div class="project-details">
                <div class="project-header">
                    <span class="project-name">${project.name}</span>
                    <span class="project-d-day ${dDayData.isUrgent ? 'd-day-urgent' : ''}">${dDayData.text}</span>
                </div>
                ${progressDisplayHTML}
                <div class="project-footer">
                    <p class="project-assignee">담당: ${assignee}</p>
                    <span class="project-progress-text" style="color: ${projectColors.main};">${project.progress}%</span>
                </div>
            </div>
        `;
        return projectEl;
    }

    function renderProjects() {
        projectListEl.innerHTML = '';
        scheduledProjectListEl.innerHTML = '';
        completedProjectListEl.innerHTML = '';

        // [핵심 수정] 1. 현재 선택된 카테고리에 따라 전체 프로젝트를 먼저 필터링합니다.
        const filteredProjects = appData.projects.filter(p => {
            if (currentCategoryFilter === '전체') return true;
            return p.category === currentCategoryFilter;
        });
        filteredProjects.sort((a, b) => a.priority - b.priority);

        // [핵심 수정] 2. 필터링된 결과를 기준으로 각 상태별 목록을 나눕니다.
        const activeProjects = filteredProjects.filter(p => p.status === 'active');
        const scheduledProjects = filteredProjects.filter(p => p.status === 'scheduled');
        const completedProjects = filteredProjects.filter(p => p.status === 'completed');

        // 3. 각 리스트를 렌더링합니다.
        activeProjects.forEach(p => projectListEl.appendChild(createProjectElement(p)));
        scheduledProjects.forEach(p => scheduledProjectListEl.appendChild(createProjectElement(p)));
        completedProjects.forEach(p => {
            const el = createProjectElement(p);
            el.classList.add('completed');
            completedProjectListEl.appendChild(el);
        });

        // 4. 각 섹션의 표시 여부를 결정합니다.
        activeProjectsSection.style.display = activeProjects.length > 0 ? 'block' : 'none';
        scheduledProjectsSection.style.display = scheduledProjects.length > 0 ? 'block' : 'none';
        completedProjectsSection.style.display = completedProjects.length > 0 ? 'block' : 'none';
    }


    function renderDetailsModal() {
        const project = appData.projects.find(p => p.id === currentOpenProjectId);
        if (!project) {
            detailsModal.close();
            return;
        };

        // --- 버튼 상태 관리 ---
        const rightButtons = document.querySelector('.footer-buttons-right');
        // 1. 삭제 확인 관련 버튼 초기화
        rightButtons.style.display = 'flex';
        confirmDeleteBtn.style.display = 'none';
        deleteProjectBtn.style.display = 'block';

        // 2. 모든 상태 변경 버튼을 일단 숨김
        [completeProjectBtn, restoreProjectBtn, setStatusActiveBtn, setStatusScheduledBtn].forEach(btn => btn.style.display = 'none');

        // 3. 프로젝트 상태에 따라 필요한 버튼만 표시
        switch (project.status) {
            case 'active': // "진행중"일 때
                setStatusScheduledBtn.style.display = 'block'; // '예정으로 변경' 표시
                completeProjectBtn.style.display = 'block';    // '프로젝트 종료' 표시
                break;
            case 'scheduled': // "예정"일 때
                setStatusActiveBtn.style.display = 'block';     // '프로젝트 진행' 표시
                break;
            case 'completed': // "종료됨"일 때
                restoreProjectBtn.style.display = 'block';      // '프로젝트 복구' 표시
                break;
        }

        // --- 데이터 렌더링 ---
        detailsModalTitle.textContent = project.name;
        detailsPrioritySelect.value = project.priority;
        detailsCategorySelect.value = project.category;
        // [신규] 담당자 선택 목록 렌더링
        detailsUserSelect.innerHTML = appData.users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
        // 담당자가 없는 경우(NULL)를 대비하여 || '' 추가
        detailsUserSelect.value = project.user_id || '';
        detailsDeadlineInput.value = formatDateToYYYYMMDD(project.deadline);

        detailsTaskList.innerHTML = '';
        project.tasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = 'task-item-popup';
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

        if (sortable_tasks) sortable_tasks.destroy(); // 기존 인스턴스가 있으면 파괴
        sortable_tasks = new Sortable(detailsTaskList, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: handleTaskReorder, // 드래그가 끝나면 실행될 함수
            filter: 'input[type="range"]',
            preventOnFilter: false
        });

        initializeProjectCalendar(project);
    }

    function renderSidebar() {
        postListEl.innerHTML = '';
        (appData.posts || []).forEach(post => {
            const postEl = document.createElement('div');
            postEl.className = 'post-item';
            postEl.dataset.postId = post.id;
            let preview = post.content.substring(0, 200);
            if (post.content.length > 200) {
                preview += '...';
            }
            postEl.innerHTML = `
                <h3>${post.title}</h3>
                <p class="post-preview">${preview}</p>
                <p>작성자: ${post.author_name} / 최종 수정: ${new Date(post.updated_at).toLocaleDateString()}</p>
            `;
            postListEl.appendChild(postEl);
        });
    }

    function initializeCalendar() {
        const events = [];
        appData.projects.filter(p => p.status === 'active').forEach(project => {
            const projectColors = getProjectColor(project.id);
            const assignee = appData.users.find(u => u.id === project.user_id);
            const assigneeName = assignee ? ` ${assignee.name}` : '';
            if (project.deadline) {
                events.push({
                    title: `[P${assigneeName}] ${project.name}`,
                    start: formatDateToYYYYMMDD(project.start_date),
                    end: formatDateToYYYYMMDD(project.deadline),
                    backgroundColor: projectColors.main,
                    borderColor: projectColors.main
                });
            }
            project.tasks.forEach(task => {
                if (task.deadline) {
                    events.push({ title: `[업무] ${task.content}`, start: formatDateToYYYYMMDD(task.deadline), allDay: true, backgroundColor: '#6c757d' });
                }
            });
        });
        if (calendar) calendar.destroy();
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' },
            events: events,
            locale: 'ko'
        });
        calendar.render();
    }

    function initializeProjectCalendar(project) {
        const events = [];
        project.tasks.forEach(task => {
            if (task.deadline) {
                events.push({ title: task.content, start: formatDateToYYYYMMDD(task.deadline), allDay: true, backgroundColor: getProjectColor(project.id).main });
            }
        });
        if (projectCalendar) projectCalendar.destroy();
        projectCalendar = new FullCalendar.Calendar(projectCalendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: { left: 'prev,next', center: 'title', right: 'dayGridMonth' },
            events: events,
            locale: 'ko',
            height: '100%'
        });
        projectCalendar.render();
    }

    // --- 4. 이벤트 리스너 설정 ---
    function setupEventListeners() {
        // 사용자 UI
        currentUserIcon.addEventListener('click', (e) => { e.stopPropagation(); const isHidden = userPopup.style.display === 'none' || userPopup.style.display === ''; if (isHidden) { renderUserPopup(); userPopup.style.display = 'block'; } else { userPopup.style.display = 'none'; } });
        document.addEventListener('click', (e) => { if (!userPopup.contains(e.target) && !currentUserIcon.contains(e.target)) { userPopup.style.display = 'none'; } });
        userPopupList.addEventListener('click', (e) => { if (e.target.classList.contains('delete-user-btn')) { handleUserDelete(e.target.dataset.userId); } else { const userLi = e.target.closest('li'); if (userLi) handleUserSwitch(userLi.dataset.userId); } });
        addUserBtn.addEventListener('click', handleUserAdd);

        // 프로젝트 리스트 클릭
        projectListEl.addEventListener('click', openDetailsModal);
        completedProjectListEl.addEventListener('click', openDetailsModal);
        scheduledProjectListEl.addEventListener('click', openDetailsModal);

        // 상세 모달 이벤트
        closeDetailsModalBtn.addEventListener('click', () => detailsModal.close());
        completeProjectBtn.addEventListener('click', () => handleSetStatus('completed'));
        restoreProjectBtn.addEventListener('click', () => handleSetStatus('active'));
        setStatusActiveBtn.addEventListener('click', () => handleSetStatus('active'));
        setStatusScheduledBtn.addEventListener('click', () => handleSetStatus('scheduled'));
        deleteProjectBtn.addEventListener('click', enterDeleteConfirmationMode);
        confirmDeleteBtn.addEventListener('click', handleConfirmProjectDelete);
        detailsPrioritySelect.addEventListener('change', handlePriorityChange);
        detailsCategorySelect.addEventListener('change', handleCategoryChange);
        detailsUserSelect.addEventListener('change', handleAssigneeChange);
        detailsDeadlineInput.addEventListener('change', handleDeadlineChange);
        detailsTaskList.addEventListener('change', (e) => { if (e.target.type === 'range') updateProgress('task', e.target.dataset.taskId, e.target.value); if (e.target.classList.contains('deadline-input')) handleTaskDeadlineEdit(e.target.dataset.taskId, e.target.value); });
        detailsTaskList.addEventListener('focusout', (e) => { if (e.target.classList.contains('task-content-input')) handleTaskContentEdit(e.target.dataset.taskId, e.target.value); });
        detailsTaskList.addEventListener('keydown', (e) => {
            // 입력된 키가 Enter이고, Shift 키가 눌리지 않았을 때
            if (e.target.classList.contains('task-content-input') && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Enter 키의 기본 동작(줄바꿈)을 막음
                e.target.blur();    // 입력창의 focus를 잃게 만들어, 기존의 focusout 저장 로직을 실행시킴
            }
        });
        detailsTaskList.addEventListener('click', (e) => { if (e.target.classList.contains('delete-task-btn')) { handleTaskDelete(e.target.dataset.taskId); } });
        addCommentBtn.addEventListener('click', handleAddComment);
        commentsList.addEventListener('click', (e) => { const item = e.target.closest('.comment-item'); if (!item) return; const commentId = item.dataset.commentId; if (e.target.classList.contains('delete-comment-btn')) { handleCommentDelete(commentId); return; } if (e.target.classList.contains('edit-comment-btn')) { const currentText = item.querySelector('.comment-text-content span:last-child')?.textContent?.trim() || ''; const newContent = prompt('코멘트를 수정하세요', currentText); if (newContent && newContent.trim()) { handleCommentEdit(commentId, newContent.trim()); } } });
        detailsModalTitle.addEventListener('click', handleTitleEdit);
        addDetailTaskBtn.addEventListener('click', handleAddNewTaskInDetail);

        // 수동 진행도 슬라이더 이벤트
        projectListEl.addEventListener('change', (e) => { if (e.target.classList.contains('manual-progress-slider')) { updateProgress('project', e.target.dataset.projectId, e.target.value); } });

        // 프로젝트 추가 모달
        addProjectBtn.addEventListener('click', openProjectModal);
        closeModalBtn.addEventListener('click', () => projectModal.close());
        addTaskFieldBtn.addEventListener('click', addModalTaskField);
        modalTaskListEl.addEventListener('click', (e) => { if (e.target.classList.contains('delete-task-btn')) e.target.parentElement.remove(); });
        projectForm.addEventListener('submit', handleFormSubmit);

        // 게시판
        boardToggleBtn.addEventListener('click', toggleSidebar);
        closeSidebarBtn.addEventListener('click', toggleSidebar);
        sidebarBackdrop.addEventListener('click', toggleSidebar);
        newPostBtn.addEventListener('click', openPostModalForNew);
        postListEl.addEventListener('click', handlePostListClick);
        postForm.addEventListener('submit', handlePostFormSubmit);
        closePostModalBtn.addEventListener('click', () => postModal.close());
        closePostViewModalBtn.addEventListener('click', () => postViewModal.close());
        editPostBtn.addEventListener('click', handleEditPostBtnClick);
        deletePostBtn.addEventListener('click', handleDeletePost);
        categoryFiltersEl.addEventListener('click', handleCategoryFilterClick);

        // '새 프로젝트' 팝업 상태 라디오 버튼
        projectModal.querySelectorAll('input[name="status"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const deadlineInput = document.getElementById('project-deadline');
                deadlineInput.required = e.target.value === 'active';
            });
        });

        // 팝업 외부 클릭 시 닫기
        [detailsModal, postModal, postViewModal].forEach(modal => {
            modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
        });
    }

    // --- 5. 이벤트 핸들러 & 로직 ---
    function openDetailsModal(e) {
        if (e.target.classList.contains('manual-progress-slider')) return;
        const projectItem = e.target.closest('.project-item');
        if (projectItem) {
            currentOpenProjectId = parseInt(projectItem.dataset.projectId);
            renderDetailsModal();
            detailsModal.showModal();
            setTimeout(() => {
                if (projectCalendar) projectCalendar.render();
                document.querySelectorAll('#details-task-list .task-content-input').forEach(textarea => autoResizeTextarea({ target: textarea }));
            }, 0);
        }
    }

    function handleUserSwitch(userId) {
        localStorage.setItem('currentSchedulerUser', userId);
        currentUser = appData.users.find(u => u.id === parseInt(userId));
        userPopup.style.display = 'none';
        renderCurrentUserIcon();
        renderProjects();
    }

    async function handleTaskReorder(evt) {
        const project = appData.projects.find(p => p.id === currentOpenProjectId);
        if (!project) return;

        // 1. 로컬 데이터(appData)의 순서를 드래그 결과에 맞춰 즉시 변경
        const movedTask = project.tasks.splice(evt.oldIndex, 1)[0];
        project.tasks.splice(evt.newIndex, 0, movedTask);

        // 2. 서버에 새로운 순서의 ID 배열을 전송 (낙관적 업데이트)
        const orderedTaskIds = project.tasks.map(t => t.id);
        try {
            const response = await fetch('/api/tasks/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_ids: orderedTaskIds })
            });
            if (!response.ok) throw new Error('Server error');
        } catch (error) {
            console.error("업무 순서 변경 실패:", error);
            showToast("업무 순서 저장에 실패했습니다. 데이터를 새로고침합니다.");
            refreshDataAndRender(); // 실패 시에는 전체 데이터를 다시 불러와 동기화
        }
    }

    async function handleUserAdd() {
        const name = newUserNameInput.value.trim();
        if (!name) return;
        try {
            const response = await fetch('/api/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
            if (!response.ok) throw new Error('Server error');
            const newUser = await response.json();
            if (newUser) {
                appData.users.push(newUser);
                newUserNameInput.value = '';
                renderUserPopup();
            }
        } catch (error) {
            showToast('사용자 추가에 실패했습니다.');
        }
    }

    async function refreshDataAndRender(savedUserId = null) {
        const loadingOverlay = document.getElementById('loading-overlay'); // 로딩 요소 가져오기

        try {
            const headers = {};
            if (currentUser) {
                headers['X-Current-User-ID'] = currentUser.id;
            }
            const response = await fetch('/api/data', { headers });
            if (!response.ok) throw new Error(`API 요청 실패: ${response.status}`);
            appData = await response.json();

            if (savedUserId && appData.users.some(u => u.id == savedUserId)) {
                currentUser = appData.users.find(u => u.id == savedUserId);
            } else if ((!currentUser || !appData.users.some(u => u.id === currentUser.id)) && appData.users.length > 0) {
                currentUser = appData.users[0];
            }

            renderAll();
        } catch (error) {
            console.error('데이터 갱신 실패:', error);
            // 여기에 에러 메시지를 사용자에게 보여주는 로직을 추가할 수도 있습니다.
        } finally {

            loadingOverlay.classList.add('hidden');
        }
    }

    async function handleUserDelete(userId) {
        if (!confirm('정말로 이 사용자를 삭제하시겠습니까?')) return;
        const originalUsers = [...appData.users];
        const userToDelete = appData.users.find(u => u.id == userId);

        appData.users = appData.users.filter(u => u.id != userId);
        renderUserPopup();
        if (currentUser?.id == userId) {
            currentUser = appData.users.length > 0 ? appData.users[0] : null;
            if (currentUser) localStorage.setItem('currentSchedulerUser', currentUser.id);
            else localStorage.removeItem('currentSchedulerUser');
            renderAll();
        }

        try {
            const response = await fetch(`/api/user/${userId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Server error');
        } catch (error) {
            showToast('사용자 삭제에 실패했습니다. 원래대로 복구합니다.');
            appData.users = originalUsers;
            if (userToDelete && currentUser?.id != userToDelete.id) {
                currentUser = appData.users.find(u => u.id === currentUser.id);
            }
            renderAll();
        }
    }

    // main.js의 이벤트 핸들러 영역에 아래 함수를 추가하세요.

    function handleCategoryFilterClick(e) {
        // 클릭된 요소가 버튼이 아니면 무시
        if (e.target.tagName !== 'BUTTON') return;

        // 현재 선택된 카테고리 상태를 업데이트
        currentCategoryFilter = e.target.dataset.category;

        // 모든 버튼에서 'active' 클래스를 제거
        categoryFiltersEl.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        // 클릭된 버튼에만 'active' 클래스 추가
        e.target.classList.add('active');

        // 새로운 필터에 맞춰 프로젝트 리스트를 다시 렌더링
        renderProjects();
    }

    async function handleCommentEdit(commentId, newContent) {
        const project = appData.projects.find(p => p.comments.some(c => c.id == commentId));
        if (!project) return;
        const commentIndex = project.comments.findIndex(c => c.id == commentId);
        if (commentIndex === -1) return;

        const originalComment = { ...project.comments[commentIndex] };
        project.comments[commentIndex].content = newContent; // 낙관적 업데이트
        renderDetailsModal();

        try {
            const response = await fetch(`/api/comment/${commentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newContent })
            });
            if (!response.ok) throw new Error('Server error');

            const updatedComment = await response.json();
            // 서버 최종 데이터로 교체
            project.comments[commentIndex] = updatedComment;

        } catch (error) {
            showToast('코멘트 수정에 실패했습니다.');
            project.comments[commentIndex] = originalComment; // 롤백
        }
        renderDetailsModal();
    }
    async function handleAddComment() {
        const text = commentInput.value.trim();
        if (!text || !currentOpenProjectId) return;

        const newCommentData = { author_name: currentUser.name, content: text };
        commentInput.value = '';

        try {
            const response = await fetch(`/api/project/${currentOpenProjectId}/comment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCommentData) });
            if (!response.ok) throw new Error('Server error');
            const newComment = await response.json();
            const project = appData.projects.find(p => p.id === currentOpenProjectId);
            if (project) {
                project.comments.push(newComment);
            }
            renderDetailsModal();
        } catch (error) {
            showToast('코멘트 추가에 실패했습니다.');
            commentInput.value = text;
        }
    }

    async function handleTaskDelete(taskId) {
        if (!confirm('이 업무를 삭제하시겠습니까?')) return;

        const project = appData.projects.find(p => p.tasks.some(t => t.id == taskId));
        if (!project) return;
        const originalTasks = [...project.tasks];
        project.tasks = project.tasks.filter(t => t.id != taskId);

        updateProjectProgress(project.id); // 업무 삭제 후 프로젝트 진행도 재계산
        renderDetailsModal();
        renderProjects(); // 메인 리스트의 진행도도 업데이트

        try {
            const response = await fetch(`/api/task/${taskId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Server error');
            showToast('업무가 삭제되었습니다.'); // <-- 성공 알림 추가
        } catch (error) {
            showToast('업무 삭제에 실패했습니다.');
            project.tasks = originalTasks;
            updateProjectProgress(project.id); // 롤백 후에도 재계산
            renderDetailsModal();
            renderProjects();
        }
    }

    async function handleCommentDelete(commentId) {
        if (!confirm('이 코멘트를 삭제하시겠습니까?')) return;

        const project = appData.projects.find(p => p.comments.some(c => c.id == commentId));
        if (!project) return;

        const originalComments = [...project.comments];
        project.comments = project.comments.filter(c => c.id != commentId);
        renderDetailsModal();

        try {
            const response = await fetch(`/api/comment/${commentId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Server error');
            showToast('코멘트가 삭제되었습니다.'); // <-- 성공 알림 추가
        } catch (error) {
            showToast('코멘트 삭제에 실패했습니다.');
            project.comments = originalComments;
            renderDetailsModal();
        }
    }

    async function handleSetStatus(newStatus) {
        const statusMap = { active: '진행', scheduled: '예정', completed: '종료' };
        if (!confirm(`이 프로젝트를 '${statusMap[newStatus]}' 상태로 변경하시겠습니까?`)) return;

        const project = appData.projects.find(p => p.id === currentOpenProjectId);
        if (!project) return;

        const originalStatus = project.status;
        project.status = newStatus;
        renderAll();
        detailsModal.close();

        try {
            const response = await fetch(`/api/project/${currentOpenProjectId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
            if (!response.ok) throw new Error('Server error');
        } catch (error) {
            showToast(`프로젝트 상태 변경에 실패했습니다.`);
            project.status = originalStatus;
            renderAll();
        }
    }

    async function handleCategoryChange(e) {
        const newCategory = e.target.value;
        const project = appData.projects.find(p => p.id === currentOpenProjectId);
        if (!project || project.category === newCategory) return;

        const originalCategory = project.category;
        project.category = newCategory;
        renderAll(); // 화면에 즉시 반영

        try {
            const response = await fetch(`/api/project/${currentOpenProjectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: newCategory })
            });
            if (!response.ok) throw new Error('Server error');
        } catch (error) {
            showToast('카테고리 변경에 실패했습니다.');
            project.category = originalCategory; // 오류 시 원래대로 롤백
            renderAll();
        }
    }

    function enterDeleteConfirmationMode() {
        const rightButtons = document.querySelector('.footer-buttons-right');
        rightButtons.style.display = 'none';
        deleteProjectBtn.style.display = 'none';
        confirmDeleteBtn.style.display = 'block';
        confirmDeleteBtn.style.marginLeft = 'auto';
    }

    async function handleConfirmProjectDelete() {
        const project = appData.projects.find(p => p.id === currentOpenProjectId);
        if (!project) return;

        const projectIndex = appData.projects.findIndex(p => p.id === currentOpenProjectId);
        const originalProjects = [...appData.projects]; // <-- 버그 수정을 위해 위치 변경

        appData.projects.splice(projectIndex, 1);
        renderAll();
        detailsModal.close();

        try {
            const response = await fetch(`/api/project/${project.id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Server error');
            showToast('프로젝트가 성공적으로 삭제되었습니다.');
        } catch (error) {
            showToast('프로젝트 삭제에 실패했습니다.');
            appData.projects = originalProjects;
            renderAll();
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        // 1. 제출 버튼을 찾습니다.
        const submitBtn = projectForm.querySelector('button[type="submit"]');

        const tasks = [];
        document.querySelectorAll('#modal-task-list > div').forEach(field => {
            const content = field.querySelector('.task-content-input').value.trim();
            if (content) {
                tasks.push({ content, deadline: field.querySelector('.modal-task-deadline').value || null });
            }
        });
        const newProjectData = { name: document.getElementById('project-name-input').value, user_id: parseInt(document.getElementById('project-user-select').value), priority: parseInt(document.getElementById('project-priority-select').value), status: projectForm.querySelector('input[name="status"]:checked').value, category: document.getElementById('project-category-select').value, start_date: document.getElementById('project-start-date').value, deadline: document.getElementById('project-deadline').value || null, tasks };

        try {
            // 2. 버튼을 비활성화하고 텍스트를 변경해 처리 중임을 알립니다.
            submitBtn.disabled = true;
            submitBtn.textContent = '생성 중...';

            const response = await fetch('/api/project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProjectData) });
            if (!response.ok) throw new Error('Server error');
            const newProject = await response.json();
            appData.projects.push(newProject);
            renderAll();
            projectModal.close();
        } catch (error) {
            showToast('프로젝트 생성에 실패했습니다.');
        } finally {
            // 3. (중요) 요청 성공/실패 여부와 관계없이 버튼을 다시 활성화합니다.
            submitBtn.disabled = false;
            submitBtn.textContent = '생성';
        }
    }

    async function handlePriorityChange(e) {
        const newPriority = parseInt(e.target.value);
        const project = appData.projects.find(p => p.id === currentOpenProjectId);
        if (!project || project.priority === newPriority) return;

        const originalPriority = project.priority;
        project.priority = newPriority;
        renderProjects();

        try {
            const response = await fetch(`/api/project/${currentOpenProjectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priority: newPriority }) });
            if (!response.ok) throw new Error('Server error');
        } catch (error) {
            showToast('우선순위 변경에 실패했습니다.');
            project.priority = originalPriority;
            renderProjects();
        }
    }

    async function handleAssigneeChange(e) {
        const newUserId = parseInt(e.target.value);
        const project = appData.projects.find(p => p.id === currentOpenProjectId);
        if (!project || project.user_id === newUserId) return;

        const originalUserId = project.user_id;
        project.user_id = newUserId;
        renderAll(); // 화면에 즉시 반영

        try {
            const response = await fetch(`/api/project/${currentOpenProjectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: newUserId })
            });
            if (!response.ok) throw new Error('Server error');

            // 서버 최종 데이터로 로컬 데이터 업데이트
            const updatedProject = await response.json();
            const projectIndex = appData.projects.findIndex(p => p.id === updatedProject.id);
            if (projectIndex !== -1) {
                appData.projects[projectIndex] = updatedProject;
            }
            renderAll();

        } catch (error) {
            showToast('담당자 변경에 실패했습니다.');
            project.user_id = originalUserId; // 오류 시 롤백
            renderAll();
        }
    }

    async function handleDeadlineChange(e) {
        const newDeadline = e.target.value;
        const project = appData.projects.find(p => p.id === currentOpenProjectId);
        if (!project || project.deadline === newDeadline) return;

        const originalDeadline = project.deadline;
        project.deadline = newDeadline;
        renderAll();

        try {
            const response = await fetch(`/api/project/${currentOpenProjectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deadline: newDeadline }) });
            if (!response.ok) throw new Error('Server error');
        } catch (error) {
            showToast('마감일 변경에 실패했습니다.');
            project.deadline = originalDeadline;
            renderAll();
        }
    }

    async function handleTaskContentEdit(taskId, newContent) {
        const project = appData.projects.find(p => p.tasks.some(t => t.id == taskId));
        const task = project?.tasks.find(t => t.id == taskId);
        if (!task || task.content === newContent) return;

        const originalContent = task.content;
        task.content = newContent;

        try {
            const response = await fetch(`/api/task/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newContent }) });
            if (!response.ok) throw new Error('Server error');
        } catch (error) {
            showToast("업무 내용 저장에 실패했습니다.");
            task.content = originalContent;
            renderDetailsModal();
        }
    }

    async function handleTaskDeadlineEdit(taskId, newDeadline) {
        const project = appData.projects.find(p => p.tasks.some(t => t.id == taskId));
        const task = project?.tasks.find(t => t.id == taskId);
        if (!task) return;

        const originalDeadline = task.deadline;
        task.deadline = newDeadline;
        renderDetailsModal();
        initializeProjectCalendar(project);
        initializeCalendar();

        try {
            const response = await fetch(`/api/task/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deadline: newDeadline }) });
            if (!response.ok) throw new Error('Server error');
        } catch (error) {
            showToast('업무 마감일 저장에 실패했습니다.');
            task.deadline = originalDeadline;
            renderDetailsModal();
            initializeProjectCalendar(project);
            initializeCalendar();
        }
    }

    async function updateProgress(type, id, valueStr) {
        const value = parseInt(valueStr);
        const projectIndex = appData.projects.findIndex(p => p.id == (type === 'task' ? appData.projects.find(pr => pr.tasks.some(t => t.id == id))?.id : id));
        if (projectIndex === -1) return;

        const project = appData.projects[projectIndex];
        const originalProjectProgress = project.progress;
        let originalTaskProgress = null, taskIndex = -1;

        if (type === 'task') {
            taskIndex = project.tasks.findIndex(t => t.id == id);
            if (taskIndex === -1) return;
            const task = project.tasks[taskIndex];
            originalTaskProgress = task.progress;
            task.progress = value;
            const totalProgress = project.tasks.reduce((sum, t) => sum + parseInt(t.progress), 0);
            project.progress = Math.round(totalProgress / project.tasks.length);
        } else {
            project.progress = value;
        }

        renderProjects();
        if (detailsModal.open) renderDetailsModal();

        try {
            if (type === 'task') {
                const taskResponse = await fetch(`/api/task/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: value }) });
                if (!taskResponse.ok) throw new Error('Task update failed');
                if (originalProjectProgress !== project.progress) {
                    const projectResponse = await fetch(`/api/project/${project.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: project.progress }) });
                    if (!projectResponse.ok) throw new Error('Project progress update failed');
                }
            } else {
                const projectResponse = await fetch(`/api/project/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ progress: value }) });
                if (!projectResponse.ok) throw new Error('Project progress update failed');
            }
        } catch (error) {
            console.error("Progress update failed:", error);
            showToast("진행도 업데이트에 실패했습니다. 원래대로 복구합니다.");
            appData.projects[projectIndex].progress = originalProjectProgress;
            if (type === 'task') {
                appData.projects[projectIndex].tasks[taskIndex].progress = originalTaskProgress;
            }
            renderProjects();
            if (detailsModal.open) renderDetailsModal();
        }
    }

    async function handleAddNewTaskInDetail() {
        if (!currentOpenProjectId) return;
        try {
            const response = await fetch(`/api/project/${currentOpenProjectId}/task`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
            if (!response.ok) throw new Error('Server error');
            const newTask = await response.json();
            const project = appData.projects.find(p => p.id === currentOpenProjectId);
            project.tasks.push(newTask);
            renderDetailsModal();
            const newTaskInput = document.querySelector(`textarea[data-task-id="${newTask.id}"]`);
            if (newTaskInput) {
                newTaskInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                newTaskInput.focus();
            }
        } catch (error) {
            showToast('업무 추가에 실패했습니다.');
        }
    }

    async function handleTitleEdit(e) {
        const project = appData.projects.find(p => p.id === currentOpenProjectId);
        if (!project) return;

        // 1. prompt 창으로 새 프로젝트 이름을 입력받음
        const newName = prompt("새 프로젝트 이름을 입력하세요:", project.name);

        // 2. 사용자가 취소했거나, 이름이 비어있거나, 이전 이름과 같으면 아무것도 하지 않음
        if (newName === null || newName.trim() === '' || newName.trim() === project.name) {
            return;
        }

        const originalName = project.name;
        project.name = newName.trim();
        renderAll(); // 3. 낙관적 업데이트: 일단 화면에 새 이름 반영

        // 4. 서버에 변경사항 저장 및 오류 시 롤백
        try {
            const response = await fetch(`/api/project/${currentOpenProjectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim() })
            });
            if (!response.ok) throw new Error('Server error');

            const updatedProject = await response.json();
            const projectIndex = appData.projects.findIndex(p => p.id === updatedProject.id);
            if (projectIndex !== -1) {
                appData.projects[projectIndex] = { ...appData.projects[projectIndex], ...updatedProject };
            }
            renderAll(); // 최종 데이터로 화면 동기화

        } catch (error) {
            showToast('이름 변경에 실패했습니다.');
            project.name = originalName; // 롤백
            renderAll();
        }
    }

    function toggleSidebar() {
        const isOpen = sidebar.classList.contains('open');
        if (!isOpen && boardToggleBtn.classList.contains('has-notification')) {
            markPostsAsRead();
        }
        sidebar.classList.toggle('open');
        sidebarBackdrop.classList.toggle('visible');
    }

    async function markPostsAsRead() {
        if (!currentUser) return;
        boardToggleBtn.classList.remove('has-notification');
        await fetch('/api/posts/mark-as-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id })
        });
        appData.has_new_posts = false;
    }

    function openPostModalForNew() { postModal.showModal(); postForm.reset(); postIdInput.value = ''; postModalTitle.textContent = '새 글 작성'; }

    function handlePostListClick(e) {
        const postItem = e.target.closest('.post-item');
        if (!postItem) return;
        currentOpenPostId = parseInt(postItem.dataset.postId);
        const post = appData.posts.find(p => p.id === currentOpenPostId);
        document.getElementById('post-view-title').textContent = post.title;
        document.getElementById('post-view-meta').textContent = `작성자: ${post.author_name} | 최종 수정: ${new Date(post.updated_at).toLocaleString()}`;
        document.getElementById('post-view-body').textContent = post.content;
        if (currentUser.id === post.user_id) {
            editPostBtn.style.display = 'inline-block';
            deletePostBtn.style.display = 'inline-block';
        } else {
            editPostBtn.style.display = 'none';
            deletePostBtn.style.display = 'none';
        }
        postViewModal.showModal();
    }

    async function handlePostFormSubmit(e) {
        e.preventDefault();

        // 1. 제출 버튼을 찾습니다.
        const submitBtn = postForm.querySelector('button[type="submit"]');

        const postId = postIdInput.value;
        const postData = { title: postTitleInput.value, content: postContentTextarea.value, user_id: currentUser.id };

        try {
            // 2. 버튼을 비활성화하고 처리 중임을 알립니다.
            submitBtn.disabled = true;
            submitBtn.textContent = '저장 중...';

            const url = postId ? `/api/post/${postId}` : '/api/post';
            const method = postId ? 'PUT' : 'POST';
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(postData) });
            if (!response.ok) throw new Error('Server error');
            const resultPost = await response.json();
            if (postId) {
                const index = appData.posts.findIndex(p => p.id == postId);
                if (index > -1) appData.posts[index] = resultPost;
            } else {
                appData.posts.unshift(resultPost);
            }
            renderSidebar();
            postModal.close();
        } catch (error) {
            showToast('게시글 저장에 실패했습니다.');
        } finally {
            // 3. (중요) 성공/실패 여부와 관계없이 버튼을 다시 활성화합니다.
            submitBtn.disabled = false;
            submitBtn.textContent = '저장';
        }
    }

    function handleEditPostBtnClick() {
        const post = appData.posts.find(p => p.id === currentOpenPostId);
        if (!post) return;
        postViewModal.close();
        postModal.showModal();
        postModalTitle.textContent = '글 수정';
        postIdInput.value = post.id;
        postTitleInput.value = post.title;
        postContentTextarea.value = post.content;
    }

    async function handleDeletePost() {
        if (confirm('이 글을 정말로 삭제하시겠습니까?')) {
            const originalPosts = [...appData.posts];
            appData.posts = appData.posts.filter(p => p.id !== currentOpenPostId);
            renderSidebar();
            postViewModal.close();

            try {
                const response = await fetch(`/api/post/${currentOpenPostId}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Server error');
                showToast('게시글이 삭제되었습니다.'); // <-- 성공 알림 추가
            } catch (error) {
                showToast('게시글 삭제에 실패했습니다.');
                appData.posts = originalPosts;
                renderSidebar();
            }
        }
    }

    function openProjectModal() {
        projectForm.reset();
        document.getElementById('project-start-date').valueAsDate = new Date();
        const userSelect = document.getElementById('project-user-select');
        userSelect.innerHTML = appData.users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
        if (currentUser) userSelect.value = currentUser.id;
        modalTaskListEl.innerHTML = '';
        addModalTaskField();
        document.getElementById('project-deadline').required = false;
        projectModal.showModal();
    }

    function addModalTaskField() {
        const taskField = document.createElement('div');
        taskField.className = 'task-item-popup';
        taskField.innerHTML = `
            <textarea class="task-content-input" placeholder="세부 업무 내용" rows="1"></textarea>
            <div class="task-item-footer" style="gap: 15px;">
                <input type="date" class="modal-task-deadline">
                <button type="button" class="delete-task-btn">&times;</button>
            </div>
        `;
        const textarea = taskField.querySelector('textarea');
        textarea.addEventListener('input', autoResizeTextarea);
        modalTaskListEl.appendChild(taskField);
    }
    // --- 6. 헬퍼 함수 ---
    function autoResizeTextarea(event) { const textarea = event.target; textarea.style.height = 'auto'; textarea.style.height = textarea.scrollHeight + 'px'; }
    function getShortName(name) { if (name === 'DI 팀') { return 'DI'; } if (name && name.length > 1) { return name.substring(1).trim().replace(/\s/g, ''); } return name; }
    function getUserColor(userId) { const colors = ['#6d6875', '#b5838d', '#e5989b', '#ffb4a2', '#ffcdb2']; return colors[((userId || 0) - 1 + colors.length) % colors.length]; }
    function getProjectColor(projectId) { const colors = [{ main: '#20c997', background: '#e9fbf5' }, { main: '#fd7e14', background: '#fff4e7' }, { main: '#6610f2', background: '#f0e7fd' }, { main: '#0d6efd', background: '#e7f0ff' }, { main: '#d63384', background: '#faeaf1' }, { main: '#198754', background: '#e8f3ee' }]; return colors[((projectId || 0) - 1 + colors.length) % colors.length]; }
    function calculateDday(deadline) { if (!deadline) return { text: '미정', isUrgent: false }; const today = new Date(); const deadlineDate = new Date(deadline); today.setHours(0, 0, 0, 0); deadlineDate.setHours(0, 0, 0, 0); const diffTime = deadlineDate - today; const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); if (diffDays === 0) { return { text: 'D-Day', isUrgent: true }; } else if (diffDays < 0) { return { text: `D+${Math.abs(diffDays)}`, isUrgent: false }; } else { return { text: `D-${diffDays}`, isUrgent: diffDays <= 7 }; } }
    function formatDateToYYYYMMDD(dateString) { if (!dateString) return ''; const date = new Date(dateString); const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
    function showToast(message) { const container = document.getElementById('toast-container'); if (!container) { console.error('Toast container not found!'); return; } const toast = document.createElement('div'); toast.className = 'toast-message'; toast.textContent = message; container.appendChild(toast); toast.addEventListener('animationend', () => { toast.remove(); }); }    // --- 앱 시작 ---
    function updateProjectProgress(projectId) { const project = appData.projects.find(p => p.id === projectId); if (!project || project.tasks.length === 0) { if (project) project.progress = 0; return; } const totalProgress = project.tasks.reduce((sum, t) => sum + t.progress, 0); project.progress = Math.round(totalProgress / project.tasks.length); }
    initializeApp();
});