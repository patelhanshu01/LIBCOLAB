import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, GraduationCap, Award, Clock, ArrowRight, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StudentDashboard = () => {
  const { user, token } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [enrollRes, borrowRes, certRes] = await Promise.all([
          axios.get(`${API}/enrollments`, { headers }),
          axios.get(`${API}/borrows`, { headers }),
          axios.get(`${API}/certificates`, { headers })
        ]);
        setEnrollments(enrollRes.data);
        setBorrows(borrowRes.data);
        setCertificates(certRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const activeBorrows = borrows.filter(b => ['pending', 'approved', 'borrowed'].includes(b.status));
  const activeCourses = enrollments.filter(e => e.status !== 'completed');

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8" data-testid="student-dashboard">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.grade_level ? `Grade ${user.grade_level}` : 'Student'} • Ready to learn something new?
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/books">
              <Button variant="outline" className="gap-2" data-testid="browse-books-btn">
                <BookOpen className="w-4 h-4" />
                Browse Books
              </Button>
            </Link>
            <Link to="/courses">
              <Button className="gap-2" data-testid="explore-courses-btn">
                <GraduationCap className="w-4 h-4" />
                Explore Courses
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="stat-gradient-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Courses</p>
                  <p className="text-3xl font-bold mt-1">{activeCourses.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-gradient-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Books Borrowed</p>
                  <p className="text-3xl font-bold mt-1">{activeBorrows.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-gradient-3">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Certificates Earned</p>
                  <p className="text-3xl font-bold mt-1">{certificates.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Progress */}
        {activeCourses.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Continue Learning
              </CardTitle>
              <Link to="/courses">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeCourses.slice(0, 3).map((enrollment, index) => (
                  <div 
                    key={enrollment.id} 
                    className={`flex items-center gap-4 p-4 bg-muted/50 rounded-xl animate-fadeInUp stagger-${index + 1}`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{enrollment.course_title}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={enrollment.progress_percentage} className="h-2 flex-1" />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {Math.round(enrollment.progress_percentage)}%
                        </span>
                      </div>
                    </div>
                    <Link to={`/courses/${enrollment.course_id}`}>
                      <Button size="sm" data-testid={`continue-course-${enrollment.id}`}>
                        Continue
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Borrowed Books */}
        {activeBorrows.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" />
                Your Borrowed Books
              </CardTitle>
              <Link to="/books">
                <Button variant="ghost" size="sm" className="gap-1">
                  Browse More <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeBorrows.slice(0, 4).map((borrow, index) => (
                  <div 
                    key={borrow.id} 
                    className={`flex items-center gap-4 p-4 border border-border rounded-xl animate-fadeInUp stagger-${index + 1}`}
                  >
                    <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-6 h-6 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{borrow.book_title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={borrow.status === 'pending' ? 'secondary' : 'default'} className="capitalize">
                          {borrow.status}
                        </Badge>
                        {borrow.due_date && (
                          <span className="text-xs text-muted-foreground">
                            Due: {new Date(borrow.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {activeCourses.length === 0 && activeBorrows.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Start Your Learning Journey</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Browse our library of free academic books or explore courses to begin learning.
              </p>
              <div className="flex justify-center gap-4">
                <Link to="/books">
                  <Button variant="outline" data-testid="empty-browse-books">Browse Books</Button>
                </Link>
                <Link to="/courses">
                  <Button data-testid="empty-explore-courses">Explore Courses</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
