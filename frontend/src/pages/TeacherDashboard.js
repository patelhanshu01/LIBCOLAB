import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users, Plus, BookOpen, BarChart3, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TeacherDashboard = () => {
  const { token, user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '', description: '', grade_levels: [], subjects: [], is_free: true, price: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [coursesRes, enrollRes, analyticsRes] = await Promise.all([
          axios.get(`${API}/courses?teacher_id=${user.id}`),
          axios.get(`${API}/enrollments`, { headers }),
          axios.get(`${API}/teacher/analytics`, { headers }).catch(() => ({ data: null }))
        ]);
        setCourses(coursesRes.data);
        setEnrollments(enrollRes.data);
        setAnalytics(analyticsRes.data);
      } catch (error) {
        console.error('Failed to fetch teacher data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, user]);

  const handleCreateCourse = async () => {
    if (!newCourse.title) {
      toast.error('Please enter a course title');
      return;
    }
    try {
      const res = await axios.post(`${API}/courses`, newCourse, { headers: { Authorization: `Bearer ${token}` } });
      setCourses(prev => [...prev, res.data]);
      setDialogOpen(false);
      setNewCourse({ title: '', description: '', grade_levels: [], subjects: [], is_free: true, price: 0 });
      toast.success('Course created successfully!');
    } catch (error) {
      toast.error('Failed to create course');
    }
  };

  const getEnrollmentsForCourse = (courseId) => enrollments.filter(e => e.course_id === courseId);

  const totalStudents = analytics?.total_students || new Set(enrollments.map(e => e.user_id)).size;
  const avgProgress = analytics?.avg_progress || (enrollments.length > 0 ? enrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / enrollments.length : 0);
  const avgQuizScore = analytics?.avg_quiz_score || 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="teacher-dashboard">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage courses and track student progress</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="create-course-btn">
                <Plus className="w-4 h-4" /> Create Course
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Course</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Course Title</Label>
                  <Input id="title" value={newCourse.title} onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value }))} placeholder="Enter course title" data-testid="course-title-input" />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={newCourse.description} onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))} placeholder="Course description" data-testid="course-description-input" />
                </div>
                <Button onClick={handleCreateCourse} className="w-full" data-testid="submit-course-btn">Create Course</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">My Courses</p>
                  <p className="text-3xl font-bold mt-1">{courses.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-3xl font-bold mt-1">{totalStudents}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Progress</p>
                  <p className="text-3xl font-bold mt-1">{Math.round(avgProgress)}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Quiz Score</p>
                  <p className="text-3xl font-bold mt-1">{Math.round(avgQuizScore)}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="courses" className="w-full">
          <TabsList>
            <TabsTrigger value="courses" data-testid="teacher-tab-courses">My Courses</TabsTrigger>
            <TabsTrigger value="students" data-testid="teacher-tab-students">Students Needing Help</TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses" className="mt-4">
            <Card>
              <CardHeader><CardTitle>My Courses</CardTitle></CardHeader>
              <CardContent>
                {courses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => {
                      const courseEnrollments = getEnrollmentsForCourse(course.id);
                      const avgCourseProgress = courseEnrollments.length > 0
                        ? courseEnrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / courseEnrollments.length
                        : 0;
                      const courseStat = analytics?.course_stats?.find(c => c.course_id === course.id);

                      return (
                        <Card key={course.id} className="border-l-4 border-l-primary">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <GraduationCap className="w-6 h-6 text-primary" />
                              </div>
                              <Badge variant="outline">{courseEnrollments.length} students</Badge>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{course.description || 'No description'}</p>
                            <div className="space-y-2 mb-4">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Avg. Progress</span>
                                <span className="font-medium">{Math.round(avgCourseProgress)}%</span>
                              </div>
                              <Progress value={avgCourseProgress} className="h-2" />
                            </div>
                            {courseStat && (
                              <div className="text-sm text-muted-foreground mb-3">
                                Avg Quiz Score: <span className="font-medium">{Math.round(courseStat.avg_quiz_score)}%</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <BookOpen className="w-4 h-4" />
                              <span>{course.modules?.length || 0} modules</span>
                              <span>&bull;</span>
                              <span>{course.quizzes?.length || 0} quizzes</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Courses Yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first course to start teaching</p>
                    <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> Create Course</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Needing Help Tab */}
          <TabsContent value="students" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Students Scoring Below 50%
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.students_needing_help?.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.students_needing_help.map((item, i) => (
                      <div key={i} className="p-4 bg-amber-50 border border-amber-200 rounded-xl" data-testid={`struggling-student-${i}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <span className="font-semibold text-amber-800">{item.student?.name?.charAt(0)}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-amber-900">{item.student?.name}</h4>
                          </div>
                        </div>
                        <div className="space-y-2 ml-13">
                          {item.low_scores?.map((score, j) => (
                            <div key={j} className="flex items-center gap-2 text-sm">
                              <Badge variant="destructive" className="text-xs">{Math.round(score.score)}%</Badge>
                              <span className="text-amber-800">{score.quiz}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">All Students Are Doing Well!</h3>
                    <p className="text-muted-foreground">No students are currently scoring below 50% on quizzes.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
