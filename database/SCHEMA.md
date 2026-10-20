# HostelIQ — Database Schema Documentation

## Database: `hostel_db` (MongoDB)

---

## Collections

### 1. `users`
Stores warden / admin / staff accounts.

| Field      | Type    | Notes                                |
|------------|---------|--------------------------------------|
| _id        | ObjectId| Auto-generated                       |
| name       | String  | Required                             |
| email      | String  | Unique, lowercase                    |
| password   | String  | bcrypt hashed, never returned in GET |
| role       | String  | `admin` \| `warden` \| `staff`       |
| isActive   | Boolean | Soft-delete flag                     |
| createdAt  | Date    | Auto                                 |
| updatedAt  | Date    | Auto                                 |

---

### 2. `rooms`
Represents physical hostel rooms.

| Field        | Type     | Notes                                          |
|--------------|----------|------------------------------------------------|
| _id          | ObjectId | Auto-generated                                 |
| roomNumber   | String   | Unique, uppercase e.g. `A101`                  |
| block        | String   | Wing/Block letter e.g. `A`                     |
| floor        | Number   | 0 = ground floor                               |
| capacity     | Number   | Max beds (1–10)                                |
| roomType     | String   | `single` \| `double` \| `triple` \| `dormitory`|
| amenities    | [String] | e.g. `['WiFi', 'AC']`                          |
| monthlyRent  | Number   | In INR                                         |
| occupiedBeds | Number   | Synced from allocations (denormalized)         |
| isActive     | Boolean  | Soft-delete                                    |

**Virtuals** (computed, not stored):
- `occupancyStatus`: `empty` (0 occupied) / `partial` / `full`
- `availableBeds`: capacity − occupiedBeds

**UI color mapping:**
- 🔴 `empty`   → Red card
- 🟡 `partial` → Yellow card
- 🟢 `full`    → Green card

---

### 3. `students`
Hostel resident profiles.

| Field         | Type    | Notes                      |
|---------------|---------|----------------------------|
| _id           | ObjectId| Auto-generated             |
| studentId     | String  | Unique, e.g. `STU001`      |
| name          | String  | Full name                  |
| email         | String  | Unique college email        |
| phone         | String  | 10-digit                   |
| course        | String  | e.g. `B.Tech`              |
| year          | Number  | 1–6                        |
| department    | String  | e.g. `Computer Science`    |
| gender        | String  | `male` \| `female` \| `other`|
| guardianName  | String  | Optional                   |
| guardianPhone | String  | Optional                   |
| address       | String  | Optional                   |
| isActive      | Boolean | Soft-delete                |

---

### 4. `allocations`
Links a student to a specific bed in a room.

| Field        | Type     | Notes                                     |
|--------------|----------|-------------------------------------------|
| _id          | ObjectId | Auto-generated                            |
| room         | ObjectId | Ref → `rooms`                             |
| student      | ObjectId | Ref → `students`                          |
| bedNumber    | Number   | Which bed (1, 2, 3…)                      |
| checkInDate  | Date     | Required                                  |
| checkOutDate | Date     | Set when vacated                          |
| academicYear | String   | e.g. `2024-25`                            |
| status       | String   | `active` \| `vacated` \| `transferred`    |
| remarks      | String   | Optional notes                            |
| allocatedBy  | ObjectId | Ref → `users` (who made the allocation)   |
| createdAt    | Date     | Auto                                      |

**Business Rules:**
- One student → one active allocation at a time
- One bed (room + bedNumber) → one active allocation at a time
- Vacating an allocation decrements `room.occupiedBeds`

---

## Indexes

```
users:       { email: 1 } unique
rooms:       { roomNumber: 1 } unique, { block: 1, floor: 1 }
students:    { studentId: 1 } unique, { email: 1 } unique, text index on name/studentId/email
allocations: { student: 1, status: 1 }, { room: 1, bedNumber: 1, status: 1 }
```

---

## Seed Data
Run `npm run seed` in the `backend/` folder to populate:
- 3 users (admin, warden, staff)
- 128 rooms (4 blocks × 4 floors × 8 rooms each)
- 80 students
- 60 active allocations (mixed occupancy for realistic dashboard)
