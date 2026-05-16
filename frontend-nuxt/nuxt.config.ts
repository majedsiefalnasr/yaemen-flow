export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  ssr: true,
  app: {
    head: {
      htmlAttrs: { lang: 'ar', dir: 'rtl' },
      title: 'منصة إدارة وتمويل الواردات - البنك المركزي اليمني',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'منصة رقمية لإدارة دورة حياة طلبات تمويل الواردات بشفافية وكفاءة' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&display=swap' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8000/api',
      appName: process.env.NUXT_PUBLIC_APP_NAME || 'منصة الواردات',
    },
  },
  css: ['~/assets/css/main.css'],
})
