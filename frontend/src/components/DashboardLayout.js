import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, BookOpen, GraduationCap, Award, User, LogOut, 
  Menu, X, ShoppingCart, Library, Users, BarChart3, Settings 
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Badge } from '../components/ui/badge';

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const { user, logout } = useAuth();
  const { getItemCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Navigation items based on role
  const getNavItems = () => {
    const baseItems = [
      { icon: Home, label: 'Dashboard', path: getDashboardPath() },
    ];

    switch (user?.role) {
      case 'student':
        return [
          ...baseItems,
          { icon: BookOpen, label: 'Books', path: '/books' },
          { icon: GraduationCap, label: 'Courses', path: '/courses' },
          { icon: Award, label: 'Certificates', path: '/certificates' },
          { icon: User, label: 'Profile', path: '/profile' },
        ];
      case 'parent':
        return [
          ...baseItems,
          { icon: Users, label: 'My Children', path: '/parent' },
          { icon: User, label: 'Profile', path: '/profile' },
        ];
      case 'teacher':
        return [
          ...baseItems,
          { icon: GraduationCap, label: 'My Courses', path: '/teacher/courses' },
          { icon: Users, label: 'Students', path: '/teacher/students' },
          { icon: User, label: 'Profile', path: '/profile' },
        ];
      case 'librarian':
        return [
          ...baseItems,
          { icon: BookOpen, label: 'Inventory', path: '/librarian/inventory' },
          { icon: Users, label: 'Borrow Requests', path: '/librarian/borrows' },
          { icon: User, label: 'Profile', path: '/profile' },
        ];
      case 'admin':
        return [
          ...baseItems,
          { icon: Users, label: 'Users', path: '/admin/users' },
          { icon: BookOpen, label: 'Books', path: '/admin/books' },
          { icon: GraduationCap, label: 'Courses', path: '/admin/courses' },
          { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
          { icon: Settings, label: 'Settings', path: '/admin/settings' },
        ];
      default:
        return baseItems;
    }
  };

  const getDashboardPath = () => {
    switch (user?.role) {
      case 'admin': return '/admin';
      case 'librarian': return '/librarian';
      case 'teacher': return '/teacher';
      case 'parent': return '/parent';
      default: return '/dashboard';
    }
  };

  const navItems = getNavItems();
  const cartCount = getItemCount();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden glass-header fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => setSidebarOpen(true)} 
            className="p-2 hover:bg-muted rounded-lg"
            data-testid="mobile-menu-btn"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Library className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">LibCollab</span>
          </Link>
          {user?.role === 'student' && (
            <Link to="/cart" className="relative p-2">
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs">
                  {cartCount}
                </Badge>
              )}
            </Link>
          )}
        </div>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <Link to="/" className="flex items-center gap-2" data-testid="sidebar-logo">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Library className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl">LibCollab</span>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-muted rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-sm">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Cart (for students) */}
          {user?.role === 'student' && (
            <div className="p-4 border-t border-border">
              <Link
                to="/cart"
                className="sidebar-link justify-between"
                data-testid="nav-cart"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5" />
                  <span>Cart</span>
                </div>
                {cartCount > 0 && (
                  <Badge variant="secondary">{cartCount}</Badge>
                )}
              </Link>
            </div>
          )}

          {/* Logout */}
          <div className="p-4 border-t border-border">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5" />
              <span>Log Out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
