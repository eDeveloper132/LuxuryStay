# LuxuryStay User Application

## Project Overview

LuxuryStay is a comprehensive role-based hotel management application that provides different features based on the user type. The system supports four distinct roles: **Manager**, **Receptionist**, **Housekeeping**, and **Guest**. Built with TypeScript, Express, MongoDB, and additional modern tools, it's designed for learning purposes or small-scale real-world use.

## Features by Role

### Manager (👑)
- 🔍 CRUD & status management on **Rooms**
- 🛠️ CRUD & status management on **Issues**
- 💸 Generate, view, download, and pay **Invoices**
- 📅 Schedule, update, and delete **Tasks**
- 📋 Manage **Bookings** (view, cancel, update status)

### Receptionist (💼)
- 🔍 View **Rooms**
- 📣 Report **Issues**
- 💸 Generate, view, and download **Invoices**
- 📅 Schedule and view **Tasks**
- 📋 View and update **Bookings**

### Housekeeping (🧹)
- 🔍 View and update **Room Status**
- 🔍 View and update **Issue Status**
- 🔍 View and update **Task Status**

### Guest (🧳)
- 🔍 View **Rooms**
- 📣 Report **Issues**
- 💸 View and download **Own Invoices**
- 📝 View and update **Own Profile**
- 📅 Create, view, and cancel **Own Bookings**

## Technology Stack

- **Backend**: Node.js + Express.js (v5.1.0)
- **Language**: TypeScript with ESNext target
- **Database**: MongoDB with Mongoose ODM (v8.16.2)
- **Authentication**: JWT (JSON Web Tokens) with cookie-based sessions
- **Styling**: Tailwind CSS
- **Real-time Communication**: Socket.IO
- **Security**: bcrypt for password hashing
- **Email Services**: Nodemailer
- **AI Integration**: OpenAI API and Pinecone vector database
- **PDF Generation**: PDFKit for invoice generation
- **Environment**: dotenv for environment variable management
- **CORS**: Cross-origin resource sharing support
- **Utilities**: UUID for unique identifiers, MathJS for mathematical operations

## Architecture & Structure

### Directory Structure
```
luxurystay-user/
├── .env
├── .env.example
├── .gitignore
├── LICENSE
├── package-lock.json
├── package.json
├── Readme.md
├── tsconfig.json
├── vercel.json
├── emailconfig.js
├── emailconfig.ts
├── emailservice.js
├── emailservice.ts
├── node_modules/
├── public/              # Static assets and HTML pages
└── src/
    ├── agents/          # AI agent system
    ├── client/          # Client-side utilities
    ├── config/          # Configuration files
    ├── controllers/     # Request handling logic
    ├── memory/          # Session and state management
    ├── middleware/      # Express middleware
    ├── models/          # Mongoose schemas
    ├── routes/          # API route definitions
    ├── tools/           # AI tools and utilities
    ├── types/           # TypeScript type definitions
    └── utils/           # Utility functions
```

## Building and Running

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local instance or cloud Atlas)
- Environment variables configured in `.env` files

### Setup Instructions

1. Navigate to the project directory:
```bash
cd luxurystay-user
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:
```
PORT=4000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/luxurystay
JWT_SECRET=supersecretkey
EMAIL_USER=you@domain.com
EMAIL_PASS=yourEmailPassword
```

4. Build and run the application:
```bash
npm run start
```

This compiles TypeScript (tsc) and boots the Node.js server.

For development with hot-reload:
```bash
npx ts-node ./src/index.mjs
```

## Key Endpoints

### Authentication
- `/api/auth` - Authentication-related endpoints
- `/login` - Login page
- `/signup` - Signup page
- `/logout` - Logout functionality
- `/verify-email` - Email verification
- `/verify-email-two` - Secondary email verification
- `/reset-password` - Password reset endpoint

### Role-based Views
- `/` - Main dashboard (role-dependent)
- `/room-management` - Manager room management
- `/issue-management` - Manager issue management
- `/task-management` - Manager task management
- `/invoice-management` - Manager invoice management
- `/booking-management` - Manager booking management
- `/hkeep-room` - Housekeeping room view
- `/hkeep-maintenance` - Housekeeping maintenance view
- `/hkeep-tasks` - Housekeeping tasks view
- `/recept-rooms` - Receptionist rooms view
- `/recept-invoices` - Receptionist invoices view
- `/recept-tasks` - Receptionist tasks view
- `/recept-bookings` - Receptionist bookings view
- `/recept-issue` - Receptionist issue reporting
- `/guest-rooms` - Guest rooms view
- `/guest-bookings` - Guest bookings view
- `/guest-issues` - Guest issue reporting

### API Endpoints
- `/api/guest` - Guest-related APIs
- `/api/bookings` - Booking management APIs
- `/api/invoices` - Invoice management APIs
- `/api/housekeeping` - Housekeeping APIs
- `/api/maintenance` - Maintenance APIs
- `/api/rooms` - Room management APIs
- `/usermanagement` - User management APIs

### AI Agent Endpoint
- `/agent` - AI-powered booking and management assistant

## Database Models

The application includes several Mongoose models:
- **User Model**: Account management and role-based access
- **Room Model**: Room information and availability
- **Booking Model**: Booking records and status
- **Invoice Model**: Financial records and payments
- **Issue Model**: Maintenance and reporting system
- **Task Model**: Task assignment and completion tracking

## AI Integration

The application features an AI agent system that can:
- Parse booking requests from natural language
- Handle room booking processes
- Process booking cancellations
- Show available rooms based on criteria
- Assist with other hotel management tasks through a `/agent` endpoint

The AI system uses OpenAI API integration with custom tools defined in the `/tools/` directory.

## Email Services

The application includes comprehensive email functionality:
- Account verification emails
- Password reset functionality
- Booking confirmations
- Custom email configuration files (both JavaScript and TypeScript versions)

## Security

- JWT-based authentication system
- Password hashing with bcrypt
- Cookie-based session management
- Role-based access control
- Protected routes with middleware
- Input validation and sanitization

## Development Conventions

- TypeScript is used throughout the application
- Modern ESNext features with NodeNext module resolution
- Strict TypeScript configuration with comprehensive type checking
- Consistent file naming with .mjs for modules
- Comprehensive documentation in JSDoc style

## Deployment

The project includes a `vercel.json` file, suggesting it's configured for deployment on Vercel. The application can also be deployed to other Node.js hosting platforms with minimal configuration.

## Testing

The default npm test command currently just echoes an error message, indicating that tests would need to be added as needed. The suggested commands for development include:
- Linting: `npm run lint` (eslint)
- Formatting: `npm run format` (prettier)