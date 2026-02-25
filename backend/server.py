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
import jwt
import bcrypt
from enum import Enum
import random

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

app = FastAPI(title="Library LMS API")
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
    school_id: str
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
    query = {"school_id": data.school_id, "email": data.school_email}
    if data.student_id:
        query["student_id"] = data.student_id
    if data.employee_id:
        query["employee_id"] = data.employee_id
    
    user = await db.users.find_one(query, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid school credentials. Please check your Student/Employee ID and email.")
    
    if not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # Log login activity
    await log_activity(user["id"], "login", f"Logged in via school verification", {"school_id": data.school_id})
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
        school_name=school.get("name"),
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
    
    await log_activity(user["id"], "login", f"User logged in")
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
    
    allowed_fields = ["name", "phone", "grade_level", "specialization"]
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
    due_date = now + timedelta(days=14)
    
    borrow_doc = {
        "id": borrow_id,
        "book_id": borrow.book_id,
        "user_id": user["id"],
        "book_title": book["title"],
        "user_name": user["name"],
        "borrow_type": borrow.borrow_type,
        "status": BorrowStatus.PENDING.value,
        "issue_date": None,
        "due_date": due_date.isoformat(),
        "return_date": None,
        "created_at": now.isoformat()
    }
    
    await db.borrows.insert_one(borrow_doc)
    await log_activity(user["id"], "borrow", f"Requested to borrow: {book['title']}", {"book_id": borrow.book_id})
    await check_and_award_badges(user["id"])
    
    borrow_doc["status"] = BorrowStatus.PENDING
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
    query = {}
    if grade:
        query["grade_levels"] = grade
    if subject:
        query["subjects"] = subject
    if teacher_id:
        query["teacher_id"] = teacher_id
    
    courses = await db.courses.find(query, {"_id": 0}).to_list(1000)
    return [CourseResponse(**c) for c in courses]

@api_router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseResponse(**course)

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

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str, user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.TEACHER]))):
    await db.courses.delete_one({"id": course_id})
    return {"message": "Course deleted"}

