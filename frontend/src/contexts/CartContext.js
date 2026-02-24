import React, { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  const addToCart = useCallback((book) => {
    setItems(prev => {
      const exists = prev.find(item => item.id === book.id);
      if (exists) {
        return prev;
      }
      return [...prev, { ...book, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((bookId) => {
    setItems(prev => prev.filter(item => item.id !== bookId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [items]);

  const getItemCount = useCallback(() => {
    return items.length;
  }, [items]);

  const isInCart = useCallback((bookId) => {
    return items.some(item => item.id === bookId);
  }, [items]);

  const value = {
    items,
    addToCart,
    removeFromCart,
    clearCart,
    getTotal,
    getItemCount,
    isInCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;
