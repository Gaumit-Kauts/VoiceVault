/**
 * API Client for VoiceVault Backend
 * Handles all communication with Flask API
 */

const API_BASE_URL = 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.userId = null; // Store current user ID
  }

  setUserId(userId) {
    this.userId = userId;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // ==================== Auth ====================

  async register(email, password, displayName = null) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        display_name: displayName,
      }),
    });
  }

  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store user ID for subsequent requests
    if (response.user?.user_id) {
      this.setUserId(response.user.user_id);
    }

    return response;
  }

  // ==================== Users ====================

  async getUser(userId) {
    return this.request(`/users/${userId}`);
  }

  async getUserHistory(userId, page = 1, limit = 20) {
    return this.request(`/users/${userId}/history?page=${page}&limit=${limit}`);
  }

  // ==================== Posts ====================

  async uploadPost(formData) {
    const url = `${this.baseUrl}/posts/upload`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData, // Don't set Content-Type, let browser set it with boundary
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    } catch (error) {
      console.error('Upload Error:', error);
      throw error;
    }
  }

  async getPosts(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.visibility) queryParams.append('visibility', params.visibility);
    // Pass current_user_id for privacy checks (not filtering by author)
    if (params.current_user_id) queryParams.append('current_user_id', params.current_user_id);

    return this.request(`/posts?${queryParams.toString()}`);
  }

  async getPost(postId) {
    return this.request(`/posts/${postId}`);
  }

  async getPostBundle(postId) {
    return this.request(`/posts/${postId}/bundle`);
  }

  async updatePost(postId, updates) {
    return this.request(`/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deletePost(postId) {
    // Update status to mark as deleted
    return this.updatePost(postId, { status: 'deleted' });
  }

  async getPostMetadata(postId) {
    return this.request(`/posts/${postId}/metadata`);
  }

  async getAudioUrl(postId, expiresIn = 3600) {
    return this.request(`/posts/${postId}/audio?expires_in=${expiresIn}`);
  }

  // ==================== Post Files ====================

  async getPostFiles(postId) {
    return this.request(`/posts/${postId}/files`);
  }

  // ==================== Post Metadata ====================

  async getPostMetadata(postId) {
    return this.request(`/posts/${postId}/metadata`);
  }

  async exportPost(postId) {
  const response = await fetch(`/api/posts/${postId}/download`, { method: "GET" });
  if (!response.ok) throw new Error(`Failed to download post: ${response.statusText}`);
  return await response.blob(); // returns proper Blob ready for download
}

  // ==================== RAG Search ====================

  async searchRAG(query, userId, page = 1, limit = 30) {
    const queryParams = new URLSearchParams({
      q: query,
      user_id: userId,
      page,
      limit,
    });

    return this.request(`/rag/search?${queryParams.toString()}`);
  }

  // ==================== Audit Logs ====================

  async getPostAudit(postId, page = 1, limit = 100) {
    return this.request(`/posts/${postId}/audit?page=${page}&limit=${limit}`);
  }

  async getAuditLogs(params = {}) {
    const queryParams = new URLSearchParams();

    if (params.post_id) queryParams.append('post_id', params.post_id);
    if (params.user_id) queryParams.append('user_id', params.user_id);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);

    return this.request(`/audit?${queryParams.toString()}`);
  }

  // ==================== Health Check ====================

  async healthCheck() {
    return this.request('/health');
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export class for testing
export default ApiClient;
