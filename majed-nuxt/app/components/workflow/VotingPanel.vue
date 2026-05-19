<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Check, X, Minus, Lock, Crown, Gavel, AlertTriangle, PlayCircle, StopCircle } from 'lucide-vue-next'
import { useCell } from '@/composables/useCell'
import { votesCell, voteHistoryCell, finalizationsCell, execConfigCell, castVote, tally, isFinalized, finalizeVoting, transitionRequest } from '@/lib/governance'
import { DEMO_USERS, type ImportRequest } from '@/lib/mock'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { toast } from 'vue-sonner'

const props = defineProps<{ req: ImportRequest }>()
const { user } = storeToRefs(useAuthStore())
useCell(votesCell); useCell(voteHistoryCell); useCell(finalizationsCell)
const cfg = useCell(execConfigCell)
const justif = ref('')

const final = computed(() => isFinalized(props.req.id))
const tallyData = computed(() => tally(props.req.id))
const counts = computed(() => tallyData.value.counts)
const votes = computed(() => tallyData.value.votes)
const members = computed(() => cfg.value.memberIds.map((id) => DEMO_USERS.find((u) => u.id === id)).filter(Boolean) as typeof DEMO_USERS)
const isMember = computed(() => !!user.value && cfg.value.memberIds.includes(user.value.id))
const isManager = computed(() => !!user.value && user.value.id === cfg.value.managerId)
const myVote = computed(() => user.value ? votes.value.find((v) => v.voterId === user.value!.id) : undefined)
const locked = computed(() => !!final.value)
const totalVoted = computed(() => counts.value.approve + counts.value.reject + counts.value.abstain)
const threshold = 4
const approvePct = computed(() => Math.min(100, (counts.value.approve / threshold) * 100))
const rejectPct = computed(() => Math.min(100, (counts.value.reject / threshold) * 100))
const sessionOpen = computed(() => props.req.stage === 'executive_voting' && !locked.value)
const canControl = computed(() => isManager.value && !locked.value)

