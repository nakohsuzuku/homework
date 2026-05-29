import { Router } from 'express';
import webhookRoutes from './webhookRoutes';
import reportRoutes from './reportRoutes';
import difyRoutes from './difyRoutes';

const router = Router();

router.use('/webhook', webhookRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/reports', reportRoutes);
router.use('/dify', difyRoutes);

export default router;