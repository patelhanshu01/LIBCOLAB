import React, { useState, useEffect } from 'react';
import { Users, BookOpen, GraduationCap, Award, TrendingUp, Star, Trophy, Flame, Zap, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BADGE_CONFIG = {
  book_worm: { label: 'Book Worm', icon: BookOpen, color: 'bg-teal-500/10 text-teal-600' },
  quiz_master: { label: 'Quiz Master', icon: Trophy, color: 'bg-amber-500/10 text-amber-600' },
  perfect_attendance: { label: 'Perfect Attendance', icon: Flame, color: 'bg-red-500/10 text-red-600' },
  course_champion: { label: 'Course Champion', icon: GraduationCap, color: 'bg-indigo-500/10 text-indigo-600' },
  speed_reader: { label: 'Speed Reader', icon: Zap, color: 'bg-purple-500/10 text-purple-600' },
};

const ParentDashboard = () => {
  const { token } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childProgress, setChildProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(`${API}/parent/children`, { headers });
        setChildren(res.data);
        if (res.data.length > 0) {
          setSelectedChild(res.data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch children:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, [token]);

  useEffect(() => {
    const fetchChildProgress = async () => {
      if (!selectedChild) return;
      setProgressLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(`${API}/parent/child/${selectedChild}/progress`, { headers });
        setChildProgress(res.data);
      } catch (error) {
        console.error('Failed to fetch child progress:', error);
      } finally {
        setProgressLoading(false);
      }
    };
    fetchChildProgress();
  }, [selectedChild, token]);

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

  if (children.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6" data-testid="parent-dashboard">
          <h1 className="text-3xl font-bold tracking-tight">Parent Dashboard</h1>
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Children Linked</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                No student accounts are linked to your parent account yet.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const cp = childProgress;
  const activeEnrollments = cp?.enrollments?.filter(e => e.status !== 'completed') || [];
  const completedEnrollments = cp?.enrollments?.filter(e => e.status === 'completed') || [];
  const activeBorrows = cp?.borrows?.filter(b => ['pending', 'approved', 'borrowed'].includes(b.status)) || [];
  const quizResults = cp?.quiz_results || [];
  const perfSummary = cp?.performance_summary || {};
  const childBadges = cp?.child?.badges || [];

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="parent-dashboard">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Parent Dashboard</h1>
            <p className="text-muted-foreground mt-1">Monitor your children's learning progress</p>
          </div>
          {children.length > 1 && (
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger className="w-48" data-testid="child-selector">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {children.map(child => (
                  <SelectItem key={child.id} value={child.id}>{child.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Child Info */}
        {cp?.child && (
          <Card className="bg-gradient-to-r from-primary/5 to-teal-500/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {cp.child.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{cp.child.name}</h2>
                  <p className="text-muted-foreground">
                    {cp.child.grade_level ? `Grade ${cp.child.grade_level}` : 'Student'}
                    {cp.child.school_name && ` at ${cp.child.school_name}`}
                  </p>
                </div>
                {childBadges.length > 0 && (
                  <div className="flex gap-2">
                    {childBadges.map(badgeId => {
                      const config = BADGE_CONFIG[badgeId];
                      if (!config) return null;
                      const IconComp = config.icon;
                      return (
                        <div key={badgeId} className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`} title={config.label}>
                          <IconComp className="w-5 h-5" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {progressLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-5 text-center">
                  <p className="text-sm text-muted-foreground">Avg Quiz Score</p>
                  <p className={`text-2xl font-bold mt-1 ${perfSummary.avg_quiz_score >= 70 ? 'text-green-600' : perfSummary.avg_quiz_score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {perfSummary.avg_quiz_score ? `${Math.round(perfSummary.avg_quiz_score)}%` : '--'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 text-center">
                  <p className="text-sm text-muted-foreground">Courses Enrolled</p>
                  <p className="text-2xl font-bold mt-1">{perfSummary.courses_enrolled || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 text-center">
                  <p className="text-sm text-muted-foreground">Courses Completed</p>
                  <p className="text-2xl font-bold mt-1">{perfSummary.courses_completed || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 text-center">
                  <p className="text-sm text-muted-foreground">Books Borrowed</p>
                  <p className="text-2xl font-bold mt-1">{perfSummary.books_borrowed || 0}</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="progress" className="w-full">
              <TabsList>
                <TabsTrigger value="progress" data-testid="parent-tab-progress">Progress</TabsTrigger>
                <TabsTrigger value="quizzes" data-testid="parent-tab-quizzes">Quiz Results ({quizResults.length})</TabsTrigger>
                <TabsTrigger value="books" data-testid="parent-tab-books">Books ({activeBorrows.length})</TabsTrigger>
                <TabsTrigger value="activity" data-testid="parent-tab-activity">Activity</TabsTrigger>
              </TabsList>

              {/* Progress Tab */}
              <TabsContent value="progress" className="space-y-4 mt-4">
                {activeEnrollments.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Active Courses</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      {activeEnrollments.map((e) => (
                        <div key={e.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{e.course_title}</h3>
                            <div className="flex items-center gap-2 mt-2">
                              <Progress value={e.progress_percentage} className="h-2 flex-1" />
                              <span className="text-sm text-muted-foreground">{Math.round(e.progress_percentage)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {completedEnrollments.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4 text-green-600" /> Completed Courses</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {completedEnrollments.map((e) => (
                        <div key={e.id} className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-200">
                          <Award className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span className="font-medium">{e.course_title}</span>
                          <Badge className="ml-auto bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {activeEnrollments.length === 0 && completedEnrollments.length === 0 && (
                  <Card className="text-center py-8"><CardContent><p className="text-muted-foreground">No course enrollments yet</p></CardContent></Card>
                )}
              </TabsContent>

              {/* Quiz Results Tab */}
              <TabsContent value="quizzes" className="mt-4">
                <Card>
                  <CardHeader><CardTitle>Quiz Results</CardTitle></CardHeader>
                  <CardContent>
                    {quizResults.length > 0 ? (
                      <div className="space-y-3">
                        {quizResults.map((q, i) => (
                          <div key={i} className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl" data-testid={`parent-quiz-${i}`}>
                            <div className={`w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 ${q.percentage >= 70 ? 'bg-green-500/10' : q.percentage >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
                              <span className={`font-bold text-xl ${q.percentage >= 70 ? 'text-green-600' : q.percentage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                {Math.round(q.percentage)}%
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium">{q.quiz_title}</h4>
                              <p className="text-sm text-muted-foreground">{q.course_title}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant={q.passed ? 'default' : 'destructive'}>{q.passed ? 'Passed' : 'Failed'}</Badge>
                              <p className="text-xs text-muted-foreground mt-1">{q.score}/{q.total_marks}</p>
                            </div>
                          </div>
                        ))}
                        {quizResults.some(q => q.percentage < 50) && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 mt-4">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-amber-800">Attention Needed</p>
                              <p className="text-sm text-amber-700">
                                Your child scored below 50% on some quizzes. Consider discussing these topics together or reaching out to their teacher.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No quiz results yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Books Tab */}
              <TabsContent value="books" className="mt-4">
                <Card>
                  <CardHeader><CardTitle>Borrowed Books</CardTitle></CardHeader>
                  <CardContent>
                    {activeBorrows.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeBorrows.map((borrow) => (
                          <div key={borrow.id} className="flex items-center gap-4 p-4 border border-border rounded-xl">
                            <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-6 h-6 text-teal-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{borrow.book_title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="capitalize">{borrow.status}</Badge>
                                {borrow.due_date && (
                                  <span className="text-xs text-muted-foreground">Due: {new Date(borrow.due_date).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No borrowed books</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="mt-4">
                <Card>
                  <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                  <CardContent>
                    {cp?.recent_activity?.length > 0 ? (
                      <div className="space-y-3">
                        {cp.recent_activity.map((activity, i) => (
                          <div key={i} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                            <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm">{activity.description}</p>
                              <p className="text-xs text-muted-foreground">{new Date(activity.timestamp).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No recent activity</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ParentDashboard;
