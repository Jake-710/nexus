import { useAuth } from '../App';
import { useCallback } from 'react';

const API_BASE = '/api/v1';

export const useApi = () => {
  const { token, logout } = useAuth();

  const customFetch = useCallback(async (endpoint, options = {}) => {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        logout();
        throw new Error('Unauthorized');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'API Error');
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }, [token, logout]);

  const get = useCallback((endpoint) => customFetch(endpoint), [customFetch]);
  
  const post = useCallback((endpoint, body) => customFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  }), [customFetch]);
  
  const patch = useCallback((endpoint, body) => customFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }), [customFetch]);
  
  const put = useCallback((endpoint, body) => customFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  }), [customFetch]);

  return { get, post, patch, put };
};
