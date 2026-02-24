import React, { useState, useEffect } from 'react';
import { Users, BookOpen, TrendingUp, Eye, CheckCircle, Clock, XCircle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LibrarianDashboard = () => {
  const { token } = useAuth();
  const [books, setBooks] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [booksRes, borrowsRes] = await Promise.all([
          axios.get(`${API}/books`),
          axios.get(`${API}/borrows`, { headers })
        ]);
        setBooks(booksRes.data);
        setBorrows(borrowsRes.data);
      } catch (error) {
        console.error('Failed to fetch librarian data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleApproveBorrow = async (borrowId) => {
    try {
      await axios.put(
        `${API}/borrows/${borrowId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Borrow request approved');
      // Refresh borrows
      const res = await axios.get(`${API}/borrows`, { headers: { Authorization: `Bearer ${token}` } });
      setBorrows(res.data);
    } catch (error) {
      toast.error('Failed to approve borrow');
    }
  };

  const handleReturnBook = async (borrowId) => {
    try {
      await axios.put(
        `${API}/borrows/${borrowId}/return`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Book marked as returned');
      // Refresh borrows
      const res = await axios.get(`${API}/borrows`, { headers: { Authorization: `Bearer ${token}` } });
      setBorrows(res.data);
    } catch (error) {
      toast.error('Failed to process return');
    }
  };

  const pendingBorrows = borrows.filter(b => b.status === 'pending');
  const activeBorrows = borrows.filter(b => ['approved', 'borrowed'].includes(b.status));
  const lowStockBooks = books.filter(b => b.format !== 'digital' && b.available_copies < 2);

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

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="librarian-dashboard">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Librarian Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage inventory and borrow requests
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="stat-gradient-1">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="text-3xl font-bold mt-1">{pendingBorrows.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-gradient-2">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Borrows</p>
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
                  <p className="text-sm text-muted-foreground">Low Stock</p>
                  <p className="text-3xl font-bold mt-1">{lowStockBooks.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2" data-testid="pending-tab">
              <Clock className="w-4 h-4" />
              Pending ({pendingBorrows.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2" data-testid="active-tab">
              <BookOpen className="w-4 h-4" />
              Active ({activeBorrows.length})
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2" data-testid="inventory-tab">
              <Users className="w-4 h-4" />
              Inventory
            </TabsTrigger>
          </TabsList>

          {/* Pending Requests */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Borrow Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingBorrows.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Book</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingBorrows.map((borrow) => (
                        <TableRow key={borrow.id}>
                          <TableCell className="font-medium">{borrow.book_title}</TableCell>
                          <TableCell>{borrow.user_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{borrow.borrow_type}</Badge>
                          </TableCell>
                          <TableCell>{new Date(borrow.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              onClick={() => handleApproveBorrow(borrow.id)}
                              data-testid={`approve-btn-${borrow.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No pending requests</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Borrows */}
          <TabsContent value="active">
            <Card>
              <CardHeader>
                <CardTitle>Active Borrows</CardTitle>
              </CardHeader>
              <CardContent>
                {activeBorrows.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Book</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeBorrows.map((borrow) => (
                        <TableRow key={borrow.id}>
                          <TableCell className="font-medium">{borrow.book_title}</TableCell>
                          <TableCell>{borrow.user_name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">{borrow.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {borrow.due_date ? new Date(borrow.due_date).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleReturnBook(borrow.id)}
                              data-testid={`return-btn-${borrow.id}`}
                            >
                              Mark Returned
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No active borrows</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Book Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Location</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {books.map((book) => (
                      <TableRow key={book.id}>
                        <TableCell className="font-medium">{book.title}</TableCell>
                        <TableCell>{book.author}</TableCell>
                        <TableCell>
                          <Badge className={book.category === 'academic' ? 'academic-badge' : 'leisure-badge'}>
                            {book.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{book.format}</TableCell>
                        <TableCell>
                          {book.format !== 'digital' ? (
                            <span className={book.available_copies < 2 ? 'text-orange-600 font-medium' : ''}>
                              {book.available_copies} / {book.total_copies}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Unlimited</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {book.shelf_location || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default LibrarianDashboard;
