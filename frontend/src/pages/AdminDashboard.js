import React, { useState, useEffect } from 'react';
import { Users, BookOpen, GraduationCap, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { token } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [analyticsRes, usersRes] = await Promise.all([
          axios.get(`${API}/analytics`, { headers }),
          axios.get(`${API}/users`, { headers })
        ]);
        setAnalytics(analyticsRes.data);
        setUsers(usersRes.data);
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

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

  const COLORS = ['#4F46E5', '#0F766E', '#F97316', '#8B5CF6', '#EC4899'];

  const roleData = analytics?.users_by_role 
    ? Object.entries(analytics.users_by_role).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="admin-dashboard">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            System overview and analytics
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="stat-gradient-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold mt-1">{analytics?.total_users || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <ArrowUp className="w-4 h-4" />
                <span>12% this month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-gradient-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Books</p>
                  <p className="text-3xl font-bold mt-1">{analytics?.total_books || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-teal-600" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
                <ArrowUp className="w-4 h-4" />
                <span>5 new this week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-gradient-3">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Courses</p>
                  <p className="text-3xl font-bold mt-1">{analytics?.total_courses || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Borrows</p>
                  <p className="text-3xl font-bold mt-1">{analytics?.active_borrows || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Users by Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {roleData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={roleData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {roleData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No user data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Popular Books</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {analytics?.popular_books?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.popular_books}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="title" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="borrows" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No borrow data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Users */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.recent_activity?.length > 0 ? (
                <div className="space-y-4">
                  {analytics.recent_activity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No recent activity</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-semibold">
                        {user.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{user.role}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
