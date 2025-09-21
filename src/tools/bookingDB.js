import mongoose from "mongoose";
import { BookingModel } from "../models/Booking.js";
import { RoomModel } from "../models/Room.js";
import { UserModel } from "../models/User.js";
function parseDateStrict(d) {
    const s = String(d ?? '').trim();
    const dt = new Date(s);
    if (isNaN(dt.getTime()))
        return null;
    // normalize to start of day (UTC) to avoid timezone oddities
    dt.setUTCHours(0, 0, 0, 0);
    return dt;
}
async function isRoomAvailable(roomId, checkIn, checkOut) {
    // Overlap check: find bookings for this room that are not cancelled and overlap
    // existing.checkIn < new.checkOut && existing.checkOut > new.checkIn  => overlap
    const overlap = await BookingModel.findOne({
        room: roomId,
        status: { $ne: 'cancelled' },
        $or: [
            { checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } }
        ]
    }).lean();
    return !overlap;
}
export const getUserByEmailDirect = async (args, ctx = {}) => {
    try {
        const email = String(args.email ?? '').trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return JSON.stringify({ ok: false, error: 'invalid_email' });
        }
        const user = await UserModel.findOne({ email }).select('-password -forgotPasswordToken -verificationToken').lean();
        if (!user)
            return JSON.stringify({ ok: false, status: 404, error: 'not_found' });
        return JSON.stringify({ ok: true, user }, null, 2);
    }
    catch (err) {
        return JSON.stringify({ ok: false, error: String(err.message ?? err) });
    }
};
export const getRoomByNumberDirect = async (args, ctx = {}) => {
    try {
        const roomNumber = String(args.roomNumber ?? args.number ?? '').trim();
        if (!roomNumber)
            return JSON.stringify({ ok: false, error: 'roomNumber_required' });
        const room = await RoomModel.findOne({ number: roomNumber }).lean();
        if (!room)
            return JSON.stringify({ ok: false, status: 404, error: 'not_found' });
        return JSON.stringify({ ok: true, room }, null, 2);
    }
    catch (err) {
        return JSON.stringify({ ok: false, error: String(err.message ?? err) });
    }
};
export const getRoomsDirect = async (args, ctx = {}) => {
    try {
        const filter = {};
        // filter by type if provided
        if (args.type)
            filter.type = String(args.type);
        // by default only show rooms marked 'available' in the RoomModel
        filter.status = 'available';
        // parse optional date range
        const checkIn = args.checkIn ? parseDateStrict(args.checkIn) : null;
        const checkOut = args.checkOut ? parseDateStrict(args.checkOut) : null;
        // If caller supplied a human-friendly roomNumber (or number), resolve that specific room
        const roomNumber = args.roomNumber ?? args.number ?? null;
        if (roomNumber) {
            const rnum = String(roomNumber).trim();
            const found = await RoomModel.findOne({ number: rnum }).lean();
            if (!found) {
                return JSON.stringify({ ok: false, status: 404, error: 'room_not_found_for_number', roomNumber: rnum }, null, 2);
            }
            // If checkIn/checkOut provided, verify availability for that specific room
            if (checkIn && checkOut) {
                const avail = await isRoomAvailable(String(found._id), checkIn, checkOut);
                if (!avail) {
                    return JSON.stringify({ ok: true, count: 0, rooms: [] }, null, 2);
                }
            }
            // return single-room array to keep response consistent with list mode
            return JSON.stringify({ ok: true, count: 1, rooms: [found] }, null, 2);
        }
        // No specific roomNumber: find all rooms that match the filter
        let rooms = await RoomModel.find(filter).lean();
        // If date-range provided, filter out rooms with overlapping bookings
        if (checkIn && checkOut) {
            const availableRooms = [];
            for (const r of rooms) {
                const avail = await isRoomAvailable(String(r._id), checkIn, checkOut);
                if (avail)
                    availableRooms.push(r);
            }
            rooms = availableRooms;
        }
        return JSON.stringify({ ok: true, count: rooms.length, rooms }, null, 2);
    }
    catch (err) {
        return JSON.stringify({ ok: false, error: String(err.message ?? err) }, null, 2);
    }
};
export const bookRoomDirect = async (args, ctx = {}) => {
    const session = await mongoose.startSession();
    try {
        const roomId = String(args.room ?? args.roomId ?? '').trim();
        const checkIn = parseDateStrict(args.checkIn);
        const checkOut = parseDateStrict(args.checkOut);
        const guests = args.guests ? Number(args.guests) : undefined;
        const email = args.email ? String(args.email).trim().toLowerCase() : undefined;
        if (!roomId || !checkIn || !checkOut) {
            return JSON.stringify({ ok: false, error: 'room_and_dates_required' });
        }
        if (checkOut <= checkIn) {
            return JSON.stringify({ ok: false, error: 'checkOut_must_be_after_checkIn' });
        }
        // permission check example: only certain roles allowed to create booking on behalf of others
        // find room
        const room = await RoomModel.findById(roomId).lean();
        if (!room)
            return JSON.stringify({ ok: false, error: 'room_not_found' });
        // check availability
        const available = await isRoomAvailable(roomId, checkIn, checkOut);
        if (!available)
            return JSON.stringify({ ok: false, error: 'room_unavailable' });
        // resolve user/guest
        let guestId = null;
        if (email) {
            const user = await UserModel.findOne({ email }).lean();
            if (!user)
                return JSON.stringify({ ok: false, error: 'user_not_found_for_email' });
            guestId = user._id;
        }
        else if (ctx.userId) {
            guestId = ctx.userId;
        }
        else {
            return JSON.stringify({ ok: false, error: 'guest_identification_required' });
        }
        // compute price (nights * room.price). Basic example
        const msPerDay = 1000 * 60 * 60 * 24;
        const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / msPerDay);
        const price = (room.price ?? 0) * nights;
        // create booking inside a transaction
        let bookingDoc;
        await session.withTransaction(async () => {
            bookingDoc = await BookingModel.create([{
                    guest: guestId,
                    room: room._id,
                    checkIn,
                    checkOut,
                    status: 'reserved',
                    price
                }], { session });
            // bookingDoc is an array of docs because create([..]) returns an array
            bookingDoc = bookingDoc[0].toObject();
            // optionally: do not mark room occupied now; that is for check-in flow
        });
        return JSON.stringify({ ok: true, booking: bookingDoc }, null, 2);
    }
    catch (err) {
        return JSON.stringify({ ok: false, error: String(err.message ?? err) });
    }
    finally {
        session.endSession();
    }
};
export const cancelBookingDirect = async (args, ctx = {}) => {
    try {
        const bookingId = String(args.bookingId ?? args.id ?? '').trim();
        if (!bookingId)
            return JSON.stringify({ ok: false, error: 'bookingId_required' });
        const booking = await BookingModel.findById(bookingId);
        if (!booking)
            return JSON.stringify({ ok: false, error: 'booking_not_found' });
        booking.status = 'cancelled';
        await booking.save();
        // Optionally: update RoomModel status if you maintain it while reserved (not recommended)
        // If you store room availability based on bookings, no update required.
        return JSON.stringify({ ok: true, bookingId, status: 'cancelled' }, null, 2);
    }
    catch (err) {
        return JSON.stringify({ ok: false, error: String(err.message ?? err) });
    }
};
