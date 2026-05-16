<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'role'], roles: ['support_member', 'committee_manager'] })
const api = useApi()
const { data } = await useAsyncData('committee', () => api.get('/requests', { stage: 'support_review' }))
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">قائمة المراجعة - اللجنة المساندة</h1>
    <div class="card overflow-x-auto">
      <table class="w-full text-sm text-right">
        <thead class="border-b"><tr><th class="p-2">المرجع</th><th>التاجر</th><th>المبلغ</th><th>المخاطر</th><th></th></tr></thead>
        <tbody>
          <tr v-for="r in data?.data" :key="r.id" class="border-b hover:bg-slate-50">
            <td class="p-2 font-mono">{{ r.reference }}</td>
            <td>{{ r.merchant?.name }}</td>
            <td>{{ Number(r.amount).toLocaleString() }} {{ r.currency }}</td>
            <td><span class="badge" :class="r.risk === 'high' ? 'bg-red-100 text-red-700' : r.risk === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'">{{ r.risk }}</span></td>
            <td><NuxtLink :to="`/requests/${r.id}`" class="text-primary hover:underline">مراجعة</NuxtLink></td>
          </tr>
          <tr v-if="!data?.data?.length"><td colspan="5" class="p-4 text-center text-slate-500">لا توجد طلبات قيد المراجعة</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
