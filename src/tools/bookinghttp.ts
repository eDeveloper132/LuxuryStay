// src/tools/bookingHttp.ts
import { ToolHandler } from "../types/types.js";

const API_BASE = process.env.API_BASE ?? 'http://localhost:2000'; // adjust if needed

type Context = { userId?: string; role?: string; cookie?: string | undefined };

function buildAuthHeaders(ctx: Context) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (ctx.cookie) headers['cookie'] = ctx.cookie;
  if (!ctx.cookie && ctx.userId) headers['x-user-id'] = ctx.userId;
  if (!ctx.cookie && ctx.role) headers['x-user-role'] = ctx.role;
  return headers;
}

/**
 * Helper: look up a user by email via your API.
 * Expects your API to expose something like GET /api/users?email=... and to return 200 + user JSON when allowed.
 */
// inside src/tools/bookingHttp.ts (replace only fetchUserByEmail)
async function fetchUserByEmail(email: string, ctx: Context) {
  try {
    // validate email-ish quickly
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: 'invalid_email_format' };
    }

    // NOTE: your controller uses req.params.email, so call the path with the email as a route param
    // change this path if your backend expects a different shape (e.g. /api/users?email=...)
    const url = `${API_BASE}/usermanagement/email/${encodeURIComponent(email)}`;

    const resp = await fetch(url, { method: 'GET', headers: buildAuthHeaders(ctx) });
    const text = await resp.text();

    let parsed: any;
    try { parsed = JSON.parse(text); } catch { parsed = text; }

    if (resp.status === 404) {
      return { ok: false, status: 404, reason: 'not_found', body: parsed };
    }

    if (!resp.ok) {
      return { ok: false, status: resp.status, body: parsed };
    }

    // assume API returns user object (or { user: {...} } ) — normalize both
    const user = parsed?.user ?? parsed;
    return { ok: true, user };
  } catch (err: any) {
    return { ok: false, error: String(err.message ?? err) };
  }
}

/**
 * POST to /api/bookings (your createBooking controller expects room, checkIn, checkOut in the body).
 * If args.email is present, try to resolve userId by calling your users API first.
 */
export const bookRoomViaApi: ToolHandler = async (args, context = {}) => {
  try {
    const room = String(args.room ?? args.roomId ?? '');
    const checkIn = String(args.checkIn ?? '');
    const checkOut = String(args.checkOut ?? '');
    const guests = args.guests ?? undefined;
    const email = args.email ? String(args.email).trim() : undefined;

    if (!room || !checkIn || !checkOut) {
      return 'Error: room, checkIn and checkOut are required. Example: room: "<roomId>", checkIn: "2025-10-01", checkOut: "2025-10-03"';
    }

    const headers = buildAuthHeaders(context as Context);
    const body: any = { room, checkIn, checkOut };
    if (guests) body.guests = guests;

    // If an email is provided, try to resolve user and attach guest/user id
    if (email) {
      const userRes = await fetchUserByEmail(email, context as Context);
      if (!userRes.ok) {
        // Return helpful failure so the model can ask the user to confirm email or authenticate
        return JSON.stringify({ ok: false, reason: 'user_lookup_failed', details: userRes }, null, 2);
      }
      const user = userRes.user;
      const userId = user?._id ?? user?.id ?? null;
      if (!userId) {
        return JSON.stringify({ ok: false, reason: 'user_lookup_no_id', user }, null, 2);
      }
      // attach guest id into body (your controller expects guest from session,
      // but passing it here is useful if backend accepts explicit guest id)
      body.guest = userId;
    }

    const url = `${API_BASE}/api/bookings`;
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

    if (!resp.ok) {
      return JSON.stringify({ ok: false, status: resp.status, body: parsed }, null, 2);
    }
    return JSON.stringify({ ok: true, status: resp.status, body: parsed }, null, 2);
  } catch (err: any) {
    return `Error calling booking API: ${err.message ?? String(err)}`;
  }
};

/**
 * Cancel booking via your cancel endpoint (keep as you had).
 */
export const cancelBookingViaApi: ToolHandler = async (args, context = {}) => {
  try {
    const bookingId = String(args.bookingId ?? args.id ?? '');
    if (!bookingId) return 'Error: bookingId is required to cancel a booking.';

    const headers = buildAuthHeaders(context as Context);

    const url = `${API_BASE}/api/bookings/${bookingId}/cancel`;
    const r = await fetch(url, { method: 'PATCH', headers });
    const t = await r.text();
    let parsed;
    try { parsed = JSON.parse(t); } catch { parsed = t; }
    if (!r.ok) {
      return JSON.stringify({ ok: false, status: r.status, body: parsed }, null, 2);
    }
    return JSON.stringify({ ok: true, method: 'PATCH /cancel', result: parsed }, null, 2);
  } catch (err: any) {
    return `Error calling cancel booking API: ${err.message ?? String(err)}`;
  }
};

/**
 * GET rooms list
 */
export const getRoomsViaApi: ToolHandler = async (args, context = {}) => {
  try {
    const headers = buildAuthHeaders(context as Context);
    const params = new URLSearchParams();
    if (args.type) params.append('type', String(args.type));
    if (args.capacity) params.append('capacity', String(args.capacity));
    const url = `${API_BASE}/api/rooms${params.toString() ? '?' + params.toString() : ''}`;
    const resp = await fetch(url, { method: 'GET', headers });
    const text = await resp.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    if (!resp.ok) return JSON.stringify({ ok: false, status: resp.status, body: parsed }, null, 2);
    return JSON.stringify({ ok: true, status: resp.status, rooms: parsed }, null, 2);
  } catch (err: any) {
    return `Error fetching rooms API: ${err.message ?? String(err)}`;
  }
};

/**
 * Optional explicit user lookup tool (model can call this directly if needed)
 */
export const getUserByEmailViaApi: ToolHandler = async (args, context = {}) => {
  try {
    const email = String(args.email ?? '').trim();
    if (!email) return 'Error: email is required';
    const res = await fetchUserByEmail(email, context as Context);
    return JSON.stringify(res, null, 2);
  } catch (err: any) {
    return `Error calling user lookup API: ${err.message ?? String(err)}`;
  }
};
