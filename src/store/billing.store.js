/**
 * Zustand Store for Billing State Management
 * Manages draft invoice, items, totals, payment modes
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useBillingStore = create(
  persist(
    (set, get) => ({
      // State
      draftBill: null,
      items: [],
      totals: {
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        roundOff: 0,
        grandTotal: 0,
      },
      selectedCustomer: null,
      paymentMode: 'cash',
      isLoading: false,
      error: null,

      // Actions
      addItem: (item) => {
        set((state) => {
          const newItems = [...state.items, { ...item, id: Date.now() }];
          const newTotals = calculateTotals(newItems);
          return { items: newItems, totals: newTotals };
        });
      },

      removeItem: (itemId) => {
        set((state) => {
          const newItems = state.items.filter(item => item.id !== itemId);
          const newTotals = calculateTotals(newItems);
          return { items: newItems, totals: newTotals };
        });
      },

      updateItem: (itemId, updates) => {
        set((state) => {
          const newItems = state.items.map(item =>
            item.id === itemId ? { ...item, ...updates } : item
          );
          const newTotals = calculateTotals(newItems);
          return { items: newItems, totals: newTotals };
        });
      },

      setCustomer: (customer) => {
        set({ selectedCustomer: customer });
      },

      setPaymentMode: (mode) => {
        set({ paymentMode: mode });
      },

      setIsLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      clearBill: () => {
        set({
          draftBill: null,
          items: [],
          totals: {
            subtotal: 0,
            discountTotal: 0,
            taxTotal: 0,
            roundOff: 0,
            grandTotal: 0,
          },
          selectedCustomer: null,
          paymentMode: 'cash',
          error: null,
        });
      },

      getItemCount: () => get().items.length,
      getGrandTotal: () => get().totals.grandTotal,
    }),
    {
      name: 'billing-store',
      partialize: (state) => ({
        items: state.items,
        totals: state.totals,
        selectedCustomer: state.selectedCustomer,
        paymentMode: state.paymentMode,
      }),
    }
  )
);

/**
 * Calculate bill totals from items
 */
function calculateTotals(items) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;

  items.forEach(item => {
    const itemSubtotal = item.quantity * item.price;
    const discount = itemSubtotal * (item.discountPercent || 0) / 100;
    const afterDiscount = itemSubtotal - discount;
    const tax = afterDiscount * (item.taxRate || 0) / 100;

    subtotal += itemSubtotal;
    discountTotal += discount;
    taxTotal += tax;
  });

  const grandTotal = subtotal - discountTotal + taxTotal;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    roundOff: 0,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}
