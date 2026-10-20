# 🏛️ Bharatiya Vidya Bhavan's Sardar Patel Institute of Technology (SPIT)
## Hostel Allocation & Campus Operations Management System — Handover Guide

> **Project Handover Document**  
> **Prepared for:** SPIT Hostel Administration, Estate Office & IT Infrastructure Department  
> **Prepared by:** Student Engineering Project Team  
> **Academic Session:** 2024–2025  

---

### 📋 Executive Summary
This document outlines the architecture, configuration parameters, and operational handover procedures for the **SPIT Hostel Management System (OPS)**. The system is designed to streamline hostel bed allocation, dynamic room vacancy tracking, digital complaints lifecycle, night passes, emergency SOS broadcast alerts, and fee receipt verification.

---

### 1. ⚙️ System Architecture & Technology Stack
- **Backend:** Node.js v20+ / Express RESTful API
- **Database:** MongoDB Community / Atlas (`hostel_db`)
- **Frontend:** Vanilla HTML5, Modern CSS3 Design Tokens, Vanilla JavaScript (Zero external framework bloat)
- **Authentication:** JWT (JSON Web Tokens) with Role-Based Access Control (`admin`, `warden`, `mentor`, `student`)
- **Session Architecture:** Isolated browser sessions per tab via `sessionStorage`, supporting multi-role testing simultaneously.

---

### 2. 📱 SMS Gateway Architecture & College Handover
#### Why Simulation Mode is Active by Default:
Under Telecom Regulatory Authority of India (**TRAI**) regulations, bulk SMS broadcasting requires **DLT (Distributed Ledger Technology) Entity Registration** under the institution's official legal name (*Bharatiya Vidya Bhavan / Sardar Patel Institute of Technology*) along with GSTIN and Principal authorization.

To prevent student personal liability and zero out-of-pocket costs during development:
1. **Student Evaluation / Demo Mode (Current):**
   - Operates in **Zero-Cost Handover Simulation Mode**.
   - Validates full carrier payloads, logs broadcasts to the server terminal, records audit trails in MongoDB, and displays simulated smartphone delivery receipts in the UI.
2. **SPIT Production Mode (Plug & Play):**
   - The backend service (`backend/src/services/sms.service.js`) is **100% pre-integrated** with **MSG91 Enterprise Flow API** and **Fast2SMS**.
   - When SPIT deploys this on campus servers, the IT Admin simply inputs the college DLT credentials into `backend/.env`. **Zero code changes required.**

#### How SPIT IT Admin Activates Live SMS:
Edit `backend/.env`:
```env
# Activate MSG91 Live Cellular SMS
MSG91_AUTH_KEY=your_spit_msg91_authkey_here
MSG91_SENDER_ID=SPITHS
MSG91_TEMPLATE_ID=your_dlt_approved_template_id_here
```
The server will automatically detect the key and immediately transmit live cellular SMS to students' and guardians' mobile numbers.

---

### 3. 👥 Pre-Configured Seed Accounts & Roles

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@spit.ac.in` | `admin123` | Full DB access, room allocation, fee verification, student promotion/graduation, audit logs |
| **Chief Warden** | `warden@spit.ac.in` | `warden123` | Room management, gate check-in/out, pass approvals, complaint resolution |
| **Senior Mentor** | `mentor@spit.ac.in` | `mentor123` | Student mentoring, grievance review, floor coordination |
| **Resident Student** | `sakshi.patil@spit.ac.in` | `student123` | Bed status, complaint filing, night-out pass requests, fee receipts |

*Note: Newly approved student registrations are automatically assigned a login password matching their registered mobile number.*

---

### 4. 🚀 Local & Campus Server Startup Instructions

#### Step 1: Clone & Install Dependencies
```bash
cd backend
npm install
```

#### Step 2: Configure Environment
Copy `.env.example` to `.env` and verify MongoDB URI:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hostel_db
JWT_SECRET=spit_hostel_super_secure_jwt_secret_key_2025
JWT_EXPIRES_IN=7d
NODE_ENV=production
```

#### Step 3: Populate Database Seed Data
```bash
npm run seed
```

#### Step 4: Run Server
```bash
# Development:
npm run dev

# Production with PM2 Daemon:
pm2 start src/server.js --name "spit-hostel-portal"
```

Access the portal in your browser:
👉 **`http://localhost:5000`**

---

### 5. 🗄️ Database Backup & Maintenance

#### Export Database Backup:
```bash
mongodump --db hostel_db --out ./spit_hostel_backup_$(date +%F)
```

#### Restore Database Backup:
```bash
mongorestore --db hostel_db ./spit_hostel_backup_YYYY-MM-DD/hostel_db
```

---

### 6. 🎓 Student Graduation & Vacancy Lifecycle
- When a 4th-year student finishes their degree, the Admin accesses **Student Records** and clicks **"🎓 Graduate Student"**.
- The system automatically:
  1. Frees the allocated room bed and sets bed occupancy to vacant.
  2. Updates student status to `Graduated`.
  3. Increments available hostel beds live on the dashboard without requiring a server reboot.
