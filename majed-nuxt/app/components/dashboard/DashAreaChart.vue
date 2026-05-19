<script setup lang="ts">
import { computed } from 'vue'
import { MONTHLY } from '@/lib/mock'
const W = 600, H = 240, P = 32
const max = Math.max(...MONTHLY.map((m) => Math.max(m.طلبات, m.مُعتمد)))
const stepX = (W - P * 2) / (MONTHLY.length - 1)
function points(key: 'طلبات' | 'مُعتمد') {
  return MONTHLY.map((m, i) => {
    const x = P + i * stepX
    const y = H - P - (((m as any)[key] / max) * (H - P * 2))
    return `${x},${y}`
  }).join(' ')
}
const submittedPoints = computed(() => points('طلبات'))
const approvedPoints = computed(() => points('مُعتمد'))
const submittedArea = computed(() => `${P},${H - P} ${submittedPoints.value} ${W - P},${H - P}`)
const approvedArea = computed(() => `${P},${H - P} ${approvedPoints.value} ${W - P},${H - P}`)
const labels = MONTHLY.map((m) => m.m)
const ticks = [0.25, 0.5, 0.75, 1].map((t) => H - P - t * (H - P * 2))
</script>
<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="w-full h-[240px]">
    <defs>
      <linearGradient id="ga1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="oklch(0.28 0.09 255)" stop-opacity="0.35" />
        <stop offset="100%" stop-color="oklch(0.28 0.09 255)" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="ga2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="oklch(0.65 0.14 195)" stop-opacity="0.35" />
        <stop offset="100%" stop-color="oklch(0.65 0.14 195)" stop-opacity="0" />
      </linearGradient>
    </defs>
    <line v-for="(y, i) in ticks" :key="i" :x1="P" :y1="y" :x2="W - P" :y2="y"
      stroke="oklch(0.9 0.01 240)" stroke-dasharray="3 3" />
    <polygon :points="submittedArea" fill="url(#ga1)" />
    <polyline :points="submittedPoints" fill="none" stroke="oklch(0.28 0.09 255)" stroke-width="2" />
    <polygon :points="approvedArea" fill="url(#ga2)" />
    <polyline :points="approvedPoints" fill="none" stroke="oklch(0.65 0.14 195)" stroke-width="2" />
    <text v-for="(lab, i) in labels" :key="lab" :x="P + i * stepX" :y="H - 8"
      text-anchor="middle" font-size="11" fill="oklch(0.5 0.03 250)">{{ lab }}</text>
  </svg>
  <div class="flex gap-4 text-xs mt-2 justify-center">
    <div class="flex items-center gap-2"><span class="h-2 w-3 rounded" style="background:oklch(0.28 0.09 255)" /> طلبات</div>
    <div class="flex items-center gap-2"><span class="h-2 w-3 rounded" style="background:oklch(0.65 0.14 195)" /> مُعتمد</div>
  </div>
</template>
