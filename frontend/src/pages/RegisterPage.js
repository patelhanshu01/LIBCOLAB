import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Library, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    grade_level: '',
    phone: '',
    specialization: '',
    parent_email: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        grade_level: formData.role === 'student' && formData.grade_level ? parseInt(formData.grade_level) : null,
        phone: formData.role === 'parent' ? formData.phone : null,
        specialization: formData.role === 'teacher' ? formData.specialization : null
      };

      const user = await register(userData);
      toast.success(`Welcome to LibCollab, ${user.name}!`);
      
      // Redirect based on role
      switch (user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'librarian':
          navigate('/librarian');
          break;
        case 'teacher':
          navigate('/teacher');
          break;
        case 'parent':
          navigate('/parent');
          break;
        default:
          navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Image */}
      <div className="hidden lg:block lg:flex-1 bg-muted relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
        <img 
          src="https://images.pexels.com/photos/8500359/pexels-photo-8500359.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Students collaborating"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-8" data-testid="logo-link">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Library className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">LibCollab</span>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
            <p className="text-muted-foreground mt-2">
              Join LibCollab and start your learning journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="role">I am a</Label>
              <Select value={formData.role} onValueChange={(value) => handleChange('role', value)}>
                <SelectTrigger data-testid="role-select" className="h-12">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                data-testid="name-input"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@school.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                data-testid="email-input"
                className="h-12"
              />
            </div>

            {/* Role-specific fields */}
            {formData.role === 'student' && (
              <div className="space-y-2">
                <Label htmlFor="grade">Grade Level</Label>
                <Select value={formData.grade_level} onValueChange={(value) => handleChange('grade_level', value)}>
                  <SelectTrigger data-testid="grade-select" className="h-12">
                    <SelectValue placeholder="Select your grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">Grade 8</SelectItem>
                    <SelectItem value="9">Grade 9</SelectItem>
                    <SelectItem value="10">Grade 10</SelectItem>
                    <SelectItem value="11">Grade 11</SelectItem>
                    <SelectItem value="12">Grade 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.role === 'parent' && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="555-123-4567"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  data-testid="phone-input"
                  className="h-12"
                />
              </div>
            )}

            {formData.role === 'teacher' && (
              <div className="space-y-2">
                <Label htmlFor="specialization">Subject/Specialization</Label>
                <Input
                  id="specialization"
                  placeholder="e.g., Mathematics, Science"
                  value={formData.specialization}
                  onChange={(e) => handleChange('specialization', e.target.value)}
                  data-testid="specialization-input"
                  className="h-12"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  data-testid="password-input"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                data-testid="confirm-password-input"
                className="h-12"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-full gap-2" 
              disabled={loading}
              data-testid="register-submit-btn"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline" data-testid="login-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
