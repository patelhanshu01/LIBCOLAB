# Library LMS - Product Requirements Document

## Overview
A Learning Management System (LMS) for a library that collaborates with schools (grades 8-12) to promote student learning and engagement. The system provides free access to academic books for students from partner schools and offers leisure/fun activity books for rent or purchase.

## Core Architecture
- **Backend**: FastAPI + MongoDB (motor async) + JWT authentication
- **Frontend**: React + TailwindCSS + Shadcn UI + Recharts
- **Database**: MongoDB (MONGO_URL from .env)

## User Roles
- Student, Parent, Teacher, Librarian, Admin

## Key Features

### Implemented (P0 Complete)
- [x] **Role-based authentication** - JWT-based login/register for all roles
- [x] **School-based verification login** - Students/teachers login via school selection, ID, school email
- [x] **Book management** - Academic (free) and Leisure (rent/buy), digital + physical
- [x] **Course system** - Enrollment, modules, quizzes with auto-grading
- [x] **Student Dashboard** - Stats, badges tab, performance tab with quiz history & recommendations
- [x] **Parent Dashboard** - Child progress, quiz results, borrowed books, activity timeline (tabs)
- [x] **Teacher Dashboard** - Course management, student analytics, low-performers identification
- [x] **Librarian Dashboard** - Full book CRUD (add/edit/delete), borrow approval, return handling
- [x] **Admin Dashboard** - Analytics charts, user management, system overview
- [x] **Gamification** - 5 achievement badges (Book Worm, Quiz Master, Perfect Attendance, Course Champion, Speed Reader)
- [x] **Performance-based recommendations** - Books suggested for students scoring < 50% on quizzes
- [x] **Comprehensive mock data** - 15 students, 4 teachers, 2 parents, 13 books, 3 courses with quiz results
- [x] **Certificate system** - Auto-generated on course completion

### Upcoming (P1)
- [ ] Course/quiz creation UI for teachers (beyond basic course creation)
- [ ] Full module management in teacher dashboard
- [ ] Enhanced admin management (user CRUD, school management)

### Future (P2)
- [ ] Stripe payment integration for leisure books
- [ ] Verifiable certificate platform integration
- [ ] School Staff dashboard and role
- [ ] Dark mode toggle
- [ ] Reading progress tracking

## Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@library.com | admin123 |
| Student | t.anderson@nths.edu | student123 |
| Parent | parent@family.com | parent123 |
| Teacher | m.johnson@nths.edu | teacher123 |
| Librarian | librarian@library.com | librarian123 |

### School Login (NTHS)
- Student: ID=NTHS-2024-001, Email=t.anderson@nths.edu, Pass=student123
- Teacher: ID=T-NTHS-001, Email=m.johnson@nths.edu, Pass=teacher123

## Database Collections
users, books, courses, enrollments, borrows, activities, quiz_results, certificates, schools, payments

## Key API Endpoints
- POST /api/auth/login, /api/auth/register, /api/auth/school-verify
- GET/POST /api/books, PUT/DELETE /api/books/:id
- GET/POST /api/courses, /api/courses/:id/modules, /api/courses/:id/quizzes
- GET/POST /api/enrollments, PUT /api/enrollments/:id/progress
- GET/POST /api/borrows, PUT /api/borrows/:id/approve, PUT /api/borrows/:id/return
- GET /api/badges/my, /api/performance/report, /api/activity/stats
- GET /api/parent/children, /api/parent/child/:id/progress
- GET /api/teacher/analytics, /api/analytics
