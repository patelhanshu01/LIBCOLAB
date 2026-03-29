import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  GraduationCap,
  Clock,
  Users,
  Play,
  CheckCircle,
  Lock,
  ArrowLeft,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import axios from "axios";

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
          token
            ? axios.get(`${API}/enrollments`, { headers })
            : Promise.resolve({ data: [] }),
        ]);
        setCourses(coursesRes.data);
        setEnrollments(enrollRes.data);
      } catch (error) {
        console.error("Failed to fetch courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleEnroll = async (courseId) => {
    if (!token) {
      toast.error("Please log in to enroll");
      return;
    }

    try {
      await axios.post(
        `${API}/enrollments`,
        { course_id: courseId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Successfully enrolled!");
      // Refresh enrollments
      const res = await axios.get(`${API}/enrollments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEnrollments(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to enroll");
    }
  };

  const getEnrollment = (courseId) =>
    enrollments.find((e) => e.course_id === courseId);
  const uniqueCourses = Object.values(
    courses.reduce((acc, course) => {
      const existing = acc[course.title];
      const currentIsEnrolled = !!getEnrollment(course.id);
      const existingIsEnrolled = existing
        ? !!getEnrollment(existing.id)
        : false;

      if (!existing || (!existingIsEnrolled && currentIsEnrolled)) {
        acc[course.title] = course;
      }

      return acc;
    }, {}),
  );

  const enrolledCourses = uniqueCourses.filter((course) => {
    const enrollment = getEnrollment(course.id);
    return (
      !!enrollment && Math.round(enrollment.progress_percentage || 0) < 100
    );
  });
  const completedCourses = uniqueCourses.filter((course) => {
    const enrollment = getEnrollment(course.id);
    return (
      !!enrollment && Math.round(enrollment.progress_percentage || 0) >= 100
    );
  });
  const upcomingCourses = uniqueCourses.filter(
    (course) => !getEnrollment(course.id),
  );

  const renderCourseGrid = (courseList, showProgress) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1100px] mx-auto">
      {courseList.map((course, index) => {
        const enrollment = getEnrollment(course.id);

        return (
          <Card
            key={course.id}
            className={`book-card h-full border-l-4 ${showProgress ? "border-l-primary" : "border-l-transparent"} animate-fadeInUp stagger-${(index % 3) + 1}`}
            data-testid={`course-card-${course.id}`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                {course.is_free ? (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700"
                  >
                    Free
                  </Badge>
                ) : (
                  <Badge variant="outline">${course.price}</Badge>
                )}
              </div>

              <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {course.description || "No description available"}
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

              {course.grade_levels?.length > 0 && !showProgress && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {course.grade_levels.map((grade) => (
                    <Badge key={grade} variant="outline" className="text-xs">
                      Grade {grade}
                    </Badge>
                  ))}
                </div>
              )}

              {showProgress && enrollment ? (
                <div className="space-y-4 pt-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {Math.round(enrollment.progress_percentage)}%
                    </span>
                  </div>
                  <Progress
                    value={enrollment.progress_percentage}
                    className="h-2.5"
                  />
                  {course.grade_levels?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-3">
                      {course.grade_levels.map((grade) => (
                        <Badge
                          key={grade}
                          variant="outline"
                          className="text-xs"
                        >
                          Grade {grade}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Link to={`/courses/${course.id}`} className="block pt-2">
                    <Button
                      className="w-full"
                      data-testid={`continue-course-${course.id}`}
                    >
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
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-xl" />
            ))}
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
          <Tabs defaultValue="enrolled" className="space-y-4">
            <TabsList className="h-auto w-full max-w-2xl justify-start rounded-xl p-1">
              <TabsTrigger
                value="enrolled"
                className="flex-1 gap-2 rounded-lg py-2"
              >
                <GraduationCap className="w-4 h-4" />
                Enrolled Courses
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="flex-1 gap-2 rounded-lg py-2"
              >
                <CheckCircle className="w-4 h-4" />
                Completed Courses
              </TabsTrigger>
              <TabsTrigger
                value="upcoming"
                className="flex-1 gap-2 rounded-lg py-2"
              >
                <Clock className="w-4 h-4" />
                Upcoming Courses
              </TabsTrigger>
            </TabsList>

            <TabsContent value="enrolled" className="mt-0 space-y-4">
              {enrolledCourses.length > 0 ? (
                renderCourseGrid(enrolledCourses, true)
              ) : (
                <Card className="text-center py-10">
                  <CardContent>
                    <h3 className="text-lg font-medium mb-2">
                      No Enrolled Courses Yet
                    </h3>
                    <p className="text-muted-foreground">
                      Enroll in an upcoming course to start learning.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="mt-0 space-y-4">
              {upcomingCourses.length > 0 ? (
                renderCourseGrid(upcomingCourses, false)
              ) : (
                <Card className="text-center py-10">
                  <CardContent>
                    <h3 className="text-lg font-medium mb-2">
                      No Upcoming Courses
                    </h3>
                    <p className="text-muted-foreground">
                      You are already enrolled in all available courses.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-0 space-y-4">
              {completedCourses.length > 0 ? (
                renderCourseGrid(completedCourses, true)
              ) : (
                <Card className="text-center py-10">
                  <CardContent>
                    <h3 className="text-lg font-medium mb-2">
                      No Completed Courses Yet
                    </h3>
                    <p className="text-muted-foreground">
                      Finish a course and pass its final quiz to see it here.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
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
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const courseRes = await axios.get(`${API}/courses/${courseId}`);
        setCourse(courseRes.data);

        if (token) {
          const enrollRes = await axios.get(`${API}/enrollments`, { headers });
          const userEnrollment = enrollRes.data.find(
            (e) => e.course_id === courseId,
          );
          setEnrollment(userEnrollment);
        }
      } catch (error) {
        console.error("Failed to fetch course:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, token]);

  useEffect(() => {
    if (course?.quizzes?.length) {
      const finalQuiz = course.quizzes[course.quizzes.length - 1];
      setQuizAnswers(new Array(finalQuiz.questions?.length || 0).fill(-1));
    }
  }, [course]);

  const handleCompleteModule = async (moduleId) => {
    if (!enrollment) return;

    try {
      await axios.put(
        `${API}/enrollments/${enrollment.id}/progress?module_id=${moduleId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Module completed!");

      // Refresh enrollment
      const res = await axios.get(`${API}/enrollments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updated = res.data.find((e) => e.course_id === courseId);
      setEnrollment(updated);
    } catch (error) {
      toast.error("Failed to update progress");
    }
  };

  const handleEnroll = async () => {
    if (!token) {
      toast.error("Please log in to enroll");
      return;
    }

    try {
      const res = await axios.post(
        `${API}/enrollments`,
        { course_id: courseId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setEnrollment(res.data);
      toast.success("Successfully enrolled!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to enroll");
    }
  };

  const handleSubmitFinalQuiz = async () => {
    const finalQuiz = course?.quizzes?.[course.quizzes.length - 1];
    if (!enrollment || !finalQuiz) return;

    if (quizAnswers.some((answer) => answer === -1)) {
      toast.error("Please answer both quiz questions before submitting");
      return;
    }

    setSubmittingQuiz(true);
    try {
      const response = await axios.post(
        `${API}/enrollments/${enrollment.id}/quiz/${finalQuiz.id}`,
        quizAnswers,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setQuizResult(response.data);
      toast.success(
        response.data.passed
          ? "Quiz passed! Course completed."
          : "Quiz submitted. You need 60% to pass.",
      );

      const res = await axios.get(`${API}/enrollments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updated = res.data.find((e) => e.course_id === courseId);
      setEnrollment(updated);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit quiz");
    } finally {
      setSubmittingQuiz(false);
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

  const isModuleCompleted = (moduleId) =>
    enrollment?.completed_modules?.includes(moduleId);
  const finalQuiz = course?.quizzes?.[course.quizzes.length - 1];
  const finalQuizAttempt =
    finalQuiz && enrollment?.quiz_scores
      ? enrollment.quiz_scores[finalQuiz.id]
      : null;
  const allModulesCompleted =
    !!enrollment &&
    (enrollment.completed_modules?.length || 0) >=
      (course.modules?.length || 0);
  const finalQuizPassed = !!finalQuizAttempt?.passed;
  const showFinalQuiz =
    !!enrollment && !!finalQuiz && allModulesCompleted && !finalQuizPassed;
  const finalQuizPassPercent = finalQuiz
    ? Math.round((finalQuiz.passing_marks / finalQuiz.total_marks) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="course-detail-page">
        <Link
          to="/courses"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
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
                    <p className="text-muted-foreground">
                      by {course.teacher_name}
                    </p>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">
                  {course.description || "No description available"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {course.grade_levels?.map((grade) => (
                    <Badge key={grade} variant="outline">
                      Grade {grade}
                    </Badge>
                  ))}
                  {course.subjects?.map((subject) => (
                    <Badge key={subject} variant="secondary">
                      {subject}
                    </Badge>
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
                  <Accordion
                    type="single"
                    collapsible
                    value={activeModule}
                    onValueChange={setActiveModule}
                  >
                    {course.modules.map((module, index) => {
                      const completed = isModuleCompleted(module.id);
                      const locked = !enrollment && index > 0;

                      return (
                        <AccordionItem key={module.id} value={module.id}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  completed
                                    ? "bg-green-100 text-green-600"
                                    : locked
                                      ? "bg-muted text-muted-foreground"
                                      : "bg-primary/10 text-primary"
                                }`}
                              >
                                {completed ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : locked ? (
                                  <Lock className="w-4 h-4" />
                                ) : (
                                  index + 1
                                )}
                              </div>
                              <span
                                className={
                                  locked ? "text-muted-foreground" : ""
                                }
                              >
                                {module.title}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pl-11 space-y-4">
                              {module.description && (
                                <div>
                                  <p className="text-sm font-medium mb-1">
                                    Overview
                                  </p>
                                  <p className="text-muted-foreground">
                                    {module.description}
                                  </p>
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium mb-1">
                                  Notes
                                </p>
                                <p className="text-muted-foreground whitespace-pre-line">
                                  {module.content ||
                                    "Detailed lesson notes will appear here."}
                                </p>
                              </div>
                              {enrollment && !completed && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleCompleteModule(module.id)
                                  }
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

            {showFinalQuiz && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    Final Quiz
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Complete this {finalQuiz.questions?.length || 0}-question
                    final quiz after finishing the modules. You need at least{" "}
                    {finalQuizPassPercent}% to pass the course.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {finalQuiz.questions?.map((question, questionIndex) => (
                    <div
                      key={questionIndex}
                      className="space-y-3 rounded-xl border p-4"
                    >
                      <div>
                        <p className="font-medium">
                          Question {questionIndex + 1}: {question.question}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <label
                            key={optionIndex}
                            className="flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer hover:bg-muted/40"
                          >
                            <input
                              type="radio"
                              name={`quiz-question-${questionIndex}`}
                              checked={
                                quizAnswers[questionIndex] === optionIndex
                              }
                              onChange={() => {
                                const nextAnswers = [...quizAnswers];
                                nextAnswers[questionIndex] = optionIndex;
                                setQuizAnswers(nextAnswers);
                              }}
                              className="accent-primary"
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  {quizResult && (
                    <div
                      className={`rounded-xl border px-4 py-3 ${quizResult.passed ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}
                    >
                      <p
                        className={`font-medium ${quizResult.passed ? "text-green-700" : "text-amber-700"}`}
                      >
                        {quizResult.passed
                          ? "You passed the final quiz."
                          : "You did not reach the passing score yet."}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Score: {Math.round(quizResult.percentage)}% • Passing
                        requirement: {finalQuizPassPercent}%
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handleSubmitFinalQuiz}
                    disabled={submittingQuiz}
                    className="w-full"
                  >
                    {submittingQuiz
                      ? "Submitting Quiz..."
                      : "Submit Final Quiz"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                {enrollment ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Your Progress
                      </p>
                      <p className="text-4xl font-bold text-primary">
                        {Math.round(enrollment.progress_percentage)}%
                      </p>
                    </div>
                    <Progress
                      value={enrollment.progress_percentage}
                      className="h-3"
                    />
                    <p className="text-sm text-muted-foreground text-center">
                      {enrollment.completed_modules?.length || 0} of{" "}
                      {course.modules?.length || 0} modules completed
                    </p>
                    {finalQuiz && (
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${finalQuizPassed ? "bg-green-50 text-green-700" : allModulesCompleted ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"}`}
                      >
                        {finalQuizPassed
                          ? `Final quiz passed: ${Math.round(finalQuizAttempt?.percentage || 0)}%`
                          : allModulesCompleted
                            ? `Modules complete. Pass the final quiz with ${finalQuizPassPercent}% to finish the course.`
                            : "Complete all modules to unlock the final quiz."}
                      </div>
                    )}
                    {enrollment.status === "completed" && (
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
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700 mb-2"
                        >
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
                    <p className="text-sm text-muted-foreground">Final Quiz</p>
                    <p className="font-medium">
                      {finalQuiz
                        ? `${finalQuiz.questions?.length || 0} questions • ${finalQuizPassPercent}% to pass`
                        : "Not available"}
                    </p>
                  </div>
                </div>
                {!finalQuizPassed && allModulesCompleted && (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Finish the final quiz to complete this course and unlock
                      its certificate.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CoursesPage;
