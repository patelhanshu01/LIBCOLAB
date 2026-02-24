import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, GraduationCap, Users, Award, ArrowRight, Sparkles, Library, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="glass-header fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Library className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">LibCollab</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost" data-testid="login-nav-btn">Log In</Button>
            </Link>
            <Link to="/register">
              <Button className="rounded-full px-6" data-testid="get-started-nav-btn">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>Free Academic Resources for Schools</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                Your Library,
                <br />
                <span className="text-primary">Reimagined</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Access thousands of academic books for free through your school partnership. 
                Explore leisure reads, track your learning progress, and earn certificates.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register">
                  <Button size="lg" className="rounded-full px-8 gap-2" data-testid="hero-get-started-btn">
                    Start Learning Free
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/books">
                  <Button size="lg" variant="outline" className="rounded-full px-8" data-testid="hero-browse-btn">
                    Browse Library
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-8 pt-4">
                <div>
                  <div className="text-3xl font-bold text-foreground">10K+</div>
                  <div className="text-sm text-muted-foreground">Books Available</div>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <div className="text-3xl font-bold text-foreground">50+</div>
                  <div className="text-sm text-muted-foreground">Partner Schools</div>
                </div>
                <div className="w-px h-12 bg-border" />
                <div>
                  <div className="text-3xl font-bold text-foreground">5K+</div>
                  <div className="text-sm text-muted-foreground">Active Students</div>
                </div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl" />
              <img 
                src="https://images.pexels.com/photos/8500359/pexels-photo-8500359.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                alt="Students in modern library"
                className="rounded-3xl shadow-2xl object-cover w-full h-[500px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Two Libraries, One Platform</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Access free academic resources through your school, or explore our leisure collection for fun reading.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Academic Section */}
            <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
              <div className="w-14 h-14 rounded-xl bg-teal-100 flex items-center justify-center mb-6">
                <GraduationCap className="w-7 h-7 text-teal-700" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-teal-700">Academic Library</h3>
              <p className="text-muted-foreground mb-6">
                Free access to textbooks, study guides, and educational resources for grades 8-12. 
                Available through our school partnerships.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center">
                    <Shield className="w-3 h-3 text-teal-700" />
                  </div>
                  <span>100% Free for partner school students</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center">
                    <BookOpen className="w-3 h-3 text-teal-700" />
                  </div>
                  <span>Digital & Physical book options</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center">
                    <Award className="w-3 h-3 text-teal-700" />
                  </div>
                  <span>Integrated learning courses</span>
                </li>
              </ul>
              <Link to="/books?category=academic">
                <Button variant="outline" className="academic-button w-full" data-testid="browse-academic-btn">
                  Browse Academic Books
                </Button>
              </Link>
            </div>

            {/* Leisure Section */}
            <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
              <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center mb-6">
                <Sparkles className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-orange-600">Leisure Collection</h3>
              <p className="text-muted-foreground mb-6">
                Rent or buy fiction, graphic novels, lifestyle books, and more. 
                Discover your next favorite read!
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
                    <BookOpen className="w-3 h-3 text-orange-600" />
                  </div>
                  <span>Affordable rent & buy options</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
                    <Users className="w-3 h-3 text-orange-600" />
                  </div>
                  <span>Reading clubs & recommendations</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-orange-600" />
                  </div>
                  <span>New releases weekly</span>
                </li>
              </ul>
              <Link to="/books?category=leisure">
                <Button className="leisure-button w-full" data-testid="browse-leisure-btn">
                  Explore Leisure Books
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">Get started in three simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Create Account</h3>
              <p className="text-muted-foreground">
                Sign up as a student, parent, or educator. Link your account to your school.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Browse & Borrow</h3>
              <p className="text-muted-foreground">
                Access free academic books or explore leisure reads. Download or pickup physical copies.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Learn & Earn</h3>
              <p className="text-muted-foreground">
                Enroll in courses, complete quizzes, and earn certificates to showcase your progress.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-primary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-6">Ready to Start Learning?</h2>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of students already using LibCollab to access free educational resources 
            and track their learning journey.
          </p>
          <Link to="/register">
            <Button size="lg" variant="secondary" className="rounded-full px-8 gap-2" data-testid="cta-signup-btn">
              Create Free Account
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Library className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">LibCollab</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 LibCollab. Empowering education through collaboration.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
