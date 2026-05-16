import { useAuthStore } from '~/stores/auth'

export function useApi() {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  async function request<T = any>(path: string, options: any = {}): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers || {}),
    }
    if (auth.token) headers.Authorization = `Bearer ${auth.token}`
    if (!(options.body instanceof FormData) && options.body && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json'
      options.body = JSON.stringify(options.body)
    }

    try {
      return await $fetch<T>(`${config.public.apiBase}${path}`, { ...options, headers })
    } catch (err: any) {
      if (err?.response?.status === 401) {
        auth.clear()
        await navigateTo('/login')
      }
      throw err
    }
  }

  return {
    get: <T = any>(path: string, params?: Record<string, any>) =>
      request<T>(`${path}${params ? '?' + new URLSearchParams(params).toString() : ''}`),
    post: <T = any>(path: string, body?: any) => request<T>(path, { method: 'POST', body }),
    put: <T = any>(path: string, body?: any) => request<T>(path, { method: 'PUT', body }),
    del: <T = any>(path: string) => request<T>(path, { method: 'DELETE' }),
    upload: <T = any>(path: string, formData: FormData) =>
      request<T>(path, { method: 'POST', body: formData }),
  }
}
