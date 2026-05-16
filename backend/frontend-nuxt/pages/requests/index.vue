<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
const api = useApi()
const search = ref('')
const stage = ref('')
const page = ref(1)

const { data, pending, refresh } = await useAsyncData(
  'requests',
  () => api.get('/requests', { search: search.value, stage: stage.value, page: page.value }),
  { watch: [search, stage, page] }
)

const stages = ['', 'submitted', 'support_review', 'support_approved', 'executive_voting', 'approved', 'rejected', 'completed']
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">طلبات تمويل الواردات</h1>
      <NuxtLink to="/requests/new" class="btn-primary">+ طلب جديد</NuxtLink>
    </div>
    <div class="card mb-4 flex gap-3 flex-wrap">
      <input v-model="search" placeholder="بحث..." class="input max-w-xs" />
      <select v-model="stage" class="input max-w-xs">
        <option value="">كل المراحل</option>
        <option v-for="s in stages.filter(Boolean)" :key="s" :value="s">{{ s }}</option>
      </select>
    </div>
    <div class="card overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="text-right border-b">
          <tr><th class="p-2">المرجع</th><th>التاجر</th><th>المبلغ</th><th>المرحلة</th><th>التقدم</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-if="pending"><td colspan="6" class="p-4 text-center">جاري التحميل...</td></tr>
          <tr v-for="r in data?.data" :key="r.id" class="border-b hover:bg-slate-50">
            <td class="p-2 font-mono">{{ r.reference }}</td>
            <td>{{ r.merchant?.name }}</td>
            <td>{{ Number(r.amount).toLocaleString() }} {{ r.currency }}</td>
            <td><span class="badge bg-slate-100">{{ r.stage }}</span></td>
            <td><div class="bg-slate-200 h-2 rounded"><div class="h-2 bg-primary rounded" :style="{ width: r.progress + '%' }"></div></div></td>
            <td><NuxtLink :to="`/requests/${r.id}`" class="text-primary hover:underline">عرض</NuxtLink></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
