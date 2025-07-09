import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { generateInvoice, getMyInvoices, downloadInvoicePDF, payInvoice, invoiceAggregate } from '../controllers/invoiceController.js';
const router = Router();
// Guest aur staff invoice generate kar sakte
router.post('/', protect, authorize(['receptionist', 'manager']), generateInvoice);
router.get('/sumofrevenue', protect, authorize(['admin']), invoiceAggregate);
// Guest apni invoices dekh sakta
router.get('/me', protect, authorize(['guest']), getMyInvoices);
// PDF download
router.get('/:id/pdf', protect, authorize(['guest', 'receptionist', 'manager']), downloadInvoicePDF);
// Mark as paid (manager/admin)
router.patch('/:id/pay', protect, authorize(['manager', 'admin']), payInvoice);
export default router;
