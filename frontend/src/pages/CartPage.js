import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, ArrowLeft, CreditCard, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import DashboardLayout from '../components/DashboardLayout';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CartPage = () => {
  const { items, removeFromCart, clearCart, getTotal } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = React.useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setProcessing(true);
    try {
      // Process mock payment for each item
      for (const item of items) {
        await axios.post(
          `${API}/payments`,
          {
            item_type: 'book',
            item_id: item.id,
            amount: item.price,
            payment_method: 'mock_card'
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Create borrow record for the purchase/rental
        await axios.post(
          `${API}/borrows`,
          { book_id: item.id, borrow_type: item.pricing_type },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      clearCart();
      toast.success('Purchase complete! Check your borrowed books.');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Checkout failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const total = getTotal();

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="cart-page">
        <Link to="/books?category=leisure" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Continue Shopping
        </Link>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Cart</h1>
          <p className="text-muted-foreground mt-1">
            Review your leisure book selections
          </p>
        </div>

        {items.length > 0 ? (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.id} data-testid={`cart-item-${item.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-28 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        {item.cover_image ? (
                          <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <BookOpen className="w-8 h-8 text-orange-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.author}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="capitalize">{item.pricing_type}</Badge>
                          <Badge className="leisure-badge capitalize">{item.format}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">${item.price?.toFixed(2)}</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive mt-2"
                          onClick={() => removeFromCart(item.id)}
                          data-testid={`remove-item-${item.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="truncate flex-1 mr-2">{item.title}</span>
                        <span>${item.price?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-orange-600">${total.toFixed(2)}</span>
                  </div>
                  <Button 
                    className="w-full leisure-button gap-2" 
                    size="lg"
                    onClick={handleCheckout}
                    disabled={processing}
                    data-testid="checkout-btn"
                  >
                    {processing ? (
                      'Processing...'
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Checkout (Mock)
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    This is a mock checkout. No real payment will be processed.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Your Cart is Empty</h3>
              <p className="text-muted-foreground mb-6">
                Browse our leisure collection and add some books!
              </p>
              <Link to="/books?category=leisure">
                <Button className="leisure-button" data-testid="browse-leisure-btn">
                  Browse Leisure Books
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CartPage;
