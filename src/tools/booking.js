import { BookingModel } from "../models/Booking.js";
import { RoomModel } from "../models/Room.js";
import { UserModel } from "../models/User.js";
// Helper: validate date strings (expects yyyy-mm-dd or ISO)
function parseDateString(s) {
    if (!s)
        return null;
    const d = new Date(String(s));
    return isNaN(d.getTime()) ? null : d;
}
export const bookRoomHandler = async (args, context) => {
    try {
        const room = (args.room ?? args.roomId ?? '');
        const checkInRaw = args.checkIn;
        const checkOutRaw = args.checkOut;
        const guestName = (args.guestName ?? '');
        const guestId = (args.guestId ?? context?.userId ?? '');
        const guests = Number(args.guests ?? 1);
        // Basic validation
        if (!room)
            return 'Error: `room` (room id) is required. Provide room id or roomNumber.';
        const checkIn = parseDateString(checkInRaw);
        const checkOut = parseDateString(checkOutRaw);
        if (!checkIn || !checkOut)
            return 'Error: invalid or missing checkIn/checkOut dates.';
        if (checkIn >= checkOut)
            return 'Error: checkOut must be after checkIn.';
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const checkInStart = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
        if (checkInStart <= todayStart)
            return 'Error: Check-in date must be in the future.';
        // Load room
        const roomDoc = await RoomModel.findById(room);
        if (!roomDoc) {
            return `Error: Room ${room} not found.`;
        }
        // Check overlapping bookings (mirror controller logic)
        const overlapping = await BookingModel.find({
            room,
            status: 'reserved',
            $or: [
                { checkIn: { $lte: checkIn }, checkOut: { $gte: checkIn } },
                { checkIn: { $lte: checkOut }, checkOut: { $gte: checkOut } },
                { checkIn: { $gte: checkIn, $lte: checkOut } },
                { checkOut: { $gte: checkIn, $lte: checkOut } },
            ],
        }).lean();
        if (overlapping.length) {
            return `Error: Booking overlap. Room already reserved for the selected dates.`;
        }
        // Guest must be provided (or supplied via context.userId)
        if (!guestId) {
            // We can still create guest-less booking if your system allows; here we require guestId.
            return 'Error: guestId is required to create a booking. Provide guestId in context or args.';
        }
        const msPerDay = 1000 * 60 * 60 * 24;
        const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / msPerDay);
        const price = days * (roomDoc.price ?? 0);
        const booking = await BookingModel.create({
            guest: guestId,
            room: roomDoc._id,
            checkIn,
            checkOut,
            price,
            status: 'reserved',
            // Add other fields if needed
        });
        // Optionally notify user if email exists
        try {
            const user = await UserModel.findById(guestId);
            if (user?.email) {
                // call your notify function here if present, e.g. notifyUser(user.email, ...)
                // await notifyUser(user.email, `Your booking ${booking._id} has been created`);
            }
        }
        catch (e) {
            // ignore notification errors
        }
        return JSON.stringify({
            message: 'Booking confirmed',
            booking: {
                id: booking._id,
                room: roomDoc.number ?? roomDoc._id,
                roomType: roomDoc.type,
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                price: booking.price,
                status: booking.status,
            },
        }, null, 2);
    }
    catch (err) {
        return `Error in bookRoomHandler: ${err.message ?? String(err)}`;
    }
};
export const cancelBookingHandler = async (args, context) => {
    try {
        const bookingId = String(args.bookingId ?? '');
        const reason = args.reason ? String(args.reason) : undefined;
        const requesterId = (args.requesterId ?? context?.userId);
        const requesterRole = (args.requesterRole ?? context?.role);
        if (!bookingId)
            return 'Error: bookingId is required to cancel a booking.';
        const booking = await BookingModel.findById(bookingId);
        if (!booking)
            return `Error: Booking ${bookingId} not found.`;
        if (booking.status === 'cancelled')
            return `Error: Booking ${bookingId} already cancelled.`;
        // Authorization: allow cancel if requester is owner or privileged role
        const isOwner = requesterId && booking.guest?.toString() === requesterId;
        const isPrivileged = requesterRole && ['admin', 'manager', 'receptionist'].includes(requesterRole);
        if (!isOwner && !isPrivileged) {
            return `Error: Not authorized to cancel this booking. Provide requesterId of owner or use an admin account.`;
        }
        booking.status = 'cancelled';
        if (reason)
            booking.cancelReason = reason;
        await booking.save();
        // Optionally notify guest
        try {
            const user = await UserModel.findById(booking.guest);
            if (user?.email) {
                // await notifyUser(user.email, `Your booking ${booking._id} has been cancelled. Reason: ${reason ?? 'none'}`);
            }
        }
        catch (e) {
            // ignore notification errors
        }
        return JSON.stringify({ success: true, booking: { id: booking._id, status: booking.status } }, null, 2);
    }
    catch (err) {
        return `Error in cancelBookingHandler: ${err.message ?? String(err)}`;
    }
};