function vote(v: 'approve' | 'reject' | 'abstain') {
  if (!user.value) return
  const ok = castVote(props.req, user.value.id, v, justif.value || undefined)
  if (!ok) return toast.error('التصويت مغلق')
  toast.success('تم تسجيل تصويتك')
  justif.value = ''
}
function openSession() {
  if (!user.value) return
  transitionRequest(props.req, 'executive_voting', { id: user.value.id, name: user.value.name, role: user.value.role }, 'فتح باب التصويت')
  toast.success('تم فتح باب التصويت')
}
function closeSession() {
  if (!user.value) return
  if (!confirm('سيتم احتساب نتيجة التصويت بناءً على الأصوات الحالية. متابعة؟')) return
  const r = finalizeVoting(props.req, user.value.id)
  if ('error' in r) toast.error(r.error)
  else toast.success(`تم إغلاق التصويت — ${r.result === 'approved' ? 'اعتماد' : 'رفض'}`)
}
</script>
<template>
  <div class="rounded-xl border bg-card divide-y">
    <div class="p-4 flex items-center justify-between flex-wrap gap-3">
      <div>
        <div class="font-semibold flex items-center gap-2"><Gavel class="h-4 w-4" /> جلسة تصويت اللجنة التنفيذية</div>
        <div class="text-xs text-muted-foreground mt-0.5">النصاب: {{ threshold }} أصوات · صوّت {{ totalVoted }} من {{ members.length }}</div>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <span v-if="locked" :class="cn('inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold', final!.result === 'approved' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive')">
          <Lock class="h-3.5 w-3.5" /> تم إغلاق التصويت — {{ final!.result === 'approved' ? 'مُعتمد' : 'مرفوض' }}
          <span v-if="final!.managerVoteWeighted"> (بصوت المدير)</span>
        </span>
        <span v-else-if="sessionOpen" class="text-xs px-3 py-1.5 rounded-full bg-info/15 text-info font-medium">باب التصويت مفتوح</span>
        <span v-else class="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground font-medium">باب التصويت مغلق</span>
        <Button v-if="canControl && !sessionOpen && req.stage === 'swift_attached'" size="sm" @click="openSession"><PlayCircle class="h-4 w-4 ml-1" /> فتح</Button>
        <Button v-if="canControl && sessionOpen" size="sm" variant="destructive" @click="closeSession"><StopCircle class="h-4 w-4 ml-1" /> إغلاق</Button>
      </div>
    </div>
    <div class="p-4 grid sm:grid-cols-3 gap-3">
      <div class="rounded-lg border p-3">
        <div class="flex items-center justify-between mb-1.5"><div class="text-xs text-muted-foreground">موافقة</div><div class="font-bold tabular-nums">{{ counts.approve }}</div></div>
        <div class="h-2 bg-muted rounded-full overflow-hidden"><div class="h-full bg-success rounded-full transition-all" :style="{ width: approvePct + '%' }" /></div>
      </div>
      <div class="rounded-lg border p-3">
        <div class="flex items-center justify-between mb-1.5"><div class="text-xs text-muted-foreground">رفض</div><div class="font-bold tabular-nums">{{ counts.reject }}</div></div>
        <div class="h-2 bg-muted rounded-full overflow-hidden"><div class="h-full bg-destructive rounded-full" :style="{ width: rejectPct + '%' }" /></div>
      </div>
      <div class="rounded-lg border p-3">
        <div class="flex items-center justify-between mb-1.5"><div class="text-xs text-muted-foreground">امتناع</div><div class="font-bold tabular-nums">{{ counts.abstain }}</div></div>
        <div class="h-2 bg-muted rounded-full overflow-hidden"><div class="h-full bg-muted-foreground rounded-full" :style="{ width: (counts.abstain / Math.max(1, members.length)) * 100 + '%' }" /></div>
      </div>
    </div>
    <div class="p-4">
      <div class="text-xs font-semibold mb-2 text-muted-foreground">أعضاء اللجنة</div>
      <div class="space-y-1.5">
        <div v-for="m in members" :key="m.id" class="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
          <div class="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-bold">{{ m.avatar }}</div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium flex items-center gap-1.5">{{ m.name }}<Crown v-if="m.id === cfg.managerId" class="h-3.5 w-3.5 text-accent" /></div>
            <div class="text-[11px] text-muted-foreground">{{ m.email }}</div>
          </div>
          <template v-if="votes.find((x) => x.voterId === m.id) as any">
            <span :class="cn('text-[11px] px-2 py-0.5 rounded-full font-medium',
              votes.find((x) => x.voterId === m.id)!.vote === 'approve' && 'bg-success/15 text-success',
              votes.find((x) => x.voterId === m.id)!.vote === 'reject' && 'bg-destructive/15 text-destructive',
              votes.find((x) => x.voterId === m.id)!.vote === 'abstain' && 'bg-muted text-muted-foreground')">
              {{ ({ approve: 'موافق', reject: 'رافض', abstain: 'ممتنع' } as any)[votes.find((x) => x.voterId === m.id)!.vote] }}
            </span>
          </template>
          <span v-else class="text-[11px] text-muted-foreground">لم يصوّت</span>
        </div>
      </div>
    </div>
    <div v-if="isMember && !locked && sessionOpen" class="p-4 bg-muted/30">
      <div class="text-xs font-semibold mb-2">
        <template v-if="myVote">تصويتك الحالي: {{ ({approve:'موافق',reject:'رافض',abstain:'ممتنع'} as any)[myVote.vote] }} — يمكنك تغييره</template>
        <template v-else>صوّت الآن</template>
      </div>
      <Textarea v-model="justif" placeholder="مبررات (اختياري)" :rows="2" class="mb-2" />
      <div class="flex gap-2 flex-wrap">
        <Button size="sm" class="bg-success hover:bg-success/90 text-success-foreground" @click="vote('approve')"><Check class="h-4 w-4 ml-1" /> موافق</Button>
        <Button size="sm" variant="destructive" @click="vote('reject')"><X class="h-4 w-4 ml-1" /> رافض</Button>
        <Button size="sm" variant="outline" @click="vote('abstain')"><Minus class="h-4 w-4 ml-1" /> ممتنع</Button>
      </div>
    </div>
    <div v-if="!locked && totalVoted >= members.length && counts.approve === counts.reject" class="p-4 bg-warning/5 border-t-2 border-warning/30">
      <div class="flex items-start gap-3">
        <AlertTriangle class="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div class="text-sm">
          <div class="font-semibold">تعادل في التصويت ({{ counts.approve }} مقابل {{ counts.reject }})</div>
          <div class="text-xs text-muted-foreground mt-1">
            <template v-if="isManager">بصفتك مدير اللجنة، صوتك حاسم.</template>
            <template v-else>بانتظار صوت مدير اللجنة الحاسم.</template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>