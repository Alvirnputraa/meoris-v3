"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { homepageSection2DealsDb } from '@/lib/database';

interface Deal {
  id: string;
  img: string;
  old: string;
  new: string;
  title: string;
  subtitle: string;
  produk_id: string;
  produk: any;
  discount_percentage?: number;
  discountPercentage?: number; // Alias untuk discount_percentage untuk kemudahan akses di JSX
}

interface DealsCacheContextType {
  deals: Deal[];
  loading: boolean;
  error: string | null;
  refreshDeals: () => Promise<void>;
  lastUpdated: number | null;
}

const DealsCacheContext = createContext<DealsCacheContextType | undefined>(undefined);

const CACHE_KEY = 'meoris_deals_cache';
const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 menit dalam milidetik

interface CachedData {
  deals: Deal[];
  timestamp: number;
}

export function DealsCacheProvider({ children }: { children: ReactNode }) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const loadDealsFromCache = (): Deal[] | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (!cachedData) return null;

      const parsed: CachedData = JSON.parse(cachedData);
      const now = Date.now();

      // Cek apakah cache masih valid
      if (now - parsed.timestamp < CACHE_EXPIRY_TIME) {
        return parsed.deals;
      }

      // Cache kadaluarsa, hapus dari localStorage
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (error) {
      console.error('Error loading deals from cache:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  };

  const saveDealsToCache = (dealsData: Deal[]) => {
    if (typeof window === 'undefined') return;

    try {
      const cacheData: CachedData = {
        deals: dealsData,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setLastUpdated(cacheData.timestamp);
    } catch (error) {
      console.error('Error saving deals to cache:', error);
    }
  };

  const fetchDealsFromDatabase = async (): Promise<Deal[]> => {
    try {
      const data = await homepageSection2DealsDb.getActive(10);
      
      // Transform data to match expected format
      const transformedDeals = data.map(deal => {
        // Calculate discount percentage if not provided
        let discountPercentage = deal.discount_percentage;
        if (!discountPercentage && deal.produk && 'harga' in deal.produk && deal.harga_diskon) {
          const originalPrice = Number(deal.produk.harga);
          const discountPrice = Number(deal.harga_diskon);
          discountPercentage = Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
        }
        
        return {
          id: deal.id,
          img: (deal.produk && 'photo1' in deal.produk ? deal.produk.photo1 : '/images/test1p.png') as string,
          old: deal.produk && 'harga' in deal.produk ? `Rp ${Number(deal.produk.harga).toLocaleString('id-ID')}` : 'Rp 0',
          new: deal.harga_diskon ? `Rp ${Number(deal.harga_diskon).toLocaleString('id-ID')}` : (deal.produk && 'harga' in deal.produk ? `Rp ${Number(deal.produk.harga).toLocaleString('id-ID')}` : 'Rp 0'),
          title: 'SPESIAL DISKON',
          subtitle: 'UNTUK KAMU',
          produk_id: deal.produk_id,
          produk: deal.produk,
          discount_percentage: discountPercentage,
          discountPercentage: discountPercentage // Alias untuk kemudahan akses
        };
      });

      return transformedDeals;
    } catch (error) {
      console.error('Error fetching deals from database:', error);
      // Return fallback data if database fails
      return [
        {
          id: 'fallback-1',
          img: '/images/test1p.png',
          old: 'Rp 499.000',
          new: 'Rp 299.000',
          title: 'SPESIAL DISKON',
          subtitle: 'UNTUK KAMU',
          produk_id: '',
          produk: null,
          discount_percentage: 40, // 499k -> 299k = 40% discount
          discountPercentage: 40 // Alias untuk kemudahan akses
        },
        {
          id: 'fallback-2',
          img: '/images/produktest_section2.png',
          old: 'Rp 459.000',
          new: 'Rp 289.000',
          title: 'SPESIAL DISKON',
          subtitle: 'UNTUK KAMU',
          produk_id: '',
          produk: null,
          discount_percentage: 37, // 459k -> 289k = ~37% discount
          discountPercentage: 37 // Alias untuk kemudahan akses
        }
      ];
    }
  };

  const loadDeals = async () => {
    setLoading(true);
    setError(null);

    try {
      // Coba ambil dari cache dulu
      const cachedDeals = loadDealsFromCache();
      
      if (cachedDeals) {
        setDeals(cachedDeals);
        setLoading(false);
        return;
      }

      // Jika tidak ada cache atau cache kadaluarsa, ambil dari database
      const dealsFromDb = await fetchDealsFromDatabase();
      setDeals(dealsFromDb);
      saveDealsToCache(dealsFromDb);
    } catch (error) {
      console.error('Error loading deals:', error);
      setError('Gagal memuat data deals');
    } finally {
      setLoading(false);
    }
  };

  const refreshDeals = async () => {
    try {
      setLoading(true);
      const dealsFromDb = await fetchDealsFromDatabase();
      setDeals(dealsFromDb);
      saveDealsToCache(dealsFromDb);
      setError(null);
    } catch (error) {
      console.error('Error refreshing deals:', error);
      setError('Gagal memperbarui data deals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeals();
  }, []);

  const value: DealsCacheContextType = {
    deals,
    loading,
    error,
    refreshDeals,
    lastUpdated
  };

  return (
    <DealsCacheContext.Provider value={value}>
      {children}
    </DealsCacheContext.Provider>
  );
}

export function useDealsCache() {
  const context = useContext(DealsCacheContext);
  if (context === undefined) {
    throw new Error('useDealsCache must be used within a DealsCacheProvider');
  }
  return context;
}