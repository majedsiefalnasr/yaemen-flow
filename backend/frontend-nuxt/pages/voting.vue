<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'role'], roles: ['executive_member', 'committee_manager'] })
const api = useApi()
const { data } = await useAsyncData('voting', () => api.get('/requests', { stage: 'executive_voting' }))
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">جلسة التصويت التنفيذي</h1>
    <div class="grid md:grid-cols-2 gap-4">
      <NuxtLink v-for="r in data?.data" :key="r.id" :to="`/requests/${r.id}`" class="card hover:border-primary transition">
        <div class="flex justify-between mb-2">
          <span class="font-mono font-bold">{{ r.reference }}</span>
          <span class="badge bg-primary/10 text-primary">{{ r.currency }} {{ Number(r.amount).toLocaleString() }}</span>
        </div>
        <div class="text-sm">{{ r.merchant?.name }}</div>
        <div class="text-xs text-slate-500 mt-1">{{ r.supplier }} · {{ r.port }}</div>
      </NuxtLink>
      <div v-if="!data?.data?.length" class="card text-center text-slate-500 md:col-span-2">لا توجد طلبات للتصويت</div>
    </div>
  </div>
</template>
