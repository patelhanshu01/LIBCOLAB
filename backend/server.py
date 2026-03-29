from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import re
import jwt
import bcrypt
from enum import Enum
import random
import uvicorn

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'library-lms-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
import os

# Lifespan event handler (replaces deprecated on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
    client.close()

app = FastAPI(title="Library LMS API", lifespan=lifespan)
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ===================== ENUMS =====================
class UserRole(str, Enum):
    STUDENT = "student"
    PARENT = "parent"
    TEACHER = "teacher"
    LIBRARIAN = "librarian"
    ADMIN = "admin"
    GUEST = "guest"

class BookCategory(str, Enum):
    ACADEMIC = "academic"
    LEISURE = "leisure"

class PricingType(str, Enum):
    FREE = "free"
    RENT = "rent"
    BUY = "buy"

class BookFormat(str, Enum):
    DIGITAL = "digital"
    PHYSICAL = "physical"
    BOTH = "both"

class BorrowStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    BORROWED = "borrowed"
    RETURNED = "returned"
    OVERDUE = "overdue"

class EnrollmentStatus(str, Enum):
    ENROLLED = "enrolled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DROPPED = "dropped"

class BadgeType(str, Enum):
    BOOK_WORM = "book_worm"  # Borrowed 10+ books
    QUIZ_MASTER = "quiz_master"  # Scored 90%+ on 5 quizzes
    PERFECT_ATTENDANCE = "perfect_attendance"  # 7-day login streak
    COURSE_CHAMPION = "course_champion"  # Completed 3+ courses
    SPEED_READER = "speed_reader"  # Finished a book in under 3 days

# ===================== MODELS =====================

# School Models
class SchoolResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    code: str
    address: str
    city: str
    is_partner: bool
    student_count: int = 0
    teacher_count: int = 0

# School Verification Models
class SchoolVerifyRequest(BaseModel):
    school_id: Optional[str] = None
    student_id: Optional[str] = None
    employee_id: Optional[str] = None
    school_email: EmailStr
    password: str
    role: UserRole

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole
    grade_level: Optional[int] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    parent_id: Optional[str] = None
    school_id: Optional[str] = None
    student_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: Optional[UserRole] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: UserRole
    grade_level: Optional[int] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    parent_id: Optional[str] = None
    school_id: Optional[str] = None
    school_name: Optional[str] = None
    student_id: Optional[str] = None
    badges: List[str] = []
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Activity Models
class ActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    activity_type: str  # login, borrow, return, enroll, quiz_complete, module_complete
    description: str
    metadata: Dict = {}
    timestamp: str

class ActivityStatsResponse(BaseModel):
    total_logins: int
    books_borrowed: int
    courses_enrolled: int
    quizzes_completed: int
    modules_completed: int
    login_streak: int
    last_active: Optional[str]
    daily_activity: List[Dict]
    reading_time_hours: float

# Quiz Result Models
class QuizResultResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    course_id: str
    quiz_id: str
    quiz_title: str
    course_title: str
    score: float
    total_marks: float
    percentage: float
    passed: bool
    answers: List[int]
    submitted_at: str

# Performance & Recommendations
class PerformanceReport(BaseModel):
    overall_average: float
    quiz_scores: List[Dict]
    weak_areas: List[str]
    strong_areas: List[str]
    recommendations: List[Dict]
    improvement_trend: str

# Badge Models
class BadgeResponse(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    earned_at: Optional[str] = None

# Book Models
class BookCreate(BaseModel):
    title: str
    author: str
    description: Optional[str] = None
    overview: Optional[str] = None
    content: Optional[str] = None
    category: BookCategory
    pricing_type: PricingType
    price: float = 0.0
    format: BookFormat
    cover_image: Optional[str] = None
    file_url: Optional[str] = None
    external_link: Optional[str] = None
    shelf_location: Optional[str] = None
    available_copies: int = 1
    total_copies: int = 1
    isbn: Optional[str] = None
    grade_levels: List[int] = []
    subjects: List[str] = []

class BookResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    author: str
    description: Optional[str] = None
    overview: Optional[str] = None
    content: Optional[str] = None
    category: BookCategory
    pricing_type: PricingType
    price: float
    format: BookFormat
    cover_image: Optional[str] = None
    file_url: Optional[str] = None
    external_link: Optional[str] = None
    shelf_location: Optional[str] = None
    available_copies: int
    total_copies: int
    isbn: Optional[str] = None
    grade_levels: List[int] = []
    subjects: List[str] = []
    created_at: str

# Borrow Record Models
class BorrowCreate(BaseModel):
    book_id: str
    borrow_type: str = "borrow"

class BorrowResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    book_id: str
    user_id: str
    book_title: str
    user_name: str
    borrow_type: str
    status: BorrowStatus
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    return_date: Optional[str] = None
    created_at: str

# Course Models
class ModuleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    order: int = 0

class QuizQuestionCreate(BaseModel):
    question: str
    options: List[str]
    correct_answer: int

class QuizCreate(BaseModel):
    title: str
    module_id: Optional[str] = None
    questions: List[QuizQuestionCreate]
    total_marks: int
    passing_marks: int

class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    grade_levels: List[int] = []
    subjects: List[str] = []
    is_free: bool = True
    price: float = 0.0

class CourseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    teacher_id: str
    teacher_name: str
    grade_levels: List[int] = []
    subjects: List[str] = []
    is_free: bool
    price: float
    modules: List[dict] = []
    quizzes: List[dict] = []
    created_at: str

# Enrollment Models
class EnrollmentCreate(BaseModel):
    course_id: str

class EnrollmentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    course_id: str
    user_id: str
    course_title: str
    status: EnrollmentStatus
    progress_percentage: float = 0.0
    completed_modules: List[str] = []
    quiz_scores: dict = {}
    enrolled_at: str

# Certificate Models
class CertificateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    course_id: str
    course_title: str
    issue_date: str
    grade: str

# Payment Models (Mock)
class PaymentCreate(BaseModel):
    item_type: str
    item_id: str
    amount: float
    payment_method: str = "mock_card"

class PaymentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    item_type: str
    item_id: str
    amount: float
    status: str
    payment_method: str
    created_at: str

# Analytics Models
class AnalyticsResponse(BaseModel):
    total_users: int
    total_books: int
    total_courses: int
    active_borrows: int
    total_enrollments: int
    users_by_role: dict
    popular_books: List[dict]
    recent_activity: List[dict]
    schools_data: List[dict] = []

# ===================== AUTH HELPERS =====================
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, role: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_roles(allowed_roles: List[UserRole]):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in [r.value for r in allowed_roles]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

async def log_activity(user_id: str, activity_type: str, description: str, metadata: dict = {}):
    activity = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "activity_type": activity_type,
        "description": description,
        "metadata": metadata,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.activities.insert_one(activity)

async def check_and_award_badges(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return
    
    current_badges = user.get("badges", [])
    new_badges = []
    
    # Book Worm - Borrowed 10+ books
    borrow_count = await db.borrows.count_documents({"user_id": user_id})
    if borrow_count >= 10 and "book_worm" not in current_badges:
        new_badges.append("book_worm")
    
    # Quiz Master - Scored 90%+ on 5 quizzes
    high_scores = await db.quiz_results.count_documents({"user_id": user_id, "percentage": {"$gte": 90}})
    if high_scores >= 5 and "quiz_master" not in current_badges:
        new_badges.append("quiz_master")
    
    # Perfect Attendance - 7-day login streak
    activities = await db.activities.find({"user_id": user_id, "activity_type": "login"}).sort("timestamp", -1).to_list(30)
    if len(activities) >= 7:
        streak = 1
        for i in range(1, len(activities)):
            prev_date = datetime.fromisoformat(activities[i-1]["timestamp"]).date()
            curr_date = datetime.fromisoformat(activities[i]["timestamp"]).date()
            if (prev_date - curr_date).days == 1:
                streak += 1
            else:
                break
        if streak >= 7 and "perfect_attendance" not in current_badges:
            new_badges.append("perfect_attendance")
    
    # Course Champion - Completed 3+ courses
    completed_courses = await db.enrollments.count_documents({"user_id": user_id, "status": "completed"})
    if completed_courses >= 3 and "course_champion" not in current_badges:
        new_badges.append("course_champion")
    
    if new_badges:
        await db.users.update_one({"id": user_id}, {"$push": {"badges": {"$each": new_badges}}})

# ===================== SCHOOL ROUTES =====================
@api_router.get("/schools", response_model=List[SchoolResponse])
async def get_schools():
    schools = await db.schools.find({}, {"_id": 0}).to_list(100)
    return [SchoolResponse(**s) for s in schools]

@api_router.get("/schools/{school_id}", response_model=SchoolResponse)
async def get_school(school_id: str):
    school = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return SchoolResponse(**school)

@api_router.post("/auth/school-verify", response_model=TokenResponse)
async def verify_school_login(data: SchoolVerifyRequest):
    school_roles = {UserRole.STUDENT, UserRole.TEACHER}
    school = None

    if data.role in school_roles:
        if not data.school_id:
            raise HTTPException(status_code=400, detail="School is required for student and teacher login")

        # Find school
        school = await db.schools.find_one({"id": data.school_id}, {"_id": 0})
        if not school:
            raise HTTPException(status_code=404, detail="School not found")
        
        if not school.get("is_partner", False):
            raise HTTPException(status_code=403, detail="School is not a partner institution")
        
        # Check if email matches school domain
        school_domain = school.get("email_domain", "")
        if school_domain and not data.school_email.endswith(school_domain):
            raise HTTPException(status_code=400, detail=f"Email must be from {school_domain}")
        
        # Find user by school credentials
        query = {
            "school_id": data.school_id,
            "email": data.school_email,
            "role": data.role.value
        }
        if data.student_id:
            query["student_id"] = data.student_id
        if data.employee_id:
            query["employee_id"] = data.employee_id
    else:
        query = {"email": data.school_email, "role": data.role.value}
    
    user = await db.users.find_one(query, {"_id": 0})
    if not user:
        if data.role in school_roles:
            raise HTTPException(status_code=401, detail="Invalid school credentials. Please check your Student/Employee ID and email.")
        raise HTTPException(status_code=401, detail="Invalid email or password for the selected role.")
    
    if not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # Log login activity
    await log_activity(user["id"], "login", "Logged in via school verification", {"school_id": data.school_id})
    await check_and_award_badges(user["id"])
    
    token = create_token(user["id"], user["role"])
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=UserRole(user["role"]),
        grade_level=user.get("grade_level"),
        phone=user.get("phone"),
        specialization=user.get("specialization"),
        employee_id=user.get("employee_id"),
        department=user.get("department"),
        parent_id=user.get("parent_id"),
        school_id=user.get("school_id"),
        school_name=school.get("name") if school else None,
        student_id=user.get("student_id"),
        badges=user.get("badges", []),
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

# ===================== AUTH ROUTES =====================
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role.value,
        "grade_level": user_data.grade_level,
        "phone": user_data.phone,
        "specialization": user_data.specialization,
        "employee_id": user_data.employee_id,
        "department": user_data.department,
        "parent_id": user_data.parent_id,
        "school_id": user_data.school_id,
        "student_id": user_data.student_id,
        "badges": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    await log_activity(user_id, "register", f"New user registered: {user_data.name}")
    
    token = create_token(user_id, user_data.role.value)
    
    school_name = None
    if user_data.school_id:
        school = await db.schools.find_one({"id": user_data.school_id}, {"_id": 0})
        if school:
            school_name = school.get("name")
    
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        grade_level=user_data.grade_level,
        phone=user_data.phone,
        specialization=user_data.specialization,
        employee_id=user_data.employee_id,
        department=user_data.department,
        parent_id=user_data.parent_id,
        school_id=user_data.school_id,
        school_name=school_name,
        student_id=user_data.student_id,
        badges=[],
        created_at=user_doc["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if credentials.role and user["role"] != credentials.role.value:
        raise HTTPException(status_code=403, detail=f"This login is only available for {credentials.role.value} accounts")
    
    await log_activity(user["id"], "login", "User logged in")
    await check_and_award_badges(user["id"])
    
    token = create_token(user["id"], user["role"])
    
    school_name = None
    if user.get("school_id"):
        school = await db.schools.find_one({"id": user["school_id"]}, {"_id": 0})
        if school:
            school_name = school.get("name")
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=UserRole(user["role"]),
        grade_level=user.get("grade_level"),
        phone=user.get("phone"),
        specialization=user.get("specialization"),
        employee_id=user.get("employee_id"),
        department=user.get("department"),
        parent_id=user.get("parent_id"),
        school_id=user.get("school_id"),
        school_name=school_name,
        student_id=user.get("student_id"),
        badges=user.get("badges", []),
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    school_name = None
    if user.get("school_id"):
        school = await db.schools.find_one({"id": user["school_id"]}, {"_id": 0})
        if school:
            school_name = school.get("name")
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=UserRole(user["role"]),
        grade_level=user.get("grade_level"),
        phone=user.get("phone"),
        specialization=user.get("specialization"),
        employee_id=user.get("employee_id"),
        department=user.get("department"),
        parent_id=user.get("parent_id"),
        school_id=user.get("school_id"),
        school_name=school_name,
        student_id=user.get("student_id"),
        badges=user.get("badges", []),
        created_at=user["created_at"]
    )

# ===================== ACTIVITY & STATS ROUTES =====================
@api_router.get("/activity/stats")
async def get_activity_stats(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    
    # Count activities
    total_logins = await db.activities.count_documents({"user_id": user_id, "activity_type": "login"})
    books_borrowed = await db.borrows.count_documents({"user_id": user_id})
    courses_enrolled = await db.enrollments.count_documents({"user_id": user_id})
    quizzes_completed = await db.quiz_results.count_documents({"user_id": user_id})
    
    # Count completed modules
    enrollments = await db.enrollments.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    modules_completed = sum(len(e.get("completed_modules", [])) for e in enrollments)
    
    # Calculate login streak
    activities = await db.activities.find(
        {"user_id": user_id, "activity_type": "login"}
    ).sort("timestamp", -1).to_list(30)
    
    login_streak = 0
    if activities:
        dates_set = set()
        for a in activities:
            dates_set.add(datetime.fromisoformat(a["timestamp"]).date())
        
        today = datetime.now(timezone.utc).date()
        streak = 0
        current_date = today
        while current_date in dates_set:
            streak += 1
            current_date -= timedelta(days=1)
        login_streak = streak
    
    # Get last active
    last_activity = await db.activities.find_one(
        {"user_id": user_id},
        {"_id": 0},
        sort=[("timestamp", -1)]
    )
    last_active = last_activity["timestamp"] if last_activity else None
    
    # Daily activity for last 7 days
    daily_activity = []
    for i in range(7):
        date = datetime.now(timezone.utc).date() - timedelta(days=i)
        start = datetime.combine(date, datetime.min.time()).replace(tzinfo=timezone.utc)
        end = datetime.combine(date, datetime.max.time()).replace(tzinfo=timezone.utc)
        
        count = await db.activities.count_documents({
            "user_id": user_id,
            "timestamp": {"$gte": start.isoformat(), "$lte": end.isoformat()}
        })
        daily_activity.append({
            "date": date.isoformat(),
            "count": count
        })
    
    return {
        "total_logins": total_logins,
        "books_borrowed": books_borrowed,
        "courses_enrolled": courses_enrolled,
        "quizzes_completed": quizzes_completed,
        "modules_completed": modules_completed,
        "login_streak": login_streak,
        "last_active": last_active,
        "daily_activity": daily_activity[::-1],
        "reading_time_hours": round(books_borrowed * 2.5, 1)  # Estimate 2.5 hours per book
    }

@api_router.get("/activity/timeline")
async def get_activity_timeline(user: dict = Depends(get_current_user), limit: int = 20):
    activities = await db.activities.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(limit)
    return activities

# ===================== QUIZ RESULTS & PERFORMANCE =====================
@api_router.get("/quiz-results", response_model=List[QuizResultResponse])
async def get_quiz_results(user: dict = Depends(get_current_user)):
    results = await db.quiz_results.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return [QuizResultResponse(**r) for r in results]

@api_router.get("/performance/report")
async def get_performance_report(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    
    # Get all quiz results
    quiz_results = await db.quiz_results.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    
    if not quiz_results:
        return {
            "overall_average": 0,
            "quiz_scores": [],
            "weak_areas": [],
            "strong_areas": [],
            "recommendations": [],
            "improvement_trend": "no_data"
        }
    
    # Calculate overall average
    percentages = [r["percentage"] for r in quiz_results]
    overall_average = sum(percentages) / len(percentages)
    
    # Group by subject/course
    course_scores = {}
    for r in quiz_results:
        course_id = r.get("course_id", "unknown")
        if course_id not in course_scores:
            course_scores[course_id] = {"scores": [], "title": r.get("course_title", "Unknown")}
        course_scores[course_id]["scores"].append(r["percentage"])
    
    # Determine weak and strong areas
    weak_areas = []
    strong_areas = []
    for course_id, data in course_scores.items():
        avg = sum(data["scores"]) / len(data["scores"])
        if avg < 50:
            weak_areas.append(data["title"])
        elif avg >= 80:
            strong_areas.append(data["title"])
    
    # Generate recommendations for weak areas (scores below 50%)
    recommendations = []
    for r in quiz_results:
        if r["percentage"] < 50:
            # Find related books
            course = await db.courses.find_one({"id": r["course_id"]}, {"_id": 0})
            if course:
                subjects = course.get("subjects", [])
                related_books = await db.books.find(
                    {"subjects": {"$in": subjects}, "category": "academic"},
                    {"_id": 0}
                ).to_list(3)
                
                for book in related_books:
                    recommendations.append({
                        "type": "book",
                        "reason": f"Low score ({r['percentage']:.0f}%) in {r['quiz_title']}",
                        "item": {
                            "id": book["id"],
                            "title": book["title"],
                            "author": book["author"],
                            "subjects": book.get("subjects", [])
                        }
                    })
    
    # Check for incomplete modules
    enrollments = await db.enrollments.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    for enrollment in enrollments:
        if enrollment["progress_percentage"] < 100:
            course = await db.courses.find_one({"id": enrollment["course_id"]}, {"_id": 0})
            if course:
                total_modules = len(course.get("modules", []))
                completed = len(enrollment.get("completed_modules", []))
                if total_modules > completed:
                    recommendations.append({
                        "type": "module",
                        "reason": f"Incomplete course: {completed}/{total_modules} modules done",
                        "item": {
                            "id": enrollment["course_id"],
                            "title": enrollment["course_title"],
                            "progress": enrollment["progress_percentage"]
                        }
                    })
    
    # Determine improvement trend
    if len(quiz_results) >= 3:
        recent = sorted(quiz_results, key=lambda x: x["submitted_at"])[-3:]
        recent_avg = sum(r["percentage"] for r in recent) / 3
        older_avg = sum(r["percentage"] for r in quiz_results[:-3]) / max(len(quiz_results) - 3, 1)
        
        if recent_avg > older_avg + 5:
            improvement_trend = "improving"
        elif recent_avg < older_avg - 5:
            improvement_trend = "declining"
        else:
            improvement_trend = "stable"
    else:
        improvement_trend = "insufficient_data"
    
    return {
        "overall_average": round(overall_average, 1),
        "quiz_scores": [{"quiz": r["quiz_title"], "score": r["percentage"], "date": r["submitted_at"]} for r in quiz_results],
        "weak_areas": weak_areas,
        "strong_areas": strong_areas,
        "recommendations": recommendations[:10],  # Limit to 10
        "improvement_trend": improvement_trend
    }

# ===================== BADGES ROUTES =====================
@api_router.get("/badges/all")
async def get_all_badges():
    return [
        {"id": "book_worm", "name": "Book Worm", "description": "Borrowed 10+ books", "icon": "📚"},
        {"id": "quiz_master", "name": "Quiz Master", "description": "Scored 90%+ on 5 quizzes", "icon": "🏆"},
        {"id": "perfect_attendance", "name": "Perfect Attendance", "description": "7-day login streak", "icon": "🔥"},
        {"id": "course_champion", "name": "Course Champion", "description": "Completed 3+ courses", "icon": "🎓"},
        {"id": "speed_reader", "name": "Speed Reader", "description": "Finished a book in under 3 days", "icon": "⚡"}
    ]

@api_router.get("/badges/my")
async def get_my_badges(user: dict = Depends(get_current_user)):
    user_badges = user.get("badges", [])
    all_badges = [
        {"id": "book_worm", "name": "Book Worm", "description": "Borrowed 10+ books", "icon": "📚"},
        {"id": "quiz_master", "name": "Quiz Master", "description": "Scored 90%+ on 5 quizzes", "icon": "🏆"},
        {"id": "perfect_attendance", "name": "Perfect Attendance", "description": "7-day login streak", "icon": "🔥"},
        {"id": "course_champion", "name": "Course Champion", "description": "Completed 3+ courses", "icon": "🎓"},
        {"id": "speed_reader", "name": "Speed Reader", "description": "Finished a book in under 3 days", "icon": "⚡"}
    ]
    
    result = []
    for badge in all_badges:
        badge["earned"] = badge["id"] in user_badges
        result.append(badge)
    
    return result

# ===================== USER MANAGEMENT =====================
@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.LIBRARIAN]))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    result = []
    for u in users:
        school_name = None
        if u.get("school_id"):
            school = await db.schools.find_one({"id": u["school_id"]}, {"_id": 0})
            if school:
                school_name = school.get("name")
        result.append(UserResponse(**{**u, "school_name": school_name}))
    return result

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, user: dict = Depends(get_current_user)):
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    school_name = None
    if target_user.get("school_id"):
        school = await db.schools.find_one({"id": target_user["school_id"]}, {"_id": 0})
        if school:
            school_name = school.get("name")
    
    return UserResponse(**{**target_user, "school_name": school_name})

