# 🏨 LuxuryStay — Hotel Management System

**LuxuryStay** is a role‑based hotel management app that flexes features based on your squad: **Manager**, **Receptionist**, **Housekeeping**, or **Guest**. Built with TypeScript, Express, MongoDB & more — perfect for learning or small‑scale real‑world use.

---

## 🚀 Features by Role

**Manager** 👑  
- 🔍 CRUD & status on **Rooms**  
- 🛠️ CRUD & status on **Issues**  
- 💸 Generate/View/Download/Pay **Invoices**  
- 📅 Schedule/Update/Delete **Tasks**  
- 📋 Manage **Bookings** (view/cancel/status)  

**Receptionist** 💼  
- 🔍 View **Rooms**  
- 📣 Report **Issues**  
- 💸 Generate/View/Download **Invoices**  
- 📅 Schedule/View **Tasks**  
- 📋 View/Update **Bookings**  

**Housekeeping** 🧹  
- 🔍 View/Update **Room Status**  
- 🔍 View/Update **Issue Status**  
- 🔍 View/Update **Task Status**  

**Guest** 🧳  
- 🔍 View **Rooms**  
- 📣 Report **Issues**  
- 💸 View/Download **Your Invoices**  
- 📝 View/Update **Your Profile**  
- 📅 Create/View/Cancel **Your Bookings**  

---

## 📦 Download & Run

1. **Grab the code**  
   - Download ZIP via **Code > Download ZIP**  
   - Or clone it:  
     ```bash
     git clone https://github.com/your-repo-url.git
     ```

2. **Install deps**  
   ```bash
   cd luxurystay
   npm install

Configure env vars
Copy .env.example → .env
Fill in your MongoURI, JWT secrets, SMTP creds, etc.

PORT=4000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/luxurystay
JWT_SECRET=supersecretkey
EMAIL_USER=you@domain.com
EMAIL_PASS=yourEmailPassword


Run in dev
npm run start
This compiles TS (tsc) then boots node ./src/index.mjs

🧩 Scripts & Config
{
  "scripts": {
    "start": "tsc && node ./src/index.mjs",  // build & run
    "dev": "ts-node ./src/index.mjs",         // hot‑reload for dev
    "lint": "eslint . --ext .ts",             // code style checks
    "format": "prettier --write .",           // auto‑format
    "test": "echo \"No tests yet 😅\" && exit 1"
  },
  "dependencies": {
    "express": "^5.1.0",
    "mongoose": "^8.16.2",
    "jsonwebtoken": "^9.0.2",
    // …more in package.json
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "ts-node": "^10.9.2",
    "@types/express": "^5.0.3",
    // …etc
  }
}

🗄️ Database Setup
Stand up a MongoDB Atlas cluster or local Mongo instance.
Point MONGO_URI in .env to it.
On first run, the app auto‑creates collections (users, rooms, issues, tasks, bookings, invoices).

🔒 Auth & Roles
JWT‑based auth: login returns a token you send in Authorization: Bearer <token>.
Role checks in middleware guard endpoints, so users only hit allowed routes.

🛠️ Postman Collection
Grab the postman_collection.json in the root to import all endpoints, example payloads & auth flows.

🤝 Contributing
Fork it 🍴
Create your feature branch: git checkout -b my-awesome-feature
Commit your changes: git commit -m 'feat: add X feature'
Push to branch: git push origin my-awesome-feature
Open a PR — I’ll peep it & merge!

📝 License
Released under the MIT License. Do your thing, have fun, and drop a ⭐ if you like it!