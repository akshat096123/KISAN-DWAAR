import { Router, Request, Response } from 'express';
import { db } from '../db';

const router = Router();

router.post('/login', (req: Request, res: Response): void => {
  try {
    const { role, id, name, aadhaarOrMobile } = req.body;

    if (!role) {
      res.status(400).json({ error: 'Role is required (farmer, buyer, transporter, government)' });
      return;
    }

    if (role === 'government') {
      res.json({
        success: true,
        user: {
          role: 'government',
          id: id || 'GOVT-OFFICER-INSPECTOR-12',
          name: 'R. K. Verma (Mandi Inspector)',
          token: `token-govt-${Date.now()}`,
        },
      });
      return;
    }

    if (role === 'farmer') {
      let farmer;
      if (id) {
        farmer = db.prepare('SELECT * FROM farmers WHERE id = ?').get(id);
      } else if (aadhaarOrMobile) {
        farmer = db.prepare('SELECT * FROM farmers WHERE aadhaar_number = ? OR phone = ?').get(aadhaarOrMobile, aadhaarOrMobile);
      }
      if (!farmer) {
        farmer = db.prepare('SELECT * FROM farmers LIMIT 1').get();
      }

      if (!farmer) {
        res.status(404).json({ error: 'Farmer record not found.' });
        return;
      }

      res.json({
        success: true,
        user: {
          role: 'farmer',
          id: (farmer as any).id,
          name: (farmer as any).name,
          phone: (farmer as any).phone,
          aadhaar: (farmer as any).aadhaar_number,
          token: `token-farmer-${(farmer as any).id}`,
        },
      });
      return;
    }

    if (role === 'buyer') {
      let buyer;
      if (id) {
        buyer = db.prepare('SELECT * FROM buyers WHERE id = ?').get(id);
      } else if (aadhaarOrMobile) {
        buyer = db.prepare('SELECT * FROM buyers WHERE phone = ? OR tax_id = ?').get(aadhaarOrMobile, aadhaarOrMobile);
      }
      if (!buyer) {
        buyer = db.prepare('SELECT * FROM buyers LIMIT 1').get();
      }

      if (!buyer) {
        res.status(404).json({ error: 'Buyer record not found.' });
        return;
      }

      res.json({
        success: true,
        user: {
          role: 'buyer',
          id: (buyer as any).id,
          name: (buyer as any).organization_name,
          token: `token-buyer-${(buyer as any).id}`,
        },
      });
      return;
    }

    if (role === 'transporter') {
      let transporter;
      if (id) {
        transporter = db.prepare('SELECT * FROM transporters WHERE id = ?').get(id);
      } else if (aadhaarOrMobile) {
        transporter = db.prepare('SELECT * FROM transporters WHERE phone = ? OR aadhaar_number = ?').get(aadhaarOrMobile, aadhaarOrMobile);
      }
      if (!transporter) {
        transporter = db.prepare('SELECT * FROM transporters LIMIT 1').get();
      }

      if (!transporter) {
        res.status(404).json({ error: 'Transporter record not found.' });
        return;
      }

      res.json({
        success: true,
        user: {
          role: 'transporter',
          id: (transporter as any).id,
          name: (transporter as any).name,
          token: `token-transporter-${(transporter as any).id}`,
        },
      });
      return;
    }

    res.status(400).json({ error: 'Invalid role specified.' });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Internal server error during authentication.' });
  }
});

export default router;