@api_router.get("/users/school/{school_id}")
async def get_users_by_school(school_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.TEACHER]))):
    users = await db.users.find({"school_id": school_id}, {"_id": 0, "password": 0}).to_list(1000)
    school = await db.schools.find_one({"id": school_id}, {"_id": 0})
    school_name = school.get("name") if school else None
    
    return [UserResponse(**{**u, "school_name": school_name}) for u in users]

@api_router.get("/parent/children", response_model=List[UserResponse])
async def get_children(user: dict = Depends(require_roles([UserRole.PARENT]))):
    children = await db.users.find({"parent_id": user["id"]}, {"_id": 0, "password": 0}).to_list(100)
    result = []
    for c in children:
        school_name = None
        if c.get("school_id"):
            school = await db.schools.find_one({"id": c["school_id"]}, {"_id": 0})
            if school:
                school_name = school.get("name")
        result.append(UserResponse(**{**c, "school_name": school_name}))
    return result

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, updates: dict, user: dict = Depends(get_current_user)):
    if user["id"] != user_id and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    allowed_fields = [
        "name",
        "email",
        "phone",
        "grade_level",
        "specialization",
        "school_id",
        "student_id",
        "employee_id",
        "department",
    ]
    update_data = {k: v for k, v in updates.items() if k in allowed_fields}
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    return {"message": "User updated"}

# ===================== BOOK ROUTES =====================
@api_router.post("/books", response_model=BookResponse)
async def create_book(book: BookCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.LIBRARIAN]))):
    book_id = str(uuid.uuid4())
    book_doc = {
        "id": book_id,
        **book.model_dump(),
        "category": book.category.value,
        "pricing_type": book.pricing_type.value,
        "format": book.format.value,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.books.insert_one(book_doc)
    book_doc["category"] = book.category
    book_doc["pricing_type"] = book.pricing_type
    book_doc["format"] = book.format
    return BookResponse(**book_doc)

@api_router.get("/books", response_model=List[BookResponse])
async def get_books(
    category: Optional[str] = None,
    grade: Optional[int] = None,
    subject: Optional[str] = None,
    search: Optional[str] = None
):
    query = {}
    if category:
        query["category"] = category
    if grade:
        query["grade_levels"] = grade
    if subject:
        query["subjects"] = subject
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"author": {"$regex": search, "$options": "i"}}
        ]
    
    books = await db.books.find(query, {"_id": 0}).to_list(1000)
    result = []
    for b in books:
        b = normalize_book_content(b)
        b["category"] = BookCategory(b["category"])
        b["pricing_type"] = PricingType(b["pricing_type"])
        b["format"] = BookFormat(b["format"])
        result.append(BookResponse(**b))
    return result

@api_router.get("/books/{book_id}", response_model=BookResponse)
async def get_book(book_id: str):
    book = await db.books.find_one({"id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    book = normalize_book_content(book)
    book["category"] = BookCategory(book["category"])
    book["pricing_type"] = PricingType(book["pricing_type"])
    book["format"] = BookFormat(book["format"])
    return BookResponse(**book)

@api_router.put("/books/{book_id}")
async def update_book(book_id: str, updates: dict, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.LIBRARIAN]))):
    await db.books.update_one({"id": book_id}, {"$set": updates})
    return {"message": "Book updated"}

@api_router.delete("/books/{book_id}")
async def delete_book(book_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.LIBRARIAN]))):
    await db.books.delete_one({"id": book_id})
    return {"message": "Book deleted"}

# ===================== BORROW ROUTES =====================
@api_router.post("/borrows", response_model=BorrowResponse)
async def create_borrow(borrow: BorrowCreate, user: dict = Depends(get_current_user)):
    book = await db.books.find_one({"id": borrow.book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if book["format"] == "physical" and book["available_copies"] < 1:
        raise HTTPException(status_code=400, detail="No copies available")
    
    borrow_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    is_purchase = borrow.borrow_type == PricingType.BUY.value
    due_date = None if is_purchase else now + timedelta(days=14)
    
    borrow_doc = {
        "id": borrow_id,
        "book_id": borrow.book_id,
        "user_id": user["id"],
        "book_title": book["title"],
        "user_name": user["name"],
        "borrow_type": borrow.borrow_type,
        "status": BorrowStatus.APPROVED.value if is_purchase else BorrowStatus.PENDING.value,
        "issue_date": now.isoformat() if is_purchase else None,
        "due_date": due_date.isoformat() if due_date else None,
        "return_date": None,
        "created_at": now.isoformat()
    }
    
    await db.borrows.insert_one(borrow_doc)
    if is_purchase and book["format"] in ["physical", "both"]:
        await db.books.update_one({"id": borrow.book_id}, {"$inc": {"available_copies": -1}})

    await log_activity(
        user["id"],
        "borrow",
        f"{'Purchased' if is_purchase else 'Requested to borrow'}: {book['title']}",
        {"book_id": borrow.book_id}
    )
    await check_and_award_badges(user["id"])
    
    borrow_doc["status"] = BorrowStatus.APPROVED if is_purchase else BorrowStatus.PENDING
    return BorrowResponse(**borrow_doc)

@api_router.get("/borrows", response_model=List[BorrowResponse])
async def get_borrows(user: dict = Depends(get_current_user)):
    if user["role"] in ["admin", "librarian"]:
        borrows = await db.borrows.find({}, {"_id": 0}).to_list(1000)
    else:
        borrows = await db.borrows.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    result = []
    for b in borrows:
        b["status"] = BorrowStatus(b["status"])
        result.append(BorrowResponse(**b))
    return result

@api_router.put("/borrows/{borrow_id}/approve")
async def approve_borrow(borrow_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.LIBRARIAN]))):
    borrow = await db.borrows.find_one({"id": borrow_id}, {"_id": 0})
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow record not found")
    
    now = datetime.now(timezone.utc)
    await db.borrows.update_one(
        {"id": borrow_id},
        {"$set": {"status": BorrowStatus.APPROVED.value, "issue_date": now.isoformat()}}
    )
    
    book = await db.books.find_one({"id": borrow["book_id"]})
    if book and book["format"] in ["physical", "both"]:
        await db.books.update_one({"id": borrow["book_id"]}, {"$inc": {"available_copies": -1}})
    
    return {"message": "Borrow approved"}

@api_router.put("/borrows/{borrow_id}/return")
async def return_book(borrow_id: str, user: dict = Depends(get_current_user)):
    borrow = await db.borrows.find_one({"id": borrow_id}, {"_id": 0})
    if not borrow:
        raise HTTPException(status_code=404, detail="Borrow record not found")

    if user["role"] not in ["admin", "librarian"] and borrow["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to return this book")

    if borrow.get("borrow_type") == PricingType.BUY.value:
        raise HTTPException(status_code=400, detail="Purchased books cannot be returned")

    if borrow.get("status") == BorrowStatus.RETURNED.value:
        raise HTTPException(status_code=400, detail="Book has already been returned")
    
    now = datetime.now(timezone.utc)
    await db.borrows.update_one(
        {"id": borrow_id},
        {"$set": {"status": BorrowStatus.RETURNED.value, "return_date": now.isoformat()}}
    )
    
    book = await db.books.find_one({"id": borrow["book_id"]})
    if book and book["format"] in ["physical", "both"]:
        await db.books.update_one({"id": borrow["book_id"]}, {"$inc": {"available_copies": 1}})
    
    await log_activity(borrow["user_id"], "return", f"Returned: {borrow['book_title']}", {"book_id": borrow["book_id"]})
    
    return {"message": "Book returned"}

