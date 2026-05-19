import type { Ref } from 'vue'
import type { Cell } from '@/lib/db'

// Cell.ref is already a reactive Vue ref kept in sync by cell.set()
export function useCell<T>(cell: Cell<T>): Ref<T> {
  return cell.ref
}