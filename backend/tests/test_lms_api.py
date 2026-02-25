"""
Library LMS API Tests
Tests for authentication, dashboard data, books, enrollments, borrows, and role-based access
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERS = {
    'admin': {'email': 'admin@library.com', 'password': 'admin123'},
    'student': {'email': 'student@school.com', 'password': 'student123'},
    'parent': {'email': 'parent@family.com', 'password': 'parent123'},
    'teacher': {'email': 'm.johnson@nths.edu', 'password': 'teacher123'},
    'librarian': {'email': 'librarian@library.com', 'password': 'librarian123'}
}

@pytest.fixture(scope="module")
def api_session():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def tokens(api_session):
    """Get auth tokens for all users"""
    tokens = {}
    for role, creds in TEST_USERS.items():
        response = api_session.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code == 200:
            data = response.json()
            tokens[role] = {
                'token': data['access_token'],
                'user': data['user']
            }
    return tokens


class TestHealthAndAuth:
    """Test health and authentication endpoints"""
    
    def test_schools_endpoint(self, api_session):
        """GET /api/schools - Should return partner schools"""
        response = api_session.get(f"{BASE_URL}/api/schools")
        assert response.status_code == 200
        schools = response.json()
        assert len(schools) >= 1
        assert any(s['code'] == 'NTHS' for s in schools)
        nths = [s for s in schools if s['code'] == 'NTHS'][0]
        assert nths['is_partner'] is True
        print(f"✓ Schools endpoint returned {len(schools)} schools")

    def test_books_endpoint_public(self, api_session):
        """GET /api/books - Public endpoint should return books"""
        response = api_session.get(f"{BASE_URL}/api/books")
        assert response.status_code == 200
        books = response.json()
        assert len(books) >= 1
        # Verify book structure
        book = books[0]
        assert 'id' in book
        assert 'title' in book
        assert 'category' in book
        print(f"✓ Books endpoint returned {len(books)} books")

    def test_courses_endpoint_public(self, api_session):
        """GET /api/courses - Public endpoint should return courses"""
        response = api_session.get(f"{BASE_URL}/api/courses")
        assert response.status_code == 200
        courses = response.json()
        assert len(courses) >= 1
        print(f"✓ Courses endpoint returned {len(courses)} courses")

    def test_admin_login(self, api_session):
        """POST /api/auth/login - Admin login"""
        response = api_session.post(f"{BASE_URL}/api/auth/login", json=TEST_USERS['admin'])
        assert response.status_code == 200
        data = response.json()
        assert 'access_token' in data
        assert data['user']['role'] == 'admin'
        print("✓ Admin login successful")

    def test_student_login(self, api_session):
        """POST /api/auth/login - Student login"""
        response = api_session.post(f"{BASE_URL}/api/auth/login", json=TEST_USERS['student'])
        assert response.status_code == 200
        data = response.json()
        assert data['user']['role'] == 'student'
        assert data['user']['name'] == 'Tommy Anderson'
        assert data['user']['grade_level'] == 10
        print("✓ Student login successful")

    def test_parent_login(self, api_session):
        """POST /api/auth/login - Parent login"""
        response = api_session.post(f"{BASE_URL}/api/auth/login", json=TEST_USERS['parent'])
        assert response.status_code == 200
        data = response.json()
        assert data['user']['role'] == 'parent'
        assert data['user']['name'] == 'Jennifer Anderson'
        print("✓ Parent login successful")

    def test_teacher_login(self, api_session):
        """POST /api/auth/login - Teacher login"""
        response = api_session.post(f"{BASE_URL}/api/auth/login", json=TEST_USERS['teacher'])
        assert response.status_code == 200
        data = response.json()
        assert data['user']['role'] == 'teacher'
        assert data['user']['name'] == 'Mr. Michael Johnson'
        assert data['user']['school_name'] == 'North Toronto High School'
        print("✓ Teacher login successful")

    def test_librarian_login(self, api_session):
        """POST /api/auth/login - Librarian login"""
        response = api_session.post(f"{BASE_URL}/api/auth/login", json=TEST_USERS['librarian'])
        assert response.status_code == 200
        data = response.json()
        assert data['user']['role'] == 'librarian'
        assert data['user']['name'] == 'Sarah Mitchell'
        print("✓ Librarian login successful")

    def test_invalid_login(self, api_session):
        """POST /api/auth/login - Invalid credentials should return 401"""
        response = api_session.post(f"{BASE_URL}/api/auth/login", json={
            'email': 'wrong@email.com', 
            'password': 'wrongpass'
        })
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")


class TestSchoolBasedLogin:
    """Test school-based login endpoints"""
    
    def test_school_verify_teacher(self, api_session):
        """POST /api/auth/school-verify - Teacher with school credentials"""
        # Get NTHS school ID
        schools_res = api_session.get(f"{BASE_URL}/api/schools")
        schools = schools_res.json()
        nths_id = [s['id'] for s in schools if s['code'] == 'NTHS'][0]
        
        response = api_session.post(f"{BASE_URL}/api/auth/school-verify", json={
            'school_id': nths_id,
            'employee_id': 'T-NTHS-001',
            'school_email': 'm.johnson@nths.edu',
            'password': 'teacher123',
            'role': 'teacher'
        })
        assert response.status_code == 200
        data = response.json()
        assert data['user']['role'] == 'teacher'
        assert data['user']['school_name'] == 'North Toronto High School'
        print("✓ Teacher school login successful")
    
    def test_school_verify_invalid_domain(self, api_session):
        """POST /api/auth/school-verify - Email domain validation"""
        schools_res = api_session.get(f"{BASE_URL}/api/schools")
        schools = schools_res.json()
        nths_id = [s['id'] for s in schools if s['code'] == 'NTHS'][0]
        
        # student@school.com doesn't match @nths.edu domain
        response = api_session.post(f"{BASE_URL}/api/auth/school-verify", json={
            'school_id': nths_id,
            'student_id': 'NTHS-2024-001',
            'school_email': 'student@school.com',  # Wrong domain
            'password': 'student123',
            'role': 'student'
        })
        # Should fail due to domain mismatch
        assert response.status_code == 400
        assert 'Email must be from' in response.json()['detail']
        print("✓ School login domain validation works correctly")


class TestStudentDashboard:
    """Test student dashboard APIs"""
    
    def test_student_enrollments(self, api_session, tokens):
        """GET /api/enrollments - Student should see their enrollments"""
        token = tokens['student']['token']
        response = api_session.get(
            f"{BASE_URL}/api/enrollments",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        enrollments = response.json()
        assert len(enrollments) >= 1
        # Verify enrollment structure
        enrollment = enrollments[0]
        assert 'course_title' in enrollment
        assert 'progress_percentage' in enrollment
        assert 'status' in enrollment
        print(f"✓ Student has {len(enrollments)} enrollments")

    def test_student_borrows(self, api_session, tokens):
        """GET /api/borrows - Student should see their borrows"""
        token = tokens['student']['token']
        response = api_session.get(
            f"{BASE_URL}/api/borrows",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        borrows = response.json()
        assert len(borrows) >= 1
        # Verify borrow structure
        borrow = borrows[0]
        assert 'book_title' in borrow
        assert 'status' in borrow
        print(f"✓ Student has {len(borrows)} borrows")

    def test_student_badges(self, api_session, tokens):
        """GET /api/badges/my - Student badges endpoint"""
        token = tokens['student']['token']
        response = api_session.get(
            f"{BASE_URL}/api/badges/my",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        badges = response.json()
        assert len(badges) >= 1
        # Verify badge structure
        badge = badges[0]
        assert 'id' in badge
        assert 'name' in badge
        assert 'earned' in badge
        earned_badges = [b for b in badges if b['earned']]
        print(f"✓ Student has {len(earned_badges)}/{len(badges)} badges earned")

    def test_student_quiz_results(self, api_session, tokens):
        """GET /api/quiz-results - Student quiz results"""
        token = tokens['student']['token']
        response = api_session.get(
            f"{BASE_URL}/api/quiz-results",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        results = response.json()
        assert len(results) >= 1
        # Verify quiz result structure
        result = results[0]
        assert 'quiz_title' in result
        assert 'percentage' in result
        assert 'passed' in result
        print(f"✓ Student has {len(results)} quiz results")

    def test_student_performance_report(self, api_session, tokens):
        """GET /api/performance/report - Student performance report"""
        token = tokens['student']['token']
        response = api_session.get(
            f"{BASE_URL}/api/performance/report",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        report = response.json()
        assert 'overall_average' in report
        assert 'quiz_scores' in report
        assert 'improvement_trend' in report
        print(f"✓ Student performance avg: {report['overall_average']}%")


class TestParentDashboard:
    """Test parent dashboard APIs"""
    
    def test_parent_children(self, api_session, tokens):
        """GET /api/parent/children - Parent should see linked children"""
        token = tokens['parent']['token']
        response = api_session.get(
            f"{BASE_URL}/api/parent/children",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        children = response.json()
        assert len(children) >= 1
        # Tommy Anderson should be linked
        assert any(c['name'] == 'Tommy Anderson' for c in children)
        print(f"✓ Parent has {len(children)} linked child(ren)")

    def test_parent_child_progress(self, api_session, tokens):
        """GET /api/parent/child/{id}/progress - Child progress details"""
        token = tokens['parent']['token']
        child_id = tokens['student']['user']['id']
        
        response = api_session.get(
            f"{BASE_URL}/api/parent/child/{child_id}/progress",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        progress = response.json()
        assert 'child' in progress
        assert 'enrollments' in progress
        assert 'borrows' in progress
        assert 'quiz_results' in progress
        assert 'performance_summary' in progress
        assert progress['child']['name'] == 'Tommy Anderson'
        print("✓ Parent can view child's detailed progress")


class TestTeacherDashboard:
    """Test teacher dashboard APIs"""
    
    def test_teacher_analytics(self, api_session, tokens):
        """GET /api/teacher/analytics - Teacher analytics"""
        token = tokens['teacher']['token']
        response = api_session.get(
            f"{BASE_URL}/api/teacher/analytics",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        analytics = response.json()
        assert 'total_courses' in analytics
        assert 'total_students' in analytics
        assert 'avg_progress' in analytics
        assert 'avg_quiz_score' in analytics
        assert 'students_needing_help' in analytics
        assert 'course_stats' in analytics
        print(f"✓ Teacher has {analytics['total_courses']} courses, {analytics['total_students']} students")

    def test_teacher_courses(self, api_session, tokens):
        """GET /api/courses?teacher_id - Teacher's courses"""
        teacher_id = tokens['teacher']['user']['id']
        response = api_session.get(f"{BASE_URL}/api/courses?teacher_id={teacher_id}")
        assert response.status_code == 200
        courses = response.json()
        # Mr. Johnson should have at least the Algebra course
        assert len(courses) >= 1
        print(f"✓ Teacher has {len(courses)} course(s)")


