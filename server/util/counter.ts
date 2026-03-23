const COUNTER_KEY = 'agent-run-counter'

export async function incrementAgentRunCounter(): Promise<number> {
  const storage = useStorage('data')
  const current = (await storage.getItem<number>(COUNTER_KEY)) ?? 0
  const next = current + 1
  await storage.setItem(COUNTER_KEY, next)
  return next
}

export async function getAgentRunCounter(): Promise<number> {
  const storage = useStorage('data')
  return (await storage.getItem<number>(COUNTER_KEY)) ?? 0
}
