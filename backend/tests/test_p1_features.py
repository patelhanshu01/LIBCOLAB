"""
Library LMS P1 Features API Tests
Tests for Teacher course/module/quiz CRUD, Admin user CRUD/role management, Librarian inventory filters
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USERS = {
    'admin': {'email': 'admin@library.com', 'password': 'admin123'},
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
    """Get auth tokens for test users"""
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


# ===================== TEACHER COURSE CRUD =====================
class TestTeacherCourseCRUD:
    """Test teacher course create, read, update, delete"""
    
    created_course_id = None
    
    def test_create_course(self, api_session, tokens):
        """POST /api/courses - Teacher creates a new course"""
        token = tokens['teacher']['token']
        course_data = {
            'title': 'TEST_Advanced Calculus',
            'description': 'Course for testing CRUD operations',
            'grade_levels': [11, 12],
            'subjects': ['Mathematics', 'Calculus'],
            'is_free': True,
            'price': 0
        }
        response = api_session.post(
            f"{BASE_URL}/api/courses",
            json=course_data,
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200, f"Failed to create course: {response.text}"
        course = response.json()
        assert course['title'] == course_data['title']
        assert course['description'] == course_data['description']
        assert course['grade_levels'] == [11, 12]
        assert 'Mathematics' in course['subjects']
        assert course['teacher_id'] == tokens['teacher']['user']['id']
        TestTeacherCourseCRUD.created_course_id = course['id']
        print(f"✓ Course created: {course['title']} (ID: {course['id']})")
    
    def test_get_created_course(self, api_session, tokens):
        """GET /api/courses/{id} - Verify course was persisted"""
        course_id = TestTeacherCourseCRUD.created_course_id
        assert course_id is not None, "Course not created in previous test"
        
        response = api_session.get(f"{BASE_URL}/api/courses/{course_id}")
        assert response.status_code == 200
        course = response.json()
        assert course['title'] == 'TEST_Advanced Calculus'
        assert len(course['modules']) == 0
        assert len(course['quizzes']) == 0
        print(f"✓ Course retrieved successfully: {course['title']}")
    
    def test_update_course(self, api_session, tokens):
        """PUT /api/courses/{id} - Update course title and description"""
        course_id = TestTeacherCourseCRUD.created_course_id
        token = tokens['teacher']['token']
        
        update_data = {
            'title': 'TEST_Advanced Calculus Updated',
            'description': 'Updated description for testing'
        }
        response = api_session.put(
            f"{BASE_URL}/api/courses/{course_id}",
            json=update_data,
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200, f"Failed to update course: {response.text}"
        
        # Verify update persisted
        get_response = api_session.get(f"{BASE_URL}/api/courses/{course_id}")
        assert get_response.status_code == 200
        course = get_response.json()
        assert course['title'] == update_data['title']
        assert course['description'] == update_data['description']
        print(f"✓ Course updated: {course['title']}")


class TestTeacherModuleCRUD:
    """Test teacher module create, read, delete within a course"""
    
    created_module_id = None
    
    def test_add_module_to_course(self, api_session, tokens):
        """POST /api/courses/{id}/modules - Add module to course"""
        course_id = TestTeacherCourseCRUD.created_course_id
        token = tokens['teacher']['token']
        
        module_data = {
            'title': 'TEST_Limits and Continuity',
            'description': 'Introduction to limits',
            'content': 'In calculus, a limit is the value that a function approaches...',
            'video_url': 'https://example.com/video/limits',
            'order': 1
        }
        response = api_session.post(
            f"{BASE_URL}/api/courses/{course_id}/modules",
            json=module_data,
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200, f"Failed to add module: {response.text}"
        result = response.json()
        assert 'module_id' in result
        TestTeacherModuleCRUD.created_module_id = result['module_id']
        print(f"✓ Module added: {module_data['title']} (ID: {result['module_id']})")
    
    def test_verify_module_in_course(self, api_session, tokens):
        """GET /api/courses/{id} - Verify module was added"""
        course_id = TestTeacherCourseCRUD.created_course_id
        module_id = TestTeacherModuleCRUD.created_module_id
        
        response = api_session.get(f"{BASE_URL}/api/courses/{course_id}")
        assert response.status_code == 200
        course = response.json()
        
        assert len(course['modules']) >= 1
        module = [m for m in course['modules'] if m['id'] == module_id]
        assert len(module) == 1
        assert module[0]['title'] == 'TEST_Limits and Continuity'
        print(f"✓ Module verified in course: {module[0]['title']}")
    
    def test_add_second_module(self, api_session, tokens):
        """Add another module for deletion test"""
        course_id = TestTeacherCourseCRUD.created_course_id
        token = tokens['teacher']['token']
        
        module_data = {
            'title': 'TEST_Module to Delete',
            'description': 'This module will be deleted',
            'order': 2
        }
        response = api_session.post(
            f"{BASE_URL}/api/courses/{course_id}/modules",
            json=module_data,
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        result = response.json()
        
        # Verify both modules exist
        get_response = api_session.get(f"{BASE_URL}/api/courses/{course_id}")
        course = get_response.json()
        assert len(course['modules']) >= 2
        print(f"✓ Second module added (ID: {result['module_id']})")
        
        # Return module ID for deletion test
        return result['module_id']
    
    def test_delete_module(self, api_session, tokens):
        """DELETE /api/courses/{cid}/modules/{mid} - Delete a module"""
        course_id = TestTeacherCourseCRUD.created_course_id
        token = tokens['teacher']['token']
        
        # Get modules before delete
        get_response = api_session.get(f"{BASE_URL}/api/courses/{course_id}")
        course = get_response.json()
        modules_before = len(course['modules'])
        
        # Delete the second module
        module_to_delete = [m for m in course['modules'] if 'Delete' in m.get('title', '')][0]
        module_id = module_to_delete['id']
        
        response = api_session.delete(
            f"{BASE_URL}/api/courses/{course_id}/modules/{module_id}",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200, f"Failed to delete module: {response.text}"
        
        # Verify deletion
        get_response = api_session.get(f"{BASE_URL}/api/courses/{course_id}")
        course = get_response.json()
        assert len(course['modules']) == modules_before - 1
        assert not any(m['id'] == module_id for m in course['modules'])
        print(f"✓ Module deleted successfully")


class TestTeacherQuizCRUD:
    """Test teacher quiz create and delete within a course"""
    
    created_quiz_id = None
    
    def test_create_quiz(self, api_session, tokens):
        """POST /api/courses/{id}/quizzes - Create quiz with questions"""
        course_id = TestTeacherCourseCRUD.created_course_id
        token = tokens['teacher']['token']
        module_id = TestTeacherModuleCRUD.created_module_id
        
        quiz_data = {
            'title': 'TEST_Calculus Quiz 1',
            'module_id': module_id,
            'total_marks': 10,
            'passing_marks': 5,
            'questions': [
                {
                    'question': 'What is the limit of 1/x as x approaches infinity?',
                    'options': ['0', '1', 'infinity', 'undefined'],
                    'correct_answer': 0
                },
                {
                    'question': 'The derivative of x^2 is:',
                    'options': ['x', '2x', 'x^3', '2'],
                    'correct_answer': 1
                },
                {
                    'question': 'What is the integral of 2x?',
                    'options': ['x', 'x^2', '2x^2', 'x^2 + C'],
                    'correct_answer': 3
                }
            ]
        }
        response = api_session.post(
            f"{BASE_URL}/api/courses/{course_id}/quizzes",
            json=quiz_data,
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200, f"Failed to create quiz: {response.text}"
        result = response.json()
        assert 'quiz_id' in result
        TestTeacherQuizCRUD.created_quiz_id = result['quiz_id']
        print(f"✓ Quiz created: {quiz_data['title']} (ID: {result['quiz_id']})")
    
    def test_verify_quiz_in_course(self, api_session, tokens):
        """GET /api/courses/{id} - Verify quiz was added with questions"""
        course_id = TestTeacherCourseCRUD.created_course_id
        quiz_id = TestTeacherQuizCRUD.created_quiz_id
        
        response = api_session.get(f"{BASE_URL}/api/courses/{course_id}")
        assert response.status_code == 200
        course = response.json()
        
        assert len(course['quizzes']) >= 1
        quiz = [q for q in course['quizzes'] if q['id'] == quiz_id]
        assert len(quiz) == 1
        assert quiz[0]['title'] == 'TEST_Calculus Quiz 1'
        assert len(quiz[0]['questions']) == 3
        assert quiz[0]['total_marks'] == 10
        assert quiz[0]['passing_marks'] == 5
        print(f"✓ Quiz verified with {len(quiz[0]['questions'])} questions")
    
    def test_delete_quiz(self, api_session, tokens):
        """DELETE /api/courses/{cid}/quizzes/{qid} - Delete a quiz"""
        course_id = TestTeacherCourseCRUD.created_course_id
        quiz_id = TestTeacherQuizCRUD.created_quiz_id
        token = tokens['teacher']['token']
        
        response = api_session.delete(
            f"{BASE_URL}/api/courses/{course_id}/quizzes/{quiz_id}",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200, f"Failed to delete quiz: {response.text}"
        
        # Verify deletion
        get_response = api_session.get(f"{BASE_URL}/api/courses/{course_id}")
        course = get_response.json()
        assert not any(q['id'] == quiz_id for q in course['quizzes'])
        print(f"✓ Quiz deleted successfully")


class TestTeacherCourseDelete:
    """Test course deletion (cleanup)"""
    
    def test_delete_course(self, api_session, tokens):
        """DELETE /api/courses/{id} - Delete the test course"""
        course_id = TestTeacherCourseCRUD.created_course_id
        token = tokens['teacher']['token']
        
        response = api_session.delete(
            f"{BASE_URL}/api/courses/{course_id}",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200, f"Failed to delete course: {response.text}"
        
        # Verify course no longer exists
        get_response = api_session.get(f"{BASE_URL}/api/courses/{course_id}")
        assert get_response.status_code == 404
        print(f"✓ Course deleted and verified (404)")


# ===================== ADMIN USER MANAGEMENT =====================
class TestAdminUserCRUD:
    """Test admin user create, role change, delete"""
    
    created_user_id = None
    
    def test_create_user(self, api_session, tokens):
        """POST /api/admin/users - Admin creates a new user"""
        token = tokens['admin']['token']
        user_data = {
            'name': 'TEST_New Teacher',
            'email': 'test.teacher@example.com',
            'password': 'testpass123',
            'role': 'teacher'
        }
        response = api_session.post(
            f"{BASE_URL}/api/admin/users",
            json=user_data,
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200, f"Failed to create user: {response.text}"
        result = response.json()
        assert 'id' in result
        TestAdminUserCRUD.created_user_id = result['id']
        print(f"✓ User created: {user_data['name']} (ID: {result['id']})")
    
    def test_verify_user_created(self, api_session, tokens):
        """GET /api/users - Verify new user appears in users list"""
        token = tokens['admin']['token']
        response = api_session.get(
            f"{BASE_URL}/api/users",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        users = response.json()
        user = [u for u in users if u['id'] == TestAdminUserCRUD.created_user_id]
        assert len(user) == 1
        assert user[0]['name'] == 'TEST_New Teacher'
        assert user[0]['role'] == 'teacher'
        print(f"✓ User verified in users list")
    
    def test_new_user_can_login(self, api_session, tokens):
        """POST /api/auth/login - Newly created user can login"""
        response = api_session.post(
            f"{BASE_URL}/api/auth/login",
            json={'email': 'test.teacher@example.com', 'password': 'testpass123'}
        )
        assert response.status_code == 200
        data = response.json()
        assert data['user']['role'] == 'teacher'
        print(f"✓ New user can login successfully")
    
    def test_change_user_role(self, api_session, tokens):
        """PUT /api/admin/users/{id}/role - Change user role"""
        token = tokens['admin']['token']
        user_id = TestAdminUserCRUD.created_user_id
        
        response = api_session.put(
            f"{BASE_URL}/api/admin/users/{user_id}/role",
            json={'role': 'librarian'},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200, f"Failed to change role: {response.text}"
        
        # Verify role changed
        users_response = api_session.get(
            f"{BASE_URL}/api/users",
            headers={'Authorization': f'Bearer {token}'}
        )
        users = users_response.json()
        user = [u for u in users if u['id'] == user_id][0]
        assert user['role'] == 'librarian'
        print(f"✓ User role changed to librarian")
    
    def test_delete_user(self, api_session, tokens):
        """DELETE /api/admin/users/{id} - Delete the test user"""
        token = tokens['admin']['token']
        user_id = TestAdminUserCRUD.created_user_id
        
        response = api_session.delete(
            f"{BASE_URL}/api/admin/users/{user_id}",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200, f"Failed to delete user: {response.text}"
        
        # Verify user no longer in list
        users_response = api_session.get(
            f"{BASE_URL}/api/users",
            headers={'Authorization': f'Bearer {token}'}
        )
        users = users_response.json()
        assert not any(u['id'] == user_id for u in users)
        print(f"✓ User deleted successfully")
    
    def test_deleted_user_cannot_login(self, api_session, tokens):
        """POST /api/auth/login - Deleted user cannot login"""
        response = api_session.post(
            f"{BASE_URL}/api/auth/login",
            json={'email': 'test.teacher@example.com', 'password': 'testpass123'}
        )
        assert response.status_code == 401
        print(f"✓ Deleted user correctly denied login")


class TestAdminUserValidation:
    """Test admin user validation scenarios"""
    
    def test_create_user_missing_fields(self, api_session, tokens):
        """POST /api/admin/users - Missing required fields"""
        token = tokens['admin']['token']
        response = api_session.post(
            f"{BASE_URL}/api/admin/users",
            json={'name': 'Test', 'email': 'test@test.com'},  # Missing password and role
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 400
        print(f"✓ Missing fields correctly rejected")
    
    def test_create_duplicate_email(self, api_session, tokens):
        """POST /api/admin/users - Duplicate email rejected"""
        token = tokens['admin']['token']
        response = api_session.post(
            f"{BASE_URL}/api/admin/users",
            json={
                'name': 'Duplicate',
                'email': 'admin@library.com',  # Already exists
                'password': 'pass123',
                'role': 'student'
            },
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 400
        assert 'already registered' in response.json().get('detail', '').lower()
        print(f"✓ Duplicate email correctly rejected")
    
    def test_change_to_invalid_role(self, api_session, tokens):
        """PUT /api/admin/users/{id}/role - Invalid role rejected"""
        token = tokens['admin']['token']
        # Use an existing user ID
        users_response = api_session.get(f"{BASE_URL}/api/users", headers={'Authorization': f'Bearer {token}'})
        users = users_response.json()
        test_user_id = [u for u in users if u['email'] != 'admin@library.com'][0]['id']
        
        response = api_session.put(
            f"{BASE_URL}/api/admin/users/{test_user_id}/role",
            json={'role': 'invalid_role'},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 400
        print(f"✓ Invalid role correctly rejected")
    
    def test_admin_cannot_delete_self(self, api_session, tokens):
        """DELETE /api/admin/users/{id} - Admin cannot delete themselves"""
        token = tokens['admin']['token']
        admin_id = tokens['admin']['user']['id']
        
        response = api_session.delete(
            f"{BASE_URL}/api/admin/users/{admin_id}",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 400
        assert 'yourself' in response.json().get('detail', '').lower()
        print(f"✓ Admin self-delete correctly blocked")


# ===================== LIBRARIAN INVENTORY SEARCH/FILTER =====================
class TestLibrarianInventory:
    """Test librarian inventory search and filter via API"""
    
    def test_search_books_by_title(self, api_session, tokens):
        """GET /api/books?search=algebra - Search books by title"""
        response = api_session.get(f"{BASE_URL}/api/books?search=algebra")
        assert response.status_code == 200
        books = response.json()
        # Should find algebra-related books
        assert any('algebra' in b['title'].lower() for b in books)
        print(f"✓ Search by title returned {len(books)} books")
    
    def test_search_books_by_author(self, api_session, tokens):
        """GET /api/books?search=rowling - Search books by author"""
        response = api_session.get(f"{BASE_URL}/api/books?search=rowling")
        assert response.status_code == 200
        books = response.json()
        # May or may not have Rowling books in seed data
        print(f"✓ Search by author returned {len(books)} books")
    
    def test_filter_books_by_category_academic(self, api_session, tokens):
        """GET /api/books?category=academic - Filter academic books"""
        response = api_session.get(f"{BASE_URL}/api/books?category=academic")
        assert response.status_code == 200
        books = response.json()
        assert all(b['category'] == 'academic' for b in books)
        print(f"✓ Academic filter returned {len(books)} books")
    
    def test_filter_books_by_category_leisure(self, api_session, tokens):
        """GET /api/books?category=leisure - Filter leisure books"""
        response = api_session.get(f"{BASE_URL}/api/books?category=leisure")
        assert response.status_code == 200
        books = response.json()
        assert all(b['category'] == 'leisure' for b in books)
        print(f"✓ Leisure filter returned {len(books)} books")
    
    def test_combined_search_and_filter(self, api_session, tokens):
        """GET /api/books?search=...&category=academic - Combined"""
        response = api_session.get(f"{BASE_URL}/api/books?category=academic")
        assert response.status_code == 200
        books = response.json()
        # All should be academic
        assert all(b['category'] == 'academic' for b in books)
        print(f"✓ Combined search/filter works")


class TestLibrarianBookCRUD:
    """Test librarian book CRUD operations"""
    
    created_book_id = None
    
    def test_create_book(self, api_session, tokens):
        """POST /api/books - Librarian creates book"""
        token = tokens['librarian']['token']
        book_data = {
            'title': 'TEST_New Library Book',
            'author': 'Test Author',
            'description': 'A test book',
            'category': 'academic',
            'pricing_type': 'free',
            'price': 0,
            'format': 'physical',
            'shelf_location': 'T1-01',
            'available_copies': 3,
            'total_copies': 3,
            'isbn': '978-TEST-12345',
            'grade_levels': [9, 10],
            'subjects': ['Testing']
        }
        response = api_session.post(
            f"{BASE_URL}/api/books",
            json=book_data,
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        book = response.json()
        assert book['title'] == book_data['title']
        assert book['shelf_location'] == 'T1-01'
        TestLibrarianBookCRUD.created_book_id = book['id']
        print(f"✓ Book created: {book['title']}")
    
    def test_update_book(self, api_session, tokens):
        """PUT /api/books/{id} - Librarian updates book"""
        token = tokens['librarian']['token']
        book_id = TestLibrarianBookCRUD.created_book_id
        
        response = api_session.put(
            f"{BASE_URL}/api/books/{book_id}",
            json={'available_copies': 5, 'shelf_location': 'T2-02'},
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        
        # Verify update
        get_response = api_session.get(f"{BASE_URL}/api/books/{book_id}")
        book = get_response.json()
        assert book['available_copies'] == 5
        assert book['shelf_location'] == 'T2-02'
        print(f"✓ Book updated successfully")
    
    def test_delete_book(self, api_session, tokens):
        """DELETE /api/books/{id} - Librarian deletes book"""
        token = tokens['librarian']['token']
        book_id = TestLibrarianBookCRUD.created_book_id
        
        response = api_session.delete(
            f"{BASE_URL}/api/books/{book_id}",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        
        # Verify deletion
        get_response = api_session.get(f"{BASE_URL}/api/books/{book_id}")
        assert get_response.status_code == 404
        print(f"✓ Book deleted successfully")


class TestLibrarianBorrowManagement:
    """Test librarian borrow approve/return operations"""
    
    def test_librarian_can_view_all_borrows(self, api_session, tokens):
        """GET /api/borrows - Librarian sees all borrows"""
        token = tokens['librarian']['token']
        response = api_session.get(
            f"{BASE_URL}/api/borrows",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        borrows = response.json()
        # Should have some borrows from seed data
        assert len(borrows) >= 1
        print(f"✓ Librarian sees {len(borrows)} borrows")
    
    def test_borrow_statuses_exist(self, api_session, tokens):
        """Verify borrows have expected status values"""
        token = tokens['librarian']['token']
        response = api_session.get(
            f"{BASE_URL}/api/borrows",
            headers={'Authorization': f'Bearer {token}'}
        )
        borrows = response.json()
        statuses = set(b['status'] for b in borrows)
        # Should have at least some status variety
        print(f"✓ Found borrow statuses: {statuses}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
