// src/tools/index.ts
import { ToolHandler } from '../types/types.js';
import { bookRoomDirect, cancelBookingDirect, getRoomsDirect, getUserByEmailDirect, getRoomByNumberDirect } from './bookingDB.js';
// previously: import { bookRoomViaApi, ... } from './bookinghttp.js';


export const tools: Record<string, { handler: ToolHandler; schema: any }> = {
  book_room: {
    handler: bookRoomDirect,
    schema: {
      name: 'book_room',
      description: 'Book a room. Provide room (id), checkIn (yyyy-mm-dd), checkOut (yyyy-mm-dd),email, and optional guests.',
      parameters: {
        type: 'object',
        properties: {
          room: { type: 'string' },
          checkIn: { type: 'string' },
          checkOut: { type: 'string' },
          guests: { type: 'integer' },
          email: { type: 'string' }
        },
        required: ['room', 'checkIn', 'checkOut']
      }
    }
  },
  cancel_booking: {
    handler: cancelBookingDirect,
    schema: {
      name: 'cancel_booking',
      description: 'Cancel a booking by bookingId.',
      parameters: {
        type: 'object',
        properties: {
          bookingId: { type: 'string' }
        },
        required: ['bookingId']
      }
    }
  },
  get_rooms: {
    handler: getRoomsDirect,
    schema: {
      name: 'get_rooms',
      description: 'Fetch list of available rooms. Optionally filter by type or checkIn/checkOut dates.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Room type (e.g. deluxe, single, suite)' },
          checkIn: { type: 'string' },
          checkOut: { type: 'string' }
        }
      }
    }
  },
  get_user_by_email: {
    handler: getUserByEmailDirect,
    schema: {
      name: 'get_user_by_email',
      description: 'Fetch user by email (sanitized).',
      parameters: {
        type: 'object',
        properties: {
          email: { type: 'string' }
        },
        required: ['email']
      }
    }
  },
    get_room_by_number: {
    handler: getRoomByNumberDirect,
    schema: {
      name: 'get_room_by_number',
      description: 'Fetch a room by its displayed number (e.g., "101"). Returns room details including _id.',
      parameters: {
        type: 'object',
        properties: {
          roomNumber: { type: 'string' }
        },
        required: ['roomNumber']
      }
    }
  }
}

