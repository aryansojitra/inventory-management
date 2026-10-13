import React, { createContext, useContext, useState } from 'react';
import { Student, InventoryItem, IndividualAsset } from '../types';

export interface CartItem {
  item: InventoryItem;
  quantity: number;
  asset?: IndividualAsset;
}

interface CartContextType {
  selectedStudent: Student | null;
  setSelectedStudent: (student: Student | null) => void;
  cartItems: CartItem[];
  addItem: (item: InventoryItem, quantity?: number, asset?: IndividualAsset) => void;
  removeItem: (itemId: string, assetId?: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalCartQuantity: number;
  remainingAllowedQuantity: number;
  canAddMore: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const totalCartQuantity = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);

  const maxLimit = selectedStudent ? selectedStudent.maxBorrowLimit : 5;
  const currentBorrowed = selectedStudent ? selectedStudent.currentBorrowedCount : 0;
  const remainingAllowedQuantity = Math.max(0, maxLimit - currentBorrowed - totalCartQuantity);
  const canAddMore = remainingAllowedQuantity > 0;

  const addItem = (item: InventoryItem, quantity = 1, asset?: IndividualAsset) => {
    setCartItems((prev) => {
      // If individual asset, check if already in cart
      if (asset) {
        if (prev.some((ci) => ci.asset?._id === asset._id)) {
          return prev;
        }
        return [...prev, { item, quantity: 1, asset }];
      }

      // Quantity item
      const existing = prev.find((ci) => ci.item._id === item._id && !ci.asset);
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > item.availableQuantity) return prev;
        return prev.map((ci) =>
          ci.item._id === item._id && !ci.asset ? { ...ci, quantity: newQty } : ci
        );
      }
      return [...prev, { item, quantity, asset }];
    });
  };

  const removeItem = (itemId: string, assetId?: string) => {
    setCartItems((prev) =>
      prev.filter((ci) => {
        if (assetId) return ci.asset?._id !== assetId;
        return ci.item._id !== itemId || !!ci.asset;
      })
    );
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((ci) => {
        if (ci.item._id === itemId && !ci.asset) {
          const clamped = Math.min(quantity, ci.item.availableQuantity);
          return { ...ci, quantity: clamped };
        }
        return ci;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedStudent(null);
  };

  return (
    <CartContext.Provider
      value={{
        selectedStudent,
        setSelectedStudent,
        cartItems,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalCartQuantity,
        remainingAllowedQuantity,
        canAddMore,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
