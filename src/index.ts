export const GUILD = 'finance';
export const NATS_PREFIX = 'citadel.finance.*';
export function health() {
  return { guild: GUILD, status: 'ok', version: '0.1.0', nats_prefix: NATS_PREFIX };
}
