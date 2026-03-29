import React, { useEffect, useState } from 'react';
import { BookOpen, BarChart3, Save, User, Phone, Briefcase, Building2, IdCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const StudentProfilePage = () => {
  const { user, token, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    grade_level: '',
  });

  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || '',
      phone: user.phone || '',
      grade_level: user.grade_level || '',
    });
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API}/users/${user.id}`,
        {
          name: form.name,
          phone: form.phone,
          grade_level: form.grade_level ? parseInt(form.grade_level, 10) : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await refreshUser();
      toast.success('Profile updated');
    } catch (error) {
      console.error('Failed to update student profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="student-profile-page">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground mt-1">
            View and update your basic information.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student-name">Full Name</Label>
                <Input
                  id="student-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-phone">Phone Number</Label>
                <Input
                  id="student-phone"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Your phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-email">Email Address</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  <IdCard className="w-4 h-4" />
                  <span>{user?.email || 'Not available'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="student-grade">Grade Level</Label>
                <Input
                  id="student-grade"
                  type="number"
                  min="1"
                  max="12"
                  value={form.grade_level}
                  onChange={(e) => setForm((prev) => ({ ...prev, grade_level: e.target.value }))}
                  placeholder="Grade level"
                />
              </div>

              <div className="space-y-2">
                <Label>School</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>{user?.school_name || 'Not assigned'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Student ID</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span>{user?.student_id || 'Not assigned'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

const TeacherProfilePage = () => {
  const { user, token, refreshUser } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [borrows, setBorrows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    specialization: '',
  });

  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || '',
      phone: user.phone || '',
      specialization: user.specialization || '',
    });
  }, [user]);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [analyticsRes, borrowsRes] = await Promise.all([
          axios.get(`${API}/teacher/analytics`, { headers }).catch(() => ({ data: null })),
          axios.get(`${API}/borrows`, { headers }).catch(() => ({ data: [] })),
        ]);

        setAnalytics(analyticsRes.data);
        setBorrows(borrowsRes.data || []);
      } catch (error) {
        console.error('Failed to fetch teacher profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API}/users/${user.id}`,
        {
          name: form.name,
          phone: form.phone,
          specialization: form.specialization,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await refreshUser();
      toast.success('Profile updated');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const borrowedBooks = borrows;
  const courseStats = analytics?.course_stats || [];
  const avgProgress = Math.round(analytics?.avg_progress || 0);
  const avgQuizScore = Math.round(analytics?.avg_quiz_score || 0);
  const totalStudents = analytics?.total_students || 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="teacher-profile-page">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your basic information, review teaching performance, and track your borrowed books.
          </p>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList>
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="books">Personal Books Borrowed</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacher-name">Full Name</Label>
                    <Input
                      id="teacher-name"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacher-phone">Phone Number</Label>
                    <Input
                      id="teacher-phone"
                      value={form.phone}
                      onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Your phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacher-email">Email Address</Label>
                    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      <IdCard className="w-4 h-4" />
                      <span>{user?.email || 'Not available'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacher-specialization">Specialization</Label>
                    <Input
                      id="teacher-specialization"
                      value={form.specialization}
                      onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))}
                      placeholder="Your teaching specialization"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>School</Label>
                    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      <span>{user?.school_name || 'Not assigned'}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Employee ID</Label>
                    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      <Briefcase className="w-4 h-4" />
                      <span>{user?.employee_id || 'Not assigned'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Total Students</p>
                  <p className="text-4xl font-bold">{totalStudents}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Average Progress</p>
                  <p className="text-4xl font-bold">{avgProgress}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Average Quiz Score</p>
                  <p className="text-4xl font-bold">{avgQuizScore}%</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" /> Course Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {courseStats.length > 0 ? (
                  <div className="space-y-4">
                    {courseStats.map((course) => (
                      <div key={course.course_id} className="rounded-xl border p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">{course.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {course.enrolled_students} students • {course.quiz_count} quizzes
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">{Math.round(course.avg_progress || 0)}% avg progress</Badge>
                            <Badge variant="secondary">{Math.round(course.avg_quiz_score || 0)}% avg quiz</Badge>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Progress</span>
                            <span>{Math.round(course.avg_progress || 0)}%</span>
                          </div>
                          <Progress value={course.avg_progress || 0} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No Performance Data Yet</h3>
                    <p className="text-muted-foreground">Performance will appear here once you have active courses and student activity.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="books" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-teal-600" /> Personal Books Borrowed
                </CardTitle>
              </CardHeader>
              <CardContent>
                {borrowedBooks.length > 0 ? (
                  <div className="space-y-4">
                    {borrowedBooks.map((borrow) => (
                      <div key={borrow.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-xl border p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                            <h3 className="font-medium">{borrow.book_title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {borrow.issue_date
                                ? `Issued: ${new Date(borrow.issue_date).toLocaleDateString()}`
                                : 'Awaiting issue date'}
                            </p>
                            {borrow.due_date && (
                              <p className="text-sm text-muted-foreground">
                                Due: {new Date(borrow.due_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <Badge variant={borrow.status === 'returned' ? 'secondary' : 'default'} className="capitalize w-fit">
                          {borrow.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No Borrowed Books Yet</h3>
                    <p className="text-muted-foreground">Books you borrow personally will appear here.</p>
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

const GuestProfilePage = () => {
  const { user, token, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
  });

  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name || '',
      phone: user.phone || '',
    });
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API}/users/${user.id}`,
        {
          name: form.name,
          phone: form.phone,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await refreshUser();
      toast.success('Guest profile updated');
    } catch (error) {
      console.error('Failed to update guest profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="guest-profile-page">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guest Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your guest account details and library access information.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guest-name">Full Name</Label>
                <Input
                  id="guest-name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guest-phone">Phone Number</Label>
                <Input
                  id="guest-phone"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Your phone number"
                />
              </div>

              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  <IdCard className="w-4 h-4" />
                  <span>{user?.email || 'Not available'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Account Type</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span>Guest</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="font-medium">Guest Access</p>
              <p className="text-sm text-muted-foreground mt-1">
                Guest accounts can browse the leisure library, manage purchases, and access their cart from a simplified dashboard.
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

const ProfilePage = () => {
  const { user } = useAuth();

  if (user?.role === 'teacher') {
    return <TeacherProfilePage />;
  }

  if (user?.role === 'guest') {
    return <GuestProfilePage />;
  }

  return <StudentProfilePage />;
};

export default ProfilePage;
