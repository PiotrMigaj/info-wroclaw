import mod from 'unstorage-driver-aws-dynamodb'

const dynamoDBDriver = (mod as any).default || mod

export default defineNitroPlugin(async () => {
  const storage = useStorage()

  await storage.unmount('cache')
  storage.mount('cache', dynamoDBDriver({
    table: 'info-wroclaw-cache',
    region: process.env.AWS_REGION || 'eu-central-1',
    attributes: { key: 'key', value: 'value', ttl: 'ttl' },
    ttl: 21600,
  }))
})
