// Utility HOC-like helper to guard mutation callbacks.
// Usage: onClick={withReadOnlyMutation(() => doSomething())}

import { useReadOnly } from './ReadOnlyGuard'

export function withReadOnlyMutation<TArgs extends unknown[]>(
  readOnly: boolean,
  fn: (...args: TArgs) => void
) {
  return (...args: TArgs) => {
    if (readOnly) return
    fn(...args)
  }
}

export function useReadOnlyMutation<TArgs extends unknown[]>(fn: (...args: TArgs) => void) {
  const ro = useReadOnly()
  return (...args: TArgs) => {
    if (ro) return
    fn(...args)
  }
}

