'use client';

import { useState, useEffect, useCallback } from 'react';
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

  // Get current user
  const currentUser = auth.getCurrentUser();

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
      setFavorites(favoritesData);

      if (options?.emit && typeof window !== 'undefined') {
        const event = new CustomEvent<FavoritesEventDetail>(FAVORITES_EVENT, {
          detail: { userId: currentUser.id, favorites: favoritesData, error: null }
        });
        window.dispatchEvent(event);
      }

      return favoritesData;
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
    loadFavorites();
  }, [loadFavorites]);

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
    count: favorites.length,
  };
}