# ===================== COURSE ROUTES =====================
@api_router.post("/courses", response_model=CourseResponse)
async def create_course(course: CourseCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.TEACHER]))):
    course_id = str(uuid.uuid4())
    course_doc = {
        "id": course_id,
        **course.model_dump(),
        "teacher_id": user["id"],
        "teacher_name": user["name"],
        "modules": [],
        "quizzes": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.courses.insert_one(course_doc)
    return CourseResponse(**course_doc)

@api_router.get("/courses", response_model=List[CourseResponse])
async def get_courses(
    grade: Optional[int] = None,
    subject: Optional[str] = None,
    teacher_id: Optional[str] = None
):
    await ensure_demo_courses_catalog()
    query = {}
    if grade:
        query["grade_levels"] = grade
    if subject:
        query["subjects"] = subject
    if teacher_id:
        query["teacher_id"] = teacher_id
    
    courses = await db.courses.find(query, {"_id": 0}).to_list(1000)
    return [CourseResponse(**normalize_demo_course(c)) for c in courses]

@api_router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str):
    await ensure_demo_courses_catalog()
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseResponse(**normalize_demo_course(course))

@api_router.post("/courses/{course_id}/modules")
async def add_module(course_id: str, module: ModuleCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.TEACHER]))):
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    module_id = str(uuid.uuid4())
    module_doc = {"id": module_id, **module.model_dump()}
    
    await db.courses.update_one({"id": course_id}, {"$push": {"modules": module_doc}})
    return {"message": "Module added", "module_id": module_id}

@api_router.post("/courses/{course_id}/quizzes")
async def add_quiz(course_id: str, quiz: QuizCreate, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.TEACHER]))):
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    quiz_id = str(uuid.uuid4())
    quiz_doc = {
        "id": quiz_id,
        "title": quiz.title,
        "module_id": quiz.module_id,
        "questions": [q.model_dump() for q in quiz.questions],
        "total_marks": quiz.total_marks,
        "passing_marks": quiz.passing_marks
    }
    
    await db.courses.update_one({"id": course_id}, {"$push": {"quizzes": quiz_doc}})
    return {"message": "Quiz added", "quiz_id": quiz_id}

@api_router.put("/courses/{course_id}")
async def update_course(course_id: str, updates: dict, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.TEACHER]))):
    allowed = {"title", "description", "grade_levels", "subjects", "is_free", "price", "cover_image"}
    update_data = {k: v for k, v in updates.items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    result = await db.courses.update_one({"id": course_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    return {"message": "Course updated"}

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.TEACHER]))):
    await db.courses.delete_one({"id": course_id})
    await db.enrollments.delete_many({"course_id": course_id})
    return {"message": "Course deleted"}

@api_router.put("/courses/{course_id}/modules/{module_id}")
async def update_module(course_id: str, module_id: str, updates: dict, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.TEACHER]))):
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    modules = course.get("modules", [])
    for i, m in enumerate(modules):
        if m["id"] == module_id:
            for k, v in updates.items():
                if k in {"title", "description", "content", "video_url", "order"}:
                    modules[i][k] = v
            break
    await db.courses.update_one({"id": course_id}, {"$set": {"modules": modules}})
    return {"message": "Module updated"}

@api_router.delete("/courses/{course_id}/modules/{module_id}")
async def delete_module(course_id: str, module_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.TEACHER]))):
    await db.courses.update_one({"id": course_id}, {"$pull": {"modules": {"id": module_id}}})
    return {"message": "Module deleted"}

@api_router.delete("/courses/{course_id}/quizzes/{quiz_id}")
async def delete_quiz(course_id: str, quiz_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.TEACHER]))):
    await db.courses.update_one({"id": course_id}, {"$pull": {"quizzes": {"id": quiz_id}}})
    return {"message": "Quiz deleted"}

# ===================== ADMIN USER MANAGEMENT =====================
@api_router.post("/admin/users")
async def admin_create_user(user_data: dict, admin: dict = Depends(require_roles([UserRole.ADMIN]))):
    required = {"email", "password", "name", "role"}
    if not required.issubset(user_data.keys()):
        raise HTTPException(status_code=400, detail="Missing required fields: email, password, name, role")
    existing = await db.users.find_one({"email": user_data["email"]})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    hashed_pw = bcrypt.hashpw(user_data["password"].encode(), bcrypt.gensalt()).decode()
    new_user = {
        "id": user_id,
        "email": user_data["email"],
        "name": user_data["name"],
        "role": user_data["role"],
        "password": hashed_pw,
        "phone": user_data.get("phone"),
        "school_id": user_data.get("school_id"),
        "student_id": user_data.get("student_id"),
        "employee_id": user_data.get("employee_id"),
        "grade_level": user_data.get("grade_level"),
        "parent_id": user_data.get("parent_id"),
        "badges": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(new_user)
    return {"message": "User created", "id": user_id}

@api_router.put("/admin/users/{user_id}/role")
async def admin_update_role(user_id: str, data: dict, admin: dict = Depends(require_roles([UserRole.ADMIN]))):
    role = data.get("role")
    if role not in [r.value for r in UserRole]:
        raise HTTPException(status_code=400, detail="Invalid role")
    await db.users.update_one({"id": user_id}, {"$set": {"role": role}})
    return {"message": "Role updated"}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_roles([UserRole.ADMIN]))):
    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    await db.enrollments.delete_many({"user_id": user_id})
    await db.borrows.delete_many({"user_id": user_id})
    return {"message": "User deleted"}

