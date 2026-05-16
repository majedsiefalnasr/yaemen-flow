<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
const api = useApi()
const { data } = await useAsyncData('summary', () => api.get('/reports/summary'))
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">التقارير التحليلية</h1>
    <div class="grid md:grid-cols-2 gap-4">
      <div class="card">
        <h3 class="font-bold mb-3">الطلبات الشهرية</h3>
        <table class="w-full text-sm text-right">
          <thead class="border-b"><tr><th class="p-2">الشهر</th><th>الإجمالي</th><th>معتمد</th><th>مرفوض</th></tr></thead>
          <tbody>
            <tr v-for="m in data?.monthly" :key="m.month" class="border-b">
              <td class="p-2">{{ m.month }}</td><td>{{ m.total }}</td>
              <td class="text-success">{{ m.approved }}</td><td class="text-danger">{{ m.rejected }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <h3 class="font-bold mb-3">حسب فئة البضاعة</h3>
        <div v-for="c in data?.byCategory" :key="c.goods_type" class="mb-2">
          <div class="flex justify-between text-sm mb-1"><span>{{ c.goods_type }}</span><span class="font-semibold">{{ c.total }}</span></div>
          <div class="bg-slate-200 h-2 rounded">
            <div class="h-2 bg-primary rounded" :style="{ width: Math.min(100, c.total * 10) + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