# ===================== ENROLLMENT ROUTES =====================
@api_router.post("/enrollments", response_model=EnrollmentResponse)
async def enroll(enrollment: EnrollmentCreate, user: dict = Depends(get_current_user)):
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
    if user["role"] in ["admin", "teacher"]:
        enrollments = await db.enrollments.find({}, {"_id": 0}).to_list(1000)
    else:
        enrollments = await db.enrollments.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    result = []
    for e in enrollments:
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
    
    completed_modules = enrollment.get("completed_modules", [])
    if module_id not in completed_modules:
        completed_modules.append(module_id)
    
    total_modules = len(course.get("modules", []))
    progress = (len(completed_modules) / total_modules * 100) if total_modules > 0 else 0
    
    status = EnrollmentStatus.IN_PROGRESS.value
    if progress >= 100:
        status = EnrollmentStatus.COMPLETED.value
    
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
    
    quiz = None
    for q in course.get("quizzes", []):
        if q["id"] == quiz_id:
            quiz = q
            break
    
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
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
    
    # Update enrollment quiz scores
    quiz_scores = enrollment.get("quiz_scores", {})
    quiz_scores[quiz_id] = {"score": score, "passed": passed, "percentage": percentage}
    await db.enrollments.update_one({"id": enrollment_id}, {"$set": {"quiz_scores": quiz_scores}})
    
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
        {"title": "Algebra Fundamentals", "author": "Dr. Math Expert", "description": "Complete guide to algebra for high school students", "category": "academic", "pricing_type": "free", "price": 0, "format": "both", "grade_levels": [8, 9, 10], "subjects": ["Mathematics"], "available_copies": 5, "total_copies": 5, "shelf_location": "A1-01"},
        {"title": "World History: Modern Era", "author": "Prof. History Buff", "description": "Comprehensive world history textbook", "category": "academic", "pricing_type": "free", "price": 0, "format": "digital", "grade_levels": [9, 10, 11], "subjects": ["History"], "file_url": "https://example.com/history.pdf"},
        {"title": "Biology: Life Sciences", "author": "Dr. Science Lab", "description": "Introduction to biology and life sciences", "category": "academic", "pricing_type": "free", "price": 0, "format": "both", "grade_levels": [9, 10], "subjects": ["Biology", "Science"], "available_copies": 3, "total_copies": 3, "shelf_location": "B2-03"},
        {"title": "English Literature Anthology", "author": "Literature Council", "description": "Collection of classic English literature", "category": "academic", "pricing_type": "free", "price": 0, "format": "physical", "grade_levels": [10, 11, 12], "subjects": ["English"], "available_copies": 8, "total_copies": 8, "shelf_location": "C1-05"},
        {"title": "Physics for Beginners", "author": "Dr. Newton Jr.", "description": "Introduction to physics concepts", "category": "academic", "pricing_type": "free", "price": 0, "format": "both", "grade_levels": [8, 9], "subjects": ["Physics", "Science"], "available_copies": 4, "total_copies": 4, "shelf_location": "B1-02"},
        {"title": "Chemistry Essentials", "author": "Dr. Marie Curie II", "description": "Fundamental chemistry concepts", "category": "academic", "pricing_type": "free", "price": 0, "format": "both", "grade_levels": [10, 11], "subjects": ["Chemistry", "Science"], "available_copies": 6, "total_copies": 6, "shelf_location": "B3-01"},
        {"title": "Calculus Made Easy", "author": "Prof. Leibniz", "description": "Step-by-step calculus guide", "category": "academic", "pricing_type": "free", "price": 0, "format": "digital", "grade_levels": [11, 12], "subjects": ["Mathematics"]},
        {"title": "Canadian History", "author": "Dr. Maple Leaf", "description": "History of Canada from confederation to present", "category": "academic", "pricing_type": "free", "price": 0, "format": "both", "grade_levels": [8, 9, 10], "subjects": ["History"], "available_copies": 5, "total_copies": 5, "shelf_location": "C2-04"},
    ]
    
    leisure_books = [
        {"title": "The Adventure Begins", "author": "J.K. Fantasy", "description": "An exciting adventure novel for teens", "category": "leisure", "pricing_type": "rent", "price": 2.99, "format": "physical", "grade_levels": [8, 9, 10, 11, 12], "subjects": ["Fiction"], "available_copies": 2, "total_copies": 2, "shelf_location": "L1-01"},
        {"title": "Mystery at Midnight", "author": "Agatha Detective", "description": "A thrilling mystery novel", "category": "leisure", "pricing_type": "buy", "price": 12.99, "format": "both", "grade_levels": [10, 11, 12], "subjects": ["Fiction", "Mystery"], "available_copies": 3, "total_copies": 3, "shelf_location": "L2-04"},
        {"title": "Graphic Novel Collection", "author": "Comic Masters", "description": "Popular graphic novels compilation", "category": "leisure", "pricing_type": "rent", "price": 3.99, "format": "digital", "grade_levels": [8, 9, 10, 11, 12], "subjects": ["Comics"], "file_url": "https://example.com/comics.pdf"},
        {"title": "Cooking for Teens", "author": "Chef Junior", "description": "Easy recipes for young cooks", "category": "leisure", "pricing_type": "buy", "price": 9.99, "format": "physical", "grade_levels": [8, 9, 10, 11, 12], "subjects": ["Lifestyle", "Cooking"], "available_copies": 2, "total_copies": 2, "shelf_location": "L3-02"},
        {"title": "Space Explorers", "author": "Neil Galaxy", "description": "Sci-fi adventure in outer space", "category": "leisure", "pricing_type": "rent", "price": 4.99, "format": "both", "grade_levels": [8, 9, 10], "subjects": ["Fiction", "Sci-Fi"], "available_copies": 4, "total_copies": 4, "shelf_location": "L1-05"},
    ]
    
    book_ids = {}
    for book in academic_books + leisure_books:
        book_id = str(uuid.uuid4())
        book_ids[book["title"]] = book_id
        book["id"] = book_id
        book["cover_image"] = None
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
    quiz2_id = str(uuid.uuid4())
    
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
            {"id": module1_id, "title": "Variables and Expressions", "description": "Understanding variables in algebra", "content": "A variable is a symbol that represents an unknown value. In algebra, we use letters like x, y, and z to represent these unknowns...", "video_url": None, "order": 1},
            {"id": module2_id, "title": "Solving Linear Equations", "description": "Step by step equation solving", "content": "To solve a linear equation, we need to isolate the variable on one side of the equation...", "video_url": None, "order": 2},
            {"id": module3_id, "title": "Word Problems", "description": "Applying algebra to real-world problems", "content": "Word problems require us to translate English sentences into mathematical equations...", "video_url": None, "order": 3}
        ],
        "quizzes": [
            {
                "id": quiz1_id,
                "title": "Algebra Basics Quiz",
                "module_id": module1_id,
                "questions": [
                    {"question": "What is the value of x in: x + 5 = 12?", "options": ["5", "7", "12", "17"], "correct_answer": 1},
                    {"question": "Simplify: 3x + 2x", "options": ["5x", "6x", "5x²", "x"], "correct_answer": 0},
                    {"question": "What is 2(x + 3) expanded?", "options": ["2x + 3", "2x + 6", "x + 6", "2x + 5"], "correct_answer": 1},
                    {"question": "Solve: 2x = 10", "options": ["x = 2", "x = 5", "x = 10", "x = 20"], "correct_answer": 1},
                    {"question": "If y = 3x and x = 4, what is y?", "options": ["7", "12", "1", "4"], "correct_answer": 1}
                ],
                "total_marks": 50,
                "passing_marks": 25
            },
            {
                "id": quiz2_id,
                "title": "Linear Equations Quiz",
                "module_id": module2_id,
                "questions": [
                    {"question": "Solve: x - 7 = 15", "options": ["x = 8", "x = 22", "x = -22", "x = 7"], "correct_answer": 1},
                    {"question": "What is x in: 3x + 6 = 21?", "options": ["x = 5", "x = 9", "x = 15", "x = 3"], "correct_answer": 0},
                    {"question": "Solve: x/4 = 8", "options": ["x = 2", "x = 12", "x = 32", "x = 4"], "correct_answer": 2},
                    {"question": "If 5x - 3 = 12, what is x?", "options": ["x = 3", "x = 9", "x = 15", "x = 1.8"], "correct_answer": 0}
                ],
                "total_marks": 40,
                "passing_marks": 20
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
            {"id": bio_module1_id, "title": "Cell Structure", "description": "Understanding the building blocks of life", "content": "All living things are made of cells. Cells are the basic unit of life...", "video_url": None, "order": 1},
            {"id": bio_module2_id, "title": "DNA and Genetics", "description": "How traits are inherited", "content": "DNA contains the genetic instructions for all living organisms...", "video_url": None, "order": 2}
        ],
        "quizzes": [
            {
                "id": bio_quiz_id,
                "title": "Cell Biology Quiz",
                "module_id": bio_module1_id,
                "questions": [
                    {"question": "What is the powerhouse of the cell?", "options": ["Nucleus", "Mitochondria", "Ribosome", "Cell membrane"], "correct_answer": 1},
                    {"question": "Which organelle contains DNA?", "options": ["Ribosome", "Golgi body", "Nucleus", "Lysosome"], "correct_answer": 2},
                    {"question": "Plant cells have ____ that animal cells don't have", "options": ["Nucleus", "Cell wall", "Mitochondria", "Cytoplasm"], "correct_answer": 1}
                ],
                "total_marks": 30,
                "passing_marks": 15
            }
        ],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Course 3 - English by Teacher 3
    course3_id = str(uuid.uuid4())
    eng_module1_id = str(uuid.uuid4())
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
            {"id": eng_module1_id, "title": "Shakespeare Introduction", "description": "Understanding the Bard", "content": "William Shakespeare wrote 37 plays and 154 sonnets...", "video_url": None, "order": 1}
        ],
        "quizzes": [
            {
                "id": eng_quiz_id,
                "title": "Shakespeare Quiz",
                "module_id": eng_module1_id,
                "questions": [
                    {"question": "Who wrote Romeo and Juliet?", "options": ["Charles Dickens", "Shakespeare", "Jane Austen", "Mark Twain"], "correct_answer": 1},
                    {"question": "How many sonnets did Shakespeare write?", "options": ["100", "154", "200", "50"], "correct_answer": 1}
                ],
                "total_marks": 20,
                "passing_marks": 10
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
        {"student_idx": 3, "course_id": course3_id, "progress": 100, "completed_modules": [eng_module1_id], "status": "completed"},
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
        # Tommy - Decent scores
        {"student_idx": 0, "course_id": course1_id, "quiz_id": quiz1_id, "quiz_title": "Algebra Basics Quiz", "score": 35, "total": 50, "percentage": 70, "passed": True},
        {"student_idx": 0, "course_id": course1_id, "quiz_id": quiz2_id, "quiz_title": "Linear Equations Quiz", "score": 28, "total": 40, "percentage": 70, "passed": True},
        {"student_idx": 0, "course_id": course2_id, "quiz_id": bio_quiz_id, "quiz_title": "Cell Biology Quiz", "score": 24, "total": 30, "percentage": 80, "passed": True},
        # Emma - Excellent scores
        {"student_idx": 1, "course_id": course1_id, "quiz_id": quiz1_id, "quiz_title": "Algebra Basics Quiz", "score": 48, "total": 50, "percentage": 96, "passed": True},
        {"student_idx": 1, "course_id": course1_id, "quiz_id": quiz2_id, "quiz_title": "Linear Equations Quiz", "score": 38, "total": 40, "percentage": 95, "passed": True},
        {"student_idx": 1, "course_id": course2_id, "quiz_id": bio_quiz_id, "quiz_title": "Cell Biology Quiz", "score": 27, "total": 30, "percentage": 90, "passed": True},
        # Liam - Struggling (below 50%)
        {"student_idx": 2, "course_id": course1_id, "quiz_id": quiz1_id, "quiz_title": "Algebra Basics Quiz", "score": 20, "total": 50, "percentage": 40, "passed": False},
        # Olivia - Good
        {"student_idx": 3, "course_id": course3_id, "quiz_id": eng_quiz_id, "quiz_title": "Shakespeare Quiz", "score": 18, "total": 20, "percentage": 90, "passed": True},
        # Ethan - Below 50%
        {"student_idx": 6, "course_id": course1_id, "quiz_id": quiz1_id, "quiz_title": "Algebra Basics Quiz", "score": 22, "total": 50, "percentage": 44, "passed": False},
        {"student_idx": 6, "course_id": course1_id, "quiz_id": quiz2_id, "quiz_title": "Linear Equations Quiz", "score": 18, "total": 40, "percentage": 45, "passed": False},
        # Charlotte - Average
        {"student_idx": 11, "course_id": course2_id, "quiz_id": bio_quiz_id, "quiz_title": "Cell Biology Quiz", "score": 18, "total": 30, "percentage": 60, "passed": True},
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
            "answers": [random.randint(0, 3) for _ in range(5)],
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
    await db.users.update_one({"email": "student@school.com"}, {"$set": {"badges": ["book_worm"]}})
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
