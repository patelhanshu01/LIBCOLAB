from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum

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

# ===================== MODELS =====================

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
    grade_level: Optional[int] = None  # For students (8-12)
    phone: Optional[str] = None  # For parents
    specialization: Optional[str] = None  # For teachers
    employee_id: Optional[str] = None  # For librarians
    department: Optional[str] = None  # For school staff
    parent_id: Optional[str] = None  # For linking student to parent

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
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Book Models
class BookCreate(BaseModel):
    title: str
    author: str
    description: Optional[str] = None
    category: BookCategory
    pricing_type: PricingType
    price: float = 0.0  # 0 for free/academic books
    format: BookFormat
    cover_image: Optional[str] = None
    file_url: Optional[str] = None  # For digital books
    external_link: Optional[str] = None
    shelf_location: Optional[str] = None  # For physical books
    available_copies: int = 1
    total_copies: int = 1
    isbn: Optional[str] = None
    grade_levels: List[int] = []  # Target grades (8-12)
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
    borrow_type: str = "borrow"  # borrow, rent, buy

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
    correct_answer: int  # Index of correct option

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
    item_type: str  # book or course
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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    token = create_token(user_id, user_data.role.value)
    
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
        created_at=user_doc["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
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
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
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
        created_at=user["created_at"]
    )

# ===================== USER MANAGEMENT =====================
@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(require_roles([UserRole.ADMIN, UserRole.LIBRARIAN]))):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u, role=UserRole(u["role"])) for u in users]

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, user: dict = Depends(get_current_user)):
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**target_user, role=UserRole(target_user["role"]))

@api_router.get("/parent/children", response_model=List[UserResponse])
async def get_children(user: dict = Depends(require_roles([UserRole.PARENT]))):
    children = await db.users.find({"parent_id": user["id"]}, {"_id": 0, "password": 0}).to_list(100)
    return [UserResponse(**c, role=UserRole(c["role"])) for c in children]

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
    return BookResponse(**book_doc, category=book.category, pricing_type=book.pricing_type, format=book.format)

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
    return [BookResponse(**b, category=BookCategory(b["category"]), pricing_type=PricingType(b["pricing_type"]), format=BookFormat(b["format"])) for b in books]

@api_router.get("/books/{book_id}", response_model=BookResponse)
async def get_book(book_id: str):
    book = await db.books.find_one({"id": book_id}, {"_id": 0})
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return BookResponse(**book, category=BookCategory(book["category"]), pricing_type=PricingType(book["pricing_type"]), format=BookFormat(book["format"]))

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
    due_date = now + timedelta(days=14)  # 2 weeks borrow period
    
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
    return BorrowResponse(**borrow_doc, status=BorrowStatus.PENDING)

@api_router.get("/borrows", response_model=List[BorrowResponse])
async def get_borrows(user: dict = Depends(get_current_user)):
    if user["role"] in ["admin", "librarian"]:
        borrows = await db.borrows.find({}, {"_id": 0}).to_list(1000)
    else:
        borrows = await db.borrows.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return [BorrowResponse(**b, status=BorrowStatus(b["status"])) for b in borrows]

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
    
    # Decrease available copies for physical books
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
    
    # Increase available copies for physical books
    book = await db.books.find_one({"id": borrow["book_id"]})
    if book and book["format"] in ["physical", "both"]:
        await db.books.update_one({"id": borrow["book_id"]}, {"$inc": {"available_copies": 1}})
    
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
    return EnrollmentResponse(**enrollment_doc, status=EnrollmentStatus.ENROLLED)

@api_router.get("/enrollments", response_model=List[EnrollmentResponse])
async def get_enrollments(user: dict = Depends(get_current_user)):
    if user["role"] in ["admin", "teacher"]:
        enrollments = await db.enrollments.find({}, {"_id": 0}).to_list(1000)
    else:
        enrollments = await db.enrollments.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    return [EnrollmentResponse(**e, status=EnrollmentStatus(e["status"])) for e in enrollments]

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
    passed = score >= quiz["passing_marks"]
    
    quiz_scores = enrollment.get("quiz_scores", {})
    quiz_scores[quiz_id] = {"score": score, "passed": passed}
    
    await db.enrollments.update_one({"id": enrollment_id}, {"$set": {"quiz_scores": quiz_scores}})
    
    return {"score": score, "total": quiz["total_marks"], "passed": passed}

