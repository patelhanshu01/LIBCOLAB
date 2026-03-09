# 🚀 LibColab - Quick Start Guide

## What's Changed?

This project has been successfully **migrated from Emergent to be completely independent**. It now runs entirely on your localhost without any external platform dependencies.

## ⚡ Fastest Way to Get Started

### Option 1: Automatic Startup (Recommended)

**macOS/Linux:**

```bash
cd /Users/hanshupatel/Desktop/Project/libColab/libColab
./start-dev.sh
```

**Windows:**

```cmd
cd Project\libColab\libColab
start-dev.bat
```

This will automatically:

- ✅ Check all prerequisites
- ✅ Create Python virtual environment
- ✅ Install dependencies
- ✅ Start backend on http://localhost:8000
- ✅ Start frontend on http://localhost:3000

---

## 📋 Manual Setup (If Preferred)

### 1. Install MongoDB (Choose One)

#### Option A: Local MongoDB (Recommended)

```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Linux (Ubuntu/Debian)
sudo apt-get install mongodb
sudo systemctl start mongodb

# Windows - Download from: https://www.mongodb.com/try/download/community
```

#### Option B: MongoDB Atlas (Cloud)

1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Update `backend/.env` with your connection string

### 2. Start Backend

```bash
cd backend

# Create virtual environment (first time only)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Start server
python3 server.py
```

**Backend will be at:** http://localhost:8000

### 3. Start Frontend (New Terminal)

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start development server
npm start
```

**Frontend will be at:** http://localhost:3000

---

## ✅ Verify Everything Works

### Check Backend Health

```bash
curl http://localhost:8000/ping
# Expected response: {"status":"ok","time":"..."}
```

### View API Documentation

Open: **http://localhost:8000/docs**

### Access Frontend

Open: **http://localhost:3000** in your browser

---

## 🛠️ Available Commands

### Backend

```bash
cd backend

# Run server
python3 server.py

# Run tests
python3 -m pytest

# Run API tests
python3 backend_test.py
```

### Frontend

```bash
cd frontend

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

---

## 📁 Project Structure

```
libColab/
├── backend/
│   ├── server.py           # Main FastAPI server
│   ├── requirements.txt     # Python dependencies
│   └── .env               # Environment configuration
│
├── frontend/
│   ├── src/               # React source code
│   ├── package.json       # npm dependencies
│   └── .env.local         # Frontend config
│
├── start-dev.sh          # Automated startup (macOS/Linux)
├── start-dev.bat         # Automated startup (Windows)
├── LOCAL_SETUP_GUIDE.md  # Detailed setup instructions
├── MIGRATION_SUMMARY.md  # Changes from Emergent
└── QUICKSTART.md         # This file
```

---

## 🔧 Environment Configuration

### Backend (.env)

- `MONGO_URL`: MongoDB connection string
- `DB_NAME`: Database name (default: libcolab_db)
- `BACKEND_PORT`: Backend port (default: 8000)
- `FRONTEND_URL`: Frontend URL (default: http://localhost:3000)
- `JWT_SECRET`: JWT secret key

### Frontend (.env.local)

- `REACT_APP_BACKEND_URL`: Backend API URL (default: http://localhost:8000)
- `PORT`: Frontend port (default: 3000)

---

## 🐛 Troubleshooting

### "MongoDB connection error"

**Solution:** Start MongoDB

```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongodb
```

### "Port 8000 already in use"

**Solution:** Change port in `backend/.env`

```
BACKEND_PORT=8001
```

### "Port 3000 already in use"

**Solution:** Change port in `frontend/.env.local`

```
PORT=3001
```

### "npm install fails"

**Solution:** Clear cache and reinstall

```bash
cd frontend
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### "Python module not found"

**Solution:** Activate virtual environment

```bash
cd backend
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate     # Windows
```

---

## 📚 Full Documentation

For detailed information, see:

- **Setup Instructions:** `LOCAL_SETUP_GUIDE.md`
- **Migration Details:** `MIGRATION_SUMMARY.md`
- **API Documentation:** http://localhost:8000/docs (when running)

---

## 🎯 What's Next?

1. ✅ Start the services using the startup scripts
2. ✅ Open http://localhost:3000 in your browser
3. ✅ Review API docs at http://localhost:8000/docs
4. ✅ Start building features!

---

## 📞 Need Help?

1. Check `LOCAL_SETUP_GUIDE.md` for detailed troubleshooting
2. Review `MIGRATION_SUMMARY.md` for what changed
3. Check API documentation at http://localhost:8000/docs
4. Verify all services are running on correct ports

---

## ✨ Project Status

- ✅ **Independent:** No Emergent dependencies
- ✅ **Configured:** All set for localhost development
- ✅ **Documented:** Complete setup and migration guides
- ✅ **Ready:** Start developing immediately

---

**Happy Developing! 🚀**

Last updated: March 2, 2026
