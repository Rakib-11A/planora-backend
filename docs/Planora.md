# Planora

**Planora** is a secure, JWT-protected web platform where **Admins and registered Users** can create, manage, and participate in events. Events can be **Public or Private** and may include **registration fees**.

---

# Technology Stack

## Frontend
- Next.js
- Tailwind CSS

## Backend
- Node.js
- Express.js
- Prisma ORM

## Database
- PostgreSQL

## Authentication
- Anything you prefer(Custom auth, Passport, Better auth etc)

## Payment Integration
- Stripe/SSLCommerz or anything you prefer

---

# Homepage Design

## Navbar
Links:
- Home
- Events
- Login / Signup
- Dashboard

---

## Section 1: Hero Section
- Featured event selected by Admin
- Event title
- Event date
- Short description
- Join button

---

## Section 2: Upcoming Events Slider
Slider showing **9 upcoming public events**

Each card includes:
- Event title
- Date
- Organizer
- Fee badge (Free / Paid)

---

## Section 3: Event Categories
Filters:
- Public Free
- Public Paid
- Private Free
- Private Paid

---

## Section 4: Call To Action
Encourage users to:
- Create events
- Join events

---

## Footer
Links:
- About
- Contact
- Privacy Policy

---

# Events Page

### Search
Users can search events by:
- Title
- Organizer

### Filters
- Public Free
- Public Paid
- Private Free
- Private Paid

### Event Card
Displays:
- Title
- Date
- Organizer
- Registration Fee
- View Details button

---

# Event Details Page

Displays:

- Title
- Date and Time
- Venue or Event Link
- Description
- Organizer
- Registration Fee

---

## Action Buttons

### Free Public **Join**

### Paid Public **Pay & Join**

### Free Private **Request to Join**

### Paid Private **Pay & Request**

---

## Owner Controls

Event owner can:

- Approve join requests
- Reject join requests
- Ban participants
- Edit event
- Delete event

---

## Reviews and Ratings

Users can:

- Rate events
- Write reviews
- Edit reviews
- Delete reviews (within review period)

---

# Dashboard

## Sidebar

- My Events
- Pending Invitations
- My Reviews
- Settings

---

## My Events

User can:

- Create events
- Update events
- Delete events
- View participants
- Manage approvals

### Event Creation Fields

- Title
- Date
- Time
- Venue
- Description
- Public / Private
- Registration Fee

---

## Invitations

Users can:

- Accept invitations
- Decline invitations
- Pay & Accept (for paid events)

---

## Reviews

Users can:

- View reviews
- Edit reviews
- Delete reviews

---

## Settings

Users can update:

- Profile
- Notifications

---

# Roles & Permissions

## Admin

Admin can:

- Monitor all events
- Monitor users
- Delete inappropriate events
- Delete user accounts

---

## User

Users can:

### Authentication
- Register
- Login

### Event Management
- Create events
- Update events
- Delete events

### Event Discovery
- Browse public events
- Browse private events
- Search events

### Participation

Free Public  
→ Join instantly

Paid Public  
→ Payment required → Pending approval

Private Free  
→ Request to join → Pending approval

Private Paid  
→ Payment required → Pending approval

---

## Invitations

Event hosts can invite users.

Invitees see:

- **Pay & Accept** button for paid events

After payment:

- Status becomes **Pending approval**

---

# Registration Fees & Payments

- Event creators can set **registration fees**
- Payment is processed using:
  - SSLCommerz
  - ShurjoPay

Paid join attempts create **Pending requests** awaiting host approval.

---

# Core Functionality

- Authentication using JWT
- Event CRUD operations
- Role-based access control
- Event participation system
- Invitation system
- Payment workflow
- Participant approval and banning
- Event reviews and ratings

---

# Error Handling

Includes:

### Validation
- Required field validation
- Email validation
- Fee validation

### Loading States
- API loading
- Payment processing

### Error Messages
- Invalid login
- Payment failure
- Unauthorized access

---

# UI/UX Quality

Requirements:

- Responsive design
- Mobile, tablet, and desktop support
- Consistent Tailwind styling
- Clean layout
- Reusable UI components

---

# Commit History Requirement

Minimum **20 meaningful commits** for both client and server

---

# Video Explanation

Video length: **5–10 minutes**

Demonstrate:

1. User Registration
2. Login
3. Create Event
4. Public Free Event Join
5. Paid Event Payment
6. Private Event Join Request
7. Host Approval Process
8. Dashboard Features
9. Admin Moderation
10. Event Reviews
