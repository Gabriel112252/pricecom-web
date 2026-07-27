import axios from 'axios'

export const TOKEN_KEY = 'pricecom_token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://pricecom-pricecom-api.dzxtro.easypanel.host/api/v1',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('pricecom_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

// ActiveStorage URLs (Testimonial#media_url) come back as paths, not full
// URLs — the API is API-only (no view layer to host an absolute host
// default for `rails_blob_path`), so we prefix them with the API's origin
// on the frontend instead.
export function assetUrl(path) {
  if (!path) return null
  const apiOrigin = (
    import.meta.env.VITE_API_BASE_URL || 'https://pricecom-pricecom-api.dzxtro.easypanel.host/api/v1'
  ).replace(/\/api\/v1\/?$/, '')
  return `${apiOrigin}${path}`
}

export default api
