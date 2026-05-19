// LocalStorage persistence + reactive Vue store
// Namespace: cby.v2.* → bump version key to invalidate seeds.
import { ref, computed, type Ref } from 'vue'

const NS = 'cby.v2'
const VERSION_KEY = `${NS}.version`
const CURRENT_VERSION = '2026-05-13-b'

const isBrowser = typeof window !== 'undefined'

export function dbRead<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback
  try {
    const raw = localStorage.getItem(`${NS}.${key}`)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function dbWrite<T>(key: string, value: T): void {
  if (!isBrowser) return
  try { localStorage.setItem(`${NS}.${key}`, JSON.stringify(value)) } catch {}
}

export function dbResetAll(): void {
  if (!isBrowser) return
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(NS + '.')) keys.push(k)
  }
  keys.forEach((k) => localStorage.removeItem(k))
  localStorage.setItem(VERSION_KEY, CURRENT_VERSION)
}

export function dbCheckVersion(): boolean {
  if (!isBrowser) return true
  const v = localStorage.getItem(VERSION_KEY)
  if (v !== CURRENT_VERSION) { dbResetAll(); return false }
  return true
}

if (isBrowser) dbCheckVersion()

export type Cell<T> = {
  get: () => T
  set: (next: T | ((prev: T) => T)) => void
  ref: Ref<T>
  use: () => Ref<T>
}

export function cell<T>(key: string, initial: T): Cell<T> {
  const initialVal = dbRead<T>(key, initial)
  const r = ref(initialVal) as Ref<T>
  return {
    get: () => r.value,
    set: (next) => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(r.value) : next
      r.value = v
      dbWrite(key, v)
    },
    ref: r,
    use: () => r,
  }
}