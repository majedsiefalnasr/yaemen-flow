<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
const api = useApi()
const search = ref('')
const { data, refresh, pending } = await useAsyncData('merchants',
  () => api.get('/merchants', { search: search.value }), { watch: [search] })

const showForm = ref(false)
const form = reactive({ name: '', tax_number: '', commercial_register: '', address: '', contact: '', category: '' })
const error = ref('')

async function create() {
  error.value = ''
  try {
    await api.post('/merchants', form)
    showForm.value = false
    Object.keys(form).forEach(k => (form as any)[k] = '')
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.message || 'فشل الإنشاء'
  }
}
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">سجل التجار</h1>
      <button @click="showForm = !showForm" class="btn-primary">+ تاجر جديد</button>
    </div>
    <div v-if="showForm" class="card mb-4 grid md:grid-cols-3 gap-3">
      <input v-model="form.name" placeholder="الاسم" class="input" />
      <input v-model="form.tax_number" placeholder="الرقم الضريبي" class="input" />
      <input v-model="form.commercial_register" placeholder="السجل التجاري" class="input" />
      <input v-model="form.address" placeholder="العنوان" class="input" />
      <input v-model="form.contact" placeholder="جهة الاتصال" class="input" />
      <input v-model="form.category" placeholder="الفئة" class="input" />
      <div v-if="error" class="md:col-span-3 text-sm text-danger">{{ error }}</div>
      <button @click="create" class="btn-primary md:col-span-3">حفظ</button>
    </div>
    <div class="card mb-4"><input v-model="search" placeholder="بحث..." class="input max-w-xs" /></div>
    <div class="card overflow-x-auto">
      <table class="w-full text-sm text-right">
        <thead class="border-b"><tr><th class="p-2">الاسم</th><th>الضريبي</th><th>السجل</th><th>الفئة</th><th>الحالة</th></tr></thead>
        <tbody>
          <tr v-if="pending"><td colspan="5" class="p-4 text-center">جاري التحميل...</td></tr>
          <tr v-for="m in data?.data" :key="m.id" class="border-b">
            <td class="p-2 font-semibold">{{ m.name }}</td>
            <td>{{ m.tax_number }}</td><td>{{ m.commercial_register }}</td>
            <td>{{ m.category }}</td>
            <td><span class="badge" :class="m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">{{ m.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
