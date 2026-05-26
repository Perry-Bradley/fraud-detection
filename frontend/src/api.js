import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401) {
      const refresh = localStorage.getItem('refresh_token')
      if (refresh && !err.config._retry) {
        err.config._retry = true
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh })
          localStorage.setItem('access_token', data.access)
          err.config.headers.Authorization = `Bearer ${data.access}`
          return axios(err.config)
        } catch (_) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
