// js/api.js

import { state } from './state.js';

// 공통 fetch 래퍼
async function request(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (state.currentUser) {
        headers['X-Current-User-ID'] = state.currentUser.id;
    }
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
    }
    // DELETE 요청 등 내용이 없는 성공 응답 처리
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return null;
    }
    return response.json();
}

// --- API 함수들 ---
export const fetchData = () => request('/api/data');
export const addUser = (name, position) => request('/api/user', { method: 'POST', body: JSON.stringify({ name, position }) });
export const updateUser = (userId, data) => request(`/api/user/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteUser = (userId) => request(`/api/user/${userId}`, { method: 'DELETE' });
export const createProject = (projectData) => request('/api/project', { method: 'POST', body: JSON.stringify(projectData) });
export const updateProject = (projectId, data) => request(`/api/project/${projectId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteProject = (projectId) => request(`/api/project/${projectId}`, { method: 'DELETE' });
export const setProjectStatus = (projectId, status) => request(`/api/project/${projectId}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
export const addTask = (projectId) => request(`/api/project/${projectId}/task`, { method: 'POST' });
export const updateTask = (taskId, data) => request(`/api/task/${taskId}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTask = (taskId) => request(`/api/task/${taskId}`, { method: 'DELETE' });
export const reorderTasks = (task_ids) => request('/api/tasks/reorder', { method: 'POST', body: JSON.stringify({ task_ids }) });
export const addComment = (projectId, commentData) => request(`/api/project/${projectId}/comment`, { method: 'POST', body: JSON.stringify(commentData) });
export const updateComment = (commentId, content) => request(`/api/comment/${commentId}`, { method: 'PUT', body: JSON.stringify({ content }) });
export const deleteComment = (commentId) => request(`/api/comment/${commentId}`, { method: 'DELETE' });
export const createPost = (postData) => request('/api/post', { method: 'POST', body: JSON.stringify(postData) });
export const updatePost = (postId, postData) => request(`/api/post/${postId}`, { method: 'PUT', body: JSON.stringify(postData) });
export const deletePost = (postId) => request(`/api/post/${postId}`, { method: 'DELETE' });
export const markPostsAsRead = () => request('/api/posts/mark-as-read', { method: 'POST', body: JSON.stringify({ user_id: state.currentUser.id }) });
export const createSchedule = (scheduleData) => request('/api/schedule', { method: 'POST', body: JSON.stringify(scheduleData) });
export const deleteSchedule = (scheduleId) => request(`/api/schedule/${scheduleId}`, { method: 'DELETE' });