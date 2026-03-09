# libColab - Local Development Setup Guide

This guide will help you set up and run the libColab project independently on your local machine.

## 📋 Prerequisites

Before getting started, make sure you have the following installed:

- **Node.js & npm** (v18 or higher) - [Download](https://nodejs.org/)
- **Python 3.8+** - [Download](https://www.python.org/)
- **MongoDB** - Choose one of the options below:
  - **Local MongoDB**: [Download & Install](https://docs.mongodb.com/manual/installation/)
  - **MongoDB Atlas** (Cloud): [Sign up](https://www.mongodb.com/cloud/atlas) for free

## 🏗️ Project Structure

```
libColab/
├── backend/              # FastAPI Python backend
│   ├── server.py         # Main server file
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Environment variables
├── frontend/             # React frontend
│   ├── src/              # Source code
│   ├── package.json      # NPM dependencies
│   └── .env.local        # Local environment variables
└── README.md             # Project documentation
```

## 🚀 Setup Instructions

### Step 1: Prepare MongoDB

#### Option A: Using Local MongoDB (Recommended for Development)

**macOS (using Homebrew):**

```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Verify MongoDB is running
mongosh
# If connected, type: exit
```

**Linux (Ubuntu/Debian):**

```bash
# Install MongoDB
sudo apt-get install -y mongodb

# Start MongoDB service
sudo systemctl start mongodb

# Verify it's running
mongosh
```

**Windows:**

1. Download [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Run the installer
3. Choose "Install as a Service" during installation
4. MongoDB will auto-start in the background

**Verify MongoDB Connection:**

```bash
mongosh mongodb://localhost:27017
```

#### Option B: Using MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a cluster
4. Get your connection string (should look like: `mongodb+srv://username:password@cluster.mongodb.net/myproject`)
5. Update `MONGO_URL` in `backend/.env`:
   ```
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/libcolab_db
   ```

### Step 2: Setup Backend

```bash
# Navigate to backend directory
cd backend

# Create Python virtual environment
python3 -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
python3 server.py
```

**Expected Output:**

```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

Backend will be available at: **http://localhost:8000**

### Step 3: Setup Frontend

**Open a new terminal window and:**

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

**Expected Output:**

```
Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
  ...
```

Frontend will be available at: **http://localhost:3000**

## ✅ Verification

1. **Check Backend Health:**

   ```bash
   curl http://localhost:8000/ping
   # Should return: {"status":"ok","time":"..."}
   ```

2. **Check MongoDB Connection:**
   - Backend will show successful startup message
   - Check `http://localhost:8000/docs` for API documentation

3. **Check Frontend:**
   - Open http://localhost:3000 in your browser
   - You should see the landing page

## 📝 Environment Variables

### Backend Configuration (`backend/.env`)

| Variable       | Default                     | Description                                  |
| -------------- | --------------------------- | -------------------------------------------- |
| `MONGO_URL`    | `mongodb://localhost:27017` | MongoDB connection string                    |
| `DB_NAME`      | `libcolab_db`               | Database name                                |
| `JWT_SECRET`   | Local key                   | Secret for JWT tokens (change in production) |
| `BACKEND_PORT` | `8000`                      | Backend server port                          |
| `CORS_ORIGINS` | `http://localhost:3000,...` | Allowed CORS origins                         |
| `FRONTEND_URL` | `http://localhost:3000`     | Frontend URL                                 |

### Frontend Configuration (`frontend/.env.local`)

| Variable                | Default                 | Description      |
| ----------------------- | ----------------------- | ---------------- |
| `REACT_APP_BACKEND_URL` | `http://localhost:8000` | Backend API URL  |
| `REACT_APP_ENV`         | `development`           | Environment mode |
| `PORT`                  | `3000`                  | Frontend port    |

## 🛑 Common Issues & Troubleshooting

### MongoDB Connection Error

```
KeyError: 'MONGO_URL'
```

**Solution:** Ensure `backend/.env` exists with `MONGO_URL` set. Start MongoDB:

```bash
brew services start mongodb-community  # macOS
sudo systemctl start mongodb           # Linux
```

### Port Already in Use (Port 8000 or 3000)

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>

# Or use different port in .env
BACKEND_PORT=8001
FRONTEND_PORT=3001
```

### npm Module Errors

```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Python Virtual Environment Issues

```bash
# Recreate virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate  # or on Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 📚 API Documentation

Once the backend is running, access the interactive API documentation:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## 🧪 Running Tests

### Backend Tests

```bash
cd backend
python3 -m pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Full API Test Suite

```bash
cd backend
python3 backend_test.py
```

## 🔄 Stopping the Services

Press `Ctrl+C` in each terminal window to stop:

- Backend server
- Frontend dev server
- MongoDB (if running as service)

To completely stop MongoDB:

```bash
# macOS:
brew services stop mongodb-community

# Linux:
sudo systemctl stop mongodb
```

## 📦 Building for Production

### Frontend Build

```bash
cd frontend
npm run build
# Creates optimized build in `build/` directory
```

### Backend Production Setup

Update environment variables in `backend/.env` for production:

- Use a strong JWT_SECRET
- Update MONGO_URL to production database
- Update CORS_ORIGINS to your domain
- Set DEBUG=false (if implemented)

## 🔐 Security Notes

⚠️ **For Local Development Only:**

- Current JWT_SECRET is for development only
- CORS is set to localhost only
- Database has no authentication (add in production)

**For Production:**

1. Change `JWT_SECRET` to a strong, random string
2. Enable MongoDB authentication
3. Use environment-specific configurations
4. Enable HTTPS
5. Restrict CORS origins to your domain
6. Set up proper logging and monitoring

## 📞 Support & Documentation

- **API Documentation:** http://localhost:8000/docs
- **Frontend Setup:** See `frontend/README.md`
- **Backend Setup:** See `backend/requirements.txt`

## ✨ Next Steps

1. ✅ Complete the setup steps above
2. ✅ Verify all services are running
3. ✅ Check API documentation
4. ✅ Start developing!

Happy developing! 🚀
