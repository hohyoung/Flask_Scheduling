// js/api.js

// 공통 fetch 래퍼
async function request(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            // 응답이 JSON이 아닌 경우
            errorData = { error: `API 요청 실패: ${response.status}` };
        }
        throw errorData;
    }

    // 내용이 없는 성공 응답 처리 (e.g., 204 No Content)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return null;
    }

    return response.json();
}

// --- Auth API --- 
export const login = (name, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ name, password }) });
export const logout = () => request('/api/auth/logout', { method: 'POST' });
export const checkAuthStatus = () => request('/api/auth/status');
export const setPassword = (name, password) => request('/api/auth/set-password', { method: 'POST', body: JSON.stringify({ name, password }) });


// --- Data API ---
export const fetchData = () => request('/api/data');

// --- User API (add/delete 제거, 추후 관리자 기능으로) ---
export const updateUser = (userId, data) => request(`/api/user/${userId}`, { method: 'PUT', body: JSON.stringify(data) });

// --- Project API ---
export const createProject = (projectData) => request('/api/project', { method: 'POST', body: JSON.stringify(projectData) });
export const updateProject = (projectId, data) => request(`/api/project/${projectId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteProject = (projectId) => request(`/api/project/${projectId}`, { method: 'DELETE' });
export const setProjectStatus = (projectId, status) => request(`/api/project/${projectId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });

// --- Task API ---
export const addTask = (projectId) => request(`/api/project/${projectId}/task`, { method: 'POST' });
export const updateTask = (taskId, data) => request(`/api/task/${taskId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTask = (taskId) => request(`/api/task/${taskId}`, { method: 'DELETE' });
export const reorderTasks = (task_ids) => request('/api/tasks/reorder', { method: 'POST', body: JSON.stringify({ task_ids }) });

// --- Comment API ---
export const addComment = (projectId, commentData) => request(`/api/project/${projectId}/comment`, { method: 'POST', body: JSON.stringify(commentData) });
export const updateComment = (commentId, content) => request(`/api/comment/${commentId}`, { method: 'PUT', body: JSON.stringify({ content }) });
export const deleteComment = (commentId) => request(`/api/comment/${commentId}`, { method: 'DELETE' });

// --- Post API ---
export const createPost = (postData) => request('/api/post', { method: 'POST', body: JSON.stringify(postData) });
export const updatePost = (postId, postData) => request(`/api/post/${postId}`, { method: 'PUT', body: JSON.stringify(postData) });
export const deletePost = (postId) => request(`/api/post/${postId}`, { method: 'DELETE' });
export const markPostsAsRead = () => request('/api/posts/mark-as-read', { method: 'POST' });

// --- Schedule API ---
export const createSchedule = (scheduleData) => request('/api/schedule', { method: 'POST', body: JSON.stringify(scheduleData) });
export const deleteSchedule = (scheduleId) => request(`/api/schedule/${scheduleId}`, { method: 'DELETE' });