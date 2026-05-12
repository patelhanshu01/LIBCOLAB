# libColab — Library Management System

A full-stack Library Management System for schools and institutions, built with FastAPI, React, and MongoDB. Supports multiple user roles with tailored workflows for students, librarians, and administrators.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python · FastAPI · Motor (async MongoDB) |
| Frontend | React · JavaScript |
| Database | MongoDB |
| Auth | JWT (Bearer tokens) |

## User Roles

| Role | Capabilities |
|---|---|
| Student | Browse catalog, borrow books |
| Parent | Monitor student borrowing activity |
| Teacher | Access academic resources |
| Librarian | Manage books, approve borrowing requests |
| Admin | Full system access |
| Guest | Public catalog browsing |

## Features

- Digital and physical book catalog with academic and leisure categories
- Book borrowing workflow: Pending → Approved → Borrowed → Returned / Overdue
- Free, rental, and purchase pricing models
- JWT-based authentication with role-based access control
- File upload support for book covers

## Quick Start

See [LOCAL_SETUP_GUIDE.md](LOCAL_SETUP_GUIDE.md) for full setup instructions.

**Requirements:** Node.js 18+, Python 3.8+, MongoDB

```bash
# Backend
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python3 server.py

# Frontend (new terminal)
cd frontend && npm install && npm start
```

Backend: `http://localhost:8000` · Frontend: `http://localhost:3000`
