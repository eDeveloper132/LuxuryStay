import { Request, Response } from 'express';
import { InvoiceModel } from '../models/Invoice.js';
import { BookingModel } from '../models/Booking.js';
import { AuthRequest } from '../middleware/auth.js';
import PDFDocument from 'pdfkit';

// 1. Generate invoice & save
export const generateInvoice = async (req: AuthRequest, res: Response) => {
  const { bookingId, services = [] } = req.body;

  const booking = await BookingModel.findById(bookingId).populate('guest');
  if (!booking) return res.status(404).json({ message: 'Booking nahin mili' });

  // total price = booking.price + sum(services)
  const serviceTotal = services.reduce((sum: number, s: any) => sum + s.price, 0);
  const totalAmount = booking.price + serviceTotal;

  const invoice = await InvoiceModel.create({
    booking: booking._id,
    guest: booking.guest._id,
    amount: totalAmount,
    services,
  });

  res.status(201).json(invoice);
};

// 2. List invoices for user
export const getMyInvoices = async (req: AuthRequest, res: Response) => {
  const invoices = await InvoiceModel.find({ guest: req.user!.id });
  res.json(invoices);
};

// 3. Download PDF invoice
export const downloadInvoicePDF = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const invoice = await InvoiceModel.findById(id).populate('booking');
  if (!invoice) return res.status(404).json({ message: 'Invoice nahin mili' });

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice._id}.pdf`);
  doc.fontSize(20).text('LuxuryStay Invoice', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Invoice ID: ${invoice._id}`);
  doc.text(`Booking ID: ${invoice.booking}`);
  doc.text(`Guest ID: ${invoice.guest}`);
  doc.text(`Issued At: ${invoice.issuedAt}`);
  doc.moveDown();

  invoice.services.forEach(s => {
    doc.text(`${s.name}: ${s.price}`);
  });
  doc.moveDown();
  doc.text(`Total Amount: ${invoice.amount}`);
  doc.end();
  doc.pipe(res);
};
export const invoiceAggregate = async (req: AuthRequest, res: Response) => {
const revenue = await InvoiceModel.aggregate([
    { $match: { paid: true } },
    { $group: { _id: null, sum: { $sum: '$amount' } } }
  ]);
  const sum = revenue[0]?.sum || 0;
  res.json(sum);
};
// 4. Mark as paid
export const payInvoice = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const invoice = await InvoiceModel.findByIdAndUpdate(id, { paid: true }, { new: true });
  if (!invoice) return res.status(404).json({ message: 'Invoice nahin mili' });
  res.json(invoice);
};