# ===================== ENROLLMENT ROUTES =====================
@api_router.post("/enrollments", response_model=EnrollmentResponse)
async def enroll(enrollment: EnrollmentCreate, user: dict = Depends(get_current_user)):
    await ensure_demo_courses_catalog()
    course = await db.courses.find_one({"id": enrollment.course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    existing = await db.enrollments.find_one({"course_id": enrollment.course_id, "user_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled")
    
    enrollment_id = str(uuid.uuid4())
    enrollment_doc = {
        "id": enrollment_id,
        "course_id": enrollment.course_id,
        "user_id": user["id"],
        "course_title": course["title"],
        "status": EnrollmentStatus.ENROLLED.value,
        "progress_percentage": 0.0,
        "completed_modules": [],
        "quiz_scores": {},
        "enrolled_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.enrollments.insert_one(enrollment_doc)
    await log_activity(user["id"], "enroll", f"Enrolled in: {course['title']}", {"course_id": enrollment.course_id})
    
    enrollment_doc["status"] = EnrollmentStatus.ENROLLED
    return EnrollmentResponse(**enrollment_doc)

@api_router.get("/enrollments", response_model=List[EnrollmentResponse])
async def get_enrollments(user: dict = Depends(get_current_user)):
    await ensure_demo_courses_catalog()
    if user["role"] in ["admin", "teacher"]:
        enrollments = await db.enrollments.find({}, {"_id": 0}).to_list(1000)
    else:
        enrollments = await db.enrollments.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)

    course_ids = list({e["course_id"] for e in enrollments})
    courses = await db.courses.find({"id": {"$in": course_ids}}, {"_id": 0}).to_list(1000)
    course_map = {course["id"]: normalize_demo_course(course) for course in courses}

    result = []
    for e in enrollments:
        course = course_map.get(e["course_id"])
        if course:
            valid_module_ids = {module["id"] for module in course.get("modules", [])}
            cleaned_modules = [mid for mid in e.get("completed_modules", []) if mid in valid_module_ids]
            total_modules = len(valid_module_ids)
            progress = min((len(cleaned_modules) / total_modules * 100) if total_modules > 0 else 0, 100)
            final_quiz = course.get("quizzes", [])[-1] if course.get("quizzes") else None
            final_quiz_passed = final_quiz and e.get("quiz_scores", {}).get(final_quiz["id"], {}).get("passed")
            status = EnrollmentStatus.COMPLETED.value if progress >= 100 and (final_quiz_passed or not final_quiz) else (
                EnrollmentStatus.IN_PROGRESS.value if progress > 0 else e["status"]
            )

            if cleaned_modules != e.get("completed_modules", []) or progress != e.get("progress_percentage") or status != e.get("status"):
                await db.enrollments.update_one(
                    {"id": e["id"]},
                    {"$set": {"completed_modules": cleaned_modules, "progress_percentage": progress, "status": status}}
                )
                e["completed_modules"] = cleaned_modules
                e["progress_percentage"] = progress
                e["status"] = status

        e["status"] = EnrollmentStatus(e["status"])
        result.append(EnrollmentResponse(**e))
    return result

@api_router.put("/enrollments/{enrollment_id}/progress")
async def update_progress(enrollment_id: str, module_id: str, user: dict = Depends(get_current_user)):
    enrollment = await db.enrollments.find_one({"id": enrollment_id, "user_id": user["id"]})
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    course = await db.courses.find_one({"id": enrollment["course_id"]})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course = normalize_demo_course(course)
    
    valid_module_ids = {module["id"] for module in course.get("modules", [])}
    completed_modules = [mid for mid in enrollment.get("completed_modules", []) if mid in valid_module_ids]
    if module_id in valid_module_ids and module_id not in completed_modules:
        completed_modules.append(module_id)
    
    total_modules = len(course.get("modules", []))
    progress = (len(completed_modules) / total_modules * 100) if total_modules > 0 else 0
    progress = min(progress, 100)
    
    status = EnrollmentStatus.IN_PROGRESS.value
    if progress >= 100:
        final_quiz = course.get("quizzes", [])[-1] if course.get("quizzes") else None
        quiz_scores = enrollment.get("quiz_scores", {})
        final_quiz_passed = final_quiz and quiz_scores.get(final_quiz["id"], {}).get("passed")
        status = EnrollmentStatus.COMPLETED.value if final_quiz_passed or not final_quiz else EnrollmentStatus.IN_PROGRESS.value
    
    await db.enrollments.update_one(
        {"id": enrollment_id},
        {"$set": {"completed_modules": completed_modules, "progress_percentage": progress, "status": status}}
    )
    
    await log_activity(user["id"], "module_complete", f"Completed module in {enrollment['course_title']}", {"module_id": module_id})
    await check_and_award_badges(user["id"])
    
    return {"message": "Progress updated", "progress": progress}

@api_router.post("/enrollments/{enrollment_id}/quiz/{quiz_id}")
async def submit_quiz(enrollment_id: str, quiz_id: str, answers: List[int], user: dict = Depends(get_current_user)):
    enrollment = await db.enrollments.find_one({"id": enrollment_id, "user_id": user["id"]})
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    course = await db.courses.find_one({"id": enrollment["course_id"]})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    course = normalize_demo_course(course)
    
    quiz = None
    for q in course.get("quizzes", []):
        if q["id"] == quiz_id:
            quiz = q
            break
    
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    total_modules = len(course.get("modules", []))
    if len(enrollment.get("completed_modules", [])) < total_modules:
        raise HTTPException(status_code=400, detail="Complete all course modules before taking the final quiz")
    
    # Calculate score
    correct = 0
    for i, ans in enumerate(answers):
        if i < len(quiz["questions"]) and ans == quiz["questions"][i]["correct_answer"]:
            correct += 1
    
    score = (correct / len(quiz["questions"]) * quiz["total_marks"]) if quiz["questions"] else 0
    percentage = (correct / len(quiz["questions"]) * 100) if quiz["questions"] else 0
    passed = score >= quiz["passing_marks"]
    
    # Save quiz result
    result_id = str(uuid.uuid4())
    quiz_result = {
        "id": result_id,
        "user_id": user["id"],
        "course_id": enrollment["course_id"],
        "quiz_id": quiz_id,
        "quiz_title": quiz["title"],
        "course_title": enrollment["course_title"],
        "score": score,
        "total_marks": quiz["total_marks"],
        "percentage": percentage,
        "passed": passed,
        "answers": answers,
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    await db.quiz_results.insert_one(quiz_result)
    
    # Update enrollment quiz scores and only mark complete once the final quiz is passed
    quiz_scores = enrollment.get("quiz_scores", {})
    quiz_scores[quiz_id] = {"score": score, "passed": passed, "percentage": percentage}
    final_quiz = course.get("quizzes", [])[-1] if course.get("quizzes") else None
    status = enrollment.get("status", EnrollmentStatus.IN_PROGRESS.value)
    if final_quiz and final_quiz["id"] == quiz_id and passed and len(enrollment.get("completed_modules", [])) >= total_modules:
        status = EnrollmentStatus.COMPLETED.value
    elif len(enrollment.get("completed_modules", [])) >= total_modules:
        status = EnrollmentStatus.IN_PROGRESS.value

    await db.enrollments.update_one(
        {"id": enrollment_id},
        {"$set": {"quiz_scores": quiz_scores, "status": status}}
    )
    
    await log_activity(user["id"], "quiz_complete", f"Completed quiz: {quiz['title']} - {percentage:.0f}%", {"quiz_id": quiz_id, "score": percentage})
    await check_and_award_badges(user["id"])
    
    return {"score": score, "total": quiz["total_marks"], "percentage": percentage, "passed": passed}

# ===================== CERTIFICATE ROUTES =====================
@api_router.post("/certificates/{enrollment_id}")
async def generate_certificate(enrollment_id: str, user: dict = Depends(get_current_user)):
    enrollment = await db.enrollments.find_one({"id": enrollment_id, "user_id": user["id"]})
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    if enrollment["status"] != EnrollmentStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Course not completed")
    
    existing = await db.certificates.find_one({"enrollment_id": enrollment_id}, {"_id": 0})
    if existing:
        return CertificateResponse(**existing)
    
    cert_id = str(uuid.uuid4())
    cert_doc = {
        "id": cert_id,
        "enrollment_id": enrollment_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "course_id": enrollment["course_id"],
        "course_title": enrollment["course_title"],
        "issue_date": datetime.now(timezone.utc).isoformat(),
        "grade": "A" if enrollment["progress_percentage"] >= 90 else "B" if enrollment["progress_percentage"] >= 75 else "C"
    }
    
    await db.certificates.insert_one(cert_doc)
    return CertificateResponse(**cert_doc)

@api_router.get("/certificates", response_model=List[CertificateResponse])
async def get_certificates(user: dict = Depends(get_current_user)):
    certs = await db.certificates.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return [CertificateResponse(**c) for c in certs]

@api_router.get("/certificates/{cert_id}", response_model=CertificateResponse)
async def get_certificate(cert_id: str):
    cert = await db.certificates.find_one({"id": cert_id}, {"_id": 0})
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    return CertificateResponse(**cert)

# ===================== PAYMENT ROUTES (MOCK) =====================
@api_router.post("/payments", response_model=PaymentResponse)
async def create_payment(payment: PaymentCreate, user: dict = Depends(get_current_user)):
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "user_id": user["id"],
        "item_type": payment.item_type,
        "item_id": payment.item_id,
        "amount": payment.amount,
        "status": "completed",
        "payment_method": payment.payment_method,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payments.insert_one(payment_doc)
    return PaymentResponse(**payment_doc)

@api_router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(user: dict = Depends(get_current_user)):
    if user["role"] == "admin":
        payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    else:
        payments = await db.payments.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return [PaymentResponse(**p) for p in payments]

# ===================== ANALYTICS ROUTES =====================
@api_router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.LIBRARIAN]))):
    total_users = await db.users.count_documents({})
    total_books = await db.books.count_documents({})
    total_courses = await db.courses.count_documents({})
    active_borrows = await db.borrows.count_documents({"status": {"$in": ["pending", "approved", "borrowed"]}})
    total_enrollments = await db.enrollments.count_documents({})
    
    pipeline = [{"$group": {"_id": "$role", "count": {"$sum": 1}}}]
    role_counts = await db.users.aggregate(pipeline).to_list(10)
    users_by_role = {r["_id"]: r["count"] for r in role_counts}
    
    borrow_pipeline = [
        {"$group": {"_id": "$book_id", "count": {"$sum": 1}, "title": {"$first": "$book_title"}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    popular = await db.borrows.aggregate(borrow_pipeline).to_list(5)
    popular_books = [{"title": p["title"], "borrows": p["count"]} for p in popular]
    
    recent_activities = await db.activities.find({}, {"_id": 0}).sort("timestamp", -1).to_list(10)
    recent_activity = [{"type": a["activity_type"], "description": a["description"], "date": a["timestamp"]} for a in recent_activities]
    
    # Schools data
    schools = await db.schools.find({}, {"_id": 0}).to_list(100)
    schools_data = []
    for school in schools:
        student_count = await db.users.count_documents({"school_id": school["id"], "role": "student"})
        teacher_count = await db.users.count_documents({"school_id": school["id"], "role": "teacher"})
        schools_data.append({
            "id": school["id"],
            "name": school["name"],
            "students": student_count,
            "teachers": teacher_count
        })
    
    return AnalyticsResponse(
        total_users=total_users,
        total_books=total_books,
        total_courses=total_courses,
        active_borrows=active_borrows,
        total_enrollments=total_enrollments,
        users_by_role=users_by_role,
        popular_books=popular_books,
        recent_activity=recent_activity,
        schools_data=schools_data
    )

# ===================== TEACHER ANALYTICS =====================
@api_router.get("/teacher/analytics")
async def get_teacher_analytics(user: dict = Depends(require_roles([UserRole.TEACHER]))):
    teacher_id = user["id"]
    
    # Get teacher's courses
    courses = await db.courses.find({"teacher_id": teacher_id}, {"_id": 0}).to_list(100)
    course_ids = [c["id"] for c in courses]
    
    # Get enrollments for teacher's courses
    enrollments = await db.enrollments.find({"course_id": {"$in": course_ids}}, {"_id": 0}).to_list(1000)
    
    # Get quiz results
    quiz_results = await db.quiz_results.find({"course_id": {"$in": course_ids}}, {"_id": 0}).to_list(1000)
    
    # Calculate stats
    total_students = len(set(e["user_id"] for e in enrollments))
    avg_progress = sum(e["progress_percentage"] for e in enrollments) / max(len(enrollments), 1)
    avg_quiz_score = sum(r["percentage"] for r in quiz_results) / max(len(quiz_results), 1)
    
    # Students needing help (quiz scores below 50%)
    low_performers = {}
    for r in quiz_results:
        if r["percentage"] < 50:
            if r["user_id"] not in low_performers:
                low_performers[r["user_id"]] = []
            low_performers[r["user_id"]].append(r)
    
    students_needing_help = []
    for user_id, results in low_performers.items():
        student = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if student:
            students_needing_help.append({
                "student": {"id": student["id"], "name": student["name"]},
                "low_scores": [{"quiz": r["quiz_title"], "score": r["percentage"]} for r in results]
            })
    
    # Course breakdown
    course_stats = []
    for course in courses:
        course_enrollments = [e for e in enrollments if e["course_id"] == course["id"]]
        course_results = [r for r in quiz_results if r["course_id"] == course["id"]]
        
        course_stats.append({
            "course_id": course["id"],
            "title": course["title"],
            "enrolled_students": len(course_enrollments),
            "avg_progress": sum(e["progress_percentage"] for e in course_enrollments) / max(len(course_enrollments), 1),
            "avg_quiz_score": sum(r["percentage"] for r in course_results) / max(len(course_results), 1),
            "quizzes_taken": len(course_results)
        })
    
    return {
        "total_courses": len(courses),
        "total_students": total_students,
        "total_enrollments": len(enrollments),
        "avg_progress": round(avg_progress, 1),
        "avg_quiz_score": round(avg_quiz_score, 1),
        "students_needing_help": students_needing_help,
        "course_stats": course_stats
    }

# ===================== PARENT ROUTES =====================
@api_router.get("/parent/child/{child_id}/progress")
async def get_child_progress(child_id: str, user: dict = Depends(require_roles([UserRole.PARENT]))):
    child = await db.users.find_one({"id": child_id, "parent_id": user["id"]}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found or not linked")
    
    enrollments = await db.enrollments.find({"user_id": child_id}, {"_id": 0}).to_list(100)
    borrows = await db.borrows.find({"user_id": child_id}, {"_id": 0}).to_list(100)
    quiz_results = await db.quiz_results.find({"user_id": child_id}, {"_id": 0}).to_list(100)
    activities = await db.activities.find({"user_id": child_id}, {"_id": 0}).sort("timestamp", -1).to_list(20)
    
    # Get school info
    school_name = None
    if child.get("school_id"):
        school = await db.schools.find_one({"id": child["school_id"]}, {"_id": 0})
        if school:
            school_name = school.get("name")
    
    # Calculate performance summary
    avg_quiz_score = sum(r["percentage"] for r in quiz_results) / max(len(quiz_results), 1)
    
    return {
        "child": {
            "id": child["id"],
            "name": child["name"],
            "grade_level": child.get("grade_level"),
            "school_name": school_name,
            "badges": child.get("badges", [])
        },
        "enrollments": enrollments,
        "borrows": borrows,
        "quiz_results": quiz_results,
        "recent_activity": activities,
        "performance_summary": {
            "avg_quiz_score": round(avg_quiz_score, 1),
            "courses_enrolled": len(enrollments),
            "courses_completed": len([e for e in enrollments if e["status"] == "completed"]),
            "books_borrowed": len(borrows)
        }
    }

# ===================== SEED DATA =====================
@api_router.post("/seed")
async def seed_data():
    # Check if already seeded
    existing = await db.schools.find_one({"code": "NTHS"})
    if existing:
        return {"message": "Already seeded"}
    
    # ==================== SCHOOLS ====================
    schools = [
        {
            "id": str(uuid.uuid4()),
            "name": "North Toronto High School",
            "code": "NTHS",
            "address": "70 Roehampton Ave",
            "city": "Toronto",
            "email_domain": "@nths.edu",
            "is_partner": True
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Westview Secondary School",
            "code": "WSS",
            "address": "4399 Steeles Ave W",
            "city": "Vaughan",
            "email_domain": "@westview.edu",
            "is_partner": True
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Brampton Centennial Secondary",
            "code": "BCSS",
            "address": "20 Fernforest Dr",
            "city": "Brampton",
            "email_domain": "@bcss.edu",
            "is_partner": True
        }
    ]
    
    for school in schools:
        await db.schools.insert_one(school)
    
    school_nths = schools[0]
    school_wss = schools[1]
    school_bcss = schools[2]
    
    # ==================== ADMIN USER ====================
    admin_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": admin_id,
        "email": "admin@library.com",
        "password": hash_password("admin123"),
        "name": "Admin User",
        "role": "admin",
        "badges": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # ==================== GUEST USER ====================
    guest_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": guest_id,
        "email": "guest@libcollab.com",
        "password": hash_password("guest123"),
        "name": "Guest User",
        "role": "guest",
        "badges": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # ==================== LIBRARIAN ====================
    librarian_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": librarian_id,
        "email": "librarian@library.com",
        "password": hash_password("librarian123"),
        "name": "Sarah Mitchell",
        "role": "librarian",
        "employee_id": "LIB001",
        "badges": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # ==================== TEACHERS (4 teachers across schools) ====================
    teachers = []
    
    # Teacher 1 - NTHS - Math
    teacher1_id = str(uuid.uuid4())
    teachers.append({
        "id": teacher1_id,
        "email": "m.johnson@nths.edu",
        "password": hash_password("teacher123"),
        "name": "Mr. Michael Johnson",
        "role": "teacher",
        "specialization": "Mathematics",
        "employee_id": "T-NTHS-001",
        "school_id": school_nths["id"],
        "badges": ["quiz_master"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Teacher 2 - NTHS - Science
    teacher2_id = str(uuid.uuid4())
    teachers.append({
        "id": teacher2_id,
        "email": "s.williams@nths.edu",
        "password": hash_password("teacher123"),
        "name": "Ms. Sarah Williams",
        "role": "teacher",
        "specialization": "Biology",
        "employee_id": "T-NTHS-002",
        "school_id": school_nths["id"],
        "badges": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Teacher 3 - WSS - English
    teacher3_id = str(uuid.uuid4())
    teachers.append({
        "id": teacher3_id,
        "email": "r.patel@westview.edu",
        "password": hash_password("teacher123"),
        "name": "Mr. Raj Patel",
        "role": "teacher",
        "specialization": "English Literature",
        "employee_id": "T-WSS-001",
        "school_id": school_wss["id"],
        "badges": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Teacher 4 - BCSS - History
    teacher4_id = str(uuid.uuid4())
    teachers.append({
        "id": teacher4_id,
        "email": "l.chen@bcss.edu",
        "password": hash_password("teacher123"),
        "name": "Ms. Lisa Chen",
        "role": "teacher",
        "specialization": "World History",
        "employee_id": "T-BCSS-001",
        "school_id": school_bcss["id"],
        "badges": ["course_champion"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    for teacher in teachers:
        await db.users.insert_one(teacher)
    
    # Also add demo teacher login
    await db.users.insert_one({
        "id": str(uuid.uuid4()),
        "email": "teacher@school.com",
        "password": hash_password("teacher123"),
        "name": "Demo Teacher",
        "role": "teacher",
        "specialization": "Mathematics",
        "school_id": school_nths["id"],
        "badges": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # ==================== PARENTS ====================
    parents = []
    
    parent1_id = str(uuid.uuid4())
    parents.append({
        "id": parent1_id,
        "email": "parent@family.com",
        "password": hash_password("parent123"),
        "name": "Jennifer Anderson",
        "role": "parent",
        "phone": "416-555-1234",
        "badges": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    parent2_id = str(uuid.uuid4())
    parents.append({
        "id": parent2_id,
        "email": "d.smith@gmail.com",
        "password": hash_password("parent123"),
        "name": "David Smith",
        "role": "parent",
        "phone": "905-555-5678",
        "badges": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    for parent in parents:
        await db.users.insert_one(parent)
    
    # ==================== STUDENTS (15 students across schools) ====================
    students = []
    
    # NTHS Students (6)
    nths_students = [
        {"name": "Tommy Anderson", "email": "t.anderson@nths.edu", "student_id": "NTHS-2024-001", "grade": 10, "parent_id": parent1_id},
        {"name": "Emma Wilson", "email": "e.wilson@nths.edu", "student_id": "NTHS-2024-002", "grade": 10, "parent_id": None},
        {"name": "Liam Brown", "email": "l.brown@nths.edu", "student_id": "NTHS-2024-003", "grade": 9, "parent_id": None},
        {"name": "Olivia Davis", "email": "o.davis@nths.edu", "student_id": "NTHS-2024-004", "grade": 11, "parent_id": None},
        {"name": "Noah Garcia", "email": "n.garcia@nths.edu", "student_id": "NTHS-2024-005", "grade": 12, "parent_id": None},
        {"name": "Ava Martinez", "email": "a.martinez@nths.edu", "student_id": "NTHS-2024-006", "grade": 9, "parent_id": None},
    ]
    
    for s in nths_students:
        student_id = str(uuid.uuid4())
        students.append({
            "id": student_id,
            "email": s["email"],
            "password": hash_password("student123"),
            "name": s["name"],
            "role": "student",
            "grade_level": s["grade"],
            "student_id": s["student_id"],
            "school_id": school_nths["id"],
            "parent_id": s["parent_id"],
            "badges": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # WSS Students (5)
    wss_students = [
        {"name": "Ethan Smith", "email": "e.smith@westview.edu", "student_id": "WSS-2024-001", "grade": 8, "parent_id": parent2_id},
        {"name": "Isabella Johnson", "email": "i.johnson@westview.edu", "student_id": "WSS-2024-002", "grade": 10, "parent_id": None},
        {"name": "Mason Lee", "email": "m.lee@westview.edu", "student_id": "WSS-2024-003", "grade": 11, "parent_id": None},
        {"name": "Sophia Taylor", "email": "s.taylor@westview.edu", "student_id": "WSS-2024-004", "grade": 9, "parent_id": None},
        {"name": "James White", "email": "j.white@westview.edu", "student_id": "WSS-2024-005", "grade": 12, "parent_id": None},
    ]
    
    for s in wss_students:
        student_id = str(uuid.uuid4())
        students.append({
            "id": student_id,
            "email": s["email"],
            "password": hash_password("student123"),
            "name": s["name"],
            "role": "student",
            "grade_level": s["grade"],
            "student_id": s["student_id"],
            "school_id": school_wss["id"],
            "parent_id": s["parent_id"],
            "badges": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # BCSS Students (4)
    bcss_students = [
        {"name": "Charlotte Harris", "email": "c.harris@bcss.edu", "student_id": "BCSS-2024-001", "grade": 10, "parent_id": None},
        {"name": "Benjamin Clark", "email": "b.clark@bcss.edu", "student_id": "BCSS-2024-002", "grade": 8, "parent_id": None},
        {"name": "Amelia Lewis", "email": "a.lewis@bcss.edu", "student_id": "BCSS-2024-003", "grade": 11, "parent_id": None},
        {"name": "Lucas Walker", "email": "l.walker@bcss.edu", "student_id": "BCSS-2024-004", "grade": 9, "parent_id": None},
    ]
    
    for s in bcss_students:
        student_id = str(uuid.uuid4())
        students.append({
            "id": student_id,
            "email": s["email"],
            "password": hash_password("student123"),
            "name": s["name"],
            "role": "student",
            "grade_level": s["grade"],
            "student_id": s["student_id"],
            "school_id": school_bcss["id"],
            "parent_id": s["parent_id"],
            "badges": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    for student in students:
        await db.users.insert_one(student)
    
    # ==================== BOOKS ====================
    academic_books = [
        {"title": "Algebra Fundamentals", "author": "Dr. Math Expert", "description": "Complete guide to algebra for high school students", "content": BOOK_CONTENT_BLUEPRINTS["Algebra Fundamentals"], "category": "academic", "pricing_type": "free", "price": 0, "format": "both", "grade_levels": [8, 9, 10], "subjects": ["Mathematics"], "available_copies": 5, "total_copies": 5, "shelf_location": "A1-01"},
        {"title": "World History: Modern Era", "author": "Prof. History Buff", "description": "Comprehensive world history textbook", "content": BOOK_CONTENT_BLUEPRINTS["World History: Modern Era"], "category": "academic", "pricing_type": "free", "price": 0, "format": "digital", "grade_levels": [9, 10, 11], "subjects": ["History"], "file_url": "https://example.com/history.pdf"},
        {"title": "Biology: Life Sciences", "author": "Dr. Science Lab", "description": "Introduction to biology and life sciences", "content": BOOK_CONTENT_BLUEPRINTS["Biology: Life Sciences"], "category": "academic", "pricing_type": "free", "price": 0, "format": "both", "grade_levels": [9, 10], "subjects": ["Biology", "Science"], "available_copies": 3, "total_copies": 3, "shelf_location": "B2-03"},
        {"title": "English Literature Anthology", "author": "Literature Council", "description": "Collection of classic English literature", "content": BOOK_CONTENT_BLUEPRINTS["English Literature Anthology"], "category": "academic", "pricing_type": "free", "price": 0, "format": "physical", "grade_levels": [10, 11, 12], "subjects": ["English"], "available_copies": 8, "total_copies": 8, "shelf_location": "C1-05"},
        {"title": "Physics for Beginners", "author": "Dr. Newton Jr.", "description": "Introduction to physics concepts", "content": BOOK_CONTENT_BLUEPRINTS["Physics for Beginners"], "category": "academic", "pricing_type": "free", "price": 0, "format": "both", "grade_levels": [8, 9], "subjects": ["Physics", "Science"], "available_copies": 4, "total_copies": 4, "shelf_location": "B1-02"},
        {"title": "Chemistry Essentials", "author": "Dr. Marie Curie II", "description": "Fundamental chemistry concepts", "content": BOOK_CONTENT_BLUEPRINTS["Chemistry Essentials"], "category": "academic", "pricing_type": "free", "price": 0, "format": "both", "grade_levels": [10, 11], "subjects": ["Chemistry", "Science"], "available_copies": 6, "total_copies": 6, "shelf_location": "B3-01"},
        {"title": "Calculus Made Easy", "author": "Prof. Leibniz", "description": "Step-by-step calculus guide", "content": BOOK_CONTENT_BLUEPRINTS["Calculus Made Easy"], "category": "academic", "pricing_type": "free", "price": 0, "format": "digital", "grade_levels": [11, 12], "subjects": ["Mathematics"]},
        {"title": "Canadian History", "author": "Dr. Maple Leaf", "description": "History of Canada from confederation to present", "content": BOOK_CONTENT_BLUEPRINTS["Canadian History"], "category": "academic", "pricing_type": "free", "price": 0, "format": "both", "grade_levels": [8, 9, 10], "subjects": ["History"], "available_copies": 5, "total_copies": 5, "shelf_location": "C2-04"},
    ]
    
    leisure_books = [
        {"title": "The Adventure Begins", "author": "J.K. Fantasy", "description": "An exciting adventure novel for teens", "content": BOOK_CONTENT_BLUEPRINTS["The Adventure Begins"], "category": "leisure", "pricing_type": "rent", "price": 2.99, "format": "physical", "grade_levels": [8, 9, 10, 11, 12], "subjects": ["Fiction"], "available_copies": 2, "total_copies": 2, "shelf_location": "L1-01"},
        {"title": "Mystery at Midnight", "author": "Agatha Detective", "description": "A thrilling mystery novel", "content": BOOK_CONTENT_BLUEPRINTS["Mystery at Midnight"], "category": "leisure", "pricing_type": "buy", "price": 12.99, "format": "both", "grade_levels": [10, 11, 12], "subjects": ["Fiction", "Mystery"], "available_copies": 3, "total_copies": 3, "shelf_location": "L2-04"},
        {"title": "Graphic Novel Collection", "author": "Comic Masters", "description": "Popular graphic novels compilation", "content": BOOK_CONTENT_BLUEPRINTS["Graphic Novel Collection"], "category": "leisure", "pricing_type": "rent", "price": 3.99, "format": "digital", "grade_levels": [8, 9, 10, 11, 12], "subjects": ["Comics"], "file_url": "https://example.com/comics.pdf"},
        {"title": "Cooking for Teens", "author": "Chef Junior", "description": "Easy recipes for young cooks", "content": BOOK_CONTENT_BLUEPRINTS["Cooking for Teens"], "category": "leisure", "pricing_type": "buy", "price": 9.99, "format": "physical", "grade_levels": [8, 9, 10, 11, 12], "subjects": ["Lifestyle", "Cooking"], "available_copies": 2, "total_copies": 2, "shelf_location": "L3-02"},
        {"title": "Space Explorers", "author": "Neil Galaxy", "description": "Sci-fi adventure in outer space", "content": BOOK_CONTENT_BLUEPRINTS["Space Explorers"], "category": "leisure", "pricing_type": "rent", "price": 4.99, "format": "both", "grade_levels": [8, 9, 10], "subjects": ["Fiction", "Sci-Fi"], "available_copies": 4, "total_copies": 4, "shelf_location": "L1-05"},
    ]
    
    book_ids = {}
    for book in academic_books + leisure_books:
        book_id = str(uuid.uuid4())
        book_ids[book["title"]] = book_id
        book["id"] = book_id
        if not book.get("cover_image"):
            safe_query = re.sub(r"[^a-z0-9]+", "+", book["title"].lower()).strip("+")
            category = book["category"] if book.get("category") in ["academic", "leisure"] else "books"
            book["cover_image"] = f"https://source.unsplash.com/600x800/?{category},{safe_query},book"
        book["isbn"] = None
        book["external_link"] = None
        book["created_at"] = datetime.now(timezone.utc).isoformat()
        if "available_copies" not in book:
            book["available_copies"] = 1
        if "total_copies" not in book:
            book["total_copies"] = 1
        if "shelf_location" not in book:
            book["shelf_location"] = None
        if "file_url" not in book:
            book["file_url"] = None
        await db.books.insert_one(book)
    
    # ==================== COURSES ====================
    courses = []
    
    # Course 1 - Algebra by Teacher 1
    course1_id = str(uuid.uuid4())
    module1_id = str(uuid.uuid4())
    module2_id = str(uuid.uuid4())
    module3_id = str(uuid.uuid4())
    quiz1_id = str(uuid.uuid4())
    
    courses.append({
        "id": course1_id,
        "title": "Introduction to Algebra",
        "description": "Learn the basics of algebraic equations and problem solving",
        "cover_image": None,
        "teacher_id": teacher1_id,
        "teacher_name": "Mr. Michael Johnson",
        "grade_levels": [8, 9],
        "subjects": ["Mathematics"],
        "is_free": True,
        "price": 0,
        "modules": [
            {"id": module1_id, "title": "Variables and Expressions", "description": "Understanding variables in algebra", "content": "This lesson introduces algebraic notation, variables, constants, and expressions. Students learn how letters can represent unknown values, how to combine like terms, and how to translate verbal phrases into mathematical expressions.", "video_url": None, "order": 1},
            {"id": module2_id, "title": "Solving Linear Equations", "description": "Step by step equation solving", "content": "This module covers one-step and two-step linear equations. Learners practice isolating the variable, using inverse operations, and checking solutions for accuracy with worked examples and short exercises.", "video_url": None, "order": 2},
            {"id": module3_id, "title": "Word Problems", "description": "Applying algebra to real-world problems", "content": "Students apply algebra to everyday scenarios such as shopping budgets, distance-time questions, and age relationships. The focus is on identifying unknowns, creating equations, and explaining the reasoning behind each answer.", "video_url": None, "order": 3}
        ],
        "quizzes": [
            {
                "id": quiz1_id,
                "title": "Algebra Final Quiz",
                "module_id": module3_id,
                "questions": [
                    {"question": "Theory: Which statement best explains why inverse operations are used when solving linear equations?", "options": ["They make numbers larger", "They keep the equation balanced while isolating the variable", "They remove constants only on the right side", "They turn expressions into formulas"], "correct_answer": 1},
                    {"question": "Practical: A student buys 3 notebooks and one pen for a total of $11. If the pen costs $2, which equation correctly finds the price x of one notebook?", "options": ["3x + 2 = 11", "3 + 2x = 11", "11x - 2 = 3", "x + 2 = 11"], "correct_answer": 0}
                ],
                "total_marks": 20,
                "passing_marks": 12
            }
        ],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Course 2 - Biology by Teacher 2
    course2_id = str(uuid.uuid4())
    bio_module1_id = str(uuid.uuid4())
    bio_module2_id = str(uuid.uuid4())
    bio_quiz_id = str(uuid.uuid4())
    
    courses.append({
        "id": course2_id,
        "title": "Introduction to Biology",
        "description": "Explore the fundamentals of life sciences",
        "cover_image": None,
        "teacher_id": teacher2_id,
        "teacher_name": "Ms. Sarah Williams",
        "grade_levels": [9, 10],
        "subjects": ["Biology", "Science"],
        "is_free": True,
        "price": 0,
        "modules": [
            {"id": bio_module1_id, "title": "Cell Structure", "description": "Understanding the building blocks of life", "content": "Students explore cell theory, the difference between plant and animal cells, and the role of organelles such as the nucleus, mitochondria, chloroplasts, and cell membrane in keeping organisms alive.", "video_url": None, "order": 1},
            {"id": bio_module2_id, "title": "DNA and Genetics", "description": "How traits are inherited", "content": "This module introduces chromosomes, genes, and DNA. Learners study how traits are inherited, why variation happens, and how dominant and recessive traits can be modeled with simple genetics problems.", "video_url": None, "order": 2}
        ],
        "quizzes": [
            {
                "id": bio_quiz_id,
                "title": "Biology Final Quiz",
                "module_id": bio_module2_id,
                "questions": [
                    {"question": "Theory: Which organelle is mainly responsible for releasing usable energy during cellular respiration?", "options": ["Nucleus", "Mitochondrion", "Vacuole", "Cell wall"], "correct_answer": 1},
                    {"question": "Practical: Two plants are crossed and both parents carry one dominant tall gene and one recessive short gene. Which outcome is possible for an offspring?", "options": ["Only tall offspring can appear", "Only short offspring can appear", "Both tall and short offspring can appear", "No offspring can inherit the tall trait"], "correct_answer": 2}
                ],
                "total_marks": 20,
                "passing_marks": 12
            }
        ],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Course 3 - English by Teacher 3
    course3_id = str(uuid.uuid4())
    eng_module1_id = str(uuid.uuid4())
    eng_module2_id = str(uuid.uuid4())
    eng_quiz_id = str(uuid.uuid4())
    
    courses.append({
        "id": course3_id,
        "title": "English Literature Essentials",
        "description": "Explore classic and contemporary literature",
        "cover_image": None,
        "teacher_id": teacher3_id,
        "teacher_name": "Mr. Raj Patel",
        "grade_levels": [10, 11, 12],
        "subjects": ["English"],
        "is_free": True,
        "price": 0,
        "modules": [
            {"id": eng_module1_id, "title": "Shakespeare Introduction", "description": "Understanding the Bard", "content": "Learners are introduced to Shakespeare's historical context, language style, and recurring themes such as love, ambition, conflict, and fate. The lesson also explains why Shakespeare remains influential today.", "video_url": None, "order": 1},
            {"id": eng_module2_id, "title": "Reading and Interpretation", "description": "Finding meaning in literary texts", "content": "Students practice identifying theme, tone, imagery, and character motivation in short passages. They learn how to support an interpretation with direct textual evidence and clear reasoning.", "video_url": None, "order": 2}
        ],
        "quizzes": [
            {
                "id": eng_quiz_id,
                "title": "English Final Quiz",
                "module_id": eng_module2_id,
                "questions": [
                    {"question": "Theory: Which idea best describes a literary theme?", "options": ["The time period of the story", "The main message or insight explored in the text", "The number of characters in a chapter", "The author’s full biography"], "correct_answer": 1},
                    {"question": "Practical: A character says they are 'fine' while clenching their fists and looking away. What is the best interpretation?", "options": ["The character is calm and relaxed", "The character is probably hiding frustration or anger", "The character is giving background information", "The character is speaking literally without emotion"], "correct_answer": 1}
                ],
                "total_marks": 20,
                "passing_marks": 12
            }
        ],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    for course in courses:
        await db.courses.insert_one(course)
    
    # ==================== ENROLLMENTS & PROGRESS ====================
    # Create enrollments for students with varying progress
    enrollment_data = [
        # Tommy Anderson - Good student
        {"student_idx": 0, "course_id": course1_id, "progress": 66.67, "completed_modules": [module1_id, module2_id], "status": "in_progress"},
        {"student_idx": 0, "course_id": course2_id, "progress": 100, "completed_modules": [bio_module1_id, bio_module2_id], "status": "completed"},
        # Emma Wilson - Excellent student  
        {"student_idx": 1, "course_id": course1_id, "progress": 100, "completed_modules": [module1_id, module2_id, module3_id], "status": "completed"},
        {"student_idx": 1, "course_id": course2_id, "progress": 50, "completed_modules": [bio_module1_id], "status": "in_progress"},
        # Liam Brown - Struggling student
        {"student_idx": 2, "course_id": course1_id, "progress": 33.33, "completed_modules": [module1_id], "status": "in_progress"},
        # Olivia Davis
        {"student_idx": 3, "course_id": course3_id, "progress": 100, "completed_modules": [eng_module1_id, eng_module2_id], "status": "completed"},
        # Ethan Smith (WSS)
        {"student_idx": 6, "course_id": course1_id, "progress": 66.67, "completed_modules": [module1_id, module2_id], "status": "in_progress"},
        # Charlotte Harris (BCSS)
        {"student_idx": 11, "course_id": course2_id, "progress": 50, "completed_modules": [bio_module1_id], "status": "in_progress"},
    ]
    
    for ed in enrollment_data:
        student = students[ed["student_idx"]]
        course = next(c for c in courses if c["id"] == ed["course_id"])
        
        enrollment_id = str(uuid.uuid4())
        enrollment = {
            "id": enrollment_id,
            "course_id": ed["course_id"],
            "user_id": student["id"],
            "course_title": course["title"],
            "status": ed["status"],
            "progress_percentage": ed["progress"],
            "completed_modules": ed["completed_modules"],
            "quiz_scores": {},
            "enrolled_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(7, 30))).isoformat()
        }
        await db.enrollments.insert_one(enrollment)
    
    # ==================== QUIZ RESULTS ====================
    quiz_results_data = [
        # Tommy - completed biology final
        {"student_idx": 0, "course_id": course2_id, "quiz_id": bio_quiz_id, "quiz_title": "Biology Final Quiz", "score": 16, "total": 20, "percentage": 80, "passed": True},
        # Emma - excellent scores
        {"student_idx": 1, "course_id": course1_id, "quiz_id": quiz1_id, "quiz_title": "Algebra Final Quiz", "score": 20, "total": 20, "percentage": 100, "passed": True},
        {"student_idx": 1, "course_id": course2_id, "quiz_id": bio_quiz_id, "quiz_title": "Biology Final Quiz", "score": 18, "total": 20, "percentage": 90, "passed": True},
        # Liam - struggling (below 60%)
        {"student_idx": 2, "course_id": course1_id, "quiz_id": quiz1_id, "quiz_title": "Algebra Final Quiz", "score": 8, "total": 20, "percentage": 40, "passed": False},
        # Olivia - good
        {"student_idx": 3, "course_id": course3_id, "quiz_id": eng_quiz_id, "quiz_title": "English Final Quiz", "score": 18, "total": 20, "percentage": 90, "passed": True},
        # Ethan - below 60%
        {"student_idx": 6, "course_id": course1_id, "quiz_id": quiz1_id, "quiz_title": "Algebra Final Quiz", "score": 9, "total": 20, "percentage": 45, "passed": False},
        # Charlotte - minimum passing score
        {"student_idx": 11, "course_id": course2_id, "quiz_id": bio_quiz_id, "quiz_title": "Biology Final Quiz", "score": 12, "total": 20, "percentage": 60, "passed": True},
    ]
    
    for qr in quiz_results_data:
        student = students[qr["student_idx"]]
        result = {
            "id": str(uuid.uuid4()),
            "user_id": student["id"],
            "course_id": qr["course_id"],
            "quiz_id": qr["quiz_id"],
            "quiz_title": qr["quiz_title"],
            "course_title": next(c["title"] for c in courses if c["id"] == qr["course_id"]),
            "score": qr["score"],
            "total_marks": qr["total"],
            "percentage": qr["percentage"],
            "passed": qr["passed"],
            "answers": [random.randint(0, 3) for _ in range(2)],
            "submitted_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 14))).isoformat()
        }
        await db.quiz_results.insert_one(result)
    
    # ==================== BORROWS ====================
    borrow_data = [
        {"student_idx": 0, "book_title": "Algebra Fundamentals", "status": "approved"},
        {"student_idx": 0, "book_title": "Biology: Life Sciences", "status": "borrowed"},
        {"student_idx": 1, "book_title": "Physics for Beginners", "status": "returned"},
        {"student_idx": 1, "book_title": "Chemistry Essentials", "status": "borrowed"},
        {"student_idx": 2, "book_title": "Algebra Fundamentals", "status": "pending"},
        {"student_idx": 3, "book_title": "English Literature Anthology", "status": "borrowed"},
        {"student_idx": 6, "book_title": "Algebra Fundamentals", "status": "approved"},
        {"student_idx": 11, "book_title": "Biology: Life Sciences", "status": "borrowed"},
    ]
    
    for bd in borrow_data:
        student = students[bd["student_idx"]]
        book_id = book_ids[bd["book_title"]]
        
        borrow = {
            "id": str(uuid.uuid4()),
            "book_id": book_id,
            "user_id": student["id"],
            "book_title": bd["book_title"],
            "user_name": student["name"],
            "borrow_type": "borrow",
            "status": bd["status"],
            "issue_date": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 10))).isoformat() if bd["status"] != "pending" else None,
            "due_date": (datetime.now(timezone.utc) + timedelta(days=random.randint(3, 14))).isoformat(),
            "return_date": (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 3))).isoformat() if bd["status"] == "returned" else None,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(5, 15))).isoformat()
        }
        await db.borrows.insert_one(borrow)
    
    # ==================== ACTIVITY LOGS ====================
    for student in students[:8]:  # First 8 students
        # Login activities
        for i in range(random.randint(5, 15)):
            await db.activities.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": student["id"],
                "activity_type": "login",
                "description": "User logged in",
                "metadata": {},
                "timestamp": (datetime.now(timezone.utc) - timedelta(days=i, hours=random.randint(0, 12))).isoformat()
            })
    
    # ==================== BADGES ====================
    # Award some badges
    await db.users.update_one({"email": "t.anderson@nths.edu"}, {"$set": {"badges": ["book_worm"]}})
    await db.users.update_one({"email": "e.wilson@nths.edu"}, {"$set": {"badges": ["quiz_master", "perfect_attendance"]}})
    
    # ==================== CERTIFICATES ====================
    # For completed courses
    for student in [students[0], students[1], students[3]]:
        enrollments = await db.enrollments.find({"user_id": student["id"], "status": "completed"}, {"_id": 0}).to_list(10)
        for enrollment in enrollments:
            cert = {
                "id": str(uuid.uuid4()),
                "enrollment_id": enrollment["id"],
                "user_id": student["id"],
                "user_name": student["name"],
                "course_id": enrollment["course_id"],
                "course_title": enrollment["course_title"],
                "issue_date": datetime.now(timezone.utc).isoformat(),
                "grade": "A" if enrollment["progress_percentage"] >= 90 else "B"
            }
            await db.certificates.insert_one(cert)
    
    return {"message": "Database seeded successfully with comprehensive mock data"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def stable_demo_id(*parts: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "::".join(parts)))


BOOK_CONTENT_BLUEPRINTS = {
    "Algebra Fundamentals": """Chapter 1: Algebraic Thinking

Algebra helps us describe patterns and solve unknowns using symbols. A variable stands for a value that can change, while a constant stays the same. Expressions combine numbers, variables, and operations.

Chapter 2: Expressions and Simplification

Like terms can be combined because they represent the same kind of quantity. For example, 3x + 2x becomes 5x. Students should identify coefficients, constants, and operations before simplifying.

Chapter 3: Solving Equations

An equation states that two expressions are equal. To solve an equation, isolate the variable using inverse operations and keep both sides balanced. Always check the solution by substituting it back into the original equation.

Chapter 4: Word Problems

Word problems require translating a real situation into mathematical language. Define the unknown, write an equation, solve carefully, and explain what the answer means in context.
""",
    "World History: Modern Era": """Unit 1: Revolutions and Change

The modern era includes major political and social revolutions that reshaped societies. Students study how ideas such as liberty, equality, nationalism, and reform influenced people and governments.

Unit 2: Industrialization

Industrialization changed how goods were produced and how people lived. Factories increased output, cities grew quickly, and new technologies improved transport and communication, but working conditions were often difficult.

Unit 3: Global Conflict

World conflicts in the modern era were shaped by alliances, nationalism, imperialism, and economic competition. Students should trace causes, major events, and long-term consequences rather than memorizing isolated facts.

Unit 4: Contemporary World

Modern history also includes decolonization, human rights movements, and globalization. Learners should compare how societies adapted to political change, technological growth, and international cooperation.
""",
    "Biology: Life Sciences": """Section 1: Cells and Organisms

Cells are the basic unit of life. Plant and animal cells share structures such as the nucleus, cytoplasm, and cell membrane, while plant cells also contain chloroplasts and a cell wall.

Section 2: Body Systems and Survival

Living things survive because systems work together. Cells form tissues, tissues form organs, and organs form systems that transport materials, protect the body, and maintain balance.

Section 3: Genetics and Inheritance

DNA carries genetic information. Genes influence inherited traits, and variation occurs because offspring receive different combinations of genetic material from their parents.

Section 4: Ecosystems

Organisms depend on both living and nonliving parts of their environment. Food chains, habitats, and adaptations help explain how life survives and changes within ecosystems.
""",
    "English Literature Anthology": """Part 1: Reading Literature Closely

Literature invites readers to explore ideas, emotions, and perspectives. Strong readers pay attention to character, setting, conflict, theme, and the language choices an author makes.

Part 2: Poetry and Imagery

Poets use imagery, rhythm, symbolism, and figurative language to create meaning. Readers should notice how a poem sounds as well as what it says directly.

Part 3: Drama and Dialogue

In drama, character relationships and themes are often revealed through dialogue and stage action. Students should infer meaning from tone, pauses, and what characters avoid saying.

Part 4: Interpretation and Evidence

A good interpretation is supported by evidence from the text. Readers should quote or paraphrase details and explain how those details support a larger idea about the work.
""",
    "Physics for Beginners": """Lesson 1: Motion

Motion describes how an object changes position over time. Speed is calculated using distance divided by time, and direction matters when describing movement more precisely.

Lesson 2: Forces

A force is a push or pull. Balanced forces do not change an object's motion, while unbalanced forces can make an object start moving, stop, speed up, slow down, or change direction.

Lesson 3: Energy

Energy allows things to happen. Common forms include thermal, light, sound, electrical, and kinetic energy. Energy can transfer from one object to another and can also change form.

Lesson 4: Simple Machines

Simple machines such as levers, pulleys, wheels, and inclined planes make work easier by changing the size or direction of a force.
""",
    "Chemistry Essentials": """Topic 1: Matter and Particles

Matter is anything that has mass and takes up space. All matter is made of tiny particles, and understanding their arrangement helps explain solids, liquids, and gases.

Topic 2: Atoms and Elements

Atoms are the building blocks of matter. Each element has a unique number of protons, and the periodic table organizes elements by shared properties and patterns.

Topic 3: Compounds and Mixtures

Elements can combine chemically to form compounds, while mixtures are physical combinations of substances. Students should distinguish between a chemical bond and a simple physical blend.

Topic 4: Chemical Change

Chemical reactions produce new substances. Signs of a reaction may include colour change, heat, gas, or precipitate formation, but evidence should always be interpreted carefully.
""",
    "Calculus Made Easy": """Module 1: Rates of Change

Calculus begins with the idea of change. A rate of change compares how one quantity changes relative to another, and the slope of a graph is an important starting point.

Module 2: Limits

Limits describe what a function approaches as the input moves toward a value. They help explain continuity and prepare students for formal definitions of derivatives.

Module 3: Derivatives

The derivative measures instantaneous rate of change. Students connect derivatives to tangent slope, motion problems, and optimization questions.

Module 4: Applications

Calculus is used to model growth, motion, and optimization. Learners should focus on interpreting what an answer means, not only performing symbolic procedures.
""",
    "Canadian History": """Chapter 1: Confederation and Nation Building

Canadian history includes the growth of provinces, national institutions, and transportation systems that connected regions. Confederation shaped political identity and responsibility.

Chapter 2: Immigration and Society

Canada changed as different communities arrived and contributed to the country. Students should consider both opportunity and inequality when examining settlement and social development.

Chapter 3: Conflict and Change

Wars, political movements, and debates over rights influenced Canada's development. Historical thinking requires examining both causes and the different perspectives involved.

Chapter 4: Canada Today

Modern Canada is shaped by bilingualism, multiculturalism, Indigenous rights, and global relationships. Students should connect present issues to historical roots.
""",
    "The Adventure Begins": """Chapter 1: The Map

Mira discovers an old map hidden inside a library book. The markings seem strange at first, but one symbol points toward a path outside her quiet town and begins the adventure.

Chapter 2: Into the Forest

Mira and her friend Dev follow the map into a forest filled with misleading trails and abandoned stone markers. They learn to trust observation, courage, and teamwork.

Chapter 3: The Hidden Door

The travellers find a sealed doorway built into a cliffside. Solving the clue requires patience and memory, proving that intelligence matters as much as bravery.

Chapter 4: A New Beginning

Beyond the door is not treasure but knowledge about the town's forgotten history. The ending shows that adventure can change how people understand themselves and their world.
""",
    "Mystery at Midnight": """Case File 1: The Missing Letter

The mystery begins when an important letter vanishes before a public announcement. Every suspect has a motive, but the timing of events becomes the key puzzle.

Case File 2: Clues and Contradictions

Detective Leena notices that witness statements do not match. Careful readers should track inconsistencies, hidden motives, and details that seem unimportant at first.

Case File 3: The Trap

The detective sets a plan to test the suspects rather than accuse anyone too early. This section highlights deduction, observation, and the importance of evidence.

Case File 4: The Reveal

The culprit is exposed through a combination of timing, physical evidence, and human behavior. The story shows that strong conclusions come from patterns, not guesses.
""",
    "Graphic Novel Collection": """Volume 1: Visual Storytelling

Graphic novels combine words and images to build meaning. Panel size, colour, perspective, and facial expression all contribute to tone and pacing.

Volume 2: Character Arcs

Characters in graphic stories often change through conflict, friendship, and responsibility. Readers should pay attention to both dialogue and visual cues.

Volume 3: Action and Sequence

Action scenes depend on sequence. A reader must infer movement across panels and connect what happens between images to understand the full event.

Volume 4: Theme in Comics

Comics can explore serious ideas such as identity, justice, belonging, and resilience. Visual storytelling can communicate emotion and symbolism as effectively as prose.
""",
    "Cooking for Teens": """Lesson 1: Kitchen Safety

Safe cooking begins with washing hands, cleaning surfaces, reading recipes fully, and handling knives and hot equipment carefully. Good habits prevent accidents and contamination.

Lesson 2: Basic Techniques

Young cooks should learn how to measure ingredients, chop safely, saute simple foods, and follow cooking times. Confidence grows through repetition and preparation.

Lesson 3: Balanced Meals

A strong meal includes different food groups and sensible portions. Students should think about nutrition, flavour, texture, and timing when planning what to cook.

Lesson 4: Easy Recipes

Simple recipes such as pasta dishes, wraps, omelets, smoothies, and baked snacks help beginners practice skills while producing useful everyday meals.
""",
    "Space Explorers": """Mission Log 1: Launch

The crew of the Horizon begins a mission beyond the solar system. Training, preparation, and trust are essential because the journey depends on both science and teamwork.

Mission Log 2: Unknown Signals

An unexplained signal interrupts the mission. The crew must decide whether to investigate, showing how curiosity and risk shape exploration.

Mission Log 3: The Silent Planet

The explorers land on a world that appears lifeless at first glance. As clues emerge, the story builds suspense around what counts as life and intelligence.

Mission Log 4: Homeward Truths

The return journey changes the crew's understanding of discovery. The story emphasizes resilience, ethics, and the idea that exploration also reveals truths about humanity.
""",
}


BOOK_OVERVIEW_BLUEPRINTS = {
    "Algebra Fundamentals": "A structured introduction to the language of algebra, this book walks students from variables and expressions into equation solving and word-problem reasoning. It is designed to build confidence with the core patterns that appear in middle- and high-school mathematics, with an emphasis on clear steps, balance, and explanation.",
    "World History: Modern Era": "This history text introduces the major political, economic, and social transformations of the modern world. It gives students a broad understanding of revolutions, industrialization, conflict, and globalization while encouraging them to connect events across time rather than memorizing isolated dates.",
    "Biology: Life Sciences": "This book provides a foundational overview of life science, starting with cells and basic biological organization before moving into genetics, systems, and ecosystems. It is written as an entry point for students who need a clear, readable guide to the core ideas of biology.",
    "English Literature Anthology": "An introductory literature collection focused on reading strategies, theme, tone, and interpretation, this book helps students approach poetry, drama, and prose with confidence. It emphasizes how readers move from observation to evidence-based interpretation.",
    "Physics for Beginners": "This starter physics text introduces motion, forces, energy, and simple machines through straightforward explanations and real-world examples. Its goal is to help students connect formulas and concepts to everyday experiences such as movement, friction, and mechanical advantage.",
    "Chemistry Essentials": "A beginner-friendly chemistry book covering matter, atoms, compounds, mixtures, and chemical reactions. It is meant to help students understand how substances are structured, how they combine, and how evidence is used to identify physical and chemical change.",
    "Calculus Made Easy": "This overview of introductory calculus explains rates of change, limits, and derivatives in a way that connects symbolic math to practical meaning. It gives learners a bridge from algebraic thinking into more advanced problem solving involving motion, optimization, and graphical interpretation.",
    "Canadian History": "A survey-style history book that introduces major developments in Canada from political formation to social change and national identity. The overview encourages students to think historically by connecting institutions, migration, conflict, and rights across different periods.",
    "The Adventure Begins": "A young-adult adventure story about discovery, courage, and hidden history, this book follows a journey that starts with a mysterious map and grows into a search for meaning. Its overview highlights the role of friendship, observation, and personal growth in the narrative.",
    "Mystery at Midnight": "A classic-style mystery built around missing evidence, conflicting testimony, and careful deduction. The overview frames the story as a puzzle in which readers follow clues, motives, and contradictions alongside the detective.",
    "Graphic Novel Collection": "A visual storytelling collection that introduces readers to how comics use panels, pacing, expression, and sequence to communicate meaning. It is as much about reading images critically as it is about following storylines and character development.",
    "Cooking for Teens": "A practical beginner cookbook aimed at helping young readers build safe, confident kitchen habits. The overview focuses on kitchen safety, simple techniques, balanced meals, and accessible everyday recipes that support independence.",
    "Space Explorers": "A science-fiction adventure centered on exploration, uncertainty, and the emotional weight of discovery. The overview presents the book as both a futuristic mission story and a reflection on teamwork, ethics, and curiosity beyond Earth.",
}


BOOK_SOURCE_BLUEPRINTS = {
    "Algebra Fundamentals": "https://openstax.org/books/algebra-and-trigonometry-2e/pages/preface",
    "World History: Modern Era": "https://openstax.org/details/books/world-history-volume-2",
    "Biology: Life Sciences": "https://openstax.org/details/books/biology-2e",
    "English Literature Anthology": "https://www.gutenberg.org/ebooks/100",
    "Physics for Beginners": "https://openstax.org/details/books/college-physics-2e",
    "Chemistry Essentials": "https://openstax.org/details/books/chemistry-2e",
    "Calculus Made Easy": "https://openstax.org/books/calculus-volume-1/pages/preface",
    "Canadian History": "https://opentextbc.ca/preconfederation2e/front-matter/about-the-book/",
    "The Adventure Begins": "https://www.gutenberg.org/ebooks/120",
    "Mystery at Midnight": "https://dev.gutenberg.org/ebooks/28733",
    "Graphic Novel Collection": "https://www.loc.gov/collections/comic-books-and-graphic-novels/about-this-collection/",
    "Cooking for Teens": "https://en.wikibooks.org/wiki/Cookbook",
    "Space Explorers": "https://dev.gutenberg.org/files/8986/old/moon3-index.htm",
}


def normalize_book_content(book: dict) -> dict:
    normalized = dict(book)
    default_overview = BOOK_OVERVIEW_BLUEPRINTS.get(normalized.get("title"))
    default_content = BOOK_CONTENT_BLUEPRINTS.get(normalized.get("title"))
    default_source = BOOK_SOURCE_BLUEPRINTS.get(normalized.get("title"))
    if default_overview and not normalized.get("overview"):
        normalized["overview"] = default_overview
    if default_content and not normalized.get("content"):
        normalized["content"] = default_content
    if default_source and not normalized.get("external_link"):
        normalized["external_link"] = default_source
    if normalized.get("file_url") and "example.com" in normalized.get("file_url", ""):
        normalized["file_url"] = None
    return normalized


DEMO_COURSE_BLUEPRINTS = {
    "Introduction to Algebra": {
        "teacher_email": "m.johnson@nths.edu",
        "teacher_name": "Mr. Michael Johnson",
        "description": "Learn the basics of algebraic equations and problem solving",
        "grade_levels": [8, 9],
        "subjects": ["Mathematics"],
        "modules": [
            {
                "title": "Variables and Expressions",
                "description": "Understanding variables in algebra",
                "content": "Lesson notes: Variables represent unknown values, while constants stay fixed. Expressions combine variables, numbers, and operations such as addition or multiplication. Students should be able to translate phrases like 'five more than x' into x + 5, combine like terms such as 3x + 2x = 5x, and explain why unlike terms cannot be combined directly."
            },
            {
                "title": "Solving Linear Equations",
                "description": "Step by step equation solving",
                "content": "Lesson notes: A linear equation can be solved by isolating the variable using inverse operations. If 3x + 6 = 21, subtract 6 from both sides to keep the equation balanced, then divide by 3 to find x = 5. Students should check solutions by substituting the answer back into the original equation."
            },
            {
                "title": "Word Problems",
                "description": "Applying algebra to real-world problems",
                "content": "Lesson notes: Word problems require identifying the unknown, defining a variable, and building an equation from the information given. For example, if 3 notebooks and 1 pen cost $11 and the pen costs $2, then the notebook cost x satisfies 3x + 2 = 11. Students should justify each step and connect the algebra to the real situation."
            }
        ],
        "quiz": {
            "title": "Algebra Final Quiz",
            "questions": [
                {
                    "question": "Theory: Why are inverse operations used when solving a linear equation?",
                    "options": [
                        "They make the equation longer",
                        "They keep the equation balanced while isolating the variable",
                        "They change a variable into a constant",
                        "They remove the need to check the answer"
                    ],
                    "correct_answer": 1
                },
                {
                    "question": "Practical: A pen costs $2 and 3 notebooks together with the pen cost $11. Which equation models the notebook price x?",
                    "options": ["3x + 2 = 11", "3 + 2x = 11", "11 - x = 2", "x + 2 = 11"],
                    "correct_answer": 0
                }
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    },
    "Introduction to Biology": {
        "teacher_email": "s.williams@nths.edu",
        "teacher_name": "Ms. Sarah Williams",
        "description": "Explore the fundamentals of life sciences",
        "grade_levels": [9, 10],
        "subjects": ["Biology", "Science"],
        "modules": [
            {
                "title": "Cell Structure",
                "description": "Understanding the building blocks of life",
                "content": "Lesson notes: Cells are the basic unit of life. The nucleus stores genetic information, the cell membrane controls what enters and leaves the cell, and mitochondria release usable energy during cellular respiration. Plant cells also contain a cell wall and chloroplasts, which animal cells do not have."
            },
            {
                "title": "DNA and Genetics",
                "description": "How traits are inherited",
                "content": "Lesson notes: DNA carries genetic instructions in genes found on chromosomes. Traits can be inherited in dominant or recessive forms. When two parents each carry one dominant and one recessive allele, their offspring may show either trait depending on the allele combination inherited."
            }
        ],
        "quiz": {
            "title": "Biology Final Quiz",
            "questions": [
                {
                    "question": "Theory: According to the lesson, which organelle releases usable energy for the cell?",
                    "options": ["Nucleus", "Mitochondrion", "Vacuole", "Cell wall"],
                    "correct_answer": 1
                },
                {
                    "question": "Practical: If two plants each carry one dominant tall allele and one recessive short allele, what result is possible for their offspring?",
                    "options": [
                        "Only tall offspring can appear",
                        "Only short offspring can appear",
                        "Both tall and short offspring can appear",
                        "No inherited trait can be predicted"
                    ],
                    "correct_answer": 2
                }
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    },
    "English Literature Essentials": {
        "teacher_email": "r.patel@westview.edu",
        "teacher_name": "Mr. Raj Patel",
        "description": "Explore classic and contemporary literature",
        "grade_levels": [10, 11, 12],
        "subjects": ["English"],
        "modules": [
            {
                "title": "Shakespeare Introduction",
                "description": "Understanding the Bard",
                "content": "Lesson notes: Shakespeare remains important because his works explore timeless themes such as love, ambition, jealousy, and fate. His writing often uses rich imagery, dramatic conflict, and memorable language to reveal character motivation and larger ideas."
            },
            {
                "title": "Reading and Interpretation",
                "description": "Finding meaning in literary texts",
                "content": "Lesson notes: A theme is the central message or insight explored in a text. Readers interpret meaning by examining tone, imagery, dialogue, and character behavior. When a character's words and actions do not match, the reader should infer the deeper emotion or intention behind the scene."
            }
        ],
        "quiz": {
            "title": "English Final Quiz",
            "questions": [
                {
                    "question": "Theory: What is a literary theme?",
                    "options": [
                        "The time period of the story",
                        "The main message or insight explored in the text",
                        "A list of all characters",
                        "The author’s publishing history"
                    ],
                    "correct_answer": 1
                },
                {
                    "question": "Practical: If a character says 'I’m fine' while clenching their fists and avoiding eye contact, what is the best interpretation?",
                    "options": [
                        "The character is relaxed",
                        "The character is probably hiding anger or frustration",
                        "The character is giving a factual report",
                        "The character is ending the scene happily"
                    ],
                    "correct_answer": 1
                }
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    },
    "Geometry Foundations": {
        "teacher_email": "m.johnson@nths.edu",
        "teacher_name": "Mr. Michael Johnson",
        "description": "Build confidence with angles, triangles, and geometric reasoning",
        "grade_levels": [8, 9],
        "subjects": ["Mathematics", "Geometry"],
        "modules": [
            {"title": "Angles and Lines", "description": "Understanding basic angle relationships", "content": "Lesson notes: Complementary angles add to 90 degrees and supplementary angles add to 180 degrees. Vertical angles are equal, and straight lines create predictable angle sums. Students should use these ideas to solve missing-angle problems."},
            {"title": "Triangles and Properties", "description": "Classifying triangles and using angle sums", "content": "Lesson notes: Triangles can be classified by sides and by angles. The sum of interior angles in any triangle is 180 degrees. Students should apply this rule to calculate unknown angles and justify the type of triangle shown."}
        ],
        "quiz": {
            "title": "Geometry Final Quiz",
            "questions": [
                {"question": "Theory: What is the sum of the interior angles in a triangle?", "options": ["90 degrees", "180 degrees", "270 degrees", "360 degrees"], "correct_answer": 1},
                {"question": "Practical: Two angles in a triangle are 50 degrees and 60 degrees. What is the third angle?", "options": ["70 degrees", "80 degrees", "90 degrees", "100 degrees"], "correct_answer": 0}
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    },
    "Fractions and Ratios": {
        "teacher_email": "m.johnson@nths.edu",
        "teacher_name": "Mr. Michael Johnson",
        "description": "Strengthen number sense with fractions, ratios, and proportional thinking",
        "grade_levels": [7, 8],
        "subjects": ["Mathematics"],
        "modules": [
            {"title": "Equivalent Fractions", "description": "Comparing and simplifying fractions", "content": "Lesson notes: Equivalent fractions represent the same value even when the numerator and denominator look different. Students should simplify fractions by dividing by common factors and compare fractions using visual or numerical reasoning."},
            {"title": "Ratios and Proportions", "description": "Using ratios to compare quantities", "content": "Lesson notes: A ratio compares two quantities, while a proportion shows two ratios are equal. Students should solve scale problems, part-to-part comparisons, and simple real-world ratio situations such as recipes and maps."}
        ],
        "quiz": {
            "title": "Fractions and Ratios Final Quiz",
            "questions": [
                {"question": "Theory: Which fraction is equivalent to 2/3?", "options": ["3/5", "4/6", "5/8", "6/12"], "correct_answer": 1},
                {"question": "Practical: A drink recipe uses 2 cups of juice for every 3 cups of water. How much water is needed for 4 cups of juice?", "options": ["5 cups", "6 cups", "7 cups", "8 cups"], "correct_answer": 1}
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    },
    "Chemistry Essentials": {
        "teacher_email": "s.williams@nths.edu",
        "teacher_name": "Ms. Sarah Williams",
        "description": "Discover atoms, elements, and chemical change",
        "grade_levels": [10, 11],
        "subjects": ["Chemistry", "Science"],
        "modules": [
            {"title": "Atoms and Elements", "description": "Understanding atomic structure", "content": "Lesson notes: Atoms are made of protons, neutrons, and electrons. The number of protons identifies the element. Students should connect atomic structure to element identity and recognize that electrons are involved in chemical behavior."},
            {"title": "Chemical Reactions", "description": "Recognizing evidence of chemical change", "content": "Lesson notes: Chemical reactions create new substances. Signs of chemical change can include color change, gas production, temperature change, or precipitate formation. Students should distinguish between physical and chemical changes using evidence."}
        ],
        "quiz": {
            "title": "Chemistry Final Quiz",
            "questions": [
                {"question": "Theory: Which particle determines what element an atom is?", "options": ["Electron", "Neutron", "Proton", "Ion"], "correct_answer": 2},
                {"question": "Practical: A lab mixture bubbles and releases heat when two substances are combined. What does this most strongly suggest?", "options": ["Only a physical change happened", "A chemical reaction likely occurred", "The substances disappeared", "The mixture became an element"], "correct_answer": 1}
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    },
    "Physics Motion Basics": {
        "teacher_email": "s.williams@nths.edu",
        "teacher_name": "Ms. Sarah Williams",
        "description": "Understand speed, distance, time, and forces",
        "grade_levels": [9, 10],
        "subjects": ["Physics", "Science"],
        "modules": [
            {"title": "Distance, Time, and Speed", "description": "Describing motion with formulas", "content": "Lesson notes: Speed tells how fast an object moves and can be calculated using speed = distance / time. Students should read simple motion situations, substitute values into the formula, and compare different moving objects."},
            {"title": "Forces and Motion", "description": "How pushes and pulls affect objects", "content": "Lesson notes: A force is a push or pull that can change motion. Balanced forces do not change motion, while unbalanced forces do. Students should connect these ideas to friction, acceleration, and everyday examples such as cycling or braking."}
        ],
        "quiz": {
            "title": "Physics Final Quiz",
            "questions": [
                {"question": "Theory: Which formula is used to calculate speed?", "options": ["speed = time / distance", "speed = distance / time", "speed = distance x time", "speed = force / mass"], "correct_answer": 1},
                {"question": "Practical: A runner covers 100 meters in 20 seconds. What is the runner's speed?", "options": ["2 m/s", "4 m/s", "5 m/s", "10 m/s"], "correct_answer": 2}
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    },
    "World History Foundations": {
        "teacher_email": "r.patel@westview.edu",
        "teacher_name": "Mr. Raj Patel",
        "description": "Explore key events and changes in world civilizations",
        "grade_levels": [9, 10],
        "subjects": ["History", "Social Studies"],
        "modules": [
            {"title": "Civilizations and Society", "description": "What makes a civilization develop", "content": "Lesson notes: Civilizations often develop near water sources and grow through agriculture, trade, government, and written language. Students should understand how geography and organization help societies expand and become more complex."},
            {"title": "Change Over Time", "description": "Studying causes and effects in history", "content": "Lesson notes: Historians study both causes and consequences. Events are connected, and long-term change can result from political decisions, technology, conflict, or economic shifts. Students should identify cause-and-effect links in historical examples."}
        ],
        "quiz": {
            "title": "World History Final Quiz",
            "questions": [
                {"question": "Theory: Which factor most often helped early civilizations grow?", "options": ["Living far from rivers", "Access to reliable water", "Avoiding trade", "Having no government"], "correct_answer": 1},
                {"question": "Practical: If a new trade route increases wealth and cultural exchange between regions, what is the best historical conclusion?", "options": ["Trade had no effect on society", "Trade can drive social and economic change", "Trade always causes war only", "Trade removes the need for government"], "correct_answer": 1}
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    },
    "Canadian Civics": {
        "teacher_email": "r.patel@westview.edu",
        "teacher_name": "Mr. Raj Patel",
        "description": "Learn how government, citizenship, and participation work in Canada",
        "grade_levels": [9, 10],
        "subjects": ["Civics", "Social Studies"],
        "modules": [
            {"title": "Government and Responsibilities", "description": "Levels of government in Canada", "content": "Lesson notes: Canada has federal, provincial, and municipal levels of government. Each level handles different responsibilities such as defense, education, or local transit. Students should match public issues to the correct level of government."},
            {"title": "Citizenship and Participation", "description": "How citizens take part in democracy", "content": "Lesson notes: Citizenship includes rights and responsibilities. People can participate by voting, staying informed, joining discussions, or supporting community action. Students should understand that democratic participation goes beyond election day."}
        ],
        "quiz": {
            "title": "Canadian Civics Final Quiz",
            "questions": [
                {"question": "Theory: Which level of government is mainly responsible for education in Canada?", "options": ["Federal", "Provincial", "Municipal", "International"], "correct_answer": 1},
                {"question": "Practical: If students want safer crosswalks near their school, which level of government would usually be the best first contact?", "options": ["Municipal", "Federal", "Provincial only", "No government level"], "correct_answer": 0}
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    },
    "Reading Comprehension Lab": {
        "teacher_email": "r.patel@westview.edu",
        "teacher_name": "Mr. Raj Patel",
        "description": "Practice identifying main ideas, inference, and supporting details",
        "grade_levels": [8, 9, 10],
        "subjects": ["English", "Reading"],
        "modules": [
            {"title": "Main Idea and Details", "description": "Finding what a passage is mostly about", "content": "Lesson notes: The main idea is the central point of a passage, while supporting details explain or prove it. Students should separate examples from the author's key message and summarize short texts clearly."},
            {"title": "Inference and Evidence", "description": "Reading between the lines", "content": "Lesson notes: Inference means combining clues from the text with background knowledge. Strong readers point to evidence in the passage before making a conclusion. Students should justify interpretations with specific details."}
        ],
        "quiz": {
            "title": "Reading Comprehension Final Quiz",
            "questions": [
                {"question": "Theory: What is the best definition of a main idea?", "options": ["A random detail", "The central point of a passage", "The title only", "A character name"], "correct_answer": 1},
                {"question": "Practical: If a passage says the streets were wet, umbrellas were open, and thunder was heard, what is the strongest inference?", "options": ["It was snowing", "It was raining", "It was midnight", "It was summer vacation"], "correct_answer": 1}
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    },
    "Essay Writing Workshop": {
        "teacher_email": "r.patel@westview.edu",
        "teacher_name": "Mr. Raj Patel",
        "description": "Learn how to plan, draft, and support a strong essay",
        "grade_levels": [10, 11, 12],
        "subjects": ["English", "Writing"],
        "modules": [
            {"title": "Thesis and Structure", "description": "Building a focused essay", "content": "Lesson notes: A thesis statement presents the main argument of an essay. Strong essays use an introduction, body paragraphs with evidence, and a conclusion. Students should connect each paragraph back to the thesis."},
            {"title": "Evidence and Explanation", "description": "Supporting ideas with clear reasoning", "content": "Lesson notes: Evidence can include quotations, examples, or facts, but it must be explained. Students should not simply insert evidence; they should show how it supports the main point and strengthens the argument."}
        ],
        "quiz": {
            "title": "Essay Writing Final Quiz",
            "questions": [
                {"question": "Theory: What is the role of a thesis statement?", "options": ["To list page numbers", "To present the essay’s main argument", "To repeat the title", "To replace evidence"], "correct_answer": 1},
                {"question": "Practical: If a paragraph includes a quotation but no explanation, what is missing?", "options": ["A new title", "Evidence", "Analysis of how the quotation supports the point", "A different font"], "correct_answer": 2}
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    },
    "Environmental Science": {
        "teacher_email": "s.williams@nths.edu",
        "teacher_name": "Ms. Sarah Williams",
        "description": "Study ecosystems, sustainability, and human environmental impact",
        "grade_levels": [9, 10, 11],
        "subjects": ["Science", "Environment"],
        "modules": [
            {"title": "Ecosystems and Balance", "description": "How living things interact", "content": "Lesson notes: Ecosystems include organisms and their physical environment. Food chains, habitats, and resource availability affect survival. Students should understand that changes to one part of an ecosystem can influence the whole system."},
            {"title": "Sustainability in Action", "description": "Reducing environmental impact", "content": "Lesson notes: Sustainability means meeting present needs without harming the future. Students should connect recycling, energy efficiency, conservation, and responsible consumption to long-term environmental health."}
        ],
        "quiz": {
            "title": "Environmental Science Final Quiz",
            "questions": [
                {"question": "Theory: What is an ecosystem?", "options": ["Only plants in a forest", "Only animals in one region", "Living things and their environment interacting together", "A weather report"], "correct_answer": 2},
                {"question": "Practical: Which action best supports sustainability in a school?", "options": ["Leaving lights on overnight", "Wasting paper daily", "Reducing energy use and recycling materials", "Burning more fuel for convenience"], "correct_answer": 2}
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    },
    "Computer Science Basics": {
        "teacher_email": "teacher@school.com",
        "teacher_name": "Demo Teacher",
        "description": "Explore algorithms, coding logic, and digital problem solving",
        "grade_levels": [9, 10, 11],
        "subjects": ["Computer Science", "Technology"],
        "modules": [
            {"title": "Algorithms and Logic", "description": "Breaking problems into steps", "content": "Lesson notes: An algorithm is a sequence of steps used to solve a problem. Good algorithms are clear, ordered, and efficient. Students should be able to describe everyday tasks, such as making a sandwich, as an ordered algorithm."},
            {"title": "Variables and Decisions", "description": "Using data and conditions in programs", "content": "Lesson notes: Programs store information in variables and use conditions to make decisions. If a condition is true, one action happens; if false, another may happen. Students should connect this to real examples like password checks or menu choices."}
        ],
        "quiz": {
            "title": "Computer Science Final Quiz",
            "questions": [
                {"question": "Theory: What is an algorithm?", "options": ["A computer brand", "A random guess", "A sequence of steps to solve a problem", "A type of keyboard"], "correct_answer": 2},
                {"question": "Practical: A program checks if a score is at least 60 before printing 'Pass'. What programming idea is this using?", "options": ["A condition", "A typo", "A folder", "A screenshot"], "correct_answer": 0}
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    },
    "Data and Graph Literacy": {
        "teacher_email": "teacher@school.com",
        "teacher_name": "Demo Teacher",
        "description": "Interpret charts, trends, and data representations with confidence",
        "grade_levels": [8, 9, 10],
        "subjects": ["Mathematics", "Data"],
        "modules": [
            {"title": "Reading Graphs", "description": "Understanding common chart types", "content": "Lesson notes: Bar graphs compare categories, line graphs show change over time, and pie charts show parts of a whole. Students should identify axes, labels, scales, and what a graph is designed to communicate."},
            {"title": "Interpreting Trends", "description": "Using data to make conclusions", "content": "Lesson notes: Trends show patterns such as increase, decrease, or stability. Students should avoid guessing and instead use exact data points or visible patterns to support a conclusion from a graph or table."}
        ],
        "quiz": {
            "title": "Data Literacy Final Quiz",
            "questions": [
                {"question": "Theory: Which graph is most useful for showing change over time?", "options": ["Line graph", "Pie chart", "Poster board", "Icon list"], "correct_answer": 0},
                {"question": "Practical: If a line graph rises steadily from January to April, what is the best conclusion?", "options": ["The values decreased", "The values stayed the same", "The values increased over time", "The graph has no pattern"], "correct_answer": 2}
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    },
    "Financial Literacy Basics": {
        "teacher_email": "teacher@school.com",
        "teacher_name": "Demo Teacher",
        "description": "Learn budgeting, saving, and smart money decisions",
        "grade_levels": [9, 10, 11, 12],
        "subjects": ["Financial Literacy", "Mathematics"],
        "modules": [
            {"title": "Budgeting Essentials", "description": "Planning income and expenses", "content": "Lesson notes: A budget compares money coming in with money going out. Students should categorize needs and wants, plan spending, and understand that a balanced budget helps prevent overspending."},
            {"title": "Saving and Goals", "description": "Building healthy financial habits", "content": "Lesson notes: Saving means setting aside money for future needs or goals. Students should understand short-term versus long-term goals and how consistent saving supports financial stability."}
        ],
        "quiz": {
            "title": "Financial Literacy Final Quiz",
            "questions": [
                {"question": "Theory: What is the main purpose of a budget?", "options": ["To waste money faster", "To track income and expenses", "To remove all spending", "To avoid all goals"], "correct_answer": 1},
                {"question": "Practical: A student earns $40 and plans to spend $25 while saving the rest. How much will be saved?", "options": ["$5", "$10", "$15", "$20"], "correct_answer": 2}
            ],
            "total_marks": 20,
            "passing_marks": 12
        }
    }
}


def normalize_demo_course(course: dict) -> dict:
    blueprint = DEMO_COURSE_BLUEPRINTS.get(course.get("title"))
    if not blueprint:
        return course

    normalized = {**course}
    normalized["description"] = blueprint["description"]
    normalized["grade_levels"] = blueprint["grade_levels"]
    normalized["subjects"] = blueprint["subjects"]

    existing_modules = course.get("modules", [])
    normalized_modules = []
    for index, module_blueprint in enumerate(blueprint["modules"]):
        existing = existing_modules[index] if index < len(existing_modules) else {}
        normalized_modules.append({
            "id": existing.get("id", stable_demo_id(normalized["id"], "module", str(index + 1))),
            "title": module_blueprint["title"],
            "description": module_blueprint["description"],
            "content": module_blueprint["content"],
            "video_url": existing.get("video_url"),
            "order": index + 1
        })
    normalized["modules"] = normalized_modules

    existing_quizzes = course.get("quizzes", [])
    existing_quiz = existing_quizzes[-1] if existing_quizzes else {}
    normalized["quizzes"] = [{
        "id": existing_quiz.get("id", stable_demo_id(normalized["id"], "quiz", "final")),
        "title": blueprint["quiz"]["title"],
        "module_id": normalized_modules[-1]["id"],
        "questions": blueprint["quiz"]["questions"],
        "total_marks": blueprint["quiz"]["total_marks"],
        "passing_marks": blueprint["quiz"]["passing_marks"]
    }]

    return normalized


async def ensure_demo_courses_catalog():
    teacher_emails = {blueprint["teacher_email"] for blueprint in DEMO_COURSE_BLUEPRINTS.values()}
    teacher_docs = await db.users.find({"email": {"$in": list(teacher_emails)}}, {"_id": 0}).to_list(100)
    teacher_map = {teacher["email"]: teacher for teacher in teacher_docs}

    for title, blueprint in DEMO_COURSE_BLUEPRINTS.items():
        existing = await db.courses.find_one({"title": title}, {"_id": 0})
        teacher = teacher_map.get(blueprint["teacher_email"])
        course_id = existing["id"] if existing else stable_demo_id("course", title)

        modules = []
        for index, module_blueprint in enumerate(blueprint["modules"], start=1):
            modules.append({
                "id": stable_demo_id(course_id, "module", str(index)),
                "title": module_blueprint["title"],
                "description": module_blueprint["description"],
                "content": module_blueprint["content"],
                "video_url": None,
                "order": index
            })

        quiz = {
            "id": stable_demo_id(course_id, "quiz", "final"),
            "title": blueprint["quiz"]["title"],
            "module_id": modules[-1]["id"],
            "questions": blueprint["quiz"]["questions"],
            "total_marks": blueprint["quiz"]["total_marks"],
            "passing_marks": blueprint["quiz"]["passing_marks"]
        }

        course_doc = {
            "id": course_id,
            "title": title,
            "description": blueprint["description"],
            "cover_image": None,
            "teacher_id": teacher["id"] if teacher else stable_demo_id("teacher", blueprint["teacher_email"]),
            "teacher_name": teacher["name"] if teacher else blueprint["teacher_name"],
            "grade_levels": blueprint["grade_levels"],
            "subjects": blueprint["subjects"],
            "is_free": True,
            "price": 0,
            "modules": modules,
            "quizzes": [quiz],
            "created_at": existing.get("created_at") if existing else datetime.now(timezone.utc).isoformat()
        }

        if existing:
            await db.courses.update_one({"id": course_id}, {"$set": course_doc})
        else:
            await db.courses.insert_one(course_doc)


if __name__ == "__main__":
    host = os.environ.get("BACKEND_HOST", "0.0.0.0")
    port = int(os.environ.get("BACKEND_PORT", "8000"))
    uvicorn.run("server:app", host=host, port=port, reload=True)
