import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GraduationCap, Clock, Users, Play, CheckCircle, Lock, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CoursesPage = () => {
  const { token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [coursesRes, enrollRes] = await Promise.all([
          axios.get(`${API}/courses`),
          token ? axios.get(`${API}/enrollments`, { headers }) : Promise.resolve({ data: [] })
        ]);
        setCourses(coursesRes.data);
        setEnrollments(enrollRes.data);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleEnroll = async (courseId) => {
    if (!token) {
      toast.error('Please log in to enroll');
      return;
    }

    try {
      await axios.post(
        `${API}/enrollments`,
        { course_id: courseId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Successfully enrolled!');
      // Refresh enrollments
      const res = await axios.get(`${API}/enrollments`, { headers: { Authorization: `Bearer ${token}` } });
      setEnrollments(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to enroll');
    }
  };

  const getEnrollment = (courseId) => enrollments.find(e => e.course_id === courseId);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-muted rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="courses-page">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-1">
            Explore courses and track your learning progress
          </p>
        </div>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => {
              const enrollment = getEnrollment(course.id);
              const isEnrolled = !!enrollment;

              return (
                <Card 
                  key={course.id} 
                  className={`book-card border-l-4 ${isEnrolled ? 'border-l-primary' : 'border-l-transparent'} animate-fadeInUp stagger-${(index % 3) + 1}`}
                  data-testid={`course-card-${course.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="w-6 h-6 text-primary" />
                      </div>
                      {course.is_free ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">Free</Badge>
                      ) : (
                        <Badge variant="outline">${course.price}</Badge>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {course.description || 'No description available'}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {course.teacher_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Play className="w-4 h-4" />
                        {course.modules?.length || 0} modules
                      </span>
                    </div>

                    {course.grade_levels?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {course.grade_levels.map(grade => (
                          <Badge key={grade} variant="outline" className="text-xs">
                            Grade {grade}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {isEnrolled ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{Math.round(enrollment.progress_percentage)}%</span>
                        </div>
                        <Progress value={enrollment.progress_percentage} className="h-2" />
                        <Link to={`/courses/${course.id}`}>
                          <Button className="w-full" data-testid={`continue-course-${course.id}`}>
                            Continue Learning
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <Button 
                        className="w-full" 
                        onClick={() => handleEnroll(course.id)}
                        data-testid={`enroll-btn-${course.id}`}
                      >
                        Enroll Now
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Courses Available</h3>
              <p className="text-muted-foreground">
                Check back later for new courses
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

// Course Detail Page
export const CourseDetailPage = () => {
  const { courseId } = useParams();
  const { token, user } = useAuth();
  const [course, setCourse] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const courseRes = await axios.get(`${API}/courses/${courseId}`);
        setCourse(courseRes.data);

        if (token) {
          const enrollRes = await axios.get(`${API}/enrollments`, { headers });
          const userEnrollment = enrollRes.data.find(e => e.course_id === courseId);
          setEnrollment(userEnrollment);
        }
      } catch (error) {
        console.error('Failed to fetch course:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, token]);

  const handleCompleteModule = async (moduleId) => {
    if (!enrollment) return;

    try {
      await axios.put(
        `${API}/enrollments/${enrollment.id}/progress?module_id=${moduleId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Module completed!');
      
      // Refresh enrollment
      const res = await axios.get(`${API}/enrollments`, { headers: { Authorization: `Bearer ${token}` } });
      const updated = res.data.find(e => e.course_id === courseId);
      setEnrollment(updated);
    } catch (error) {
      toast.error('Failed to update progress');
    }
  };

  const handleEnroll = async () => {
    if (!token) {
      toast.error('Please log in to enroll');
      return;
    }

    try {
      const res = await axios.post(
        `${API}/enrollments`,
        { course_id: courseId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEnrollment(res.data);
      toast.success('Successfully enrolled!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to enroll');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-12 bg-muted rounded w-2/3" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-medium mb-2">Course Not Found</h3>
            <Link to="/courses">
              <Button variant="outline">Back to Courses</Button>
            </Link>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const isModuleCompleted = (moduleId) => enrollment?.completed_modules?.includes(moduleId);

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="course-detail-page">
        <Link to="/courses" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{course.title}</h1>
                    <p className="text-muted-foreground">by {course.teacher_name}</p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">
                  {course.description || 'No description available'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {course.grade_levels?.map(grade => (
                    <Badge key={grade} variant="outline">Grade {grade}</Badge>
                  ))}
                  {course.subjects?.map(subject => (
                    <Badge key={subject} variant="secondary">{subject}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Modules */}
            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
              </CardHeader>
              <CardContent>
                {course.modules?.length > 0 ? (
                  <Accordion type="single" collapsible value={activeModule} onValueChange={setActiveModule}>
                    {course.modules.map((module, index) => {
                      const completed = isModuleCompleted(module.id);
                      const locked = !enrollment && index > 0;

                      return (
                        <AccordionItem key={module.id} value={module.id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                completed ? 'bg-green-100 text-green-600' : 
                                locked ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                              }`}>
                                {completed ? <CheckCircle className="w-4 h-4" /> : 
                                 locked ? <Lock className="w-4 h-4" /> : index + 1}
                              </div>
                              <span className={locked ? 'text-muted-foreground' : ''}>
                                {module.title}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pl-11 space-y-4">
                              <p className="text-muted-foreground">
                                {module.description || module.content || 'Module content goes here...'}
                              </p>
                              {enrollment && !completed && (
                                <Button 
                                  size="sm"
                                  onClick={() => handleCompleteModule(module.id)}
                                  data-testid={`complete-module-${module.id}`}
                                >
                                  Mark as Complete
                                </Button>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No modules available yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                {enrollment ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Your Progress</p>
                      <p className="text-4xl font-bold text-primary">
                        {Math.round(enrollment.progress_percentage)}%
                      </p>
                    </div>
                    <Progress value={enrollment.progress_percentage} className="h-3" />
                    <p className="text-sm text-muted-foreground text-center">
                      {enrollment.completed_modules?.length || 0} of {course.modules?.length || 0} modules completed
                    </p>
                    {enrollment.status === 'completed' && (
                      <Link to={`/certificates`}>
                        <Button className="w-full" variant="outline">
                          View Certificate
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      {course.is_free ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 mb-2">
                          Free Course
                        </Badge>
                      ) : (
                        <p className="text-3xl font-bold">${course.price}</p>
                      )}
                    </div>
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleEnroll}
                      data-testid="enroll-course-btn"
                    >
                      Enroll Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Instructor</p>
                    <p className="font-medium">{course.teacher_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Play className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Modules</p>
                    <p className="font-medium">{course.modules?.length || 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Quizzes</p>
                    <p className="font-medium">{course.quizzes?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CoursesPage;
