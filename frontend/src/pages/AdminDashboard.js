import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Users, BookOpen, GraduationCap, BarChart3, Plus, Pencil, Trash2, Shield, School, Activity, X, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const COLORS = ['#4F46E5', '#0D9488', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4'];

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-800',
  teacher: 'bg-blue-100 text-blue-800',
  student: 'bg-green-100 text-green-800',
  parent: 'bg-purple-100 text-purple-800',
  librarian: 'bg-orange-100 text-orange-800',
  guest: 'bg-slate-100 text-slate-800',
};

const AdminDashboard = () => {
  const { user, token, refreshUser } = useAuth();
  const location = useLocation();
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // User management
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'student', school_id: '', student_id: '', grade_level: '' });
  const [editUser, setEditUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    school_id: '',
    student_id: '',
    employee_id: '',
    grade_level: '',
    specialization: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [roleChangeUser, setRoleChangeUser] = useState(null);
  const [newRole, setNewRole] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: '', phone: '' });

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      const [analyticsRes, usersRes, schoolsRes, booksRes, coursesRes, borrowsRes] = await Promise.all([
        axios.get(`${API}/analytics`, { headers }),
        axios.get(`${API}/users`, { headers }),
        axios.get(`${API}/schools`),
        axios.get(`${API}/books`),
        axios.get(`${API}/courses`),
        axios.get(`${API}/borrows`, { headers })
      ]);
      setAnalytics(analyticsRes.data);
      setUsers(usersRes.data);
      setSchools(schoolsRes.data);
      setBooks(booksRes.data || []);
      setCourses(coursesRes.data || []);
      setBorrows(borrowsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!user) return;
    setSettingsForm({
      name: user.name || '',
      phone: user.phone || '',
    });
  }, [user]);

  const roleData = analytics?.users_by_role
    ? Object.entries(analytics.users_by_role).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
    : [];

  // User management
  const openCreateUser = () => {
    setUserForm({ name: '', email: '', password: '', role: 'student', school_id: '', student_id: '', grade_level: '' });
    setUserDialogOpen(true);
  };

  const handleCreateUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.password) {
      toast.error('Name, email and password are required'); return;
    }
    try {
      const payload = { ...userForm };
      if (!payload.school_id) delete payload.school_id;
      if (!payload.student_id) delete payload.student_id;
      if (payload.grade_level) payload.grade_level = parseInt(payload.grade_level);
      else delete payload.grade_level;
      await axios.post(`${API}/admin/users`, payload, { headers });
      toast.success('User created');
      setUserDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axios.delete(`${API}/admin/users/${userId}`, { headers });
      toast.success('User deleted');
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const openEditUser = (targetUser) => {
    setEditUser(targetUser);
    setEditUserForm({
      name: targetUser.name || '',
      email: targetUser.email || '',
      phone: targetUser.phone || '',
      school_id: targetUser.school_id || '',
      student_id: targetUser.student_id || '',
      employee_id: targetUser.employee_id || '',
      grade_level: targetUser.grade_level || '',
      specialization: targetUser.specialization || '',
    });
  };

  const handleEditUser = async () => {
    if (!editUser?.id) return;
    if (!editUserForm.name || !editUserForm.email) {
      toast.error('Name and email are required');
      return;
    }

    setEditSaving(true);
    try {
      const payload = {
        name: editUserForm.name,
        email: editUserForm.email,
        phone: editUserForm.phone || '',
        school_id: editUserForm.school_id || '',
        student_id: editUserForm.student_id || '',
        employee_id: editUserForm.employee_id || '',
        specialization: editUserForm.specialization || '',
      };

      if (editUser.role === 'student') {
        payload.grade_level = editUserForm.grade_level ? parseInt(editUserForm.grade_level, 10) : null;
      }

      await axios.put(`${API}/users/${editUser.id}`, payload, { headers });
      toast.success('User updated');
      setEditUser(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    } finally {
      setEditSaving(false);
    }
  };

  const handleRoleChange = async () => {
    if (!roleChangeUser || !newRole) return;
    try {
      await axios.put(`${API}/admin/users/${roleChangeUser}/role`, { role: newRole }, { headers });
      toast.success('Role updated');
      setRoleChangeUser(null);
      setNewRole('');
      fetchData();
    } catch (error) { toast.error('Failed to update role'); }
  };

  const handleSaveSettings = async () => {
    if (!user?.id) return;
    setSettingsSaving(true);
    try {
      await axios.put(
        `${API}/users/${user.id}`,
        {
          name: settingsForm.name,
          phone: settingsForm.phone,
        },
        { headers }
      );
      await refreshUser();
      toast.success('Admin settings updated');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    if (userSearch) {
      const q = userSearch.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    return true;
  });
  const activeBorrows = borrows.filter((borrow) => borrow.status !== 'returned');
  const settingsManagedUsers = users.filter((managedUser) => managedUser.role !== 'admin');

  const renderUserActions = (targetUser, prefix = 'user') => (
    <div className="flex justify-end gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          openEditUser(targetUser);
        }}
        data-testid={`${prefix}-edit-${targetUser.id}`}
      >
        <Pencil className="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          setRoleChangeUser(targetUser.id);
          setNewRole(targetUser.role);
        }}
        data-testid={`${prefix}-change-role-${targetUser.id}`}
      >
        <Shield className="w-4 h-4" />
      </Button>
      {deleteConfirm === targetUser.id ? (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteUser(targetUser.id);
            }}
            data-testid={`${prefix}-confirm-delete-${targetUser.id}`}
          >
            Yes
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm(null);
            }}
          >
            No
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="text-red-500"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteConfirm(targetUser.id);
          }}
          data-testid={`${prefix}-delete-${targetUser.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  const adminRoute = location.pathname.replace(/\/+$/, '');
  const adminSection = adminRoute.split('/')[2] || 'dashboard';
  const isUsersPage = adminSection === 'users';
  const isAnalyticsPage = adminSection === 'analytics';
  const isBooksPage = adminSection === 'books';
  const isCoursesPage = adminSection === 'courses';
  const isSettingsPage = adminSection === 'settings';
  const isDashboardPage = adminSection === 'dashboard';
  const shouldShowAddUser = isDashboardPage || isUsersPage;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-32 bg-muted rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="admin-dashboard">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isSettingsPage ? 'Settings' : 'Admin Dashboard'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isUsersPage
                ? 'Manage platform users from one place'
                : isAnalyticsPage
                ? 'Review platform-wide analytics and engagement'
                : isSettingsPage
                ? 'Manage your admin account and platform users from one place'
                : 'System overview and administration'}
            </p>
          </div>
          {shouldShowAddUser && (
            <Button className="gap-2" onClick={openCreateUser} data-testid="create-user-btn">
              <Plus className="w-4 h-4" /> Add User
            </Button>
          )}
        </div>

        {!isSettingsPage && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Users</p><p className="text-3xl font-bold mt-1">{analytics?.total_users || 0}</p></div><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="w-6 h-6 text-primary" /></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Books</p><p className="text-3xl font-bold mt-1">{analytics?.total_books || 0}</p></div><div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center"><BookOpen className="w-6 h-6 text-teal-600" /></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Courses</p><p className="text-3xl font-bold mt-1">{analytics?.total_courses || 0}</p></div><div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center"><GraduationCap className="w-6 h-6 text-orange-600" /></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active Borrows</p><p className="text-3xl font-bold mt-1">{analytics?.active_borrows || 0}</p></div><div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center"><BarChart3 className="w-6 h-6 text-purple-600" /></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Schools</p><p className="text-3xl font-bold mt-1">{analytics?.schools_data?.length || 0}</p></div><div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center"><School className="w-6 h-6 text-pink-600" /></div></div></CardContent></Card>
          </div>
        )}

        {isUsersPage ? (
          <div className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search by name or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9" data-testid="user-search-input" />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-36" data-testid="role-filter"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="librarian">Librarian</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(u => (
                        <TableRow key={u.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openEditUser(u)}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell className="text-sm">{u.email}</TableCell>
                          <TableCell>
                            <Badge className={`${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-800'} hover:opacity-80 capitalize`}>{u.role}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{u.school_name || '-'}</TableCell>
                          <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {renderUserActions(u)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : isSettingsPage ? (
          <div className="mt-4 space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr,0.8fr] gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-name">Full Name</Label>
                      <Input
                        id="admin-name"
                        value={settingsForm.name}
                        onChange={(e) => setSettingsForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Admin full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-phone">Phone Number</Label>
                      <Input
                        id="admin-phone"
                        value={settingsForm.phone}
                        onChange={(e) => setSettingsForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input value={user?.email || ''} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input value={user?.role || 'admin'} readOnly className="capitalize" />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveSettings} disabled={settingsSaving} data-testid="admin-settings-save">
                      {settingsSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>System Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total Users</span>
                      <span className="font-medium">{analytics?.total_users || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Teachers</span>
                      <span className="font-medium">{users.filter((u) => u.role === 'teacher').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Parents</span>
                      <span className="font-medium">{users.filter((u) => u.role === 'parent').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Librarians</span>
                      <span className="font-medium">{users.filter((u) => u.role === 'librarian').length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Students</span>
                      <span className="font-medium">{users.filter((u) => u.role === 'student').length}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Management Access</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>Use the sections below to manage teachers, students, parents, and librarians directly from settings.</p>
                    <p>You can change roles with the shield action and remove accounts with the delete action.</p>
                    <p>Books, courses, and analytics remain available from their dedicated sidebar pages.</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="flex flex-wrap h-auto">
                    <TabsTrigger value="all">All Users</TabsTrigger>
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="teachers">Teachers</TabsTrigger>
                    <TabsTrigger value="parents">Parents</TabsTrigger>
                    <TabsTrigger value="librarians">Librarians</TabsTrigger>
                    <TabsTrigger value="guests">Guests</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>School</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settingsManagedUsers.map(u => (
                            <TableRow key={u.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openEditUser(u)}>
                              <TableCell className="font-medium">{u.name}</TableCell>
                              <TableCell className="text-sm">{u.email}</TableCell>
                              <TableCell>
                                <Badge className={`${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-800'} hover:opacity-80 capitalize`}>{u.role}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">{u.school_name || '-'}</TableCell>
                              <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right">
                                {renderUserActions(u, 'settings')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="students" className="mt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>School</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settingsManagedUsers.filter((u) => u.role === 'student').map(u => (
                            <TableRow key={u.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openEditUser(u)}>
                              <TableCell className="font-medium">{u.name}</TableCell>
                              <TableCell className="text-sm">{u.email}</TableCell>
                              <TableCell className="text-sm">{u.school_name || '-'}</TableCell>
                              <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right">
                                {renderUserActions(u, 'students')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="teachers" className="mt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>School</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settingsManagedUsers.filter((u) => u.role === 'teacher').map(u => (
                            <TableRow key={u.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openEditUser(u)}>
                              <TableCell className="font-medium">{u.name}</TableCell>
                              <TableCell className="text-sm">{u.email}</TableCell>
                              <TableCell className="text-sm">{u.school_name || '-'}</TableCell>
                              <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right">
                                {renderUserActions(u, 'teachers')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="parents" className="mt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settingsManagedUsers.filter((u) => u.role === 'parent').map(u => (
                            <TableRow key={u.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openEditUser(u)}>
                              <TableCell className="font-medium">{u.name}</TableCell>
                              <TableCell className="text-sm">{u.email}</TableCell>
                              <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right">
                                {renderUserActions(u, 'parents')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="librarians" className="mt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settingsManagedUsers.filter((u) => u.role === 'librarian').map(u => (
                            <TableRow key={u.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openEditUser(u)}>
                              <TableCell className="font-medium">{u.name}</TableCell>
                              <TableCell className="text-sm">{u.email}</TableCell>
                              <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right">
                                {renderUserActions(u, 'librarians')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  <TabsContent value="guests" className="mt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {settingsManagedUsers.filter((u) => u.role === 'guest').map(u => (
                            <TableRow key={u.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openEditUser(u)}>
                              <TableCell className="font-medium">{u.name}</TableCell>
                              <TableCell className="text-sm">{u.email}</TableCell>
                              <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                              <TableCell className="text-right">
                                {renderUserActions(u, 'guests')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        ) : isBooksPage ? (
          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Books ({books.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Pricing</TableHead>
                        <TableHead>Format</TableHead>
                        <TableHead>Grades</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {books.map((book) => (
                        <TableRow key={book.id}>
                          <TableCell className="font-medium">{book.title}</TableCell>
                          <TableCell className="text-sm">{book.author}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{book.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="capitalize">{book.pricing_type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm capitalize">{book.format}</TableCell>
                          <TableCell className="text-sm">
                            {book.grade_levels?.length ? book.grade_levels.map((grade) => `Grade ${grade}`).join(', ') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : isCoursesPage ? (
          <div className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Available Courses ({courses.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Subjects</TableHead>
                        <TableHead>Grades</TableHead>
                        <TableHead>Modules</TableHead>
                        <TableHead>Quizzes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{course.title}</p>
                              <p className="text-sm text-muted-foreground">{course.description}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{course.teacher_name}</TableCell>
                          <TableCell className="text-sm">
                            {course.subjects?.length ? course.subjects.join(', ') : '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {course.grade_levels?.length ? course.grade_levels.map((grade) => `Grade ${grade}`).join(', ') : '-'}
                          </TableCell>
                          <TableCell className="text-sm">{course.modules?.length || 0}</TableCell>
                          <TableCell className="text-sm">{course.quizzes?.length || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : isAnalyticsPage ? (
          <div className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Users by Role</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    {roleData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                            {roleData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-muted-foreground">No data</div>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Popular Books</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    {analytics?.popular_books?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.popular_books}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="title" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="borrows" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-muted-foreground">No borrow data</div>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="schools">
            <TabsList>
              <TabsTrigger value="schools" data-testid="admin-tab-schools">Schools</TabsTrigger>
              <TabsTrigger value="borrows" data-testid="admin-tab-borrows">Active Borrows</TabsTrigger>
              <TabsTrigger value="activity" data-testid="admin-tab-activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="schools" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Partner Schools</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(analytics?.schools_data || []).map((school) => (
                      <Card key={school.id} className="border-l-4 border-l-primary">
                        <CardContent className="p-5">
                          <h3 className="font-semibold text-lg mb-3">{school.name}</h3>
                          <div className="flex gap-4 text-sm">
                            <div><span className="text-muted-foreground">Students: </span><span className="font-medium">{school.students}</span></div>
                            <div><span className="text-muted-foreground">Teachers: </span><span className="font-medium">{school.teachers}</span></div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="borrows" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Borrows ({activeBorrows.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {activeBorrows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Book</TableHead>
                            <TableHead>Borrow Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Taken On</TableHead>
                            <TableHead>Due Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeBorrows.map((borrow) => (
                            <TableRow key={borrow.id}>
                              <TableCell className="font-medium">{borrow.user_name}</TableCell>
                              <TableCell>{borrow.book_title}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {borrow.borrow_type === 'borrow' ? 'Borrow Free' : borrow.borrow_type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={borrow.status === 'overdue' ? 'destructive' : 'secondary'} className="capitalize">
                                  {borrow.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {new Date(borrow.issue_date || borrow.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-sm">
                                {borrow.due_date ? new Date(borrow.due_date).toLocaleDateString() : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No active borrows</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                <CardContent>
                  {analytics?.recent_activity?.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.recent_activity.map((a, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                          <Activity className="w-4 h-4 text-primary flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm">{a.description}</p>
                            <p className="text-xs text-muted-foreground">{a.type} &bull; {new Date(a.date).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-muted-foreground text-center py-8">No recent activity</p>}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={userForm.name} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" data-testid="new-user-name" /></div>
            <div><Label>Email *</Label><Input type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" data-testid="new-user-email" /></div>
            <div><Label>Password *</Label><Input type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} placeholder="Password" data-testid="new-user-password" /></div>
            <div>
              <Label>Role</Label>
              <Select value={userForm.role} onValueChange={v => setUserForm(p => ({ ...p, role: v }))}>
                <SelectTrigger data-testid="new-user-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="librarian">Librarian</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(userForm.role === 'student' || userForm.role === 'teacher') && (
              <div>
                <Label>School (optional)</Label>
                <Select value={userForm.school_id || 'none'} onValueChange={v => setUserForm(p => ({ ...p, school_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No school</SelectItem>
                    {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {userForm.role === 'student' && (
              <>
                <div><Label>Student ID</Label><Input value={userForm.student_id} onChange={e => setUserForm(p => ({ ...p, student_id: e.target.value }))} placeholder="e.g., NTHS-2024-001" /></div>
                <div><Label>Grade Level</Label><Input type="number" min="1" max="12" value={userForm.grade_level} onChange={e => setUserForm(p => ({ ...p, grade_level: e.target.value }))} placeholder="8-12" /></div>
              </>
            )}
            <Button onClick={handleCreateUser} className="w-full" data-testid="submit-create-user">Create User</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={!!roleChangeUser} onOpenChange={(o) => { if (!o) setRoleChangeUser(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Change User Role</DialogTitle></DialogHeader>
          <div className="space-y-4">
                <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger data-testid="role-change-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="librarian">Librarian</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={handleRoleChange} className="flex-1" data-testid="confirm-role-change">Save</Button>
              <Button variant="outline" onClick={() => setRoleChangeUser(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={editUserForm.name} onChange={e => setEditUserForm(p => ({ ...p, name: e.target.value }))} placeholder="Full name" /></div>
            <div><Label>Email *</Label><Input type="email" value={editUserForm.email} onChange={e => setEditUserForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" /></div>
            <div><Label>Phone Number</Label><Input value={editUserForm.phone} onChange={e => setEditUserForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone number" /></div>

            {(editUser?.role === 'student' || editUser?.role === 'teacher') && (
              <div>
                <Label>School</Label>
                <Select value={editUserForm.school_id || 'none'} onValueChange={v => setEditUserForm(p => ({ ...p, school_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No school</SelectItem>
                    {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {editUser?.role === 'student' && (
              <>
                <div><Label>Student ID</Label><Input value={editUserForm.student_id} onChange={e => setEditUserForm(p => ({ ...p, student_id: e.target.value }))} placeholder="e.g., NTHS-2024-001" /></div>
                <div><Label>Grade Level</Label><Input type="number" min="1" max="12" value={editUserForm.grade_level} onChange={e => setEditUserForm(p => ({ ...p, grade_level: e.target.value }))} placeholder="8-12" /></div>
              </>
            )}

            {(editUser?.role === 'teacher' || editUser?.role === 'librarian') && (
              <div><Label>Employee ID</Label><Input value={editUserForm.employee_id} onChange={e => setEditUserForm(p => ({ ...p, employee_id: e.target.value }))} placeholder="Employee ID" /></div>
            )}

            {editUser?.role === 'teacher' && (
              <div><Label>Specialization</Label><Input value={editUserForm.specialization} onChange={e => setEditUserForm(p => ({ ...p, specialization: e.target.value }))} placeholder="Subject specialization" /></div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleEditUser} className="flex-1" disabled={editSaving} data-testid="confirm-edit-user">
                {editSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setEditUser(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminDashboard;
