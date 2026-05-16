<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })
const api = useApi()
const { data, pending } = await useAsyncData('summary', () => api.get('/reports/summary'))
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">لوحة التحكم</h1>
    <div v-if="pending" class="text-slate-500">جاري التحميل...</div>
    <div v-else class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="card">
        <div class="text-sm text-slate-500">إجمالي الطلبات</div>
        <div class="text-3xl font-bold mt-2">{{ data?.totals?.total_requests || 0 }}</div>
      </div>
      <div class="card">
        <div class="text-sm text-slate-500">قيد المعالجة</div>
        <div class="text-3xl font-bold mt-2 text-warning">{{ data?.totals?.pending || 0 }}</div>
      </div>
      <div class="card">
        <div class="text-sm text-slate-500">مكتملة</div>
        <div class="text-3xl font-bold mt-2 text-success">{{ data?.totals?.completed || 0 }}</div>
      </div>
      <div class="card">
        <div class="text-sm text-slate-500">القيمة الإجمالية (USD)</div>
        <div class="text-3xl font-bold mt-2">{{ Number(data?.totals?.total_value_usd || 0).toLocaleString() }}</div>
      </div>
    </div>
    <div class="grid md:grid-cols-2 gap-4 mt-6">
      <div class="card">
        <h3 class="font-bold mb-3">حسب المرحلة</h3>
        <div v-for="(v, k) in data?.byStage" :key="k" class="flex justify-between py-2 border-b last:border-0">
          <span class="text-sm">{{ k }}</span><span class="font-semibold">{{ v }}</span>
        </div>
      </div>
      <div class="card">
        <h3 class="font-bold mb-3">حسب الفئة</h3>
        <div v-for="c in data?.byCategory" :key="c.goods_type" class="flex justify-between py-2 border-b last:border-0">
          <span class="text-sm">{{ c.goods_type }}</span><span class="font-semibold">{{ c.total }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
