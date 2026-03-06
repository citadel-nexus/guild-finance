export function healthCheck() {
  return {
    guild: 'finance',
    status: 'healthy',
    version: '0.1.0',
    nats_prefix: 'citadel.finance.*',
    timestamp: new Date().toISOString(),
  };
}
