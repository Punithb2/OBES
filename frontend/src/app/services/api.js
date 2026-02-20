import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', // Ensure this matches your Django URL
});

// 1. Request Interceptor: Attach the Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Handle Token Expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 (Unauthorized) and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
            throw new Error("No refresh token available");
        }

        // Ask Backend for a new Access Token
        const response = await axios.post('http://localhost:8000/api/token/refresh/', {
          refresh: refreshToken
        });

        // Save the new token
        const newAccessToken = response.data.access;
        localStorage.setItem('accessToken', newAccessToken);

        // Update the header of the failed request and retry it
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);

      } catch (refreshError) {
        console.error("Session expired. Please login again.", refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/session/signin';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Helper function to recursively fetch all paginated data from Django Rest Framework.
 * It loops through the `next` URL provided by DRF until all pages are retrieved.
 */
export const fetchAllPages = async (endpoint) => {
  let results = [];
  let nextUrl = endpoint;

  while (nextUrl) {
    // Axios will automatically handle absolute URLs provided by DRF's `next` field
    const response = await api.get(nextUrl);
    const data = response.data;

    // Check if the response is paginated (contains a 'results' array)
    if (data && data.results) {
      results = [...results, ...data.results];
      nextUrl = data.next; // DRF returns null when there are no more pages
    } else {
      // Fallback in case the endpoint is not actually paginated
      results = Array.isArray(data) ? data : [data];
      nextUrl = null;
    }
  }
  
  return results;
};

export default api;