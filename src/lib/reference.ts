export function generateReference(prefix = 'TXN'): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `${prefix}-${date}-${rand}`
}
