import requests
import sys
import json
from datetime import datetime

class LibraryLMSAPITester:
    def __init__(self, base_url="http://localhost:8000/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_result(self, test_name, success, response_code=None, error_msg=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            self.failed_tests.append(f"{test_name}: {error_msg or f'HTTP {response_code}'}")
            print(f"❌ {test_name} - FAILED: {error_msg or f'HTTP {response_code}'}")

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=True):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                try:
                    result = response.json() if response.content else {}
                    self.log_result(name, True)
                    return True, result
                except json.JSONDecodeError:
                    self.log_result(name, True)
                    return True, {}
            else:
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                except:
                    error_detail = response.text[:100] if response.text else 'No response'
                self.log_result(name, False, response.status_code, error_detail)
                return False, {}

        except Exception as e:
            self.log_result(name, False, error_msg=str(e))
            return False, {}

    def test_seed_data(self):
        """Test database seeding"""
        print("\n📊 Testing Database Seeding...")
        success, response = self.run_test(
            "Seed Database",
            "POST",
            "seed",
            200,
            auth_required=False
        )
        return success

    def test_user_login(self, email, password, role):
        """Test user login and get token"""
        print(f"\n🔐 Testing {role.title()} Login...")
        success, response = self.run_test(
            f"Login as {role}",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password},
            auth_required=False
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   ✅ Token acquired for {response['user']['name']}")
            return True, response['user']
        return False, {}

    def test_get_profile(self):
        """Test getting current user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_books_endpoints(self):
        """Test book-related endpoints"""
        print("\n📚 Testing Books Endpoints...")
        
        # Get all books
        self.run_test("Get All Books", "GET", "books", 200, auth_required=False)
        
        # Get academic books
        self.run_test("Get Academic Books", "GET", "books?category=academic", 200, auth_required=False)
        
        # Get leisure books  
        self.run_test("Get Leisure Books", "GET", "books?category=leisure", 200, auth_required=False)
        
        # Test search
        self.run_test("Search Books", "GET", "books?search=algebra", 200, auth_required=False)

    def test_courses_endpoints(self):
        """Test course-related endpoints"""
        print("\n🎓 Testing Courses Endpoints...")
        
        # Get all courses
        success, courses = self.run_test("Get All Courses", "GET", "courses", 200, auth_required=False)
        
        if success and courses:
            course_id = courses[0]['id'] if courses else None
            if course_id:
                # Get specific course
                self.run_test("Get Course Details", "GET", f"courses/{course_id}", 200, auth_required=False)
                return course_id
        
        return None

    def test_enrollments(self, course_id):
        """Test course enrollment"""
        print("\n📝 Testing Course Enrollment...")
        
        if not course_id:
            print("   ⚠️ No course ID available, skipping enrollment tests")
            return
            
        # Test enrollment
        success, enrollment = self.run_test(
            "Enroll in Course",
            "POST",
            "enrollments",
            200,
            data={"course_id": course_id}
        )
        
        # Get user's enrollments
        self.run_test("Get User Enrollments", "GET", "enrollments", 200)
        
        return enrollment.get('id') if success else None

    def test_borrowing(self):
        """Test book borrowing system"""
        print("\n📖 Testing Book Borrowing...")
        
        # First get available books
        success, books = self.run_test("Get Books for Borrowing", "GET", "books", 200, auth_required=False)
        
        if success and books:
            # Try to borrow first academic book
            academic_books = [b for b in books if b.get('category') == 'academic']
            if academic_books:
                book_id = academic_books[0]['id']
                
                # Create borrow request
                success, borrow = self.run_test(
                    "Create Borrow Request",
                    "POST",
                    "borrows",
                    200,
                    data={"book_id": book_id, "borrow_type": "borrow"}
                )
                
                # Get user's borrows
                self.run_test("Get User Borrows", "GET", "borrows", 200)
                
                return borrow.get('id') if success else None
        
        return None

    def test_certificates(self):
        """Test certificate system"""
        print("\n🏆 Testing Certificates...")
        
        # Get user certificates
        self.run_test("Get User Certificates", "GET", "certificates", 200)

    def test_mock_payment(self):
        """Test mock payment system"""
        print("\n💳 Testing Mock Payment System...")
        
        # Get leisure books first
        success, books = self.run_test("Get Books for Payment", "GET", "books?category=leisure", 200, auth_required=False)
        
        if success and books:
            leisure_books = [b for b in books if b.get('category') == 'leisure' and b.get('price', 0) > 0]
            if leisure_books:
                book = leisure_books[0]
                
                # Create mock payment
                success, payment = self.run_test(
                    "Create Mock Payment",
                    "POST",
                    "payments",
                    200,
                    data={
                        "item_type": "book",
                        "item_id": book['id'],
                        "amount": book['price'],
                        "payment_method": "mock_card"
                    }
                )
                
                # Get user payments
                self.run_test("Get User Payments", "GET", "payments", 200)
                
                return success
        
        return False

    def test_admin_endpoints(self):
        """Test admin-specific endpoints (requires admin token)"""
        print("\n👥 Testing Admin Endpoints...")
        
        # Get all users (admin/librarian only)
        self.run_test("Get All Users", "GET", "users", 200)
        
        # Get analytics (admin/librarian only)
        self.run_test("Get Analytics", "GET", "analytics", 200)

    def test_role_workflow(self, email, password, role):
        """Test complete workflow for a specific role"""
        print(f"\n🎭 Testing Complete {role.title()} Workflow...")
        
        # Login
        login_success, user = self.test_user_login(email, password, role)
        if not login_success:
            return False
            
        # Get profile
        self.test_get_profile()
        
        # Test books (available to all)
        self.test_books_endpoints()
        
        # Test courses (students can enroll, teachers can manage)
        course_id = self.test_courses_endpoints()
        
        if role == 'student':
            # Student-specific tests
            self.test_enrollments(course_id)
            self.test_borrowing()
            self.test_certificates()
            self.test_mock_payment()
            
        elif role in ['admin', 'librarian']:
            # Admin/Librarian specific tests
            self.test_admin_endpoints()
            
        elif role == 'teacher':
            # Teacher can access courses and analytics
            self.test_admin_endpoints()  # Teachers have some admin access
            
        elif role == 'parent':
            # Parent can view children progress
            # Note: Parent tests would need child user setup
            pass
            
        return True

def main():
    """Run comprehensive API tests"""
    print("🚀 Starting Library LMS API Tests")
    print("=" * 50)
    
    tester = LibraryLMSAPITester()
    
    # Test database seeding first
    seed_success = tester.test_seed_data()
    if not seed_success:
        print("❌ Database seeding failed. Cannot continue with tests.")
        return 1
    
    # Test each role
    test_credentials = [
        ("student@school.com", "student123", "student"),
        ("admin@library.com", "admin123", "admin"), 
        ("teacher@school.com", "teacher123", "teacher"),
        ("librarian@library.com", "librarian123", "librarian"),
        ("parent@family.com", "parent123", "parent")
    ]
    
    for email, password, role in test_credentials:
        try:
            print(f"\n{'='*60}")
            print(f"🧪 TESTING {role.upper()} ROLE")
            print(f"{'='*60}")
            
            tester.test_role_workflow(email, password, role)
            
        except Exception as e:
            print(f"❌ Error testing {role}: {str(e)}")
            tester.failed_tests.append(f"{role} workflow: {str(e)}")
    
    # Print final results
    print(f"\n{'='*60}")
    print("📊 FINAL TEST RESULTS")
    print(f"{'='*60}")
    print(f"✅ Tests Passed: {tester.tests_passed}")
    print(f"❌ Tests Failed: {len(tester.failed_tests)}")
    print(f"📊 Total Tests: {tester.tests_run}")
    print(f"📈 Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "No tests run")
    
    if tester.failed_tests:
        print(f"\n❌ FAILED TESTS:")
        for i, test in enumerate(tester.failed_tests, 1):
            print(f"   {i}. {test}")
    else:
        print(f"\n🎉 ALL TESTS PASSED!")
    
    return 0 if len(tester.failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())