'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { auth } from './auth';

export interface FavoriteItem {
  id: string;
  user_id: string;
  produk_id: string;
  created_at: string;
  produk?: {
    id: string;
    nama_produk: string;
    photo1?: string;
    harga?: number;
  };
}

interface FavoriteOperationResult {
  success: boolean;
  message?: string;
}

type FavoriteToggleAction = 'added' | 'removed';

type FavoriteToggleResult = FavoriteOperationResult & {
  action: FavoriteToggleAction;
};

const FAVORITES_EVENT = 'favorites:updated';

interface FavoritesEventDetail {
  userId?: string;
  favorites?: FavoriteItem[];
  error?: string | null;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const deletingFavoritesRef = useRef<Set<string>>(new Set());
  const lastOptimisticUpdateRef = useRef<number>(0);

  // Get current user
  const currentUser = auth.getCurrentUser();

  // Sync count with favorites length
  useEffect(() => {
    setCount(favorites.length);
    // Update localStorage cache
    if (currentUser) {
      try {
        localStorage.setItem(`favorites_count_${currentUser.id}`, String(favorites.length));
      } catch {}
    }
  }, [favorites, currentUser]);

  // Load favorites
  const loadFavorites = useCallback(async (options?: { emit?: boolean }) => {
    if (!currentUser) {
      setFavorites([]);
      if (options?.emit && typeof window !== 'undefined') {
        const event = new CustomEvent<FavoritesEventDetail>(FAVORITES_EVENT, {
          detail: { userId: undefined, favorites: [] }
        });
        window.dispatchEvent(event);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/favorit?userId=${currentUser.id}`);
      if (!response.ok) {
        throw new Error('Failed to load favorites');
      }
      const data = await response.json();
      const favoritesData: FavoriteItem[] = data.favorites || [];

      // Filter out items that are currently being deleted
      const filteredData = favoritesData.filter(fav => !deletingFavoritesRef.current.has(fav.id));
      setFavorites(filteredData);

      if (options?.emit && typeof window !== 'undefined') {
        const event = new CustomEvent<FavoritesEventDetail>(FAVORITES_EVENT, {
          detail: { userId: currentUser.id, favorites: filteredData, error: null }
        });
        window.dispatchEvent(event);
      }

      return filteredData;
    } catch (err: any) {
      setError(err.message);
      setFavorites([]);
      if (options?.emit && typeof window !== 'undefined') {
        const event = new CustomEvent<FavoritesEventDetail>(FAVORITES_EVENT, {
          detail: { userId: currentUser.id, favorites: [], error: err.message }
        });
        window.dispatchEvent(event);
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  // Add to favorites
  const addToFavorites = async (produkId: string): Promise<FavoriteOperationResult> => {
    if (!currentUser) {
      const message = 'Please login to add favorites';
      setError(message);
      return { success: false, message };
    }

    try {
      const response = await fetch('/api/favorit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser.id,
          produkId: produkId,
        }),
      });

      if (!response.ok) {
        let message = 'Failed to add to favorites';
        try {
          const data = await response.json();
          if (data?.error) {
            message = data.error;
          }
        } catch {}
        setError(message);
        return { success: false, message };
      }

      // Reload favorites
      await loadFavorites({ emit: true });
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, message: err.message };
    }
  };

  // Remove from favorites
  const removeFromFavorites = async (favoriteId: string): Promise<FavoriteOperationResult> => {
    if (!currentUser) {
      const message = 'Please login to manage favorites';
      setError(message);
      return { success: false, message };
    }

    try {
      const response = await fetch('/api/favorit', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          favoriteId: favoriteId,
          userId: currentUser.id,
        }),
      });

      if (!response.ok) {
        let message = 'Failed to remove from favorites';
        try {
          const data = await response.json();
          if (data?.error) {
            message = data.error;
          }
        } catch {}
        setError(message);
        return { success: false, message };
      }

      // Reload favorites
      await loadFavorites({ emit: true });
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, message: err.message };
    }
  };

  // Check if product is in favorites
  const isFavorite = (produkId: string) => {
    return favorites.some(fav => fav.produk_id === produkId);
  };

  // Get favorite item by product ID
  const getFavoriteItem = (produkId: string) => {
    return favorites.find(fav => fav.produk_id === produkId);
  };

  // Toggle favorite status
  const toggleFavorite = async (produkId: string): Promise<FavoriteToggleResult> => {
    const favoriteItem = getFavoriteItem(produkId);
    const action: FavoriteToggleAction = favoriteItem ? 'removed' : 'added';
    const result = favoriteItem
      ? await removeFromFavorites(favoriteItem.id)
      : await addToFavorites(produkId);
    
    return { ...result, action };
  };

  // Load favorites on mount and when user changes
  useEffect(() => {
    // Seed count from cache to avoid 0 flash on refresh
    if (currentUser) {
      try {
        const cached = localStorage.getItem(`favorites_count_${currentUser.id}`);
        if (cached !== null) setCount(Number(cached) || 0);
      } catch {}
    } else {
      setCount(0);
    }
    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Listen for external favorites updates (e.g., from other components)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<FavoritesEventDetail>).detail;
      if (!detail) return;

      // If event is for a specific user, ensure it matches current user
      if (detail.userId && currentUser?.id && detail.userId !== currentUser.id) {
        return;
      }

      if (Array.isArray(detail.favorites)) {
        setFavorites(detail.favorites);
      }
      if (typeof detail.error !== 'undefined') {
        setError(detail.error || null);
      }
    };

    window.addEventListener(FAVORITES_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, handler as EventListener);
    };
  }, [currentUser?.id]);

  // Listen for favorites count updates from other useFavorites instances (cross-component sync)
  useEffect(() => {
    if (!currentUser) return;

    const handleCountUpdate = (event: CustomEvent) => {
      const { count: newCount, userId } = event.detail;
      if (userId === currentUser.id) {
        setCount(newCount);
        lastOptimisticUpdateRef.current = Date.now();
      }
    };

    window.addEventListener('favorites-count-update', handleCountUpdate as EventListener);
    return () => window.removeEventListener('favorites-count-update', handleCountUpdate as EventListener);
  }, [currentUser]);

  // Listen for localStorage changes from OTHER TABS (cross-tab sync)
  useEffect(() => {
    if (!currentUser) return;

    const handleStorageChange = (event: StorageEvent) => {
      // Only react to favorites count changes for this user
      if (event.key === `favorites_count_${currentUser.id}` && event.newValue !== null) {
        const newCount = Number(event.newValue) || 0;
        setCount(newCount);
        lastOptimisticUpdateRef.current = Date.now();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUser]);

  // Optimistic remove favorite (for smooth UI with animation)
  const removeFavorite = useCallback(async (favoriteId: string) => {
    if (!currentUser) return;

    // Store original item for rollback on error
    const originalItem = favorites.find(fav => fav.id === favoriteId);

    // Optimistic update: Remove from UI immediately
    const newCount = Math.max(0, count - 1);
    const newFavorites = favorites.filter(fav => fav.id !== favoriteId);
    setFavorites(newFavorites);
    setCount(newCount);

    // Track when optimistic update happened
    lastOptimisticUpdateRef.current = Date.now();

    // Track as deleting to prevent external updates from adding it back
    deletingFavoritesRef.current.add(favoriteId);

    // Update localStorage cache immediately
    try {
      localStorage.setItem(`favorites_count_${currentUser.id}`, String(newCount));
    } catch {}

    // Dispatch custom event to sync all useFavorites instances
    window.dispatchEvent(new CustomEvent('favorites-count-update', { detail: { count: newCount, userId: currentUser.id } }));

    // IMPORTANT: Also emit FAVORITES_EVENT to sync with other components (e.g., Section 5)
    if (typeof window !== 'undefined') {
      const event = new CustomEvent<FavoritesEventDetail>(FAVORITES_EVENT, {
        detail: { userId: currentUser.id, favorites: newFavorites, error: null }
      });
      window.dispatchEvent(event);
    }

    try {
      // Delete from database in background
      const response = await fetch('/api/favorit', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          favoriteId: favoriteId,
          userId: currentUser.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove favorite');
      }

      // Keep in deletingFavoritesRef for a bit longer to prevent flicker
      await new Promise(resolve => setTimeout(resolve, 400));
    } catch (error) {
      console.error('Failed to remove favorite:', error);

      // Rollback on error: restore the item
      if (originalItem) {
        const rollbackCount = count;
        const rollbackFavorites = [...favorites, originalItem];
        setFavorites(rollbackFavorites);
        setCount(rollbackCount);
        // Rollback localStorage cache
        try {
          localStorage.setItem(`favorites_count_${currentUser.id}`, String(rollbackCount));
        } catch {}
        // Sync rollback to all instances
        window.dispatchEvent(new CustomEvent('favorites-count-update', { detail: { count: rollbackCount, userId: currentUser.id } }));
        // Emit rollback to FAVORITES_EVENT listeners
        if (typeof window !== 'undefined') {
          const event = new CustomEvent<FavoritesEventDetail>(FAVORITES_EVENT, {
            detail: { userId: currentUser.id, favorites: rollbackFavorites, error: null }
          });
          window.dispatchEvent(event);
        }
      }
    } finally {
      // Clean up after animation is complete
      deletingFavoritesRef.current.delete(favoriteId);
    }
  }, [currentUser, favorites, count]);

  // Synchronous optimistic count increment (for immediate UI feedback)
  const incrementCount = useCallback(() => {
    if (!currentUser) return;
    const newCount = count + 1;
    setCount(newCount);
    lastOptimisticUpdateRef.current = Date.now();
    try {
      localStorage.setItem(`favorites_count_${currentUser.id}`, String(newCount));
    } catch {}
    // Dispatch custom event to sync all useFavorites instances
    window.dispatchEvent(new CustomEvent('favorites-count-update', { detail: { count: newCount, userId: currentUser.id } }));
  }, [currentUser, count]);

  // Synchronous optimistic count decrement (for immediate UI feedback)
  const decrementCount = useCallback(() => {
    if (!currentUser) return;
    const newCount = Math.max(0, count - 1);
    setCount(newCount);
    lastOptimisticUpdateRef.current = Date.now();
    try {
      localStorage.setItem(`favorites_count_${currentUser.id}`, String(newCount));
    } catch {}
    // Dispatch custom event to sync all useFavorites instances
    window.dispatchEvent(new CustomEvent('favorites-count-update', { detail: { count: newCount, userId: currentUser.id } }));
  }, [currentUser, count]);

  return {
    favorites,
    loading,
    error,
    loadFavorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    getFavoriteItem,
    toggleFavorite,
    removeFavorite,
    count,
    incrementCount,
    decrementCount,
  };
}
