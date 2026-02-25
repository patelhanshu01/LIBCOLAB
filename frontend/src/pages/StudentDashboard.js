import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, GraduationCap, Award, Clock, ArrowRight, TrendingUp, Star, AlertTriangle, Flame, Zap, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BADGE_CONFIG = {
  book_worm: { label: 'Book Worm', icon: BookOpen, color: 'bg-teal-500/10 text-teal-600', border: 'border-teal-500/30' },
  quiz_master: { label: 'Quiz Master', icon: Trophy, color: 'bg-amber-500/10 text-amber-600', border: 'border-amber-500/30' },
  perfect_attendance: { label: 'Perfect Attendance', icon: Flame, color: 'bg-red-500/10 text-red-600', border: 'border-red-500/30' },
  course_champion: { label: 'Course Champion', icon: GraduationCap, color: 'bg-indigo-500/10 text-indigo-600', border: 'border-indigo-500/30' },
  speed_reader: { label: 'Speed Reader', icon: Zap, color: 'bg-purple-500/10 text-purple-600', border: 'border-purple-500/30' },
};

const StudentDashboard = () => {
  const { user, token } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [badges, setBadges] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [activityStats, setActivityStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [enrollRes, borrowRes, certRes, badgeRes, perfRes, statsRes] = await Promise.all([
          axios.get(`${API}/enrollments`, { headers }),
          axios.get(`${API}/borrows`, { headers }),
          axios.get(`${API}/certificates`, { headers }),
          axios.get(`${API}/badges/my`, { headers }),
          axios.get(`${API}/performance/report`, { headers }),
          axios.get(`${API}/activity/stats`, { headers }),
        ]);
        setEnrollments(enrollRes.data);
        setBorrows(borrowRes.data);
        setCertificates(certRes.data);
        setBadges(badgeRes.data);
        setPerformance(perfRes.data);
        setActivityStats(statsRes.data);
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
  const earnedBadges = badges.filter(b => b.earned);
  const unearnedBadges = badges.filter(b => !b.earned);

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
      <div className="space-y-8" data-testid="student-dashboard">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground mt-1">
              {user?.school_name && <span>{user.school_name} &bull; </span>}
              {user?.grade_level ? `Grade ${user.grade_level}` : 'Student'} &bull; {activityStats?.login_streak > 0 ? `${activityStats.login_streak}-day streak` : 'Ready to learn!'}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
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
          <Card>
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
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Certificates</p>
                  <p className="text-3xl font-bold mt-1">{certificates.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quiz Avg</p>
                  <p className="text-3xl font-bold mt-1">{performance?.overall_average ? `${Math.round(performance.overall_average)}%` : '--'}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Star className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="badges" data-testid="tab-badges">
              Badges ({earnedBadges.length}/{badges.length})
            </TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Course Progress */}
            {activeCourses.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Continue Learning
                  </CardTitle>
                  <Link to="/courses">
                    <Button variant="ghost" size="sm" className="gap-1">View All <ArrowRight className="w-4 h-4" /></Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activeCourses.slice(0, 3).map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{enrollment.course_title}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <Progress value={enrollment.progress_percentage} className="h-2 flex-1" />
                            <span className="text-sm text-muted-foreground whitespace-nowrap">{Math.round(enrollment.progress_percentage)}%</span>
                          </div>
                        </div>
                        <Link to={`/courses/${enrollment.course_id}`}>
                          <Button size="sm" data-testid={`continue-course-${enrollment.id}`}>Continue</Button>
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
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeBorrows.slice(0, 4).map((borrow) => (
                      <div key={borrow.id} className="flex items-center gap-4 p-4 border border-border rounded-xl">
                        <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-6 h-6 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{borrow.book_title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={borrow.status === 'pending' ? 'secondary' : 'default'} className="capitalize">{borrow.status}</Badge>
                            {borrow.due_date && (
                              <span className="text-xs text-muted-foreground">Due: {new Date(borrow.due_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeCourses.length === 0 && activeBorrows.length === 0 && (
              <Card className="text-center py-12">
                <CardContent>
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Start Your Learning Journey</h3>
                  <p className="text-muted-foreground mb-6">Browse our library of free academic books or explore courses.</p>
                  <div className="flex justify-center gap-4">
                    <Link to="/books"><Button variant="outline" data-testid="empty-browse-books">Browse Books</Button></Link>
                    <Link to="/courses"><Button data-testid="empty-explore-courses">Explore Courses</Button></Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* BADGES TAB */}
          <TabsContent value="badges" className="space-y-6 mt-4">
            {/* Earned Badges */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Earned Badges</h3>
              {earnedBadges.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {earnedBadges.map((badge) => {
                    const config = BADGE_CONFIG[badge.id] || {};
                    const IconComponent = config.icon || Star;
                    return (
                      <Card key={badge.id} className={`border-2 ${config.border || 'border-primary/30'}`} data-testid={`badge-earned-${badge.id}`}>
                        <CardContent className="p-5 flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color || 'bg-primary/10 text-primary'}`}>
                            <IconComponent className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{badge.name}</h4>
                            <p className="text-sm text-muted-foreground">{badge.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="text-center py-8">
                  <CardContent>
                    <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No badges earned yet. Keep learning!</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Locked Badges */}
            {unearnedBadges.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Badges to Unlock</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unearnedBadges.map((badge) => {
                    const config = BADGE_CONFIG[badge.id] || {};
                    const IconComponent = config.icon || Star;
                    return (
                      <Card key={badge.id} className="opacity-60 border-dashed" data-testid={`badge-locked-${badge.id}`}>
                        <CardContent className="p-5 flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-muted text-muted-foreground">
                            <IconComponent className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{badge.name}</h4>
                            <p className="text-sm text-muted-foreground">{badge.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* PERFORMANCE TAB */}
          <TabsContent value="performance" className="space-y-6 mt-4">
            {performance && performance.overall_average > 0 ? (
              <>
                {/* Performance Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Overall Average</p>
                      <p className={`text-4xl font-bold ${performance.overall_average >= 70 ? 'text-green-600' : performance.overall_average >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                        {Math.round(performance.overall_average)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Trend</p>
                      <p className="text-lg font-semibold capitalize">
                        {performance.improvement_trend === 'improving' && <span className="text-green-600">Improving</span>}
                        {performance.improvement_trend === 'declining' && <span className="text-red-600">Declining</span>}
                        {performance.improvement_trend === 'stable' && <span className="text-blue-600">Stable</span>}
                        {(performance.improvement_trend === 'insufficient_data' || performance.improvement_trend === 'no_data') && <span className="text-muted-foreground">Not enough data</span>}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-muted-foreground mb-1">Quizzes Taken</p>
                      <p className="text-4xl font-bold">{performance.quiz_scores?.length || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Strong & Weak Areas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {performance.strong_areas?.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-600" /> Strong Areas</CardTitle></CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {performance.strong_areas.map((area, i) => (
                            <Badge key={i} className="bg-green-100 text-green-800 hover:bg-green-100">{area}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {performance.weak_areas?.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" /> Needs Improvement</CardTitle></CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {performance.weak_areas.map((area, i) => (
                            <Badge key={i} variant="outline" className="border-amber-300 text-amber-700">{area}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Quiz Scores */}
                {performance.quiz_scores?.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Quiz History</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {performance.quiz_scores.map((q, i) => (
                          <div key={i} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg" data-testid={`quiz-score-${i}`}>
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${q.score >= 70 ? 'bg-green-500/10' : q.score >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                              <span className={`font-bold text-lg ${q.score >= 70 ? 'text-green-600' : q.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                {Math.round(q.score)}%
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{q.quiz}</h4>
                              <p className="text-xs text-muted-foreground">{new Date(q.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                {performance.recommendations?.length > 0 && (
                  <Card className="border-amber-200 bg-amber-50/30">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="w-5 h-5" />
                        Recommended for You
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {performance.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-lg border border-amber-200" data-testid={`recommendation-${i}`}>
                            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                              {rec.type === 'book' ? <BookOpen className="w-5 h-5 text-amber-700" /> : <GraduationCap className="w-5 h-5 text-amber-700" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{rec.item?.title}</h4>
                              <p className="text-xs text-amber-700">{rec.reason}</p>
                            </div>
                            {rec.type === 'book' && (
                              <Link to="/books">
                                <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">View</Button>
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Performance Data Yet</h3>
                  <p className="text-muted-foreground">Complete quizzes in your enrolled courses to see your performance report.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
