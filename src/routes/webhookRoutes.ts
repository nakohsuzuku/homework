import { Router } from 'express';
import { handleGitHubWebhook, handleGitLabWebhook } from '../controllers/webhookController';

const router = Router();

router.post('/github', handleGitHubWebhook);
router.post('/gitlab', handleGitLabWebhook);

export default router;