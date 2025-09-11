
import { state } from '../state.js';
import * as ui from '../ui.js';
import * as api from '../api.js';
import { refreshDataAndRender } from '../main.js';

// This file will contain handlers for various modals (Project, Schedule, Details, Post)

// --- Project Modal ---
export async function handleProjectFormSubmit(e) {
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
        ui.showToast(error.error || '프로젝트 생성에 실패했습니다.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '생성';
    }
}

// --- Schedule Modal ---
export async function handleScheduleFormSubmit(e) {
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
        ui.initializeCalendar(window.handleDateClick, window.handleEventClick);
        ui.showToast('새로운 일정이 추가되었습니다.');
        form.parentElement.close();
    } catch (error) {
        ui.showToast(error.error || '일정 추가에 실패했습니다.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '저장';
    }
}

// --- Details Modal ---
export async function handleAddTask() {
    if (!state.currentOpenProjectId) return;
    try {
        const newTask = await api.addTask(state.currentOpenProjectId);
        const project = state.appData.projects.find(p => p.id === state.currentOpenProjectId);
        if (project) {
            project.tasks.push(newTask);
            ui.renderDetailsModal();
        }
    } catch (error) {
        ui.showToast(error.error || '업무 추가에 실패했습니다.');
    }
}

export async function handleSetProjectStatus(status) {
    if (!state.currentOpenProjectId) return;
    try {
        await api.setProjectStatus(state.currentOpenProjectId, status);
        await refreshDataAndRender();
        document.getElementById('details-modal').close();
        ui.showToast(`프로젝트가 '${status}' 상태로 변경되었습니다.`);
    } catch (error) {
        ui.showToast(error.error || '상태 변경에 실패했습니다.');
    }
}

export async function handleProjectDetailChange(dataToUpdate) {
    if (!state.currentOpenProjectId) return null;
    try {
        const updatedProject = await api.updateProject(state.currentOpenProjectId, dataToUpdate);
        const projectIndex = state.appData.projects.findIndex(p => p.id === state.currentOpenProjectId);
        if (projectIndex !== -1) {
            const oldProject = state.appData.projects[projectIndex];
            updatedProject.tasks = oldProject.tasks;
            updatedProject.comments = oldProject.comments;
            state.appData.projects[projectIndex] = updatedProject;
        }
        ui.renderAll();
        return updatedProject;
    } catch (error) {
        ui.showToast(error.error || '정보 업데이트에 실패했습니다.');
        return null;
    }
}

export function handleTitleClick(e) {
    const titleEl = e.target;
    const inputEl = document.getElementById('title-edit-input');
    inputEl.value = titleEl.textContent;
    titleEl.style.display = 'none';
    inputEl.style.display = 'block';
    inputEl.focus();
}

export async function handleTitleEdit(e) {
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

export function handlePeriodToggle() {
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

export async function handleClearDeadline() {
    await handleProjectDetailChange({ deadline: null });
    document.getElementById('period-popover').hidden = true;
}

export async function handleTaskClick(e) {
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
                ui.showToast(error.error || '업무 삭제 실패');
            }
        }
    }
}

export function handleTaskChange(e) {
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

export function handleTaskBlur(e) {
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

export async function handleAddComment() {
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
        ui.showToast(error.error || '코멘트 추가 실패');
    }
}

export async function handleCommentAction(e) {
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

export function handleDeleteProject() {
    document.querySelector('.footer-buttons-right').style.display = 'none';
    document.getElementById('confirm-delete-btn').style.display = 'block';
}

export async function handleConfirmDeleteProject() {
    if (!state.currentOpenProjectId) return;
    try {
        await api.deleteProject(state.currentOpenProjectId);
        await refreshDataAndRender();
        document.getElementById('details-modal').close();
        ui.showToast('프로젝트가 삭제되었습니다.');
    } catch (error) {
        ui.showToast(error.error || '프로젝트 삭제에 실패했습니다.');
    }
}

// --- Post Modals ---
export async function handlePostFormSubmit(e) {
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
            const updatedPost = await api.updatePost(postId, postData);
            const index = state.appData.posts.findIndex(p => p.id == postId);
            if (index !== -1) state.appData.posts[index] = updatedPost;
        } else {
            const newPost = await api.createPost(postData);
            state.appData.posts.unshift(newPost);
        }
        ui.renderSidebar();
        document.getElementById('post-modal').close();
    } catch (error) {
        ui.showToast(error.error || '게시글 저장에 실패했습니다.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '저장';
    }
}

export function handleEditPost() {
    const post = state.appData.posts.find(p => p.id === state.currentOpenPostId);
    if (post) {
        document.getElementById('post-view-modal').close();
        ui.openPostModalForEdit(post);
    }
}

export async function handleDeletePost() {
    const postId = state.currentOpenPostId;
    if (postId && confirm('게시글을 삭제하시겠습니까?')) {
        try {
            await api.deletePost(postId);
            state.appData.posts = state.appData.posts.filter(p => p.id !== postId);
            ui.renderSidebar();
            document.getElementById('post-view-modal').close();
            ui.showToast('게시글이 삭제되었습니다.');
        } catch (error) {
            ui.showToast(error.error || '게시글 삭제에 실패했습니다.');
        }
    }
}
