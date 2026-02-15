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
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await response.json() : null;

      if (!response.ok) {
        const fallbackError = `Request failed with status ${response.status}`;
        throw new Error((data && data.error) || fallbackError);
      }

      return data || {};
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
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await response.json() : null;

      if (!response.ok) {
        const fallbackError = `Upload failed with status ${response.status}`;
        throw new Error((data && data.error) || fallbackError);
      }

      return data || {};
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

  async deletePost(postId, userId) {
    // Proper DELETE request with user authorization
    return this.request(`/posts/${postId}?user_id=${userId}`, {
      method: 'DELETE',
    });
  }

  async editPost(postId, updates) {
    // Updates can include: title, description, visibility
    // Must include user_id for authorization
    return this.request(`/posts/${postId}/edit`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async getAudioUrl(postId, expiresIn = 3600) {
    return this.request(`/posts/${postId}/audio-url`);
  }

  // ==================== Post Files ====================

  async getPostFiles(postId) {
    return this.request(`/posts/${postId}/files`);
  }

  // ==================== Post Metadata ====================

  async getPostMetadata(postId) {
    return this.request(`/posts/${postId}/metadata`);
  }

  // ==================== Export/Download ====================

  async exportPost(postId) {
    const response = await fetch(`${this.baseUrl}/posts/${postId}/download`, {
      method: "GET",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to download post: ${response.statusText}`);
    }

    // Get binary data
    const buffer = await response.arrayBuffer();

    // Convert to a Blob so the browser can download it
    return new Blob([buffer], { type: "application/zip" });
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
