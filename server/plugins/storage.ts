import mod from 'unstorage-driver-aws-dynamodb'

const dynamoDBDriver = (mod as any).default || mod

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  const storage = useStorage()

  const driverOptions = {
    table: 'info-wroclaw-cache',
    region: config.awsRegion || 'eu-central-1',
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
    attributes: { key: 'key', value: 'value', ttl: 'ttl' },
  }

  await storage.unmount('cache')
  storage.mount('cache', dynamoDBDriver({
    ...driverOptions,
    ttl: 21600,
  }))

  // Persistent storage without TTL for data that should never expire (e.g. counters)
  await storage.unmount('data')
  storage.mount('data', dynamoDBDriver(driverOptions))
})
