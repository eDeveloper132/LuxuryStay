import { Request, Response } from 'express';
import { InvoiceModel } from '../models/Invoice.js';
import { BookingModel } from '../models/Booking.js';
import PDFDocument from 'pdfkit';
// 1. Generate invoice & save
export const generateInvoice = async (req: Request, res: Response) => {
  try {
    const { bookingId, services = [] } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: 'bookingId is required' });
    }

    const booking = await BookingModel.findById(bookingId).populate('guest');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const serviceTotal = services.reduce((sum: number, s: any) => sum + (s.price || 0), 0);
    const totalAmount = booking.price + serviceTotal;

    const invoice = await InvoiceModel.create({
      booking: booking._id,
      guest: booking.guest._id,
      amount: totalAmount,
      services,
    });
    if (!invoice) {
      return res.status(500).json({ message: 'Failed to create invoice' });
    }

    await BookingModel.findByIdAndUpdate(bookingId, { invoice: invoice._id });

    req.app.get('io')?.emit('invoice:created', invoice);
    return res.status(201).json(invoice);
  } catch (err) {
    console.error('❌ generateInvoice error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// 2. List all invoices (admin)
export const allInvoices = async (_req: Request, res: Response) => {
  try {
    const invoices = await InvoiceModel.find();
    return res.json(invoices);
  } catch (err) {
    console.error('❌ allInvoices error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// 3. List invoices for current user
export const getMyInvoices = async (req: Request, res: Response) => {
  try {
    const rawUser = req.cookies.user as string | undefined;
    const currentUser = rawUser ? JSON.parse(rawUser) : null;
    if (!currentUser?.id) {
      console.error('⚠️ getMyInvoices: no id on user cookie:', currentUser);
      return res.status(401).json({ message: 'Not authenticated—invalid user cookie' });
    }

    const invoices = await InvoiceModel.find({ guest: currentUser.id });
    return res.json(invoices);
  } catch (err) {
    console.error('❌ getMyInvoices error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


// 4. Download PDF invoice
export const downloadInvoicePDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Invoice ID is required' });
    }

    const invoice = await InvoiceModel.findById(id)
      .populate({
        path: 'booking',
        populate: { path: 'guest', select: 'name email' },
      });

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice._id}.pdf`);
    doc.pipe(res);

    // Header
    doc
      .font('Helvetica-Bold')
      .fontSize(24)
      .text('LUXURYSTAY', { align: 'center' })
      .moveDown(0.5);

    // Sub-header
    doc
      .font('Helvetica')
      .fontSize(12)
      .text('Invoice', { align: 'center' })
      .moveDown(1);

    const left = 50;
    doc.font('Helvetica-Bold').text('Invoice ID:', left, 150)
      .font('Helvetica').text(String(invoice._id), left + 100, 150);

    doc.font('Helvetica-Bold').text('Issued At:', left, 170)
      .font('Helvetica').text(invoice.issuedAt?.toLocaleString() || '—', left + 100, 170);

    doc.font('Helvetica-Bold').text('Booking ID:', left, 190)
      .font('Helvetica').text(String(invoice.booking._id), left + 100, 190);

    const guest = (invoice.booking as any).guest;
    doc.font('Helvetica-Bold').text('Guest:', left, 210)
      .font('Helvetica').text(`${guest.name} (${guest.email})`, left + 100, 210);

    doc.moveTo(left, 240).lineTo(545, 240).stroke();

    // Services
    doc.font('Helvetica-Bold').fontSize(12).text('Service', left, 260)
      .text('Price', 400, 260, { width: 90, align: 'right' });

    invoice.services.forEach((s, i) => {
      const y = 280 + i * 20;
      doc.font('Helvetica').fontSize(11)
        .text(s.name, left, y)
        .text(`${s.price.toFixed(2)} PKR`, 400, y, { width: 90, align: 'right' });
    });

    const baseY = 300 + invoice.services.length * 20;
    const bookingPrice = (invoice.booking as any).price || 0;
    doc.font('Helvetica').text('Room Charge', left, baseY)
      .text(`${bookingPrice.toFixed(2)} PKR`, 400, baseY, { width: 90, align: 'right' });

    const totalY = baseY + 30;
    doc.font('Helvetica-Bold').fontSize(14)
      .text('Total Amount:', left, totalY)
      .text(`${invoice.amount.toFixed(2)}`, 400, totalY, { width: 90, align: 'right' });

    doc.fontSize(10).text('Thank you for choosing LuxuryStay.', 50, 750, { align: 'center', width: 500 });
    doc.end();
  } catch (err) {
    console.error('❌ downloadInvoicePDF error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// 5. Aggregate revenue for paid invoices
export const invoiceAggregate = async (_req: Request, res: Response) => {
  try {
    const revenue = await InvoiceModel.aggregate([
      { $match: { paid: true } },
      { $group: { _id: null, sum: { $sum: '$amount' } } }
    ]);
    const sum = revenue[0]?.sum || 0;
    return res.json({ totalRevenue: sum });
  } catch (err) {
    console.error('❌ invoiceAggregate error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
// 6. Mark invoice as paid
export const payInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'Invoice ID is required' });
    }

    const invoice = await InvoiceModel.findByIdAndUpdate(id, { paid: true }, { new: true });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    req.app.get('io')?.emit('invoice:paid', invoice);
    return res.json(invoice);
  } catch (err) {
    console.error('❌ payInvoice error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};