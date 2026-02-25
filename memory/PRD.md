# Library LMS - Product Requirements Document

## Overview
A Learning Management System (LMS) for a library that collaborates with schools (grades 8-12) to promote student learning and engagement. Free academic books for partner school students, leisure books for rent/purchase.

## Core Architecture
- **Backend**: FastAPI + MongoDB (motor async) + JWT authentication
- **Frontend**: React + TailwindCSS + Shadcn UI + Recharts
- **Database**: MongoDB (MONGO_URL from .env)

## User Roles
Student, Parent, Teacher, Librarian, Admin

---

## Implemented Features

### P0 (Core) - Complete
- [x] Role-based JWT authentication (all 5 roles)
- [x] School-based verification login (student ID + school email)
- [x] Book management (Academic free / Leisure paid, digital + physical)
- [x] Course system with modules, quizzes, auto-grading
- [x] Student Dashboard (stats, badges, performance, quiz history, recommendations)
- [x] Parent Dashboard (child progress tabs: progress/quizzes/books/activity)
- [x] Gamification: 5 achievement badges (Book Worm, Quiz Master, etc.)
- [x] Performance-based book recommendations (< 50% quiz score)
- [x] Comprehensive mock data (15 students, 4 teachers, 2 parents, 13 books, 3 courses)
- [x] Certificate system (auto-generated on course completion)

### P1 (Management) - Complete
- [x] Teacher: Full course CRUD (create, edit, delete)
- [x] Teacher: Module management (add, delete, content/video/ordering)
- [x] Teacher: Quiz creation UI (multi-question builder with options, correct answer, marks)
- [x] Teacher: Students needing help identification (< 50% scores)
- [x] Admin: User management (create, delete, search, filter by role)
- [x] Admin: Role change dialog
- [x] Admin: Analytics (pie chart, bar chart, school stats, activity timeline)
- [x] Librarian: Inventory search (title, author, ISBN)
- [x] Librarian: Filters (category, format, stock level) with clear button
- [x] Librarian: Full book CRUD + borrow approve/return

---

## Upcoming Tasks

### P2 (Future)
- [ ] Stripe payment integration for leisure book rental/purchase
- [ ] Verifiable certificate platform integration
- [ ] School Staff dashboard and role
- [ ] Dark mode toggle
- [ ] Reading progress tracking
- [ ] Student leaderboard by school

---

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

## Key API Endpoints
- Auth: POST /api/auth/login, /register, /school-verify
- Books: GET/POST /api/books, PUT/DELETE /api/books/:id
- Courses: GET/POST /api/courses, PUT/DELETE /api/courses/:id
- Modules: POST /api/courses/:id/modules, PUT/DELETE /api/courses/:id/modules/:mid
- Quizzes: POST /api/courses/:id/quizzes, DELETE /api/courses/:id/quizzes/:qid
- Enrollments: GET/POST /api/enrollments, PUT /api/enrollments/:id/progress
- Borrows: GET/POST /api/borrows, PUT /api/borrows/:id/approve, PUT /api/borrows/:id/return
- Admin: POST /api/admin/users, PUT /api/admin/users/:id/role, DELETE /api/admin/users/:id
- Analytics: GET /api/analytics, /api/teacher/analytics
- Student: GET /api/badges/my, /api/performance/report, /api/activity/stats
- Parent: GET /api/parent/children, /api/parent/child/:id/progress
