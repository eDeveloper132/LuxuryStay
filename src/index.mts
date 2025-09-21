import "dotenv/config";
import express, { Request, Response } from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.mjs";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

// Middlewares
import { redirectIfAuthenticated } from "./middleware/redirectifauthenticated.js";
// in-memory pending bookings store: key -> { checkIn, checkOut, guests, email, expiresAt, rooms }
const pendingBookings: Map<string, any> = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of pendingBookings) {
    if (v?.expiresAt && v.expiresAt < now) pendingBookings.delete(k);
  }
}, 60_000);

/**
 * Create a session key for pending bookings.
 * Prefer authenticated userId, fallback to cookie, then IP.
 */
function makeSessionKey(context: { userId?: string | undefined }, rawCookie?: string | undefined, ip?: string) {
  if (context?.userId) return `user:${String(context.userId)}`;
  if (rawCookie) return `cookie:${rawCookie}`;
  return `ip:${ip ?? 'unknown'}`;
}
function parseToolOutput(raw: unknown) {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  return raw;
}
// Routes
import authRoutes from "./routes/auth.js";
import guestRoutes from "./routes/guest.js";
import bookingRoutes from "./routes/booking.js";
import invoiceRoutes from "./routes/invoice.js";
import housekeepingRoutes from "./routes/housekeeping.js";
import maintenanceRoutes from "./routes/maintenance.js";
import roomRoute from "./routes/room.js";
import userManagementRoutes from "./routes/userManagement.js";
import { UserModel } from "./models/User.js";
import { sendVerificationEmailTwo } from "../emailservice.js";
import { Agent } from "./agents/agents.js";
import { CurrentUser } from "./types/types.js";
import { tools } from "./tools/index.js";
import { parseBookingFromPrompt } from "./agents/parsebookings.js";
import { BookingModel } from "./models/Booking.js";
import { RoomModel } from "./models/Room.js";

function getCurrentUser(req: Request): CurrentUser {
  // 1) Body overrides (useful for tests / admin tooling; avoid in prod)
  const body = (req.body ?? {}) as any;
  if (body && (typeof body.id === 'string' || typeof body.role === 'string')) {
    return {
      userId: typeof body.id === 'string' && body.id.trim() !== '' ? body.id : null,
      role: typeof body.role === 'string' && body.role.trim() !== '' ? body.role : null,
    };
  }

  // 2) Cookie (req.cookies.user expected to be JSON or object)
  const raw = (req as any).cookies?.user;
  if (raw) {
    try {
      if (typeof raw === 'string') {
        const parsed = JSON.parse(raw);
        return {
          userId: typeof parsed?.id === 'string' ? parsed.id : null,
          role: typeof parsed?.role === 'string' ? parsed.role : null,
        };
      } else if (typeof raw === 'object' && raw !== null) {
        return {
          userId: typeof raw.id === 'string' ? raw.id : null,
          role: typeof raw.role === 'string' ? raw.role : null,
        };
      }
    } catch {
      // ignore parse errors and continue to headers fallback
    }
  }

  // 3) Headers fallback (testing only)
  const hdrUserId = (req.headers['x-user-id'] as string) ?? (req.headers['x_user_id'] as string) ?? null;
  const hdrRole = (req.headers['x-user-role'] as string) ?? (req.headers['x_user_role'] as string) ?? null;

  return {
    userId: hdrUserId ?? null,
    role: hdrRole ?? null,
  };
}
// Connect to DB
await connectDB();

// Initialize App & Server
const app = express();
const agent = new Agent();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Global IO
app.set("io", io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/guest", guestRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/housekeeping", housekeepingRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/rooms", roomRoute);
app.use("/usermanagement", userManagementRoutes);
// Auth Pages
app.get("/login", redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.resolve("public", "auth", "signin.html"));
});
app.get("/signup", redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.resolve("public", "auth", "signup.html"));
});
app.get('/logout', (req, res) => {
  res.clearCookie('user');
  return res.status(200).json({ message: 'Logged out successfully' });
})


