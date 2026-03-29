import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  BookOpen,
  Download,
  MapPin,
  ShoppingCart,
  Check,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BooksPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, token } = useAuth();
  const { addToCart, isInCart } = useCart();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const navigate = useNavigate();
  const isGuest = user?.role === "guest";

  const category = isGuest
    ? "leisure"
    : searchParams.get("category") || "academic";

  useEffect(() => {
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("category", category);
        if (search) params.append("search", search);
        if (gradeFilter !== "all") params.append("grade", gradeFilter);

        const response = await axios.get(`${API}/books?${params.toString()}`);
        setBooks(response.data);
      } catch (error) {
        console.error("Failed to fetch books:", error);
        toast.error("Failed to load books");
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [category, search, gradeFilter]);

  const handleBorrow = async (book) => {
    if (!token) {
      toast.error("Please log in to borrow books");
      return;
    }

    try {
      await axios.post(
        `${API}/borrows`,
        { book_id: book.id, borrow_type: "borrow" },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(`Borrow request submitted for "${book.title}"`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to borrow book");
    }
  };

  const handleAddToCart = (book) => {
    addToCart(book);
    toast.success(`Added "${book.title}" to cart`);
  };

  const filteredBooks = books.filter((book) => {
    if (subjectFilter !== "all" && !book.subjects.includes(subjectFilter))
      return false;
    return true;
  });

  const subjects = [...new Set(books.flatMap((b) => b.subjects))];

  const renderCoverImageUrl = (book) => {
    if (book.cover_image) return book.cover_image;

    const theme = book.category === "academic" ? "Academic" : "Leisure";
    const safeTitle = book.title.replace(/[-<>"&]/g, "").slice(0, 24);
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='600' height='800'>
        <defs>
          <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='#3b82f6'/>
            <stop offset='100%' stop-color='#06b6d4'/>
          </linearGradient>
        </defs>
        <rect width='600' height='800' fill='url(#g)' />
        <rect x='24' y='24' width='552' height='752' rx='16' ry='16' fill='rgba(255,255,255,0.12)' />
        <text x='50%' y='45%' fill='white' font-family='Inter, system-ui, sans-serif' font-size='36' text-anchor='middle'>${theme} Book</text>
        <text x='50%' y='55%' fill='white' font-family='Inter, system-ui, sans-serif' font-size='26' text-anchor='middle'>${safeTitle}</text>
        <text x='50%' y='68%' fill='rgba(255,255,255,0.85)' font-family='Inter, system-ui, sans-serif' font-size='18' text-anchor='middle'>Cover Page</text>
      </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  const BookCard = ({ book }) => {
    const inCart = isInCart(book.id);
    const isAcademic = book.category === "academic";
    const coverImageUrl = renderCoverImageUrl(book);

    return (
      <Card
        className="book-card h-full overflow-hidden group cursor-pointer transition-transform hover:-translate-y-1"
        data-testid={`book-card-${book.id}`}
        onClick={() =>
          navigate(`/books/${book.id}?source=library&category=${book.category}`)
        }
      >
        <div className="aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
          <img
            src={coverImageUrl}
            alt={book.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-black/40 text-white text-[10px] uppercase tracking-wider text-center py-1">
            Cover Page
          </div>
          <div className="absolute top-3 left-3">
            <Badge className={isAcademic ? "academic-badge" : "leisure-badge"}>
              {isAcademic ? "Academic" : "Leisure"}
            </Badge>
          </div>
          {book.pricing_type === "free" && (
            <div className="absolute top-3 right-3">
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-700"
              >
                Free
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">{book.author}</p>

          {book.grade_levels?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {book.grade_levels.map((grade) => (
                <Badge key={grade} variant="outline" className="text-xs">
                  Grade {grade}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
            {book.format === "digital" || book.format === "both" ? (
              <span className="flex items-center gap-1">
                <Download className="w-3 h-3" /> Digital
              </span>
            ) : null}
            {book.format === "physical" || book.format === "both" ? (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />{" "}
                {book.shelf_location || "Physical"}
              </span>
            ) : null}
          </div>

          {isAcademic ? (
            <Button
              className="w-full academic-button"
              onClick={(e) => {
                e.stopPropagation();
                handleBorrow(book);
              }}
              data-testid={`borrow-btn-${book.id}`}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Borrow Free
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-orange-600">
                  ${book.price?.toFixed(2)}
                </span>
                <Badge variant="outline" className="text-xs capitalize">
                  {book.pricing_type}
                </Badge>
              </div>
              <Button
                className={
                  inCart
                    ? "w-full bg-green-600 hover:bg-green-700"
                    : "w-full leisure-button"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  if (!inCart) handleAddToCart(book);
                }}
                disabled={inCart}
                data-testid={`add-cart-btn-${book.id}`}
              >
                {inCart ? (
                  <>
                    <Check className="w-4 h-4 mr-2" /> In Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {book.pricing_type === "rent" ? "Rent" : "Buy"}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const content = (
    <div className="space-y-6" data-testid="books-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Library</h1>
        <p className="text-muted-foreground mt-1">
          {category === "academic"
            ? "Free academic resources for partner school students"
            : "Explore our leisure collection - rent or buy your favorites"}
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={category}
        onValueChange={(val) => setSearchParams({ category: val })}
      >
        {!isGuest && (
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger
              value="academic"
              className="gap-2"
              data-testid="academic-tab"
            >
              <BookOpen className="w-4 h-4" />
              Academic (Free)
            </TabsTrigger>
            <TabsTrigger
              value="leisure"
              className="gap-2"
              data-testid="leisure-tab"
            >
              <ShoppingCart className="w-4 h-4" />
              Leisure (Paid)
            </TabsTrigger>
          </TabsList>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger
              className="w-full sm:w-40"
              data-testid="grade-filter"
            >
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades</SelectItem>
              {[8, 9, 10, 11, 12].map((g) => (
                <SelectItem key={g} value={g.toString()}>
                  Grade {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subjects.length > 0 && (
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger
                className="w-full sm:w-40"
                data-testid="subject-filter"
              >
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {!isGuest && (
          <TabsContent value="academic" className="mt-6">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[3/4] bg-muted rounded-xl mb-3" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredBooks.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6 max-w-[1200px] mx-auto">
                {filteredBooks.map((book, index) => (
                  <div
                    key={book.id}
                    className={`animate-fadeInUp stagger-${(index % 5) + 1}`}
                  >
                    <BookCard book={book} />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Books Found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your filters or search terms
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        <TabsContent value="leisure" className="mt-6">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6 max-w-[1200px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[3/4] bg-muted rounded-xl mb-3" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredBooks.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6 max-w-[1200px] mx-auto">
              {filteredBooks.map((book, index) => (
                <div
                  key={book.id}
                  className={`animate-fadeInUp stagger-${(index % 5) + 1}`}
                >
                  <BookCard book={book} />
                </div>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Books Found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or search terms
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  // If user is logged in, show with dashboard layout
  if (user) {
    return <DashboardLayout>{content}</DashboardLayout>;
  }

  // Public view without dashboard
  return (
    <div className="min-h-screen bg-background">
      <nav className="glass-header fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">LibCollab</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link to="/register">
              <Button className="rounded-full px-6">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>
      <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto">{content}</div>
    </div>
  );
};

export default BooksPage;
