import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, Users, Plus, BookOpen, BarChart3, AlertTriangle, TrendingUp, Pencil, Trash2, ChevronRight, ChevronDown, FileText, HelpCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TeacherDashboard = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${token}` };

  // Course dialog
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({ title: '', description: '', grade_levels: [], subjects: [], is_free: true, price: 0 });
  const [subjectInput, setSubjectInput] = useState('');
  const [gradeInput, setGradeInput] = useState('');

  // Module dialog
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleTargetCourse, setModuleTargetCourse] = useState(null);
  const [moduleForm, setModuleForm] = useState({ title: '', description: '', content: '', video_url: '', order: 0 });

  // Quiz dialog
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizTargetCourse, setQuizTargetCourse] = useState(null);
  const [quizForm, setQuizForm] = useState({ title: '', module_id: '', total_marks: 10, passing_marks: 6, questions: [] });
  const [questionForm, setQuestionForm] = useState({ question: '', options: ['', '', '', ''], correct_answer: 0 });

  // Course detail
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchData = useCallback(async () => {
    try {
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
  }, [token, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // COURSE CRUD
  const openCreateCourse = () => {
    setEditingCourse(null);
    setCourseForm({ title: '', description: '', grade_levels: [], subjects: [], is_free: true, price: 0 });
    setCourseDialogOpen(true);
  };

  const openEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({ title: course.title, description: course.description || '', grade_levels: course.grade_levels || [], subjects: course.subjects || [], is_free: course.is_free, price: course.price || 0 });
    setCourseDialogOpen(true);
  };

  const handleSaveCourse = async () => {
    if (!courseForm.title) { toast.error('Course title is required'); return; }
    try {
      if (editingCourse) {
        await axios.put(`${API}/courses/${editingCourse.id}`, courseForm, { headers });
        toast.success('Course updated');
      } else {
        await axios.post(`${API}/courses`, courseForm, { headers });
        toast.success('Course created');
      }
      setCourseDialogOpen(false);
      fetchData();
    } catch (error) { toast.error('Failed to save course'); }
  };

  const handleDeleteCourse = async (courseId) => {
    try {
      await axios.delete(`${API}/courses/${courseId}`, { headers });
      toast.success('Course deleted');
      setDeleteConfirm(null);
      fetchData();
    } catch (error) { toast.error('Failed to delete course'); }
  };

  // MODULE
  const openAddModule = (course) => {
    setModuleTargetCourse(course);
    setModuleForm({ title: '', description: '', content: '', video_url: '', order: (course.modules?.length || 0) + 1 });
    setModuleDialogOpen(true);
  };

  const handleSaveModule = async () => {
    if (!moduleForm.title) { toast.error('Module title is required'); return; }
    try {
      await axios.post(`${API}/courses/${moduleTargetCourse.id}/modules`, moduleForm, { headers });
      toast.success('Module added');
      setModuleDialogOpen(false);
      fetchData();
    } catch (error) { toast.error('Failed to add module'); }
  };

  const handleDeleteModule = async (courseId, moduleId) => {
    try {
      await axios.delete(`${API}/courses/${courseId}/modules/${moduleId}`, { headers });
      toast.success('Module deleted');
      fetchData();
    } catch (error) { toast.error('Failed to delete module'); }
  };

  // QUIZ
  const openAddQuiz = (course) => {
    setQuizTargetCourse(course);
    setQuizForm({ title: '', module_id: '', total_marks: 10, passing_marks: 6, questions: [] });
    setQuestionForm({ question: '', options: ['', '', '', ''], correct_answer: 0 });
    setQuizDialogOpen(true);
  };

  const addQuestion = () => {
    if (!questionForm.question || questionForm.options.some(o => !o)) {
      toast.error('Fill question text and all options'); return;
    }
    setQuizForm(prev => ({ ...prev, questions: [...prev.questions, { ...questionForm }] }));
    setQuestionForm({ question: '', options: ['', '', '', ''], correct_answer: 0 });
  };

  const removeQuestion = (idx) => {
    setQuizForm(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
  };

  const handleSaveQuiz = async () => {
    if (!quizForm.title || quizForm.questions.length === 0) {
      toast.error('Quiz needs a title and at least one question'); return;
    }
    try {
      await axios.post(`${API}/courses/${quizTargetCourse.id}/quizzes`, quizForm, { headers });
      toast.success('Quiz created');
      setQuizDialogOpen(false);
      fetchData();
    } catch (error) { toast.error('Failed to create quiz'); }
  };

  const handleDeleteQuiz = async (courseId, quizId) => {
    try {
      await axios.delete(`${API}/courses/${courseId}/quizzes/${quizId}`, { headers });
      toast.success('Quiz deleted');
      fetchData();
    } catch (error) { toast.error('Failed to delete quiz'); }
  };

  // Helpers
  const addSubject = () => {
    if (subjectInput.trim() && !courseForm.subjects.includes(subjectInput.trim())) {
      setCourseForm(p => ({ ...p, subjects: [...p.subjects, subjectInput.trim()] }));
      setSubjectInput('');
    }
  };
  const addGrade = () => {
    const g = parseInt(gradeInput);
    if (g >= 1 && g <= 12 && !courseForm.grade_levels.includes(g)) {
      setCourseForm(p => ({ ...p, grade_levels: [...p.grade_levels, g].sort((a, b) => a - b) }));
      setGradeInput('');
    }
  };

  const getEnrollmentsForCourse = (courseId) => enrollments.filter(e => e.course_id === courseId);
  const totalStudents = analytics?.total_students || new Set(enrollments.map(e => e.user_id)).size;
  const avgProgress = analytics?.avg_progress || (enrollments.length > 0 ? enrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / enrollments.length : 0);
  const avgQuizScore = analytics?.avg_quiz_score || 0;
  const studentsNeedingHelp = analytics?.students_needing_help || [];
  const pastCourses = courses.filter((course) => {
    const courseEnrollments = getEnrollmentsForCourse(course.id);
    return courseEnrollments.length > 0 && courseEnrollments.every((enrollment) => enrollment.status === 'completed');
  });
  const currentSection = location.pathname.startsWith('/teacher/courses')
    ? 'courses'
    : location.pathname.startsWith('/teacher/students')
      ? 'students'
      : 'dashboard';

  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">My Courses</p><p className="text-3xl font-bold mt-1">{courses.length}</p></div><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><GraduationCap className="w-6 h-6 text-primary" /></div></div></CardContent></Card>
      <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Students</p><p className="text-3xl font-bold mt-1">{totalStudents}</p></div><div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center"><Users className="w-6 h-6 text-teal-600" /></div></div></CardContent></Card>
      <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Avg Progress</p><p className="text-3xl font-bold mt-1">{Math.round(avgProgress)}%</p></div><div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center"><BarChart3 className="w-6 h-6 text-orange-600" /></div></div></CardContent></Card>
      <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Avg Quiz Score</p><p className="text-3xl font-bold mt-1">{Math.round(avgQuizScore)}%</p></div><div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center"><TrendingUp className="w-6 h-6 text-purple-600" /></div></div></CardContent></Card>
    </div>
  );

  const renderCoursesSection = () => (
    <div className="space-y-4">
      {courses.length > 0 ? courses.map((course) => {
        const courseEnrollments = getEnrollmentsForCourse(course.id);
        const avgCourseProgress = courseEnrollments.length > 0
          ? courseEnrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / courseEnrollments.length : 0;
        const isExpanded = expandedCourse === course.id;

        return (
          <Card key={course.id} className="overflow-hidden">
            <div className="p-6 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedCourse(isExpanded ? null : course.id)}>
              <div className="flex items-center gap-4">
                {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold">{course.title}</h3>
                    <Badge variant="outline">{courseEnrollments.length} students</Badge>
                    <Badge variant="secondary">{course.modules?.length || 0} modules</Badge>
                    <Badge variant="secondary">{course.quizzes?.length || 0} quizzes</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{course.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="w-32">
                    <div className="flex justify-between text-xs mb-1"><span>Avg Progress</span><span>{Math.round(avgCourseProgress)}%</span></div>
                    <Progress value={avgCourseProgress} className="h-1.5" />
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEditCourse(course); }} data-testid={`edit-course-${course.id}`}><Pencil className="w-4 h-4" /></Button>
                    {deleteConfirm === course.id ? (
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteCourse(course.id)}>Yes</Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>No</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(course.id); }} data-testid={`delete-course-${course.id}`}><Trash2 className="w-4 h-4" /></Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t bg-muted/20 p-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Modules ({course.modules?.length || 0})</h4>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openAddModule(course)} data-testid={`add-module-${course.id}`}>
                      <Plus className="w-3 h-3" /> Add Module
                    </Button>
                  </div>
                  {course.modules?.length > 0 ? (
                    <div className="space-y-2">
                      {course.modules.map((mod, idx) => (
                        <div key={mod.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                          <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{mod.title}</p>
                            {mod.description && <p className="text-xs text-muted-foreground truncate">{mod.description}</p>}
                          </div>
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteModule(course.id, mod.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground">No modules yet. Add one to start building your course.</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold flex items-center gap-2"><HelpCircle className="w-4 h-4" /> Quizzes ({course.quizzes?.length || 0})</h4>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => openAddQuiz(course)} data-testid={`add-quiz-${course.id}`}>
                      <Plus className="w-3 h-3" /> Create Quiz
                    </Button>
                  </div>
                  {course.quizzes?.length > 0 ? (
                    <div className="space-y-2">
                      {course.quizzes.map((quiz) => (
                        <div key={quiz.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                          <div className="w-7 h-7 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <HelpCircle className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{quiz.title}</p>
                            <p className="text-xs text-muted-foreground">{quiz.questions?.length || 0} questions &bull; Pass: {quiz.passing_marks}/{quiz.total_marks}</p>
                          </div>
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteQuiz(course.id, quiz.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground">No quizzes yet. Create one to assess your students.</p>}
                </div>

              </div>
            )}
          </Card>
        );
      }) : (
        <Card className="text-center py-12">
          <CardContent>
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Courses Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first course to get started</p>
            <Button onClick={openCreateCourse}><Plus className="w-4 h-4 mr-2" /> Create Course</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStudentsSection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600" /> Students Scoring Below 50%</CardTitle>
        </CardHeader>
        <CardContent>
          {studentsNeedingHelp.length > 0 ? (
            <div className="space-y-4">
              {studentsNeedingHelp.map((item, i) => (
                <div key={i} className="p-4 bg-amber-50 border border-amber-200 rounded-xl" data-testid={`struggling-student-${i}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <span className="font-semibold text-amber-800">{item.student?.name?.charAt(0)}</span>
                    </div>
                    <h4 className="font-semibold text-amber-900">{item.student?.name}</h4>
                  </div>
                  <div className="space-y-1 ml-13">
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
              <h3 className="text-lg font-medium">All Students Are Doing Well!</h3>
              <p className="text-muted-foreground">No students below 50% on quizzes.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Enrolled Students</CardTitle>
        </CardHeader>
        <CardContent>
          {courses.some((course) => getEnrollmentsForCourse(course.id).length > 0) ? (
            <div className="space-y-6">
              {courses.map((course) => {
                const courseEnrollments = getEnrollmentsForCourse(course.id);
                if (courseEnrollments.length === 0) return null;

                return (
                  <div key={course.id} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{course.title}</h4>
                        <p className="text-sm text-muted-foreground">{courseEnrollments.length} enrolled student{courseEnrollments.length === 1 ? '' : 's'}</p>
                      </div>
                      <Badge variant="outline">{Math.round(courseEnrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / courseEnrollments.length)}% avg progress</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {courseEnrollments.map((e) => (
                        <div key={e.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Student</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={e.progress_percentage} className="h-1.5 flex-1" />
                              <span className="text-xs">{Math.round(e.progress_percentage)}%</span>
                            </div>
                          </div>
                          <Badge variant={e.status === 'completed' ? 'default' : 'secondary'} className="capitalize">{e.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Enrolled Students Yet</h3>
              <p className="text-muted-foreground">Student progress will appear here once learners join your courses.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

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
            <h1 className="text-3xl font-bold tracking-tight">
              {currentSection === 'courses' ? 'My Courses' : currentSection === 'students' ? 'Students' : 'Teacher Dashboard'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {currentSection === 'courses'
                ? 'Manage courses, modules and quizzes from one place'
                : currentSection === 'students'
                  ? 'Review learners who may need extra support'
                  : 'See your teaching overview and jump into course management'}
            </p>
          </div>
          {currentSection !== 'students' && (
            <Button className="gap-2" onClick={openCreateCourse} data-testid="create-course-btn">
              <Plus className="w-4 h-4" /> Create Course
            </Button>
          )}
        </div>

        {currentSection === 'dashboard' && renderStats()}

        {currentSection === 'dashboard' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" /> My Courses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You have {courses.length} course{courses.length === 1 ? '' : 's'} ready to manage.
                </p>
                <Link to="/teacher/courses" className="inline-flex">
                  <Button variant="outline">Open My Courses</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-sky-600" /> Past Courses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pastCourses.length > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {pastCourses.length} past course{pastCourses.length === 1 ? '' : 's'} completed by enrolled students.
                    </p>
                    <div className="space-y-3">
                      {pastCourses.slice(0, 3).map((course) => (
                        <div key={course.id} className="rounded-lg border bg-muted/20 px-4 py-3">
                          <p className="font-medium">{course.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {course.modules?.length || 0} modules • {course.quizzes?.length || 0} quizzes
                          </p>
                        </div>
                      ))}
                    </div>
                    <Link to="/teacher/courses" className="inline-flex">
                      <Button variant="outline">View All Courses</Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      No past courses yet. Courses will appear here once every enrolled student has completed them.
                    </p>
                    <Link to="/teacher/courses" className="inline-flex">
                      <Button variant="outline">Manage Courses</Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {currentSection === 'courses' && renderCoursesSection()}
        {currentSection === 'students' && renderStudentsSection()}
      </div>

      {/* Course Dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingCourse ? 'Edit Course' : 'Create Course'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={courseForm.title} onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))} placeholder="Course title" data-testid="course-title-input" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={courseForm.description} onChange={e => setCourseForm(p => ({ ...p, description: e.target.value }))} placeholder="Course description" rows={3} data-testid="course-desc-input" />
            </div>
            <div>
              <Label>Subjects</Label>
              <div className="flex gap-2 mt-1">
                <Input value={subjectInput} onChange={e => setSubjectInput(e.target.value)} placeholder="Add subject" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubject())} />
                <Button type="button" variant="outline" onClick={addSubject}>Add</Button>
              </div>
              {courseForm.subjects.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{courseForm.subjects.map(s => <Badge key={s} variant="secondary" className="gap-1">{s} <button onClick={() => setCourseForm(p => ({ ...p, subjects: p.subjects.filter(x => x !== s) }))}><X className="w-3 h-3" /></button></Badge>)}</div>}
            </div>
            <div>
              <Label>Grade Levels</Label>
              <div className="flex gap-2 mt-1">
                <Input type="number" min="1" max="12" value={gradeInput} onChange={e => setGradeInput(e.target.value)} placeholder="8-12" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGrade())} />
                <Button type="button" variant="outline" onClick={addGrade}>Add</Button>
              </div>
              {courseForm.grade_levels.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{courseForm.grade_levels.map(g => <Badge key={g} variant="secondary" className="gap-1">Grade {g} <button onClick={() => setCourseForm(p => ({ ...p, grade_levels: p.grade_levels.filter(x => x !== g) }))}><X className="w-3 h-3" /></button></Badge>)}</div>}
            </div>
            <Button onClick={handleSaveCourse} className="w-full" data-testid="save-course-btn">{editingCourse ? 'Update Course' : 'Create Course'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Module Dialog */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Module to "{moduleTargetCourse?.title}"</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title *</Label><Input value={moduleForm.title} onChange={e => setModuleForm(p => ({ ...p, title: e.target.value }))} placeholder="Module title" data-testid="module-title-input" /></div>
            <div><Label>Description</Label><Textarea value={moduleForm.description} onChange={e => setModuleForm(p => ({ ...p, description: e.target.value }))} placeholder="Module description" rows={2} /></div>
            <div><Label>Content</Label><Textarea value={moduleForm.content} onChange={e => setModuleForm(p => ({ ...p, content: e.target.value }))} placeholder="Module content or reading material" rows={4} /></div>
            <div><Label>Video URL (optional)</Label><Input value={moduleForm.video_url} onChange={e => setModuleForm(p => ({ ...p, video_url: e.target.value }))} placeholder="https://..." /></div>
            <div><Label>Order</Label><Input type="number" min="1" value={moduleForm.order} onChange={e => setModuleForm(p => ({ ...p, order: parseInt(e.target.value) || 0 }))} /></div>
            <Button onClick={handleSaveModule} className="w-full" data-testid="save-module-btn">Add Module</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quiz Dialog */}
      <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Quiz for "{quizTargetCourse?.title}"</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3"><Label>Quiz Title *</Label><Input value={quizForm.title} onChange={e => setQuizForm(p => ({ ...p, title: e.target.value }))} placeholder="Quiz title" data-testid="quiz-title-input" /></div>
              <div><Label>Total Marks</Label><Input type="number" value={quizForm.total_marks} onChange={e => setQuizForm(p => ({ ...p, total_marks: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Passing Marks</Label><Input type="number" value={quizForm.passing_marks} onChange={e => setQuizForm(p => ({ ...p, passing_marks: parseInt(e.target.value) || 0 }))} /></div>
              {quizTargetCourse?.modules?.length > 0 && (
                <div>
                  <Label>Module (optional)</Label>
                  <Select value={quizForm.module_id || 'none'} onValueChange={v => setQuizForm(p => ({ ...p, module_id: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific module</SelectItem>
                      {quizTargetCourse.modules.map(m => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Added questions */}
            {quizForm.questions.length > 0 && (
              <div className="space-y-2">
                <Label>Questions ({quizForm.questions.length})</Label>
                {quizForm.questions.map((q, i) => (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{q.question}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {q.options.map((opt, j) => (
                          <Badge key={j} variant={j === q.correct_answer ? 'default' : 'outline'} className="text-xs">{opt}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeQuestion(i)}><X className="w-3 h-3" /></Button>
                  </div>
                ))}
              </div>
            )}

            {/* Question builder */}
            <Card className="border-dashed">
              <CardContent className="p-4 space-y-3">
                <Label className="text-muted-foreground">Add Question</Label>
                <Input value={questionForm.question} onChange={e => setQuestionForm(p => ({ ...p, question: e.target.value }))} placeholder="Enter question" data-testid="question-text-input" />
                <div className="grid grid-cols-2 gap-2">
                  {questionForm.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="radio" name="correct" checked={questionForm.correct_answer === i} onChange={() => setQuestionForm(p => ({ ...p, correct_answer: i }))} className="accent-primary" />
                      <Input value={opt} onChange={e => { const opts = [...questionForm.options]; opts[i] = e.target.value; setQuestionForm(p => ({ ...p, options: opts })); }} placeholder={`Option ${i + 1}`} data-testid={`option-${i}-input`} />
                    </div>
                  ))}
                </div>
                <Button variant="outline" onClick={addQuestion} className="w-full" data-testid="add-question-btn">Add Question</Button>
              </CardContent>
            </Card>

            <Button onClick={handleSaveQuiz} className="w-full" disabled={quizForm.questions.length === 0} data-testid="save-quiz-btn">
              Create Quiz ({quizForm.questions.length} questions)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