class TestLibrarianDashboard:
    """Test librarian dashboard APIs"""
    
    def test_librarian_all_borrows(self, api_session, tokens):
        """GET /api/borrows - Librarian sees all borrows"""
        token = tokens['librarian']['token']
        response = api_session.get(
            f"{BASE_URL}/api/borrows",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        borrows = response.json()
        # Librarian should see all borrows, not just their own
        assert len(borrows) >= 1
        print(f"✓ Librarian can see {len(borrows)} borrow records")

    def test_librarian_create_book(self, api_session, tokens):
        """POST /api/books - Librarian can create books"""
        token = tokens['librarian']['token']
        new_book = {
            'title': 'TEST_Automated Test Book',
            'author': 'Test Author',
            'description': 'Book for testing',
            'category': 'academic',
            'pricing_type': 'free',
            'price': 0,
            'format': 'physical',
            'available_copies': 5,
            'total_copies': 5,
            'grade_levels': [9, 10],
            'subjects': ['Testing']
        }
        response = api_session.post(
            f"{BASE_URL}/api/books",
            json=new_book,
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        book = response.json()
        assert book['title'] == new_book['title']
        assert 'id' in book
        print(f"✓ Librarian created book with ID: {book['id']}")
        
        # Cleanup - delete the test book
        delete_res = api_session.delete(
            f"{BASE_URL}/api/books/{book['id']}",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert delete_res.status_code == 200
        print("✓ Test book cleaned up")


class TestAdminDashboard:
    """Test admin dashboard APIs"""
    
    def test_admin_analytics(self, api_session, tokens):
        """GET /api/analytics - Admin analytics"""
        token = tokens['admin']['token']
        response = api_session.get(
            f"{BASE_URL}/api/analytics",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        analytics = response.json()
        assert 'total_users' in analytics
        assert 'total_books' in analytics
        assert 'total_courses' in analytics
        assert 'active_borrows' in analytics
        assert 'users_by_role' in analytics
        assert 'popular_books' in analytics
        assert 'recent_activity' in analytics
        print(f"✓ Admin analytics: {analytics['total_users']} users, {analytics['total_books']} books")

    def test_admin_users_list(self, api_session, tokens):
        """GET /api/users - Admin can view all users"""
        token = tokens['admin']['token']
        response = api_session.get(
            f"{BASE_URL}/api/users",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        users = response.json()
        assert len(users) >= 5  # At least our 5 test users
        roles = set(u['role'] for u in users)
        assert 'student' in roles
        assert 'teacher' in roles
        assert 'admin' in roles
        print(f"✓ Admin can see {len(users)} users")


class TestRoleBasedAccess:
    """Test role-based access control"""
    
    def test_student_cannot_access_admin_analytics(self, api_session, tokens):
        """Student should not access admin analytics"""
        token = tokens['student']['token']
        response = api_session.get(
            f"{BASE_URL}/api/analytics",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 403
        print("✓ Student correctly denied access to admin analytics")

    def test_student_cannot_create_books(self, api_session, tokens):
        """Student should not be able to create books"""
        token = tokens['student']['token']
        response = api_session.post(
            f"{BASE_URL}/api/books",
            json={'title': 'Test', 'author': 'Test', 'category': 'academic', 
                  'pricing_type': 'free', 'format': 'digital'},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 403
        print("✓ Student correctly denied book creation")

    def test_teacher_cannot_access_admin_analytics(self, api_session, tokens):
        """Teacher should not access admin analytics"""
        token = tokens['teacher']['token']
        response = api_session.get(
            f"{BASE_URL}/api/analytics",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 403
        print("✓ Teacher correctly denied access to admin analytics")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
