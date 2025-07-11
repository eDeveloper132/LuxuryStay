import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.mjs";
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
    res.sendFile(path.resolve("public", "views", "signin.html"));
});
app.get("/signup", redirectIfAuthenticated, (req, res) => {
    res.sendFile(path.resolve("public", "views", "signup.html"));
});
app.get('/logout', (req, res) => {
    res.clearCookie('user');
    return res.status(200).json({ message: 'Logged out successfully' });
});
// Home Route (protected + role-based)
app.get("/", (req, res) => {
    res.send("Hello from LuxuryStay User!");
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
