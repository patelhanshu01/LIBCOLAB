import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, TrendingUp, CheckCircle, Clock, Plus, Pencil, Trash2, X, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const emptyBook = {
  title: '', author: '', description: '', category: 'academic', pricing_type: 'free',
  price: 0, format: 'physical', shelf_location: '', available_copies: 1, total_copies: 1,
  isbn: '', grade_levels: [], subjects: []
};

const LibrarianDashboard = () => {
  const { token } = useAuth();
  const [books, setBooks] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookForm, setBookForm] = useState({ ...emptyBook });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [subjectInput, setSubjectInput] = useState('');
  const [gradeInput, setGradeInput] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');

  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
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
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApproveBorrow = async (borrowId) => {
    try {
      await axios.put(`${API}/borrows/${borrowId}/approve`, {}, { headers });
      toast.success('Borrow request approved');
      fetchData();
    } catch (error) { toast.error('Failed to approve borrow'); }
  };

  const handleReturnBook = async (borrowId) => {
    try {
      await axios.put(`${API}/borrows/${borrowId}/return`, {}, { headers });
      toast.success('Book marked as returned');
      fetchData();
    } catch (error) { toast.error('Failed to process return'); }
  };

  const openAddBook = () => {
    setEditingBook(null);
    setBookForm({ ...emptyBook });
    setSubjectInput('');
    setGradeInput('');
    setBookDialogOpen(true);
  };

  const openEditBook = (book) => {
    setEditingBook(book);
    setBookForm({
      title: book.title, author: book.author, description: book.description || '',
      category: book.category, pricing_type: book.pricing_type, price: book.price || 0,
      format: book.format, shelf_location: book.shelf_location || '',
      available_copies: book.available_copies || 1, total_copies: book.total_copies || 1,
      isbn: book.isbn || '', grade_levels: book.grade_levels || [], subjects: book.subjects || []
    });
    setSubjectInput('');
    setGradeInput('');
    setBookDialogOpen(true);
  };

  const handleSaveBook = async () => {
    if (!bookForm.title || !bookForm.author) { toast.error('Title and Author are required'); return; }
    try {
      const payload = { ...bookForm, price: parseFloat(bookForm.price) || 0, available_copies: parseInt(bookForm.available_copies) || 1, total_copies: parseInt(bookForm.total_copies) || 1 };
      if (editingBook) {
        await axios.put(`${API}/books/${editingBook.id}`, payload, { headers });
        toast.success('Book updated');
      } else {
        await axios.post(`${API}/books`, payload, { headers });
        toast.success('Book added');
      }
      setBookDialogOpen(false);
      fetchData();
    } catch (error) { toast.error(editingBook ? 'Failed to update book' : 'Failed to add book'); }
  };

  const handleDeleteBook = async (bookId) => {
    try {
      await axios.delete(`${API}/books/${bookId}`, { headers });
      toast.success('Book deleted');
      setBooks(prev => prev.filter(b => b.id !== bookId));
      setDeleteConfirm(null);
    } catch (error) { toast.error('Failed to delete book'); }
  };

  const addSubject = () => {
    if (subjectInput.trim() && !bookForm.subjects.includes(subjectInput.trim())) {
      setBookForm(prev => ({ ...prev, subjects: [...prev.subjects, subjectInput.trim()] }));
      setSubjectInput('');
    }
  };
  const removeSubject = (s) => setBookForm(prev => ({ ...prev, subjects: prev.subjects.filter(x => x !== s) }));
  const addGrade = () => {
    const g = parseInt(gradeInput);
    if (g >= 1 && g <= 12 && !bookForm.grade_levels.includes(g)) {
      setBookForm(prev => ({ ...prev, grade_levels: [...prev.grade_levels, g].sort((a, b) => a - b) }));
      setGradeInput('');
    }
  };
  const removeGrade = (g) => setBookForm(prev => ({ ...prev, grade_levels: prev.grade_levels.filter(x => x !== g) }));

  // Filtered books
  const filteredBooks = books.filter(book => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!book.title.toLowerCase().includes(q) && !book.author.toLowerCase().includes(q) && !(book.isbn || '').toLowerCase().includes(q)) return false;
    }
    if (categoryFilter !== 'all' && book.category !== categoryFilter) return false;
    if (formatFilter !== 'all' && book.format !== formatFilter) return false;
    if (stockFilter === 'low' && (book.format === 'digital' || book.available_copies >= 2)) return false;
    if (stockFilter === 'out' && (book.format === 'digital' || book.available_copies > 0)) return false;
    return true;
  });

  const pendingBorrows = borrows.filter(b => b.status === 'pending');
  const activeBorrows = borrows.filter(b => ['approved', 'borrowed'].includes(b.status));
  const lowStockBooks = books.filter(b => b.format !== 'digital' && b.available_copies < 2);
  const hasActiveFilters = searchQuery || categoryFilter !== 'all' || formatFilter !== 'all' || stockFilter !== 'all';

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

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="librarian-dashboard">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Librarian Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage inventory, borrow requests, and returns</p>
          </div>
          <Button className="gap-2" onClick={openAddBook} data-testid="add-book-btn">
            <Plus className="w-4 h-4" /> Add Book
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total Books</p><p className="text-3xl font-bold mt-1">{books.length}</p></div><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><BookOpen className="w-6 h-6 text-primary" /></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending</p><p className="text-3xl font-bold mt-1">{pendingBorrows.length}</p></div><div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center"><Clock className="w-6 h-6 text-amber-600" /></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Active Borrows</p><p className="text-3xl font-bold mt-1">{activeBorrows.length}</p></div><div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center"><CheckCircle className="w-6 h-6 text-teal-600" /></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Low Stock</p><p className="text-3xl font-bold mt-1">{lowStockBooks.length}</p></div><div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center"><TrendingUp className="w-6 h-6 text-orange-600" /></div></div></CardContent></Card>
        </div>

        <Tabs defaultValue="inventory">
          <TabsList>
            <TabsTrigger value="inventory" className="gap-2" data-testid="inventory-tab"><BookOpen className="w-4 h-4" /> Inventory ({filteredBooks.length}{hasActiveFilters ? `/${books.length}` : ''})</TabsTrigger>
            <TabsTrigger value="pending" className="gap-2" data-testid="pending-tab"><Clock className="w-4 h-4" /> Pending ({pendingBorrows.length})</TabsTrigger>
            <TabsTrigger value="active" className="gap-2" data-testid="active-tab"><CheckCircle className="w-4 h-4" /> Active ({activeBorrows.length})</TabsTrigger>
          </TabsList>

          {/* Inventory */}
          <TabsContent value="inventory" className="mt-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title, author or ISBN..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="book-search-input"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-36" data-testid="category-filter">
                        <Filter className="w-3 h-3 mr-1" /><SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="leisure">Leisure</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={formatFilter} onValueChange={setFormatFilter}>
                      <SelectTrigger className="w-32" data-testid="format-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Formats</SelectItem>
                        <SelectItem value="physical">Physical</SelectItem>
                        <SelectItem value="digital">Digital</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={stockFilter} onValueChange={setStockFilter}>
                      <SelectTrigger className="w-32" data-testid="stock-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stock</SelectItem>
                        <SelectItem value="low">Low Stock</SelectItem>
                        <SelectItem value="out">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setFormatFilter('all'); setStockFilter('all'); }} data-testid="clear-filters-btn">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredBooks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Author</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Format</TableHead>
                          <TableHead>Pricing</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBooks.map((book) => (
                          <TableRow key={book.id}>
                            <TableCell className="font-medium max-w-[200px] truncate">{book.title}</TableCell>
                            <TableCell>{book.author}</TableCell>
                            <TableCell>
                              <Badge className={book.category === 'academic' ? 'bg-teal-100 text-teal-800 hover:bg-teal-100' : 'bg-orange-100 text-orange-800 hover:bg-orange-100'}>{book.category}</Badge>
                            </TableCell>
                            <TableCell className="capitalize">{book.format}</TableCell>
                            <TableCell>
                              {book.pricing_type === 'free' ? (
                                <Badge variant="secondary">Free</Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">${book.price} ({book.pricing_type})</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {book.format !== 'digital' ? (
                                <span className={book.available_copies < 2 ? 'text-orange-600 font-medium' : ''}>{book.available_copies}/{book.total_copies}</span>
                              ) : <span className="text-muted-foreground">Unlimited</span>}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{book.shelf_location || '-'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button size="sm" variant="ghost" onClick={() => openEditBook(book)} data-testid={`edit-book-${book.id}`}><Pencil className="w-4 h-4" /></Button>
                                {deleteConfirm === book.id ? (
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="destructive" onClick={() => handleDeleteBook(book.id)} data-testid={`confirm-delete-${book.id}`}>Yes</Button>
                                    <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>No</Button>
                                  </div>
                                ) : (
                                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => setDeleteConfirm(book.id)} data-testid={`delete-book-${book.id}`}><Trash2 className="w-4 h-4" /></Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-1">No books found</h3>
                    <p className="text-muted-foreground">{hasActiveFilters ? 'Try adjusting your filters' : 'Add your first book to get started'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Requests */}
          <TabsContent value="pending" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {pendingBorrows.length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Book</TableHead><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Requested</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {pendingBorrows.map((borrow) => (
                        <TableRow key={borrow.id}>
                          <TableCell className="font-medium">{borrow.book_title}</TableCell>
                          <TableCell>{borrow.user_name}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize">{borrow.borrow_type}</Badge></TableCell>
                          <TableCell>{new Date(borrow.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => handleApproveBorrow(borrow.id)} data-testid={`approve-btn-${borrow.id}`}>
                              <CheckCircle className="w-4 h-4 mr-1" /> Approve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-muted-foreground text-center py-8">No pending requests</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Borrows */}
          <TabsContent value="active" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {activeBorrows.length > 0 ? (
                  <Table>
                    <TableHeader><TableRow><TableHead>Book</TableHead><TableHead>User</TableHead><TableHead>Status</TableHead><TableHead>Due Date</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {activeBorrows.map((borrow) => (
                        <TableRow key={borrow.id}>
                          <TableCell className="font-medium">{borrow.book_title}</TableCell>
                          <TableCell>{borrow.user_name}</TableCell>
                          <TableCell><Badge variant="secondary" className="capitalize">{borrow.status}</Badge></TableCell>
                          <TableCell>{borrow.due_date ? new Date(borrow.due_date).toLocaleDateString() : '-'}</TableCell>
                          <TableCell><Button size="sm" variant="outline" onClick={() => handleReturnBook(borrow.id)} data-testid={`return-btn-${borrow.id}`}>Mark Returned</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-muted-foreground text-center py-8">No active borrows</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Book Dialog */}
      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Title *</Label><Input value={bookForm.title} onChange={e => setBookForm(p => ({ ...p, title: e.target.value }))} placeholder="Book title" data-testid="book-title-input" /></div>
              <div className="col-span-2"><Label>Author *</Label><Input value={bookForm.author} onChange={e => setBookForm(p => ({ ...p, author: e.target.value }))} placeholder="Author name" data-testid="book-author-input" /></div>
              <div className="col-span-2"><Label>Description</Label><Textarea value={bookForm.description} onChange={e => setBookForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" rows={2} data-testid="book-description-input" /></div>
              <div>
                <Label>Category</Label>
                <Select value={bookForm.category} onValueChange={v => setBookForm(p => ({ ...p, category: v, pricing_type: v === 'academic' ? 'free' : p.pricing_type }))}>
                  <SelectTrigger data-testid="book-category-select"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="academic">Academic</SelectItem><SelectItem value="leisure">Leisure</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pricing</Label>
                <Select value={bookForm.pricing_type} onValueChange={v => setBookForm(p => ({ ...p, pricing_type: v }))}>
                  <SelectTrigger data-testid="book-pricing-select"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="free">Free</SelectItem><SelectItem value="rent">Rent</SelectItem><SelectItem value="buy">Buy</SelectItem></SelectContent>
                </Select>
              </div>
              {bookForm.pricing_type !== 'free' && <div><Label>Price ($)</Label><Input type="number" step="0.01" value={bookForm.price} onChange={e => setBookForm(p => ({ ...p, price: e.target.value }))} data-testid="book-price-input" /></div>}
              <div>
                <Label>Format</Label>
                <Select value={bookForm.format} onValueChange={v => setBookForm(p => ({ ...p, format: v }))}>
                  <SelectTrigger data-testid="book-format-select"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="physical">Physical</SelectItem><SelectItem value="digital">Digital</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent>
                </Select>
              </div>
              {bookForm.format !== 'digital' && (
                <>
                  <div><Label>Available Copies</Label><Input type="number" min="0" value={bookForm.available_copies} onChange={e => setBookForm(p => ({ ...p, available_copies: e.target.value }))} data-testid="book-available-input" /></div>
                  <div><Label>Total Copies</Label><Input type="number" min="1" value={bookForm.total_copies} onChange={e => setBookForm(p => ({ ...p, total_copies: e.target.value }))} data-testid="book-total-input" /></div>
                  <div><Label>Shelf Location</Label><Input value={bookForm.shelf_location} onChange={e => setBookForm(p => ({ ...p, shelf_location: e.target.value }))} placeholder="e.g., A1-01" data-testid="book-shelf-input" /></div>
                </>
              )}
              <div><Label>ISBN</Label><Input value={bookForm.isbn} onChange={e => setBookForm(p => ({ ...p, isbn: e.target.value }))} placeholder="Optional" data-testid="book-isbn-input" /></div>
            </div>
            <div>
              <Label>Subjects</Label>
              <div className="flex gap-2 mt-1">
                <Input value={subjectInput} onChange={e => setSubjectInput(e.target.value)} placeholder="Add subject" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubject())} data-testid="book-subject-input" />
                <Button type="button" variant="outline" onClick={addSubject}>Add</Button>
              </div>
              {bookForm.subjects.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{bookForm.subjects.map(s => <Badge key={s} variant="secondary" className="gap-1">{s} <button onClick={() => removeSubject(s)}><X className="w-3 h-3" /></button></Badge>)}</div>}
            </div>
            <div>
              <Label>Grade Levels</Label>
              <div className="flex gap-2 mt-1">
                <Input type="number" min="1" max="12" value={gradeInput} onChange={e => setGradeInput(e.target.value)} placeholder="Grade 8-12" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGrade())} data-testid="book-grade-input" />
                <Button type="button" variant="outline" onClick={addGrade}>Add</Button>
              </div>
              {bookForm.grade_levels.length > 0 && <div className="flex flex-wrap gap-2 mt-2">{bookForm.grade_levels.map(g => <Badge key={g} variant="secondary" className="gap-1">Grade {g} <button onClick={() => removeGrade(g)}><X className="w-3 h-3" /></button></Badge>)}</div>}
            </div>
            <Button onClick={handleSaveBook} className="w-full" data-testid="save-book-btn">{editingBook ? 'Update Book' : 'Add Book'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default LibrarianDashboard;
