import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Library, Eye, EyeOff, ArrowRight, School, User, Building2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LoginPage = () => {
  const [loginType, setLoginType] = useState('regular');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // School verification fields
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [studentId, setStudentId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  const [schoolRole, setSchoolRole] = useState('student');
  
  const { login, loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await axios.get(`${API}/schools`);
        setSchools(response.data);
      } catch (error) {
        console.error('Failed to fetch schools:', error);
      }
    };
    fetchSchools();
  }, []);

  const handleRegularLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      redirectBasedOnRole(user.role);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSchoolLogin = async (e) => {
    e.preventDefault();
    if (!selectedSchool || !schoolEmail || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (schoolRole === 'student' && !studentId) {
      toast.error('Please enter your Student ID');
      return;
    }

    if (schoolRole === 'teacher' && !employeeId) {
      toast.error('Please enter your Employee ID');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/school-verify`, {
        school_id: selectedSchool,
        student_id: schoolRole === 'student' ? studentId : null,
        employee_id: schoolRole === 'teacher' ? employeeId : null,
        school_email: schoolEmail,
        password: password,
        role: schoolRole
      });

      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      
      // Manually trigger auth context update
      window.location.href = getRedirectPath(user.role);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid school credentials');
    } finally {
      setLoading(false);
    }
  };

  const getRedirectPath = (role) => {
    switch (role) {
      case 'admin': return '/admin';
      case 'librarian': return '/librarian';
      case 'teacher': return '/teacher';
      case 'parent': return '/parent';
      default: return '/dashboard';
    }
  };

  const redirectBasedOnRole = (role) => {
    navigate(getRedirectPath(role));
  };

  const selectedSchoolData = schools.find(s => s.id === selectedSchool);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-8" data-testid="logo-link">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Library className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">LibCollab</span>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground mt-2">
              Sign in to access your library and learning dashboard
            </p>
          </div>

          <Tabs value={loginType} onValueChange={setLoginType} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="regular" className="gap-2" data-testid="regular-login-tab">
                <User className="w-4 h-4" />
                Regular Login
              </TabsTrigger>
              <TabsTrigger value="school" className="gap-2" data-testid="school-login-tab">
                <School className="w-4 h-4" />
                School Login
              </TabsTrigger>
            </TabsList>

            {/* Regular Login */}
            <TabsContent value="regular">
              <form onSubmit={handleRegularLogin} className="space-y-5 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="email-input"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="password-input"
                      className="h-12 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      data-testid="toggle-password-btn"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-full gap-2" 
                  disabled={loading}
                  data-testid="login-submit-btn"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>
            </TabsContent>

            {/* School Login */}
            <TabsContent value="school">
              <form onSubmit={handleSchoolLogin} className="space-y-5 mt-6">
                <div className="space-y-2">
                  <Label>I am a</Label>
                  <Select value={schoolRole} onValueChange={setSchoolRole}>
                    <SelectTrigger data-testid="school-role-select" className="h-12">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher / Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Select Your School</Label>
                  <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                    <SelectTrigger data-testid="school-select" className="h-12">
                      <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Choose your school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.filter(s => s.is_partner).map(school => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name} ({school.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSchoolData && (
                    <p className="text-xs text-muted-foreground">
                      {selectedSchoolData.address}, {selectedSchoolData.city}
                    </p>
                  )}
                </div>

                {schoolRole === 'student' && (
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      placeholder="e.g., NTHS-2024-001"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      data-testid="student-id-input"
                      className="h-12 font-mono"
                    />
                  </div>
                )}

                {schoolRole === 'teacher' && (
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input
                      id="employeeId"
                      placeholder="e.g., T-NTHS-001"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      data-testid="employee-id-input"
                      className="h-12 font-mono"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="schoolEmail">School Email</Label>
                  <Input
                    id="schoolEmail"
                    type="email"
                    placeholder={selectedSchoolData ? `you${selectedSchoolData.email_domain || '@school.edu'}` : 'you@school.edu'}
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                    data-testid="school-email-input"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolPassword">Password</Label>
                  <div className="relative">
                    <Input
                      id="schoolPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="school-password-input"
                      className="h-12 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-full gap-2" 
                  disabled={loading}
                  data-testid="school-login-submit-btn"
                >
                  {loading ? 'Verifying...' : 'Login with School Credentials'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="text-center">
            <p className="text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-medium hover:underline" data-testid="register-link">
                Create one
              </Link>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-muted rounded-xl">
            <p className="text-sm font-medium mb-3">Demo Accounts:</p>
            <div className="space-y-3 text-xs">
              <div className="pb-2 border-b border-border">
                <p className="font-medium text-muted-foreground mb-1">Regular Login:</p>
                <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                  <div>Admin: admin@library.com</div>
                  <div>Pass: admin123</div>
                  <div>Parent: parent@family.com</div>
                  <div>Pass: parent123</div>
                </div>
              </div>
              <div>
                <p className="font-medium text-muted-foreground mb-1">School Login (NTHS):</p>
                <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                  <div>Student ID: NTHS-2024-001</div>
                  <div>Email: student@school.com</div>
                  <div>Teacher ID: T-NTHS-001</div>
                  <div>Email: m.johnson@nths.edu</div>
                  <div colSpan={2}>Pass: student123 / teacher123</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:flex-1 bg-muted relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
        <img 
          src="https://images.pexels.com/photos/3747460/pexels-photo-3747460.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Library shelves"
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-sm rounded-xl p-6">
          <h3 className="font-semibold text-lg mb-2">Partner Schools</h3>
          <p className="text-sm text-muted-foreground">
            Students and teachers from partner GTA schools can login with their school credentials for free access to academic resources.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
