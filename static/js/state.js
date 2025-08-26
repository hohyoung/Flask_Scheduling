// js/state.js

// 애플리케이션의 모든 상태를 담는 객체
export const state = {
    appData: { users: [], projects: [], posts: [], schedules: [] },
    currentUser: null,
    currentOpenProjectId: null,
    currentOpenPostId: null,
    currentCategoryFilter: '전체',
    newScheduleDate: null,
    calendarFilters: {
        showDITeam: true,
        showProjects: true,
        showTasks: true,
        showSchedules: true,
        selectedUsers: new Set()
    },
    chartOptions: {
        excludeDITeam: true 
    },
    // FullCalendar 인스턴스 저장용
    dom: {
        calendar: null,
        projectCalendar: null,
        sortable_tasks: null,
        startDateCalendar: null,
        deadlineCalendar: null,
    }
};

// 현재 사용자를 설정하는 함수
export function setCurrentUser(user) {
    state.currentUser = user;
    if (user) {
        localStorage.setItem('currentSchedulerUser', user.id);
    } else {
        localStorage.removeItem('currentSchedulerUser');
    }
}

// 초기 데이터를 설정하는 함수
export function setAppData(data) {
    // 날짜/배열 정규화
    data.projects = (data.projects || []).map(p => ({
        ...p,
        start_date: p.start_date || null,
        deadline: p.deadline || null,
        tasks: (p.tasks || []).map(t => ({ ...t, deadline: t.deadline || null }))
    }));
    state.appData = data;
    // 기본적으로 모든 사용자를 캘린더 필터에 선택
    state.calendarFilters.selectedUsers = new Set(data.users.map(u => u.id));
}