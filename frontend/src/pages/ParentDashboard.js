import React, { useState, useEffect } from 'react';
import { Users, BookOpen, GraduationCap, Award, Eye, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ParentDashboard = () => {
  const { token } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [childProgress, setChildProgress] = useState(null);
  const [loading, setLoading] = useState(true);

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
      
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const res = await axios.get(`${API}/parent/child/${selectedChild}/progress`, { headers });
        setChildProgress(res.data);
      } catch (error) {
        console.error('Failed to fetch child progress:', error);
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
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Parent Dashboard</h1>
            <p className="text-muted-foreground mt-1">Monitor your children's progress</p>
          </div>
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Children Linked</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                No student accounts are linked to your parent account yet. 
                Ask your child to register and link their account to you.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const activeEnrollments = childProgress?.enrollments?.filter(e => e.status !== 'completed') || [];
  const completedEnrollments = childProgress?.enrollments?.filter(e => e.status === 'completed') || [];
  const activeBorrows = childProgress?.borrows?.filter(b => ['pending', 'approved', 'borrowed'].includes(b.status)) || [];

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
                  <SelectItem key={child.id} value={child.id}>
                    {child.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Child Info */}
        {childProgress?.child && (
          <Card className="bg-gradient-to-r from-primary/5 to-teal-500/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {childProgress.child.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">{childProgress.child.name}</h2>
                  <p className="text-muted-foreground">
                    {childProgress.child.grade_level ? `Grade ${childProgress.child.grade_level}` : 'Student'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="stat-gradient-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Courses</p>
                  <p className="text-3xl font-bold mt-1">{activeEnrollments.length}</p>
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
                  <p className="text-sm text-muted-foreground">Completed Courses</p>
                  <p className="text-3xl font-bold mt-1">{completedEnrollments.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Award className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Course Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeEnrollments.length > 0 ? (
              <div className="space-y-4">
                {activeEnrollments.map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
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
                    <Badge variant={enrollment.status === 'in_progress' ? 'default' : 'secondary'} className="capitalize">
                      {enrollment.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No active courses
              </p>
            )}
          </CardContent>
        </Card>

        {/* Borrowed Books */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-600" />
              Borrowed Books
            </CardTitle>
          </CardHeader>
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
                          <span className="text-xs text-muted-foreground">
                            Due: {new Date(borrow.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No borrowed books
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ParentDashboard;
