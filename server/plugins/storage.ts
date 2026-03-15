import mod from 'unstorage-driver-aws-dynamodb'

const dynamoDBDriver = (mod as any).default || mod

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  const storage = useStorage()

  await storage.unmount('cache')
  storage.mount('cache', dynamoDBDriver({
    table: 'info-wroclaw-cache',
    region: config.awsRegion || 'eu-central-1',
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
    attributes: { key: 'key', value: 'value', ttl: 'ttl' },
    ttl: 21600,
  }))
})
