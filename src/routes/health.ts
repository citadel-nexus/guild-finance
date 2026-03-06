import express from 'express';
const router = express.Router();
router.get('/health', (_req, res) => {
  res.json({ guild: 'finance', status: 'ok', version: '0.1.0', nats_prefix: 'citadel.finance.*' });
});
export default router;
