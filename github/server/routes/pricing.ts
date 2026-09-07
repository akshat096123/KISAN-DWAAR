import { Router, Request, Response } from 'express';
import { calculateFairPrice, MSP_BENCHMARKS, MANDI_AVERAGES, ALL_MANDI_REGIONS, REGION_MANDI_PRICES } from '../../src/utils/business';
import { CropType } from '../../src/types';

const router = Router();

// GET calculated AI Fair Price
router.get('/fair-price', (req: Request, res: Response): void => {
  try {
    const crop = (req.query.crop as CropType) || 'wheat';
    const location = (req.query.location as string) || 'Meerut APMC, UP';
    const grade = (req.query.grade as string) || 'A';

    const result = calculateFairPrice(crop, location, grade);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to calculate fair price.' });
  }
});

// GET national & regional mandi averages
router.get('/mandi-rates', (req: Request, res: Response): void => {
  res.json({
    mspBenchmarks: MSP_BENCHMARKS,
    nationalAverages: MANDI_AVERAGES,
    regionalPrices: REGION_MANDI_PRICES,
  });
});

// GET list of all supported APMC mandi regions
router.get('/regions', (req: Request, res: Response): void => {
  res.json(ALL_MANDI_REGIONS);
});

export default router;
