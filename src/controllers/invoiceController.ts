import { Request, Response } from 'express';
import { InvoiceModel } from '../models/Invoice.js';
import { BookingModel } from '../models/Booking.js';
import PDFDocument from 'pdfkit';

// 1. Generate invoice & save
export const generateInvoice = async (req: Request, res: Response) => {
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
    services
  });

  req.app.get('io')?.emit('invoice:created', invoice);
  res.status(201).json(invoice);
};
export const allInvoices = async (req: Request, res: Response) => {
  const invoices = await InvoiceModel.find();
  res.json(invoices);
}
// 2. List invoices for user
export const getMyInvoices = async (req: Request, res: Response) => {
    const rawUser = req.cookies.user as string | undefined;
    const currentUser = rawUser ? JSON.parse(rawUser) : null;

    if (!currentUser?.id) {
      console.error('⚠️ reportIssue: no id on currentUser cookie:', currentUser);
      return res.status(401).json({ message: 'Not authenticated—invalid user cookie' });
    }

  const invoices = await InvoiceModel.find({ guest: currentUser.id });
  res.json(invoices);
};

// 3. Download PDF invoice
export const downloadInvoicePDF = async (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = await InvoiceModel.findById(id)
    .populate({
      path: 'booking',
      populate: { path: 'guest', select: 'name email' }
    });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

  // Create and stream PDF
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice._id}.pdf`);
  doc.pipe(res);

  // Header
  doc
    .font('Helvetica-Bold')
    .fontSize(24)
    .fillColor('#1E3A8A')
    .text('LUXURYSTAY', { align: 'center' })
    .moveDown(0.5);

  // Sub-header
  doc
    .font('Helvetica')
    .fontSize(12)
    .fillColor('#555')
    .text(`Invoice`, { align: 'center' })
    .moveDown(1);

  // Invoice & Booking Details
  const left = 50;
  doc
    .font('Helvetica-Bold')
    .fillColor('#000')
    .text('Invoice ID:', left, 150)
    .font('Helvetica')
    .text(String(invoice._id), left + 100, 150);

  doc
    .font('Helvetica-Bold')
    .text('Issued At:', left, 170)
    .font('Helvetica')
    .text(invoice.issuedAt?.toLocaleString() || '—', left + 100, 170);

  doc
    .font('Helvetica-Bold')
    .text('Booking ID:', left, 190)
    .font('Helvetica')
    .text(String(invoice.booking._id), left + 100, 190);

  const guest = (invoice.booking as any).guest;
  doc
    .font('Helvetica-Bold')
    .text('Guest:', left, 210)
    .font('Helvetica')
    .text(`${guest.name} (${guest.email})`, left + 100, 210);

  // Draw a horizontal line
  doc
    .moveTo(left, 240)
    .lineTo(545, 240)
    .strokeColor('#DDD')
    .stroke()
    .moveDown();

  // Services Table Header
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#000')
    .text('Service', left, 260)
    .text('Price', 400, 260, { width: 90, align: 'right' })
    .moveDown(0.5);

  // Services table rows
  invoice.services.forEach((s, i) => {
    const y = 280 + i * 20;
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#333')
      .text(s.name, left, y)
      .text(`$${s.price.toFixed(2)}`, 400, y, { width: 90, align: 'right' });
  });

  // Booking base price row
  const baseY = 300 + invoice.services.length * 20;
  const bookingPrice = (invoice.booking as any).price || 0;
  doc
    .font('Helvetica')
    .text('Room Charge', left, baseY)
    .text(`${bookingPrice.toFixed(2)} PKR`, 400, baseY, { width: 90, align: 'right' });

  // Total line
  const totalY = baseY + 30;
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('#000')
    .text('Total Amount:', left, totalY)
    .text(`${invoice.amount.toFixed(2)}`, 400, totalY, { width: 90, align: 'right' });

  // Footer
  doc
    .fontSize(10)
    .fillColor('#777')
    .text('Thank you for choosing LuxuryStay.', left, 750, { align: 'center', width: 500 });

  doc.end();
};
export const invoiceAggregate = async (req: Request, res: Response) => {
const revenue = await InvoiceModel.aggregate([
    { $match: { paid: true } },
    { $group: { _id: null, sum: { $sum: '$amount' } } }
  ]);
  const sum = revenue[0]?.sum || 0;
  console.log(sum);
  res.json(sum);
};
// 4. Mark as paid
export const payInvoice = async (req: Request, res: Response) => {
  const { id } = req.params;
  const invoice = await InvoiceModel.findByIdAndUpdate(id, { paid: true }, { new: true });
  if (!invoice) return res.status(404).json({ message: 'Invoice nahin mili' });
  req.app.get('io')?.emit('invoice:paid', invoice);
  res.json(invoice);
};
