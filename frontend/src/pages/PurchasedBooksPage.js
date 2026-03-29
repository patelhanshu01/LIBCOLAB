import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, RotateCcw, ShoppingBag } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PurchasedBooksPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returningId, setReturningId] = useState('');
  const activeTab = searchParams.get('tab') || 'purchased';

  useEffect(() => {
    const fetchMyBooks = async () => {
      try {
        const response = await axios.get(`${API}/borrows`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setBooks(response.data || []);
      } catch (error) {
        console.error('Failed to fetch books:', error);
        toast.error('Failed to load your books');
      } finally {
        setLoading(false);
      }
    };

    fetchMyBooks();
  }, [token]);

  const purchasedBooks = useMemo(
    () => books.filter((item) => item.borrow_type === 'buy'),
    [books]
  );

  const borrowedBooks = useMemo(
    () => books.filter((item) => ['borrow', 'rent'].includes(item.borrow_type)),
    [books]
  );

  const handleReturnBook = async (borrow) => {
    setReturningId(borrow.id);
    try {
      await axios.put(
        `${API}/borrows/${borrow.id}/return`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBooks((prev) =>
        prev.map((item) =>
          item.id === borrow.id
            ? { ...item, status: 'returned', return_date: new Date().toISOString() }
            : item
        )
      );
      toast.success(`Returned "${borrow.book_title}"`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to return book');
    } finally {
      setReturningId('');
    }
  };

  const openMyBook = async (borrow, tab) => {
    navigate(`/books/${borrow.book_id}?source=my-books&tab=${tab}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-muted rounded w-1/3" />
          <div className="h-40 bg-muted rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="purchased-books-page">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Books</h1>
          <p className="text-muted-foreground mt-1">
            View the books you own and the ones you have borrowed from the library.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setSearchParams({ tab: value })}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="purchased">Purchased Books</TabsTrigger>
            <TabsTrigger value="borrowed">Borrowed Books</TabsTrigger>
          </TabsList>

          <TabsContent value="purchased" className="mt-6">
            {purchasedBooks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {purchasedBooks.map((book) => (
                    <Card
                      key={book.id}
                      className="cursor-pointer transition-transform hover:-translate-y-1"
                      onClick={() => openMyBook(book, 'purchased')}
                    >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold">{book.book_title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                Purchased on {new Date(book.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge className="capitalize">Bought</Badge>
                          </div>

                          <div className="mt-3">
                            <Badge variant="outline">
                              Owned
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <ShoppingBag className="w-5 h-5" /> No Purchased Books Yet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Books you buy from the store will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="borrowed" className="mt-6">
            {borrowedBooks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {borrowedBooks.map((book) => {
                  const canReturn = book.status !== 'returned';
                  return (
                    <Card
                      key={book.id}
                      className="cursor-pointer transition-transform hover:-translate-y-1"
                      onClick={() => openMyBook(book, 'borrowed')}
                    >
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-semibold">{book.book_title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Added on {new Date(book.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex flex-wrap justify-end gap-2">
                                <Badge variant="outline" className="capitalize">
                                  {book.borrow_type === 'borrow' ? 'Borrow Free' : book.borrow_type}
                                </Badge>
                                <Badge variant={book.status === 'returned' ? 'secondary' : 'default'} className="capitalize">
                                  {book.status}
                                </Badge>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                              {book.issue_date && (
                                <span>Issued: {new Date(book.issue_date).toLocaleDateString()}</span>
                              )}
                              {book.due_date && book.status !== 'returned' && (
                                <span>Due: {new Date(book.due_date).toLocaleDateString()}</span>
                              )}
                              {book.return_date && (
                                <span>Returned: {new Date(book.return_date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {canReturn && (
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              className="gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReturnBook(book);
                              }}
                              disabled={returningId === book.id}
                              data-testid={`return-borrow-btn-${book.id}`}
                            >
                              <RotateCcw className="w-4 h-4" />
                              {returningId === book.id ? 'Returning...' : 'Return Book'}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <BookOpen className="w-5 h-5" /> No Borrowed Books Yet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Books you borrow for free or rent will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PurchasedBooksPage;
