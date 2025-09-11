
import { state } from '../state.js';
import * as ui from '../ui.js';
import { handleDateClick, handleEventClick } from '../main.js';

export function handleSidebarToggle() {
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

export function handleCalendarFilterChange(e) {
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

export function handleVisualizationToggle(e) {
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

export function handleChartOptionChange(e) {
    const isChecked = e.target.checked;
    state.chartOptions.excludeDITeam = isChecked;
    ui.renderLoadCalculationView();
}
