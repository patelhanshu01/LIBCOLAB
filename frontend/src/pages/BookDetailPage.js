import React, { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Download,
  ExternalLink,
  MapPin,
  ShoppingCart,
  Check,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BookDetailPage = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token } = useAuth();
  const { addToCart, isInCart } = useCart();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBook = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/books/${bookId}`);
        setBook(response.data);
      } catch (error) {
        console.error("Failed to fetch book:", error);
        toast.error("Failed to load book");
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [bookId]);

  const handleBorrow = async () => {
    if (!token) {
      toast.error("Please log in to borrow books");
      navigate("/login");
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

  const handleAddToCart = () => {
    addToCart(book);
    toast.success(`Added "${book.title}" to cart`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-40" />
          <div className="h-72 bg-muted rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!book) {
    return (
      <DashboardLayout>
        <Card className="text-center py-12">
          <CardContent>
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Book Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The book you are trying to open could not be found.
            </p>
            <Button onClick={() => navigate("/books")}>Back to Library</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const renderCoverImageUrl = (book) => {
    if (book.cover_image) return book.cover_image;

    const theme = book.category === "academic" ? "Academic" : "Leisure";
    const safeTitle = book.title.replace(/[-<>"&]/g, "").slice(0, 24);
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='600' height='800'>
        <defs>
          <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='#a855f7'/>
            <stop offset='100%' stop-color='#ec4899'/>
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

  const inCart = isInCart(book.id);
  const isAcademic = book.category === "academic";
  const coverImageUrl = renderCoverImageUrl(book);
  const source = searchParams.get("source") || "library";
  const myBooksTab = searchParams.get("tab") || "purchased";
  const libraryCategory =
    searchParams.get("category") || book.category || "academic";
  const isFromMyBooks = source === "my-books";
  const overviewText = book.overview || book.description || "";
  const contentSections = (book.content || "")
    .split("\n\n")
    .map((section) => section.trim())
    .filter(Boolean);
  const backLink = isFromMyBooks
    ? `/purchased-books?tab=${myBooksTab}`
    : `/books?category=${libraryCategory}`;
  const backLabel = isFromMyBooks ? "Back to My Books" : "Back to Library";

  const page = (
    <div className="space-y-6" data-testid="book-detail-page">
      <Link
        to={backLink}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </Link>

      <Card className="overflow-hidden">
        <div className="relative aspect-[3/4] bg-black/5">
          <img
            src={coverImageUrl}
            alt={book.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <p className="text-xs uppercase tracking-wider">Cover Page</p>
            <h2 className="text-3xl font-bold leading-tight">{book.title}</h2>
            <p className="text-sm mt-1 opacity-90">by {book.author}</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <Card className="overflow-hidden">
          <div className="aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <img
              src={coverImageUrl}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge
                      className={
                        isAcademic ? "academic-badge" : "leisure-badge"
                      }
                    >
                      {isAcademic ? "Academic" : "Leisure"}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {book.pricing_type === "free"
                        ? "Free"
                        : book.pricing_type}
                    </Badge>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {book.title}
                  </h1>
                  <p className="text-lg text-muted-foreground mt-2">
                    {book.author}
                  </p>
                </div>
                {!isAcademic && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ${book.price?.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-muted-foreground">{book.description}</p>

              {book.grade_levels?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {book.grade_levels.map((grade) => (
                    <Badge key={grade} variant="outline">
                      Grade {grade}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {(book.format === "digital" || book.format === "both") && (
                  <span className="inline-flex items-center gap-1">
                    <Download className="w-4 h-4" /> Digital Access
                  </span>
                )}
                {(book.format === "physical" || book.format === "both") && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-4 h-4" />{" "}
                    {book.shelf_location || "Physical Copy"}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {isAcademic ? (
                  <Button className="academic-button" onClick={handleBorrow}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Borrow Free
                  </Button>
                ) : (
                  <Button
                    className={
                      inCart
                        ? "bg-green-600 hover:bg-green-700"
                        : "leisure-button"
                    }
                    onClick={() => !inCart && handleAddToCart()}
                    disabled={inCart}
                  >
                    {inCart ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        In Cart
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {book.pricing_type === "rent" ? "Rent" : "Buy"}
                      </>
                    )}
                  </Button>
                )}

                {book.file_url && (
                  <Button variant="outline" asChild>
                    <a href={book.file_url} target="_blank" rel="noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      Open File
                    </a>
                  </Button>
                )}

                {book.external_link && (
                  <Button variant="outline" asChild>
                    <a
                      href={book.external_link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      External Link
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Book Overview</h2>
              {overviewText ? (
                <div className="space-y-4 text-sm leading-7 text-foreground/90 whitespace-pre-line">
                  {overviewText}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No overview is available for this book yet.
                </p>
              )}
            </CardContent>
          </Card>

          {isFromMyBooks ? (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Book Content</h2>
                {contentSections.length > 0 ? (
                  <div className="space-y-4 text-sm leading-7 text-foreground/90">
                    {contentSections.map((section, index) => (
                      <div key={index} className="whitespace-pre-line">
                        {section}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No book content is available for this book yet.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Reading Access</h2>
                <p className="text-sm leading-7 text-muted-foreground">
                  The library view shows the overview only. Add this book to `My
                  Books` or borrow it to read the full in-app content.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );

  if (user) {
    return <DashboardLayout>{page}</DashboardLayout>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-10 pb-12 px-6 max-w-7xl mx-auto">{page}</div>
    </div>
  );
};

export default BookDetailPage;
