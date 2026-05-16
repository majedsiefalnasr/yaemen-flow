<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'role'], roles: ['admin', 'committee_manager', 'support_member'] })
const api = useApi()
const { data: logs } = await useAsyncData('audit-logs', () => api.get('/audit/logs'))
const { data: dups } = await useAsyncData('audit-dups', () => api.get('/audit/duplicates'))
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">التدقيق والرقابة</h1>
    <div class="card mb-6">
      <h3 class="font-bold mb-3 text-warning">⚠️ فواتير مكررة محتملة</h3>
      <div v-if="!dups?.items?.length" class="text-slate-500 text-sm">لا توجد فواتير مكررة</div>
      <table v-else class="w-full text-sm text-right">
        <thead class="border-b"><tr><th class="p-2">الفاتورة</th><th>المرجع</th><th>التاجر</th><th>المبلغ</th></tr></thead>
        <tbody>
          <tr v-for="r in dups.items" :key="r.id" class="border-b bg-amber-50">
            <td class="p-2 font-mono">{{ r.invoice_number }}</td>
            <td>{{ r.reference }}</td><td>{{ r.merchant?.name }}</td>
            <td>{{ Number(r.amount).toLocaleString() }} {{ r.currency }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="card">
      <h3 class="font-bold mb-3">سجل النشاطات</h3>
      <table class="w-full text-sm text-right">
        <thead class="border-b"><tr><th class="p-2">الإجراء</th><th>المستخدم</th><th>المرجع</th><th>IP</th><th>الوقت</th></tr></thead>
        <tbody>
          <tr v-for="l in logs?.data" :key="l.id" class="border-b">
            <td class="p-2"><span class="badge bg-slate-100">{{ l.action }}</span></td>
            <td>{{ l.user?.name || '-' }}</td><td>{{ l.reference || '-' }}</td>
            <td class="font-mono text-xs">{{ l.ip }}</td>
            <td class="text-xs">{{ new Date(l.created_at).toLocaleString('ar') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
