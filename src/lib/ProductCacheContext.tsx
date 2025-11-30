"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { produkDb, homepageSection2DealsDb } from './database';
import type { Produk } from './supabase';

interface ProductWithDiscount extends Produk {
  discountPercentage?: number;
}

interface ProductCacheContextType {
  products: ProductWithDiscount[];
  loading: boolean;
  error: string | null;
  getProductById: (id: string) => ProductWithDiscount | null;
  refreshCache: () => Promise<void>;
  prefetchAll: () => Promise<void>;
  isCacheReady: boolean;
}

const ProductCacheContext = createContext<ProductCacheContextType | undefined>(undefined);

const CACHE_KEY = 'meoris_products_cache';
const CACHE_TIMESTAMP_KEY = 'meoris_products_cache_timestamp';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

interface CacheData {
  products: ProductWithDiscount[];
  timestamp: number;
}

export function ProductCacheProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<ProductWithDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCacheReady, setIsCacheReady] = useState(false);

  // Load from localStorage
  const loadFromStorage = useCallback((): CacheData | null => {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (!cached || !timestamp) return null;

      const cacheAge = Date.now() - parseInt(timestamp, 10);

      // Check if cache is still valid
      if (cacheAge > CACHE_DURATION) {
        console.log('[ProductCache] Cache expired, clearing...');
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        return null;
      }

      const data = JSON.parse(cached);
      console.log('[ProductCache] Loaded from localStorage:', data.length, 'products');
      return { products: data, timestamp: parseInt(timestamp, 10) };
    } catch (err) {
      console.error('[ProductCache] Error loading from storage:', err);
      return null;
    }
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback((data: Produk[]) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('[ProductCache] Saved to localStorage:', data.length, 'products');
    } catch (err) {
      console.error('[ProductCache] Error saving to storage:', err);
    }
  }, []);

  // Fetch all products from database with discount info
  const fetchAllProducts = useCallback(async (): Promise<ProductWithDiscount[]> => {
    try {
      console.log('[ProductCache] Fetching all products from database...');
      const products = await produkDb.getAll(100, 0); // Get up to 100 products
      console.log('[ProductCache] Fetched', products.length, 'products');
      
      // Get all active deals
      const deals = await homepageSection2DealsDb.getActive(100);
      console.log('[ProductCache] Fetched', deals.length, 'deals');
      
      // Create a map of product_id to discount percentage for quick lookup
      const discountMap = new Map<string, number>();
      deals.forEach(deal => {
        if (deal.discount_percentage) {
          discountMap.set(deal.produk_id, deal.discount_percentage);
        }
      });
      
      // Add discount percentage to each product
      const productsWithDiscount = products.map(product => ({
        ...product,
        discountPercentage: discountMap.get(product.id)
      }));
      
      return productsWithDiscount;
    } catch (err) {
      console.error('[ProductCache] Error fetching products:', err);
      throw err;
    }
  }, []);

  // Prefetch all products (main function)
  const prefetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAllProducts();
      setProducts(data);
      saveToStorage(data);
      setIsCacheReady(true);
    } catch (err) {
      setError('Failed to load products');
      console.error('[ProductCache] Prefetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchAllProducts, saveToStorage]);

  // Refresh cache (force refetch)
  const refreshCache = useCallback(async () => {
    console.log('[ProductCache] Refreshing cache...');
    await prefetchAll();
  }, [prefetchAll]);

  // Get product by ID from cache (instant!)
  const getProductById = useCallback((id: string): ProductWithDiscount | null => {
    const product = products.find(p => p.id === id) || null;
    if (product) {
      console.log('[ProductCache] Cache HIT for product:', id);
    } else {
      console.log('[ProductCache] Cache MISS for product:', id);
    }
    return product;
  }, [products]);

  // Initialize cache on mount
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      // Try to load from localStorage first
      const cached = loadFromStorage();

      if (cached && cached.products.length > 0) {
        console.log('[ProductCache] Using cached data');
        setProducts(cached.products);
        setIsCacheReady(true);
        setLoading(false);

        // Background refresh if cache is older than 5 minutes
        const cacheAge = Date.now() - cached.timestamp;
        if (cacheAge > 5 * 60 * 1000) {
          console.log('[ProductCache] Cache is stale, refreshing in background...');
          setTimeout(() => {
            if (!cancelled) {
              prefetchAll().catch(console.error);
            }
          }, 1000); // Delay 1 second to not block UI
        }
      } else {
        // No cache, fetch fresh data
        console.log('[ProductCache] No cache found, fetching fresh data...');
        if (!cancelled) {
          await prefetchAll();
        }
      }
    };

    initialize();

    return () => {
      cancelled = true;
    };
  }, [loadFromStorage, prefetchAll]);

  // Auto-refresh every 15 minutes when tab is active
  useEffect(() => {
    if (!isCacheReady) return;

    const interval = setInterval(() => {
      console.log('[ProductCache] Auto-refresh triggered');
      refreshCache();
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [isCacheReady, refreshCache]);

  const value: ProductCacheContextType = {
    products,
    loading,
    error,
    getProductById,
    refreshCache,
    prefetchAll,
    isCacheReady,
  };

  return (
    <ProductCacheContext.Provider value={value}>
      {children}
    </ProductCacheContext.Provider>
  );
}

export function useProductCache() {
  const context = useContext(ProductCacheContext);
  if (context === undefined) {
    throw new Error('useProductCache must be used within a ProductCacheProvider');
  }
  return context;
}
