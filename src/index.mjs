import "dotenv/config";
import express from "express";
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
// Connect to DB
await connectDB();
// Initialize App & Server
const app = express();
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
});
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.error("Error verifying email:", error);
        res.status(500).send( /* … */);
    }
});
app.post('/reset-password', async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    if (!email || !oldPassword || !newPassword) {
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
        // check old password
        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) {
            return res.status(401).json({ message: 'Old password is incorrect.' });
        }
        // hash + save new
        user.password = await bcrypt.hash(newPassword, 10);
        user.forgotPassword = false;
        user.updatedAt = new Date();
        await user.save();
        res.status(200).json({ message: 'Password reset successful! 🎉' });
    }
    catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({ message: 'Server error. Try later.' });
    }
});
app.get('/forgot-password', (req, res) => {
    res.sendFile(path.resolve('public', 'auth', 'reset-password.html'));
});
app.post('/forgot-password', async (req, res) => {
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
});
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
