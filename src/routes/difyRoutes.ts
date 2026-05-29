import { Router } from 'express';
import { analyzeCode, getAnalysisResult, listAnalysisResults } from '../controllers/difyController';

const router = Router();

router.post('/analyze', analyzeCode);
router.get('/results', listAnalysisResults);
router.get('/results/:reportId', getAnalysisResult);

export default router;