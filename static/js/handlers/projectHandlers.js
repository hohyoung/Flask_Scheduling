
import { state } from '../state.js';
import * as ui from '../ui.js';
import * as api from '../api.js';

export function handleAddProjectClick() {
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

export function handleCategoryFilterClick(e) {
    if (e.target.tagName !== 'BUTTON') return;
    state.currentCategoryFilter = e.target.dataset.category;
    document.querySelectorAll('#category-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    ui.renderProjects();
}

export function handleProjectItemClick(e) {
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

export async function handleManualProgressChange(e) {
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
        ui.showToast(error.error || "진행도 업데이트 실패");
        project.progress = originalProgress;
        ui.renderProjects();
    }
}
