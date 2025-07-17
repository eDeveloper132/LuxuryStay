// public/ts/adminSocket.ts

import io from 'socket.io-client';

//
// 1) Define payload interfaces
//
interface BookingCreatedPayload {
  _id: string;
  guest: string;
  room: string;
  checkIn: string;
  checkOut: string;
  price: number;
}

interface InvoiceGeneratedPayload {
  _id: string;
  booking: string;
  guest: string;
  amount: number;
  services: { name: string; price: number }[];
}

//
// 2) Encapsulate Socket.IO client in a class
//
export class Socket {
  // Use ReturnType<typeof io> so TS infers the socket instance type
  private socket: ReturnType<typeof io>;

  constructor(serverUrl = window.location.origin) {
    // Cast to any for unknown opts
    this.socket = io(serverUrl, {
      // @ts-ignore
      withCredentials: true,
      // @ts-ignore
      reconnectionAttempts: 5,
    } as any);

    this.socket.on('connect', () => {
      console.log(`🟢 Connected with socket id: ${this.socket.id}`);
    });

    this.socket.on('connect_error', (err: any) => {
      console.error('⚠️ Connection error:', err.message);
    });

    this.socket.on('disconnect', (reason: any) => {
      console.log(`🔴 Disconnected: ${reason}`);
    });
  }

  // Register handlers
  onBookingCreated(handler: (data: BookingCreatedPayload) => void) {
    this.socket.on('booking:created', handler);
  }

  onInvoiceGenerated(handler: (data: InvoiceGeneratedPayload) => void) {
    this.socket.on('invoice:generated', handler);
  }

  // Unsubscribe if needed
  offBookingCreated() {
    this.socket.off('booking:created');
  }

  offInvoiceGenerated() {
    this.socket.off('invoice:generated');
  }

  // Disconnect cleanly
  disconnect() {
    this.socket.disconnect();
  }
}

//
// 3) Export a singleton instance
//
const allSocket = new Socket('http://localhost:2000');
export default allSocket;
