'use client';
import { create } from 'zustand';
import type { Listing } from '@/types';

type S = {
  listings: Listing[];
  setListings: (rows: Listing[]) => void;
  clear: () => void;
};

export const useListingsStore = create<S>((set) => ({
  listings: [],
  setListings: (rows) => set({ listings: rows }),
  clear: () => set({ listings: [] }),
}));


