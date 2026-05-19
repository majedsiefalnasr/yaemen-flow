import { onScopeDispose, ref, type Ref } from 'vue'
import type { Cell } from '@/lib/db'

export function useCell<T>(cell: Cell<T>): Ref<T> {
  const value = ref(cell.get()) as Ref<T>
  const unsub = cell.subscribe(() => { value.value = cell.get() })
  onScopeDispose(() => unsub())
  return value
}