# ===================== CERTIFICATE ROUTES =====================
@api_router.post("/certificates/{enrollment_id}")
async def generate_certificate(enrollment_id: str, user: dict = Depends(get_current_user)):
    enrollment = await db.enrollments.find_one({"id": enrollment_id, "user_id": user["id"]})
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    if enrollment["status"] != EnrollmentStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Course not completed")
    
    # Check if certificate already exists
    existing = await db.certificates.find_one({"enrollment_id": enrollment_id})
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
        "status": "completed",  # Mock: always successful
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
    
    # Users by role
    pipeline = [{"$group": {"_id": "$role", "count": {"$sum": 1}}}]
    role_counts = await db.users.aggregate(pipeline).to_list(10)
    users_by_role = {r["_id"]: r["count"] for r in role_counts}
    
    # Popular books (by borrow count)
    borrow_pipeline = [
        {"$group": {"_id": "$book_id", "count": {"$sum": 1}, "title": {"$first": "$book_title"}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    popular = await db.borrows.aggregate(borrow_pipeline).to_list(5)
    popular_books = [{"title": p["title"], "borrows": p["count"]} for p in popular]
    
    # Recent activity
    recent_borrows = await db.borrows.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    recent_activity = [{"type": "borrow", "description": f"{b['user_name']} requested {b['book_title']}", "date": b["created_at"]} for b in recent_borrows[:5]]
    
    return AnalyticsResponse(
        total_users=total_users,
        total_books=total_books,
        total_courses=total_courses,
        active_borrows=active_borrows,
        total_enrollments=total_enrollments,
        users_by_role=users_by_role,
        popular_books=popular_books,
        recent_activity=recent_activity
    )

# ===================== PARENT ROUTES =====================
@api_router.get("/parent/child/{child_id}/progress")
async def get_child_progress(child_id: str, user: dict = Depends(require_roles([UserRole.PARENT]))):
    child = await db.users.find_one({"id": child_id, "parent_id": user["id"]}, {"_id": 0})
    if not child:
        raise HTTPException(status_code=404, detail="Child not found or not linked")
    
    enrollments = await db.enrollments.find({"user_id": child_id}, {"_id": 0}).to_list(100)
    borrows = await db.borrows.find({"user_id": child_id}, {"_id": 0}).to_list(100)
    
    return {
        "child": {"id": child["id"], "name": child["name"], "grade_level": child.get("grade_level")},
        "enrollments": enrollments,
        "borrows": borrows
    }

# ===================== SEED DATA =====================
@api_router.post("/seed")
async def seed_data():
    # Check if already seeded
    existing = await db.users.find_one({"email": "admin@library.com"})
    if existing:
        return {"message": "Already seeded"}
    
    # Create admin user
    admin_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": admin_id,
        "email": "admin@library.com",
        "password": hash_password("admin123"),
        "name": "Admin User",
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create librarian
    librarian_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": librarian_id,
        "email": "librarian@library.com",
        "password": hash_password("librarian123"),
        "name": "Sarah Librarian",
        "role": "librarian",
        "employee_id": "LIB001",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create teacher
    teacher_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": teacher_id,
        "email": "teacher@school.com",
        "password": hash_password("teacher123"),
        "name": "Mr. Johnson",
        "role": "teacher",
        "specialization": "Mathematics",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create parent
    parent_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": parent_id,
        "email": "parent@family.com",
        "password": hash_password("parent123"),
        "name": "Jane Parent",
        "role": "parent",
        "phone": "555-1234",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create student (linked to parent)
    student_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": student_id,
        "email": "student@school.com",
        "password": hash_password("student123"),
        "name": "Tommy Student",
        "role": "student",
        "grade_level": 10,
        "parent_id": parent_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create sample academic books (FREE)
    academic_books = [
        {"title": "Algebra Fundamentals", "author": "Dr. Math Expert", "description": "Complete guide to algebra for high school students", "category": "academic", "pricing_type": "free", "price": 0, "format": "both", "grade_levels": [8, 9, 10], "subjects": ["Mathematics"], "available_copies": 5, "total_copies": 5, "shelf_location": "A1-01"},
        {"title": "World History: Modern Era", "author": "Prof. History Buff", "description": "Comprehensive world history textbook", "category": "academic", "pricing_type": "free", "price": 0, "format": "digital", "grade_levels": [9, 10, 11], "subjects": ["History"], "file_url": "https://example.com/history.pdf"},
        {"title": "Biology: Life Sciences", "author": "Dr. Science Lab", "description": "Introduction to biology and life sciences", "category": "academic", "pricing_type": "free", "price": 0, "format": "both", "grade_levels": [9, 10], "subjects": ["Biology", "Science"], "available_copies": 3, "total_copies": 3, "shelf_location": "B2-03"},
        {"title": "English Literature Anthology", "author": "Literature Council", "description": "Collection of classic English literature", "category": "academic", "pricing_type": "free", "price": 0, "format": "physical", "grade_levels": [10, 11, 12], "subjects": ["English"], "available_copies": 8, "total_copies": 8, "shelf_location": "C1-05"},
        {"title": "Physics for Beginners", "author": "Dr. Newton Jr.", "description": "Introduction to physics concepts", "category": "academic", "pricing_type": "free", "price": 0, "format": "both", "grade_levels": [8, 9], "subjects": ["Physics", "Science"], "available_copies": 4, "total_copies": 4, "shelf_location": "B1-02"},
    ]
    
    # Create sample leisure books (PAID)
    leisure_books = [
        {"title": "The Adventure Begins", "author": "J.K. Fantasy", "description": "An exciting adventure novel for teens", "category": "leisure", "pricing_type": "rent", "price": 2.99, "format": "physical", "grade_levels": [8, 9, 10, 11, 12], "subjects": ["Fiction"], "available_copies": 2, "total_copies": 2, "shelf_location": "L1-01"},
        {"title": "Mystery at Midnight", "author": "Agatha Detective", "description": "A thrilling mystery novel", "category": "leisure", "pricing_type": "buy", "price": 12.99, "format": "both", "grade_levels": [10, 11, 12], "subjects": ["Fiction", "Mystery"], "available_copies": 3, "total_copies": 3, "shelf_location": "L2-04"},
        {"title": "Graphic Novel Collection", "author": "Comic Masters", "description": "Popular graphic novels compilation", "category": "leisure", "pricing_type": "rent", "price": 3.99, "format": "digital", "grade_levels": [8, 9, 10, 11, 12], "subjects": ["Comics"], "file_url": "https://example.com/comics.pdf"},
        {"title": "Cooking for Teens", "author": "Chef Junior", "description": "Easy recipes for young cooks", "category": "leisure", "pricing_type": "buy", "price": 9.99, "format": "physical", "grade_levels": [8, 9, 10, 11, 12], "subjects": ["Lifestyle", "Cooking"], "available_copies": 2, "total_copies": 2, "shelf_location": "L3-02"},
    ]
    
    for book in academic_books + leisure_books:
        book["id"] = str(uuid.uuid4())
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
    
    # Create sample course
    course_id = str(uuid.uuid4())
    module1_id = str(uuid.uuid4())
    module2_id = str(uuid.uuid4())
    quiz_id = str(uuid.uuid4())
    
    await db.courses.insert_one({
        "id": course_id,
        "title": "Introduction to Algebra",
        "description": "Learn the basics of algebraic equations and problem solving",
        "cover_image": None,
        "teacher_id": teacher_id,
        "teacher_name": "Mr. Johnson",
        "grade_levels": [8, 9],
        "subjects": ["Mathematics"],
        "is_free": True,
        "price": 0,
        "modules": [
            {"id": module1_id, "title": "Variables and Expressions", "description": "Understanding variables", "content": "A variable is a symbol that represents an unknown value...", "video_url": None, "order": 1},
            {"id": module2_id, "title": "Solving Linear Equations", "description": "Step by step equation solving", "content": "To solve a linear equation, isolate the variable...", "video_url": None, "order": 2}
        ],
        "quizzes": [
            {
                "id": quiz_id,
                "title": "Algebra Basics Quiz",
                "module_id": module1_id,
                "questions": [
                    {"question": "What is the value of x in: x + 5 = 12?", "options": ["5", "7", "12", "17"], "correct_answer": 1},
                    {"question": "Simplify: 3x + 2x", "options": ["5x", "6x", "5x²", "x"], "correct_answer": 0},
                    {"question": "What is 2(x + 3) expanded?", "options": ["2x + 3", "2x + 6", "x + 6", "2x + 5"], "correct_answer": 1}
                ],
                "total_marks": 30,
                "passing_marks": 18
            }
        ],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Database seeded successfully"}

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