// Home Route (protected + role-based)
app.get("/", (req, res) => {
    res.sendFile(path.resolve("public", "views", "index.html"));
});
app.get("/room-management", (req, res) => {
  res.sendFile(path.resolve("public", "views", "manager", "index.html"));
});
app.get("/issue-management", (req, res) => {
  res.sendFile(path.resolve("public", "views", "manager", "issues.html"));
});
app.get("/task-management", (req, res) => {
  res.sendFile(path.resolve("public", "views", "manager", "tasks.html"));
});
app.get("/invoice-management", (req, res) => {
  res.sendFile(path.resolve("public", "views", "manager", "invoices.html"));
});
app.get('/booking-management', (req, res) => {
  res.sendFile(path.resolve('public', 'views', 'manager', 'bookings.html'));
});
app.get('/hkeep-room', (req, res) => {
res.sendFile(path.resolve('public', 'views', 'housekeeping', 'index.html'));
});
app.get('/hkeep-maintenance', (req, res) => {
  res.sendFile(path.resolve('public', 'views', 'housekeeping', 'issues.html'));
});
app.get('/hkeep-tasks', (req, res) => {
res.sendFile(path.resolve('public', 'views', 'housekeeping', 'tasks.html'));
});
app.get('/recept-rooms', (req, res) => {
  res.sendFile(path.resolve('public', 'views', 'receptionist', 'index.html'));
});
app.get('/recept-invoices', (req, res) => {
res.sendFile(path.resolve('public', 'views', 'receptionist', 'invoices.html'));
});
app.get('/recept-tasks', (req, res) => {
  res.sendFile(path.resolve('public', 'views', 'receptionist', 'tasks.html'));
});
app.get('/recept-bookings', (req, res) => {
  res.sendFile(path.resolve('public', 'views', 'receptionist', 'bookings.html'));
});
app.get('/recept-issue', (req, res) => {
  res.sendFile(path.resolve('public', 'views', 'receptionist', 'report.html'));
});
app.get('/guest-rooms', (req, res) => {
  res.sendFile(path.resolve('public', 'views', 'guest', 'index.html'));
});
app.get('/guest-bookings', (req, res) => {
  res.sendFile(path.resolve('public', 'views', 'guest', 'bookings.html'));
});
app.get('/guest-issues', (req, res) => {
  res.sendFile(path.resolve('public', 'views', 'guest', 'issues.html'));
});
app.post('/agent', async (req, res) => {
  try {
    const prompt = String(req.body.prompt ?? '').trim();
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    // get current user / session context (your existing util)
    const { userId, role } = getCurrentUser(req); // returns { userId, role }
    const rawCookie = req.headers.cookie as string | undefined;
    const clientIp = (req.ip ?? (req.headers['x-forwarded-for'] as string) ?? '').toString();

    const context: any = {
      userId: userId ? String(userId) : undefined,
      role: role ? String(role) : undefined,
      cookie: rawCookie,
    };

    // Parse natural-language booking/cancel request
    const parsed = parseBookingFromPrompt(prompt);

    // Detect intents: CANCEL should be checked before BOOK
    const wantsCancel = /\b(cancel|cancelled|cancel booking|i want to cancel|please cancel|abort booking|remove booking)\b/i.test(prompt);
    const wantsBooking = /\b(book|reserve|reservation|reserve a room|book a room)\b/i.test(prompt);

    const sessionKey = makeSessionKey(context, rawCookie, clientIp);

    // -------------------------
    // CANCEL FLOW (priority)
    // -------------------------
    if (wantsCancel) {
      // 1) If user provides a bookingId (24-hex), prefer direct lookup
      const bookingIdMatch = prompt.match(/\b([0-9a-fA-F]{24})\b/);
      let bookingDoc: any = null;

      if (bookingIdMatch) {
        const bookingId = bookingIdMatch[1];
        bookingDoc = await BookingModel.findById(bookingId).lean();
      } else if (parsed.roomNumber) {
        // 2) If user gave room number: find room -> find booking
        const roomDoc = await RoomModel.findOne({ number: parsed.roomNumber }).lean();
        if (!roomDoc) {
          return res.json({ success: false, result: { ok: false, error: 'room_not_found_for_number', roomNumber: parsed.roomNumber } });
        }

        // Build a booking query prioritizing identity (email or session userId)
        const bookingQuery: any = { room: roomDoc._id, status: { $ne: 'cancelled' } };

        if (parsed.email) {
          const u = await UserModel.findOne({ email: parsed.email.toLowerCase() }).lean();
          if (u) bookingQuery.guest = u._id;
        } else if (context.userId) {
          bookingQuery.guest = context.userId;
        }

        // If dates given, prefer the exact match (helps disambiguate)
        if (parsed.checkIn) bookingQuery.checkIn = new Date(parsed.checkIn);
        if (parsed.checkOut) bookingQuery.checkOut = new Date(parsed.checkOut);

        // Try precise match
        bookingDoc = await BookingModel.findOne(bookingQuery).lean();

        // If not found, broaden search:
        if (!bookingDoc) {
          // If we know guest, try latest booking for that guest on that room
          if (bookingQuery.guest) {
            bookingDoc = await BookingModel.findOne({ room: roomDoc._id, guest: bookingQuery.guest, status: { $ne: 'cancelled' } }).sort({ createdAt: -1 }).lean();
          }
        }

        // Last resort: find any overlapping booking in date range
        if (!bookingDoc && parsed.checkIn && parsed.checkOut) {
          bookingDoc = await BookingModel.findOne({
            room: roomDoc._id,
            status: { $ne: 'cancelled' },
            checkIn: { $lt: new Date(parsed.checkOut) },
            checkOut: { $gt: new Date(parsed.checkIn) }
          }).lean();
        }
      } else {
        // 3) No direct bookingId and no roomNumber — check pendingBookings and fallback to LLM for clarification
        const pending = pendingBookings.get(sessionKey);
        if (pending && pending.rooms && pending.rooms.length) {
          // best to ask an explicit clarifying question (which agent.run will do)
          const out = await agent.run(prompt, context);
          return res.json(out);
        } else {
          // Let LLM clarify which booking to cancel
          const out = await agent.run(prompt, context);
          return res.json(out);
        }
      }

      // If booking not found, ask LLM to clarify or reply to user
      if (!bookingDoc) {
        const out = await agent.run(prompt, context);
        return res.json(out);
      }

      // We have bookingDoc -> call cancel tool
      const cancelTool = tools['cancel_booking'];
      if (!cancelTool) {
        // As fallback, perform direct DB cancellation (must still enforce auth)
        // BUT it's safer to require cancel tool — return error if missing
        return res.json({ success: false, result: { ok: false, error: 'cancel_tool_missing' } });
      }

      // Authorization: ensure current user can cancel this booking
      // (tool should also check, but server-side double-check is good)

      const cancelRaw = await cancelTool.handler({ bookingId: String(bookingDoc._id) }, context);
      const cancelRes = parseToolOutput(cancelRaw);

      // If cancel tool returned ok:false, return friendly result
      if (cancelRes && cancelRes.ok === false) {
        return res.json({ success: true, result: { ok: false, error: cancelRes.error ?? 'cancel_failed', details: cancelRes } });
      }

      // Success — remove any pending booking for session and return result
      try { pendingBookings.delete(sessionKey); } catch {}
      return res.json({ success: true, result: cancelRes });
    } // end cancel flow

    // -------------------------
    // BOOKING FLOW
    // -------------------------
    // If user wants to book, handle list -> choose -> book flows
    if (wantsBooking && !parsed.room && !parsed.roomNumber) {
      // Show rooms & store pending booking
      const getRoomsTool = tools['get_rooms'];
      if (!getRoomsTool) {
        const out = await agent.run(prompt, context);
        return res.json(out);
      }

      const roomArgs: any = {};
      if (parsed.checkIn) roomArgs.checkIn = parsed.checkIn;
      if (parsed.checkOut) roomArgs.checkOut = parsed.checkOut;
      if (req.body.type) roomArgs.type = req.body.type;

      const roomsRaw = await getRoomsTool.handler(roomArgs, context);
      const roomsObj = parseToolOutput(roomsRaw);

      if (roomsObj && roomsObj.ok === false) {
        // fall back to LLM for clarifying Q
        const out = await agent.run(prompt, context);
        return res.json(out);
      }

      // Normalize rooms list
      let roomsToShow: any[] = [];
      if (Array.isArray(roomsObj?.rooms)) roomsToShow = roomsObj.rooms;
      else if (Array.isArray(roomsObj)) roomsToShow = roomsObj;
      else if (roomsObj && typeof roomsObj === 'object' && (roomsObj._id || roomsObj.number)) roomsToShow = [roomsObj];

      if (roomsToShow.length === 0) {
        const fallbackText = parsed.checkIn && parsed.checkOut
          ? `I couldn't find any available rooms from ${parsed.checkIn} to ${parsed.checkOut}. Would you like to try different dates or see all available rooms?`
          : `I couldn't find any available rooms matching that request. Would you like me to show all available rooms or try different dates?`;

        return res.json({ success: true, action: 'no_rooms', message: fallbackText });
      }

      // Store pending booking
      pendingBookings.set(sessionKey, {
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
        guests: parsed.guests,
        email: parsed.email,
        rooms: roomsToShow,
        expiresAt: Date.now() + 5 * 60_000 // TTL: 5 minutes
      });

      // Friendly text
      const listText = roomsToShow.slice(0, 20).map((r: any, idx: number) => {
        const features = Array.isArray(r.features) && r.features.length ? ` • ${r.features.join(', ')}` : '';
        return `${idx + 1}. Room ${r.number} — ${r.type} — $${r.price}${features}`;
      }).join('\n');

      const reply = `I found the following rooms available${parsed.checkIn && parsed.checkOut ? ` from ${parsed.checkIn} to ${parsed.checkOut}` : ''}:\n\n${listText}\n\nReply with the room number (for example: "Room 101") to select and confirm booking.`;
      return res.json({ success: true, action: 'choose_room', message: reply, rooms: roomsToShow });
    }

    // If user provided a room number (selecting a room from a prior list) -> resolve and attempt booking
    if (parsed.roomNumber) {
      const pending = pendingBookings.get(sessionKey);
      const bookingContext = pending ?? {
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
        guests: parsed.guests,
        email: parsed.email
      };

      if (!bookingContext.checkIn || !bookingContext.checkOut) {
        // need dates -> let LLM clarify
        const out = await agent.run(prompt, context);
        return res.json(out);
      }

      // Resolve room by number using specific tool if present or via get_rooms
      const getByNumberTool = tools['get_room_by_number'];
      let roomDoc: any = null;

      if (getByNumberTool) {
        const rlRaw = await getByNumberTool.handler({ roomNumber: parsed.roomNumber }, context);
        const rl = parseToolOutput(rlRaw);
        if (rl && rl.ok === false) {
          const out = await agent.run(prompt, context);
          return res.json(out);
        }
        roomDoc = rl.room ?? (Array.isArray(rl.rooms) ? rl.rooms[0] : rl);
      } else {
        // fallback to get_rooms
        const getRoomsTool = tools['get_rooms'];
        if (!getRoomsTool) {
          const out = await agent.run(prompt, context);
          return res.json(out);
        }
        const rlRaw = await getRoomsTool.handler({ roomNumber: parsed.roomNumber }, context);
        const rl = parseToolOutput(rlRaw);
        if (rl && rl.ok === false) {
          const out = await agent.run(prompt, context);
          return res.json(out);
        }
        roomDoc = Array.isArray(rl.rooms) && rl.rooms.length ? rl.rooms[0] : (Array.isArray(rl) && rl.length ? rl[0] : rl);
      }

      if (!roomDoc) {
        const out = await agent.run(prompt, context);
        return res.json(out);
      }

      // Now call booking tool
      const bookingArgs: any = {
        room: String(roomDoc._id),
        checkIn: bookingContext.checkIn,
        checkOut: bookingContext.checkOut
      };
      if (bookingContext.guests) bookingArgs.guests = bookingContext.guests;
      if (bookingContext.email) bookingArgs.email = bookingContext.email;

      const bookTool = tools['book_room'];
      if (!bookTool) {
        const out = await agent.run(prompt, context);
        return res.json(out);
      }

      const bookRaw = await bookTool.handler(bookingArgs, context);
      const bookRes = parseToolOutput(bookRaw);

      // On success delete pending booking
      if (bookRes && bookRes.ok) pendingBookings.delete(sessionKey);

      return res.json({ success: true, result: bookRes });
    }

    // -------------------------
    // DEFAULT: Hand off to LLM/Agent (clarify or handle other intents)
    // -------------------------
    const out = await agent.run(prompt, context);
    return res.json(out);

  } catch (err: any) {
    console.error('Agent route error:', err);
    return res.status(500).json({ error: err?.message ?? String(err) });
  }
});
app.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(`
      <html>
        <body>
          <h1>Verification token is required.</h1>
        </body>
      </html>
    `);
  }

  try {
    // Find the user with the matching verification token and check if it's still valid
    const user = await UserModel.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>Invalid or expired token.</h1>
          </body>
        </html>
      `);
    }

    // Mark the user as verified
    user.isVerified = true;
    user.verificationToken = "";
    // Clear the token expiry
    await user.save();

    // Send the success message with a redirect after 3 seconds
    res.send(`
      <html>
        <head>
          <meta http-equiv="refresh" content="3;url=/" />
        </head>
        <body>
          <h1>Email verified successfully!</h1>
          <p>You will be redirected shortly...</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("Error verifying email:", error);
    res.status(500).send(`
      <html>
        <body>
          <h1>Server error. Please try again later.</h1>
        </body>
      </html>
    `);
  }
});
app.get('/verify-email-two', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send("Error: Token is required");
  }

  try {
    const user = await UserModel.findOne({
      forgotPasswordToken: token,
      forgotPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send("Error: Invalid or expired token");
    }

    user.forgotPassword = true;
    user.forgotPasswordToken = "";
    await user.save();

    // 🎉 Verified – stash email and redirect
    res.send(`
      <html>
        <head>
          <meta http-equiv="refresh" content="3;url=/forgot-password" />
          <script>
            (function() {
              localStorage.setItem('forgotten', '${user.email}');
            })();
          </script>
        </head>
        <body>
          <h1>Email verified successfully!</h1>
          <p>You’ll be redirected in 3s…</p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).send(/* … */);
  }
});
app.post('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // ensure they went through the forgot flow
    if (!user.forgotPassword) {
      return res.status(403).json({ message: 'Unauthorized reset attempt.' });
    }

    // hash + save new
    user.password = await bcrypt.hash(newPassword, 10);
    user.forgotPassword = false;
    user.updatedAt = new Date();
    await user.save();

    res.status(200).json({ message: 'Password reset successful! 🎉' });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ message: 'Server error. Try later.' });
  }
});
app.get('/forgot-password', (req, res) => {
  res.sendFile(path.resolve('public', 'auth', 'reset-password.html'));
})
app.post('/forgot-password', async(req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }
      const token = uuidv4();
      console.log("Generated verification token:", token);
  
      const hashedToken = await bcrypt.hash(token, 10);
      console.log("Hashed verification token for storage.");

      const user = await UserModel.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
  
      user.forgotPasswordToken = hashedToken;
      user.forgotPasswordExpiry = new Date(Date.now() + 3600000);
      await user.save();
  
      await sendVerificationEmailTwo(email, hashedToken);
      console.log("A password reset link has been sent to the user's email.");
      return res.status(200).json({ message: 'Password reset email sent.' });
  
})
// Socket.IO Connection
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);
  // You can register socket events here if needed
});

// Server Listen
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server + Socket.IO running on http://localhost:${PORT}`);
});
