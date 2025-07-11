import { Router } from 'express';
import { generateInvoice, getMyInvoices, downloadInvoicePDF, payInvoice, invoiceAggregate } from '../controllers/invoiceController.js';
const router = Router();
// Guest aur staff invoice generate kar sakte
router.post('/', generateInvoice); // receptionist, manager
router.get('/sumofrevenue', invoiceAggregate); // admin
// Guest apni invoices dekh sakta
router.get('/me', getMyInvoices); // guest
// PDF download
router.get('/:id/pdf', downloadInvoicePDF); // guest, receptionist, manager
// Mark as paid (manager/admin)
router.patch('/:id/pay', payInvoice); // manager, admin
export default router;
