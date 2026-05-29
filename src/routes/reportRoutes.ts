import { Router } from 'express';
import { analyzeCode, createReview, getReport, listReports, deleteReport } from '../controllers/reportController';

const router = Router();

router.post('/analyze', analyzeCode);
router.post('/', createReview);
router.get('/', listReports);
router.get('/:id', getReport);
router.delete('/:id', deleteReport);

export default router;