"use client";
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, Suspense, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useAuth } from '@/lib/auth-context'
import { praCheckoutDb, checkoutSubmissionDb, userDb, ongkirDb, produkDb, keranjangDb } from '@/lib/database'
import { useSearchParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import FloatingChat from '@/components/FloatingChat'
import { useCart } from '@/lib/useCart'
import { useFavorites } from '@/lib/useFavorites'
import { supabase } from '@/lib/supabase'
import { useChatContext } from '@/lib/chat-context'

function CheckoutContent() {
  const { user, isLoading, logout } = useAuth()
  const { count: cartCount, items: cartItems, loading: cartLoading, removeItem: removeCartItem } = useCart()
  const { count: favoritesCount, favorites, loading: favoritesLoading, toggleFavorite, removeFavorite } = useFavorites()
  const { openChat } = useChatContext()
  const formRef = useRef<HTMLFormElement | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  // Support both short_id (new) and pra_checkout_id (legacy for backward compatibility)
  const checkoutId = searchParams?.get('id') || searchParams?.get('pra_checkout_id')
  const [praCheckoutData, setPraCheckoutData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('QRIS')
  const [paymentChannels, setPaymentChannels] = useState<any[]>([])
  const [selectedShipping, setSelectedShipping] = useState<string>('J&T Express')
  const [ongkirAmount, setOngkirAmount] = useState<number>(0)
  const [ongkirLoading, setOngkirLoading] = useState(false)
  const [ongkirOptions, setOngkirOptions] = useState<Record<string, { price: number; duration: string }>>({})
  const [ongkirFetched, setOngkirFetched] = useState(false)
  const [addressLoading, setAddressLoading] = useState(true)
  // Toast state for notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [toastShow, setToastShow] = useState(false)
  // Modal state for address warning
  const [showAddressModal, setShowAddressModal] = useState(false)
  const channelLogos: Record<string, string> = {
    QRIS: '/images/QRIS.png',
    BRIVA: '/images/BRI.png',
    BNIVA: '/images/BNI.png',
    MANDIRIVA: '/images/MANDIRI.png',
    MANDIRI: '/images/MANDIRI.png'
  }

  // Avoid hydration mismatch: render only after client mounted
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Top bar and language dropdown states
  const [showTopBar, setShowTopBar] = useState(true)
  const [showLangDropdown, setShowLangDropdown] = useState(false)
  const [selectedLang, setSelectedLang] = useState('Indonesia')

  // Dropdown states for new simple design
  const [isPaymentDropdownOpen, setIsPaymentDropdownOpen] = useState(false)
  const [isSubtotalDropdownOpen, setIsSubtotalDropdownOpen] = useState(true)

  // Sidebar states for mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [cartSidebarLoading, setCartSidebarLoading] = useState(false)
  const [isFavOpen, setIsFavOpen] = useState(false)
  const [isVoucherOpen, setIsVoucherOpen] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)

  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Voucher states
  const [userVouchers, setUserVouchers] = useState<any[]>([])
  const [vouchersLoading, setVouchersLoading] = useState(false)
  const [voucherCount, setVoucherCount] = useState(0)

  // Cart/Fav interaction
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removingFavId, setRemovingFavId] = useState<string | null>(null)
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set())

  // Lock body scroll when mobile sidebar dropdown is open
  useEffect(() => {
    if (isSidebarOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen])

  // Handle scroll to hide/show top bar
  // Sidebar handlers
  const handleCloseFavSidebar = () => {
    setIsFavOpen(false);
    setSelectedFavorites(new Set());
  };

  const handleCloseVoucherSidebar = () => {
    setIsVoucherOpen(false);
  };

  const handleCloseSearchSidebar = () => {
    setIsSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
    setHasSearched(false)
  }

  const handleOpenCartSidebar = () => {
    // Use flushSync to ensure loading state renders immediately
    flushSync(() => {
      setCartSidebarLoading(true)
    })
    setIsCartOpen(true)
    // Simulate loading animation for smooth UX
    setTimeout(() => {
      setCartSidebarLoading(false)
    }, 800)
  }

  const handleRemoveCartItem = async (itemId: string) => {
    // Set removing state for animation
    setRemovingId(itemId)

    // Wait for slide animation to complete
    await new Promise(resolve => setTimeout(resolve, 500))

    // Remove item using optimistic update from hook
    await removeCartItem(itemId)

    // Clear removing state
    setRemovingId(null)
  }

  const handleRemoveFavorite = async (favoriteId: string) => {
    // Set removing state for animation
    setRemovingFavId(favoriteId)

    // Wait for slide animation to complete
    await new Promise(resolve => setTimeout(resolve, 300))

    // Remove item using optimistic update from hook
    await removeFavorite(favoriteId)

    // Clear removing state
    setRemovingFavId(null)
  }

  // Handle quantity update for checkout items
  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setViewItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, (item.quantity || 1) + delta)
        return { ...item, quantity: newQty }
      }
      return item
    }))
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setHasSearched(true)
    try {
      const results = await produkDb.search(searchQuery.trim())
      setSearchResults(results || [])
    } catch (error) {
      console.error('Error searching products:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  // Load voucher count
  useEffect(() => {
    const loadVoucherCount = async () => {
      if (!user) return;
      try {
        const { data: userVouchersData } = await supabase
          .from('user_vouchers')
          .select('voucher_id')
          .eq('user_id', user.id)
          .eq('used', false);
        if (!userVouchersData || userVouchersData.length === 0) {
          setVoucherCount(0);
          return;
        }
        const voucherIds = userVouchersData.map((uv: any) => uv.voucher_id);
        const { data: vouchersData } = await supabase
          .from('voucher')
          .select('id, expired, voucher')
          .in('id', voucherIds);
        if (!vouchersData) {
          setVoucherCount(userVouchersData.length);
          return;
        }
        let usedVoucherCodes = new Set<string>();
        try {
          const response = await fetch(`/api/vouchers/used?user_id=${user.id}`);
          if (response.ok) {
            const result = await response.json();
            usedVoucherCodes = new Set(result.voucher_codes || []);
          }
        } catch (apiError) {}
        const now = new Date();
        const validCount = vouchersData.filter((v: any) => {
          if (v.expired && new Date(v.expired) < now) return false;
          if (v.voucher && usedVoucherCodes.has(v.voucher)) return false;
          return true;
        }).length;
        setVoucherCount(validCount);
      } catch (error) {
        setVoucherCount(0);
      }
    };
    loadVoucherCount();
  }, [user]);

  // Load vouchers when sidebar opens
  useEffect(() => {
    const loadVouchers = async () => {
      if (!isVoucherOpen || !user) return;
      setVouchersLoading(true);
      try {
        const { data: userVouchersData } = await supabase
          .from('user_vouchers')
          .select('*')
          .eq('user_id', user.id)
          .eq('used', false)
          .order('claimed_at', { ascending: false });
        if (!userVouchersData || userVouchersData.length === 0) {
          setUserVouchers([]);
          setVouchersLoading(false);
          return;
        }
        const voucherIds = userVouchersData.map((uv: any) => uv.voucher_id);
        const { data: vouchersData } = await supabase
          .from('voucher')
          .select('*')
          .in('id', voucherIds);
        if (!vouchersData) {
          setUserVouchers([]);
          setVouchersLoading(false);
          return;
        }
        let usedVoucherCodes = new Set<string>();
        try {
          const response = await fetch(`/api/vouchers/used?user_id=${user.id}`);
          if (response.ok) {
            const result = await response.json();
            usedVoucherCodes = new Set(result.voucher_codes || []);
          }
        } catch (apiError) {}
        const vouchersMap = new Map(vouchersData?.map((v: any) => [v.id, v]) || []);
        const combinedData = userVouchersData.map((uv: any) => ({
          ...uv,
          voucher: vouchersMap.get(uv.voucher_id)
        }));
        const now = new Date();
        const validVouchers = combinedData.filter((uv: any) => {
          const voucherCode = uv.voucher?.voucher;
          const isExpired = uv.voucher?.expired && new Date(uv.voucher.expired) < now;
          const isUsed = voucherCode && usedVoucherCodes.has(voucherCode);
          if (isExpired) return false;
          if (isUsed) return false;
          return true;
        });
        setUserVouchers(validVouchers);
        setVoucherCount(validVouchers.length);
      } catch (error) {
        setUserVouchers([]);
      } finally {
        setVouchersLoading(false);
      }
    };
    loadVouchers();
  }, [isVoucherOpen, user])
  // Pagination for Produk yang Dipesan (summary list)
  const [summaryPage, setSummaryPage] = useState<number>(1)
  const summaryPerPage = 2
  const [profileAddress, setProfileAddress] = useState<null | {
    nama: string
    phone: string
    street: string
    kelurahan: string
    kecamatan: string
    kabupaten: string
    provinsi: string
    postal: string
    negara: string
  }>(null)
  const addressCardRef = useRef<HTMLDivElement | null>(null)
  const productCardRef = useRef<HTMLDivElement | null>(null)
  const [productMinH, setProductMinH] = useState<number | undefined>(undefined)
  const [addressMinH, setAddressMinH] = useState<number | undefined>(undefined)

  const [viewItems, setViewItems] = useState<any[]>([])

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

  // Load pra-checkout data jika ada checkout id
  useEffect(() => {
    const loadPraCheckout = async () => {
      if (checkoutId && user) {
        setLoading(true)
        try {
          // Check if checkoutId is short_id format (CHKT-XXXX-YYYY) or UUID
          const isShortId = /^CHKT-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(checkoutId);
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(checkoutId);

          let data;
          if (isShortId) {
            // Use short_id lookup (new, secure method)
            data = await praCheckoutDb.getByShortId(checkoutId);
          } else if (isUUID) {
            // Legacy support for old UUID URLs
            data = await praCheckoutDb.getById(checkoutId);
          } else {
            // Invalid format
            console.error('Invalid checkout ID format:', checkoutId);
            router.push('/home');
            return;
          }

          // Check ownership: if pra_checkout belongs to different user, redirect to home
          if (data && data.user_id && data.user_id !== user.id) {
            console.warn('User trying to access another user\'s checkout:', {
              praCheckoutUserId: data.user_id,
              currentUserId: user.id
            });
            router.push('/home');
            return;
          }

          setPraCheckoutData(data)

          // Map pra_checkout_items ke format yang sama dengan cart items
          const mappedItems = data.pra_checkout_items.map((item: any) => ({
            id: item.id,
            produk_id: item.produk_id,
            quantity: item.quantity,
            size: item.size,
            produk: item.produk
          }))
          setViewItems(mappedItems)
        } catch (error) {
          console.error('Error loading pra-checkout data:', error)
          // Redirect to home on error
          router.push('/home');
        } finally {
          setLoading(false)
        }
      }
    }

    loadPraCheckout()
  }, [checkoutId, user, router])

  // Listen for voucher apply event from sidebar
  useEffect(() => {
    console.log('[Checkout] Setting up voucher event listener');

    const handleApplyVoucher = async (event: any) => {
      console.log('[Checkout] Voucher apply event triggered!');
      const voucherData = event.detail;
      console.log('Voucher event received:', voucherData);

      if (!voucherData || !praCheckoutData) {
        console.log('Missing data:', { voucherData, praCheckoutData });
        return;
      }

      try {
        // Extract voucher code from the event
        // voucherData bisa berupa object dengan struktur: {id, voucher: 'CODE', total_potongan, ...}
        const voucherCode = voucherData.voucher || voucherData.voucher_code;
        console.log('Applying voucher code:', voucherCode);

        // Calculate discount
        const subtotal = viewItems.reduce((sum, it: any) =>
          sum + (Number(it.produk?.harga || 0) * Number(it.quantity || 1)), 0
        );

        // voucherData sudah berisi info voucher langsung
        const voucherInfo = voucherData;
        let discountAmount = 0;

        if (voucherInfo.discount_percentage) {
          // Percentage discount
          const percentageDiscount = (subtotal * Number(voucherInfo.discount_percentage)) / 100;
          discountAmount = Math.min(percentageDiscount, Number(voucherInfo.total_potongan || 0));
        } else {
          // Fixed discount
          discountAmount = Number(voucherInfo.total_potongan || 0);
        }

        console.log('Discount calculation:', {
          subtotal,
          discount_percentage: voucherInfo.discount_percentage,
          total_potongan: voucherInfo.total_potongan,
          discountAmount
        });

        const newTotalAmount = Math.max(0, subtotal - discountAmount);

        console.log('Update payload:', {
          id: praCheckoutData.id,
          voucher_code: voucherCode,
          discount_amount: discountAmount,
          total_amount: newTotalAmount
        });

        // Update pra_checkout with voucher code, discount, and new total
        const updatedData = await praCheckoutDb.update(praCheckoutData.id, {
          voucher_code: voucherCode,
          discount_amount: discountAmount,
          total_amount: newTotalAmount
        });

        console.log('Update successful:', updatedData);

        // Update local state to reflect voucher
        setPraCheckoutData(updatedData);
      } catch (error: any) {
        console.error('Error applying voucher:', error);
        console.error('Error details:', error.message, error.code);
        alert('Gagal menerapkan voucher. Silakan coba lagi.');
      }
    };

    window.addEventListener('applyVoucherFromSidebar', handleApplyVoucher);
    return () => {
      window.removeEventListener('applyVoucherFromSidebar', handleApplyVoucher);
    };
  }, [praCheckoutData, viewItems]);

 // Auto-load default user address into hidden fields and preview card
 useEffect(() => {
   if (!user) return
   setAddressLoading(true)
   ;(async () => {
     try {
       // First, try to load from user_addresses table (default address)
       const response = await fetch(`/api/user/addresses?userId=${user.id}`)
       const data = await response.json()

       if (response.ok && data.addresses && data.addresses.length > 0) {
         // Find default address or use first one
         const defaultAddress = data.addresses.find((addr: any) => addr.is_default) || data.addresses[0]

         const nama = (defaultAddress.nama || '').toString().trim()
         const parts = nama.split(/\s+/)
         const first = parts.shift() || ''
         const last = parts.join(' ')
         const phone = (defaultAddress.phone || '').toString()
         const street = (defaultAddress.street || '').toString()
         const kabupaten = (defaultAddress.kabupaten || '').toString()
         const provinsi = (defaultAddress.provinsi || '').toString()
         const postal = (defaultAddress.postal || '').toString()
         const kelurahan = (defaultAddress.kelurahan || '').toString()
         const kecamatan = (defaultAddress.kecamatan || '').toString()
         const negara = 'Indonesia'

         setProfileAddress({ nama, phone, street, kelurahan, kecamatan, kabupaten, provinsi, postal, negara })

         // Populate hidden form fields for submission
         const f = formRef.current
         if (f) {
           const assign: Record<string, string> = {
             first_name: first,
             last_name: last,
             email: user.email || '',
             phone,
             address: street,
             city: kabupaten,
             province: provinsi,
             postal_code: postal,
             kelurahan: kelurahan,
             kecamatan: kecamatan
           }
           Object.entries(assign).forEach(([name, val]) => {
             const el = f.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | null
             if (el) el.value = val
           })
         }
       } else {
         // Fallback to old users table shipping data if no address in user_addresses
         const u: any = await userDb.getById(user.id)
         if (!u) return
         const nama = (u.shipping_nama || '').toString().trim()
         const parts = nama.split(/\s+/)
         const first = parts.shift() || ''
         const last = parts.join(' ')
         const phone = (u.shipping_phone || '').toString()
         const street = (u.shipping_street || '').toString()
         const kabupaten = (u.shipping_kabupaten || u.shipping_city || u.shipping_kota || u.shipping_kecamatan || '').toString()
         const provinsi = (u.shipping_provinsi || '').toString()
         const postal = (u.shipping_postal_code || '').toString().replace(/[^0-9]/g, '').slice(0, 5)
         const kelurahan = (u.shipping_kelurahan || u.shipping_address_json?.kelurahan || '').toString()
         const kecamatan = (u.shipping_kecamatan || '').toString()
         const negara = 'Indonesia'

         // Check if user has no address data at all
         const hasAddress = nama || phone || street || kabupaten || provinsi || postal

         if (!hasAddress) {
           // Show modern modal instead of alert
           setShowAddressModal(true)
           return
         }

         setProfileAddress({ nama, phone, street, kelurahan, kecamatan, kabupaten, provinsi, postal, negara })

         // Populate hidden form fields for submission
         const f = formRef.current
         if (f) {
           const assign: Record<string, string> = {
             first_name: first,
             last_name: last,
             email: user.email || '',
             phone,
             address: street,
             city: kabupaten,
             province: provinsi,
             postal_code: postal,
             kelurahan: kelurahan,
             kecamatan: kecamatan
           }
           Object.entries(assign).forEach(([name, val]) => {
             const el = f.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | null
             if (el) el.value = val
           })
         }
       }
     } catch (e) {
       console.warn('Gagal memuat alamat profil:', e)
     } finally {
       setAddressLoading(false)
     }
   })()
 }, [user])

useEffect(() => {
  const updateHeight = () => {
    const addressHeight = addressCardRef.current?.offsetHeight || 0;
    const productHeight = productCardRef.current?.offsetHeight || 0;

    // Set both cards to the maximum height to ensure they're always equal
    const maxHeight = Math.max(addressHeight, productHeight);

    if (maxHeight > 0) {
      setProductMinH(maxHeight);
      setAddressMinH(maxHeight);
    }
  };

  // Use setTimeout to ensure DOM has updated
  const timeoutId = setTimeout(updateHeight, 50);

  // Update on window resize
  window.addEventListener('resize', updateHeight);

  // Use ResizeObserver to detect when either card height changes
  const observers: ResizeObserver[] = [];

  if (typeof ResizeObserver !== 'undefined') {
    if (addressCardRef.current) {
      const addressObserver = new ResizeObserver(() => {
        updateHeight();
      });
      addressObserver.observe(addressCardRef.current);
      observers.push(addressObserver);
    }

    if (productCardRef.current) {
      const productObserver = new ResizeObserver(() => {
        updateHeight();
      });
      productObserver.observe(productCardRef.current);
      observers.push(productObserver);
    }
  }

  return () => {
    clearTimeout(timeoutId);
    window.removeEventListener('resize', updateHeight);
    observers.forEach(observer => observer.disconnect());
  };
}, [profileAddress, viewItems.length, summaryPage])

  const normalizeEkspedisiKey = (value: string) =>
    value.replace(/\s*Express$/i, '').trim().toLowerCase()

  // Load ongkir data from Biteship based on user postal code
  useEffect(() => {
    const loadBiteshipRates = async () => {
      // Hanya load jika ada postal code dan items
      if (!profileAddress?.postal || !viewItems || viewItems.length === 0) {
        console.log('[Ongkir] Skipping load - missing postal or items:', {
          hasPostal: !!profileAddress?.postal,
          postal: profileAddress?.postal,
          itemsLength: viewItems?.length || 0
        })
        return
      }

      // Validasi postal code (harus numerik dan minimal 5 digit)
      const postalStr = String(profileAddress.postal || '').trim()
      if (!postalStr || !/^\d{5,6}$/.test(postalStr)) {
        console.warn('[Ongkir] Invalid postal code, using fallback:', postalStr)
        // Langsung gunakan fallback database jika postal code tidak valid
        try {
          const data = await ongkirDb.getAll()
          const mapped: Record<string, { price: number; duration: string }> = {}
          data.forEach((item: any) => {
            if (!item?.ekspedisi) return
            const key = normalizeEkspedisiKey(item.ekspedisi)
            const amount = Number(item.ongkir)
            mapped[key] = {
              price: Number.isNaN(amount) ? 0 : amount,
              duration: '2-4 hari'
            }
          })
          setOngkirOptions(mapped)
          setOngkirFetched(true)
        } catch (dbError) {
          console.error('Error loading fallback ongkir:', dbError)
          setOngkirOptions({})
          setOngkirFetched(true)
        }
        return
      }

      setOngkirLoading(true)
      try {
        // Build items untuk Biteship
        const biteshipItems = viewItems.map((item: any) => ({
          nama_produk: item.produk?.nama_produk || 'Produk',
          quantity: Number(item.quantity || 1),
          harga_satuan: Number(item.produk?.harga || 0),
          weight: 700 // default 700 gram per item (sandal + box + bubble wrap + plastic)
        }))

        console.log('[Ongkir] Requesting Biteship rates:', {
          postal: postalStr,
          itemsCount: biteshipItems.length
        })

        const response = await fetch('/api/biteship/rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destination_postal_code: postalStr,
            items: biteshipItems
          })
        })

        const result = await response.json()

        if (result.success && result.data?.pricing) {
          const mapped: Record<string, { price: number; duration: string }> = {}

          // Debug: Log raw response untuk investigasi
          console.log('[Biteship Rates] Raw pricing data:', result.data.pricing)

          // Parse rates dari Biteship
          result.data.pricing.forEach((rate: any) => {
            const company = (rate.company || rate.courier_company || rate.courier_code || '').toLowerCase()
            const service = (rate.courier_service_name || rate.service || '').toLowerCase()
            const price = Number(rate.price || rate.shipping_fee || 0)
            const duration = rate.duration || rate.shipment_duration_range || 'Estimasi tidak tersedia'

            // Debug: Log setiap rate
            console.log('[Biteship Rate]', { company, service, price, duration, rawRate: rate })

            // Map J&T
            if (company.includes('jnt') || company.includes('j&t') || company.includes('jet')) {
              if (!mapped['j&t'] || price < mapped['j&t'].price) {
                mapped['j&t'] = { price, duration }
              }
            }
            // Map JNE
            if (company.includes('jne')) {
              if (!mapped['jne'] || price < mapped['jne'].price) {
                mapped['jne'] = { price, duration }
              }
            }
            // Map SiCepat
            if (company.includes('sicepat') || company.includes('si cepat')) {
              if (!mapped['sicepat'] || price < mapped['sicepat'].price) {
                mapped['sicepat'] = { price, duration }
              }
            }
            // Map Anteraja
            if (company.includes('anteraja') || company.includes('ante raja')) {
              if (!mapped['anteraja'] || price < mapped['anteraja'].price) {
                mapped['anteraja'] = { price, duration }
              }
            }
          })

          console.log('[Biteship Rates] Loaded rates:', mapped)
          setOngkirOptions(mapped)
        } else {
          console.warn('[Biteship Rates] Failed to load rates:', result)
          setOngkirOptions({})
        }
      } catch (error) {
        console.error('Error loading Biteship rates:', error)
        setOngkirOptions({})
      } finally {
        setOngkirLoading(false)
        setOngkirFetched(true)
      }
    }

    loadBiteshipRates()
  }, [profileAddress?.postal, viewItems.length])

  // Update selected ongkir amount whenever options or selection change
  useEffect(() => {
    if (!selectedShipping) return
    const key = normalizeEkspedisiKey(selectedShipping)
    const rateData = ongkirOptions[key]
    setOngkirAmount(rateData?.price || 0)
  }, [selectedShipping, ongkirOptions])

  const renderOngkirPrice = (label: string, isSelected: boolean) => {
    if (ongkirLoading) {
      return <span className="font-belleza text-xs text-gray-500">Loading...</span>
    }

    const key = normalizeEkspedisiKey(label)
    const rateData = ongkirOptions[key]

    // Debug logging
    console.log('[renderOngkirPrice]', { label, key, rateData, allOptions: ongkirOptions })

    if (rateData?.price) {
      return <span className="font-belleza text-xs font-medium text-black">Rp {rateData.price.toLocaleString('id-ID')}</span>
    }

    return <span className="font-belleza text-xs text-gray-500">Tidak tersedia</span>
  }

  const renderEstimasi = (label: string) => {
    const key = normalizeEkspedisiKey(label)
    const rateData = ongkirOptions[key]

    if (ongkirLoading) {
      return 'Loading...'
    }

    if (rateData?.duration) {
      // Format duration dari API (contoh: "3 - 5 days" → "Estimasi 3-5 hari")
      const duration = rateData.duration.toLowerCase()
        .replace(' days', ' hari')
        .replace(' day', ' hari')
        .replace(' - ', '-')
      return `Estimasi ${duration}`
    }

    return 'Estimasi tidak tersedia'
  }

  const isCourierAvailable = (label: string) => {
    const key = normalizeEkspedisiKey(label)
    const rateData = ongkirOptions[key]
    return !!rateData?.price
  }

  const isAllCouriersUnavailable = () => {
    const couriers = ['J&T Express', 'JNE', 'SiCepat', 'Anteraja']
    return couriers.every(courier => !isCourierAvailable(courier))
  }

  // Load Tripay channels (optional; fallback to minimal static list if fails)
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const res = await fetch('/api/tripay/channels')
        if (!res.ok) throw new Error('Failed to load channels')
        const json = await res.json()
        const list = Array.isArray(json?.data) ? json.data : []
        setPaymentChannels(list.filter((c: any) => c.active))
        // Prefer QRIS if available
        const qris = list.find((c: any) => c.code?.toUpperCase() === 'QRIS')
        if (qris) setPaymentMethod('QRIS')
      } catch {
        // Fallback minimal list
        setPaymentChannels([
          { code: 'QRIS', name: 'QRIS' },
          { code: 'BRIVA', name: 'BRI Virtual Account' },
          { code: 'BNIVA', name: 'BNI Virtual Account' },
          { code: 'MANDIRIVA', name: 'Mandiri Virtual Account' }
        ])
      }
    }
    loadChannels()
  }, [])

  // Fill checkout fields from saved user address
  const handleUseMyAddress = async () => {
    try {
      if (!user) return
      const u: any = await userDb.getById(user.id)
      const f = formRef.current
      if (!f || !u) return
      // Require all main address fields to be present
      const required = [
        u.shipping_nama,
        u.shipping_phone,
        u.shipping_street,
        u.shipping_kabupaten || u.shipping_kecamatan,
        u.shipping_provinsi,
        u.shipping_postal_code
      ]
      const hasAllRequired = required.every((v: any) => !!(v && String(v).trim()))
      if (!hasAllRequired) {
        setToast({ type: 'error', message: 'Anda belum mempunyai alamat yang tersimpan' })
        setTimeout(() => setToastShow(true), 10)
        setTimeout(() => setToastShow(false), 2300)
        setTimeout(() => setToast(null), 2600)
        return
      }
      const shippingNama = (u.shipping_nama || '').toString().trim()
      const parts = shippingNama.split(/\s+/)
      const first = parts.shift() || ''
      const last = parts.join(' ')
      const assignments: Record<string, string> = {
        first_name: first,
        last_name: last,
        email: user.email || '',
        phone: (u.shipping_phone || '').toString(),
        address: (u.shipping_street || '').toString(),
        city: (u.shipping_kabupaten || u.shipping_kecamatan || '').toString(),
        province: (u.shipping_provinsi || '').toString(),
        postal_code: (u.shipping_postal_code || '')
          .toString()
          .replace(/[^0-9]/g, '')
          .slice(0, 5)
      }
      Object.entries(assignments).forEach(([name, val]) => {
        const el = f.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | null
        if (el) el.value = val
      })
      // Show success toast
      setToast({ type: 'success', message: 'Alamat berhasil digunakan' })
      setTimeout(() => setToastShow(true), 10)
      setTimeout(() => setToastShow(false), 2300)
      setTimeout(() => setToast(null), 2600)
    } catch (e) {
      console.error('Gagal mengisi alamat dari profil', e)
      setToast({ type: 'error', message: 'Gagal menggunakan alamat' })
      setTimeout(() => setToastShow(true), 10)
      setTimeout(() => setToastShow(false), 2300)
      setTimeout(() => setToast(null), 2600)
    }
  }

  // Reset summary page when item count changes
  useEffect(() => {
    setSummaryPage(1)
  }, [viewItems.length])

  if (!mounted) return null
  if (isLoading) return null
  if (!user) return null

  // Gunakan data dari pra_checkout jika ada, atau hitung dari cart items
  // Selalu hitung subtotal dari viewItems agar reaktif terhadap perubahan quantity
  const subtotal = viewItems.reduce((sum, it:any) => sum + (Number(it.produk?.harga || 0) * Number(it.quantity || 1)), 0)
  const discountAmount = praCheckoutData ? Number(praCheckoutData.discount_amount || 0) : 0
  const shippingCost = ongkirAmount
  const subtotalWithShipping = subtotal + shippingCost
  // Hitung total dengan mempertimbangkan diskon voucher
  const totalAmount = subtotal - discountAmount + shippingCost
  const voucherCode = praCheckoutData?.voucher_code

  // Validasi form untuk enable/disable button
  const hasAddress = !!profileAddress
  const hasShipping = !!selectedShipping && isCourierAvailable(selectedShipping)
  const hasPaymentMethod = !!paymentMethod
  const isFormValid = hasAddress && hasShipping && hasPaymentMethod
  const isButtonDisabled = submitLoading || !isFormValid

  return (
    <main className="min-h-screen flex flex-col font-belleza">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed right-4 top-16 md:top-20 z-[80] px-4 py-3 rounded shadow-md text-white font-belleza transition-all duration-300 transform ${toastShow ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'} ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      {/* Modern Address Modal */}
      {showAddressModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          style={{
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform"
            style={{
              animation: 'scaleIn 0.3s ease-out'
            }}
          >
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h3 className="font-cormorant text-2xl md:text-3xl text-center text-gray-900 font-bold mb-3">
              Alamat Belum Tersedia
            </h3>

            {/* Message */}
            <p className="font-belleza text-center text-gray-600 mb-8 leading-relaxed">
              Anda belum memiliki alamat pengiriman. Silakan isi alamat pengiriman terlebih dahulu untuk melanjutkan checkout.
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowAddressModal(false)
                  router.push('/user/purchase?view=address')
                }}
                className="w-full bg-gradient-to-r from-black via-gray-900 to-black hover:from-gray-900 hover:via-black hover:to-gray-900 text-white font-belleza py-3.5 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                Isi Alamat Sekarang
              </button>
              <button
                onClick={() => {
                  setShowAddressModal(false)
                  router.push('/home')
                }}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 hover:border-gray-400 font-belleza py-3.5 px-6 rounded-xl transition-all duration-200"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top black bar - Same as user/purchase */}
      <div className="fixed top-0 left-0 right-0 w-full bg-black h-8 md:h-10 z-[59]">
        <div className="w-full max-w-[1160px] mx-auto h-full flex items-center justify-between px-6 md:px-8 lg:px-10">
          <p className="font-belleza text-white text-xs md:text-sm overflow-hidden whitespace-nowrap">
            <span className="inline-block animate-typing">
              <span className="font-bold">Dapatkan potongan diskon dan pengiriman</span> - <span
                className="text-blue-400 underline cursor-pointer hover:text-blue-300 transition-colors"
                onClick={() => {
                  router.push('/#voucher-section');
                }}
              >cek disini</span>
            </span>
          </p>
          <style jsx>{`
            @keyframes typing {
              0% {
                width: 0;
              }
              30.4% {
                width: 100%;
              }
              100% {
                width: 100%;
              }
            }

            @keyframes wipeOut {
              0%, 91.3% {
                width: 0;
              }
              100% {
                width: 100%;
              }
            }

            .animate-typing {
              overflow: hidden;
              white-space: nowrap;
              animation: typing 11.5s steps(55, end) infinite;
              display: inline-block;
              max-width: fit-content;
              position: relative;
            }

            .animate-typing::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              height: 100%;
              width: 0;
              background-color: black;
              animation: wipeOut 11.5s ease-out infinite;
            }
          `}</style>

          {/* Top Menu Links - Desktop Only */}
          <div className="hidden md:flex items-center gap-3 md:gap-4">
            <button
              onClick={() => {
                if (!user) {
                  router.push('/login');
                } else {
                  router.push('/user/purchase?pesanan-saya=all');
                }
              }}
              className="relative font-belleza font-bold text-white text-[10px] md:text-xs transition-opacity uppercase group bg-transparent border-0 cursor-pointer"
            >
              LACAK PESANAN
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 ease-out group-hover:w-full"></span>
            </button>
            <button
              onClick={() => {
                if (!user) {
                  router.push('/login');
                } else {
                  router.push('/user/purchase?view=notifications');
                }
              }}
              className="relative font-belleza font-bold text-white text-[10px] md:text-xs transition-opacity uppercase group bg-transparent border-0 cursor-pointer"
            >
              NOTIFIKASI
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 ease-out group-hover:w-full"></span>
            </button>
            <button onClick={openChat} className="relative font-belleza font-bold text-white text-[10px] md:text-xs transition-opacity uppercase group bg-transparent border-0 cursor-pointer">
              FAQ & BANTUAN
              <span className="absolute bottom-0 left-0 w-0 h-[2px] bg-white transition-all duration-300 ease-out group-hover:w-full"></span>
            </button>
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <rect width="20" height="7" fill="#FF0000"/>
              <rect y="7" width="20" height="7" fill="#FFFFFF"/>
            </svg>
          </div>

          {/* Indonesian Flag - Mobile Only */}
          <div className="md:hidden flex items-center">
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <rect width="20" height="7" fill="#FF0000"/>
              <rect y="7" width="20" height="7" fill="#FFFFFF"/>
            </svg>
          </div>
        </div>
      </div>

      {showLangDropdown && <div className="fixed inset-0 z-[58]" onClick={() => setShowLangDropdown(false)} />}

      <Header variant="docs" topBarVisible={true} />

      {/* Mobile Header (only visible on mobile) */}
      <div className="md:hidden fixed top-8 left-0 right-0 z-[60] bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Animated Hamburger Menu */}
          <button
            type="button"
            aria-label={isSidebarOpen ? "Tutup menu" : "Buka menu"}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative w-10 h-10 flex items-center justify-center"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <div className="w-6 h-5 flex flex-col justify-center items-center">
              <span className={`w-6 h-0.5 bg-gray-800 rounded-full transition-all duration-300 ease-in-out ${isSidebarOpen ? 'rotate-45 translate-y-[3px]' : 'mb-1'}`}></span>
              <span className={`w-6 h-0.5 bg-gray-800 rounded-full transition-all duration-300 ease-in-out ${isSidebarOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100 mb-1'}`}></span>
              <span className={`w-6 h-0.5 bg-gray-800 rounded-full transition-all duration-300 ease-in-out ${isSidebarOpen ? '-rotate-45 -translate-y-[3px]' : ''}`}></span>
            </div>
          </button>

          {/* Right: 4 Icons */}
          <div className="flex items-center gap-2">
            {/* Search Icon */}
            <button
              type="button"
              aria-label="Cari"
              className="relative p-1 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => setIsSearchOpen(true)}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Voucher Icon */}
            <button
              type="button"
              aria-label="Voucher"
              className="relative p-1 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => setIsVoucherOpen(true)}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700">
                <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Favorite Icon */}
            <button
              type="button"
              aria-label="Favorit"
              className="relative p-1 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => setIsFavOpen(true)}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Cart Icon */}
            <button
              type="button"
              aria-label="Keranjang"
              className="relative p-1 hover:bg-gray-100 rounded-full transition-colors"
              onClick={handleOpenCartSidebar}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu Navigation */}
      {isSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-[58] bg-black/30 transition-opacity duration-200 ease-out animate-fadeIn"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown Panel - Full Width & Height */}
          <div className="md:hidden fixed top-[88px] left-0 right-0 bottom-0 z-[59] bg-white shadow-2xl overflow-y-auto transform transition-all duration-300 ease-out animate-slideDown">
            {/* User Profile Card - Compact */}
            {user && (
              <div className="px-4 pt-5 pb-3 bg-white">
                <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {mounted && user ? ((user as any)?.nama?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()) : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {mounted && user ? ((user as any)?.nama || user.email) : 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Menu - Vertical List */}
            <nav className="py-2">
              <ul className="font-belleza">
                <li className="animate-menu-item">
                  <Link
                    href="/home"
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-black transition-colors duration-200"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium">Home</span>
                  </Link>
                </li>

                <li className="animate-menu-item">
                  <Link
                    href="/produk"
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-black transition-colors duration-200"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                      <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium">Produk</span>
                  </Link>
                </li>

                <li className="animate-menu-item">
                  <Link
                    href="/user/purchase?view=purchase"
                    onClick={() => setIsSidebarOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-black transition-colors duration-200"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium">Pesanan</span>
                  </Link>
                </li>

                {/* Divider */}
                <li className="my-2 animate-menu-item">
                  <div className="border-t border-gray-200"></div>
                </li>

                {/* Informasi Akun with Submenu */}
                {user ? (
                  <>
                    <li className="animate-menu-item">
                      <button
                        onClick={() => setShowAccountMenu(!showAccountMenu)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-black transition-colors duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="text-sm font-medium">Informasi Akun</span>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`text-gray-400 transition-transform duration-200 ${showAccountMenu ? 'rotate-180' : ''}`}>
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>

                      {/* Submenu */}
                      {showAccountMenu && (
                        <ul className="bg-gray-50 py-1">
                          <li>
                            <Link
                              href="/user/purchase?view=profile"
                              onClick={() => setIsSidebarOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 pl-14 hover:bg-gray-100 text-gray-600 hover:text-black transition-colors duration-200"
                            >
                              <span className="text-sm">Informasi Akun</span>
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/user/purchase?view=address"
                              onClick={() => setIsSidebarOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 pl-14 hover:bg-gray-100 text-gray-600 hover:text-black transition-colors duration-200"
                            >
                              <span className="text-sm">Alamat</span>
                            </Link>
                          </li>
                        </ul>
                      )}
                    </li>

                    {/* Logout Button */}
                    <li className="animate-menu-item">
                      <button
                        onClick={() => {
                          logout();
                          setIsSidebarOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors duration-200"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-600">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-sm font-medium">Logout</span>
                      </button>
                    </li>
                  </>
                ) : (
                  <li className="animate-menu-item">
                    <Link
                      href="/login"
                      onClick={() => setIsSidebarOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 bg-black hover:bg-gray-900 text-white transition-colors duration-200 mx-4 my-2 rounded-lg justify-center"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-sm font-medium">Login</span>
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
          </div>
        </>
      )}

      {/* Search Sidebar */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40" onClick={handleCloseSearchSidebar} aria-hidden="true" />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
            <button type="button" aria-label="Tutup pencarian" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center" onClick={handleCloseSearchSidebar}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="flex items-center justify-between">
              <span className="font-cormorant text-xl md:text-2xl text-black">Cari Produk</span>
            </div>
            <div className="mt-6">
              <input
                type="text"
                placeholder="Cari produk"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setHasSearched(false)
                  setSearchResults([])
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full rounded-none border border-gray-300 px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40"
              />
              <div className="mt-3">
                <button
                  onClick={handleSearch}
                  disabled={searchLoading || !searchQuery.trim()}
                  className="w-full rounded-none bg-black text-white px-4 py-2 font-belleza text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {searchLoading ? 'Mencari...' : 'Cari'}
                </button>
              </div>
            </div>
            <div className="mt-6">
              <p className="font-cormorant text-black">Hasil pencarian</p>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto space-y-5">
              {searchLoading ? (
                <p className="text-sm text-gray-600">Mencari produk...</p>
              ) : hasSearched ? (
                searchResults.length > 0 ? (
                  searchResults.map((product: any) => (
                    <Link key={product.id} href={`/produk/${product.id}/detail`} className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded cursor-pointer">
                      <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                        {product.photo1 ? (
                          <Image src={product.photo1} alt={product.nama_produk} fill sizes="64px" className="object-cover" />
                        ) : (
                          <Image src="/images/test1p.png" alt="Produk" fill sizes="64px" className="object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-belleza text-gray-900 truncate">{product.nama_produk}</p>
                        <p className="font-belleza text-sm text-gray-700 mt-1">
                          Rp {Number(product.harga || 0).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">Tidak ada hasil untuk "{searchQuery}"</p>
                )
              ) : (
                <p className="text-sm text-gray-600">Masukkan kata kunci untuk mencari produk</p>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Cart Sidebar */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsCartOpen(false)} aria-hidden="true" />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
            <button type="button" aria-label="Tutup keranjang" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center" onClick={() => setIsCartOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="flex items-center justify-between">
              <span className="font-cormorant text-xl md:text-2xl text-black">Test</span>
            </div>

            {/* Loading State - Skeleton untuk seluruh konten */}
            {(cartLoading || cartSidebarLoading) ? (
              <>
                <div className="mt-6 space-y-5 flex-1">
                  {/* Skeleton items */}
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 animate-pulse">
                      <div className="w-16 h-16 bg-gray-200 shrink-0"></div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="w-8 h-8 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
                  <div className="h-10 bg-gray-300 rounded w-full"></div>
                </div>
              </>
            ) : (
              <>
                <div className="mt-6 space-y-5 flex-1 overflow-y-auto">
                  {(cartItems || []).length === 0 ? (
                    <p className="text-sm text-gray-600">Keranjang kosong</p>
                  ) : (
                    (cartItems || []).map((item: any) => (
                      <div key={item.id} className="flex items-center gap-4">
                        <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                          {item.produk?.photo1 ? (
                            <Image src={item.produk.photo1} alt={item.produk?.nama_produk || 'Produk'} fill sizes="64px" className="object-cover" />
                          ) : (
                            <Image src="/images/test1p.png" alt="Produk" fill sizes="64px" className="object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-belleza text-gray-900 truncate">{item.produk?.nama_produk || 'Produk'}</p>
                          <p className="font-belleza text-sm text-gray-700 mt-1"><span className="text-black">{item.quantity} x</span> Rp {Number(item.produk?.harga || 0).toLocaleString('id-ID')}{item.size ? <span className="ml-2 text-gray-500">Uk: {item.size}</span> : null}</p>
                        </div>
                        <button
                          type="button"
                          aria-label="Hapus item"
                          className="p-2 rounded hover:bg-gray-100 text-black disabled:opacity-50"
                          onClick={() => handleRemoveCartItem(item.id)}
                          disabled={removingId === item.id}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="pt-4">
                  <p className="font-cormorant text-center text-lg text-black"><span className="font-bold">Subtotal</span> : Rp {(cartItems || []).reduce((sum, it:any) => sum + (Number(it.produk?.harga || 0) * Number(it.quantity || 1)), 0).toLocaleString('id-ID')}</p>
                  <div className="mt-4 flex flex-col items-stretch gap-3">
                    <Link href="/produk/checkout" className="inline-flex items-center justify-center rounded-none bg-black px-4 py-2 font-belleza text-sm text-white hover:opacity-90 transition w-full">
                      Checkout
                    </Link>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* Favorite Sidebar */}
      {isFavOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseFavSidebar}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6">
            <button
              type="button"
              aria-label="Tutup favorit"
              className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center"
              onClick={handleCloseFavSidebar}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex items-center justify-between">
              <span className="font-cormorant text-xl md:text-2xl text-black">Favorit</span>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto space-y-5">
              {favoritesLoading && (!favorites || favorites.length === 0) ? (
                <p className="text-sm text-gray-600">Memuat favorit...</p>
              ) : (!favorites || favorites.length === 0) ? (
                <p className="text-sm text-gray-600">Belum ada favorit</p>
              ) : (
                favorites.map((favorite) => (
                  <Link key={favorite.id} href={`/produk/${favorite.produk_id}/detail`} className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded cursor-pointer">
                    <div className="relative w-16 h-16 overflow-hidden border border-gray-200 bg-gray-100 shrink-0">
                      {favorite.produk?.photo1 ? (
                        <Image src={favorite.produk.photo1} alt={favorite.produk?.nama_produk || "Produk"} fill sizes="64px" className="object-cover" />
                      ) : (
                        <Image src="/images/test1p.png" alt="Produk favorit" fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-belleza text-gray-900 truncate">{favorite.produk?.nama_produk || "Produk"}</p>
                      <p className="font-belleza text-sm text-gray-700 mt-1">Rp {Number(favorite.produk?.harga || 0).toLocaleString("id-ID")}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Hapus item"
                      className="p-2 rounded hover:bg-gray-100 text-black"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await toggleFavorite(favorite.produk_id);
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </Link>
                ))
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Voucher Sidebar */}
      {isVoucherOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out animate-fadeIn"
            onClick={handleCloseVoucherSidebar}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 transform transition-transform duration-500 ease-out animate-slideInRight flex flex-col">
            <button
              type="button"
              aria-label="Tutup voucher"
              className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center transition-transform duration-300 hover:scale-110"
              onClick={handleCloseVoucherSidebar}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex items-center justify-between mb-6">
              <span className="font-cormorant text-xl md:text-2xl text-black">Voucher Saya</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {vouchersLoading ? (
                <p className="text-sm text-gray-600">Memuat voucher...</p>
              ) : !user ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 mb-4">Login untuk melihat voucher Anda</p>
                  <Link
                    href="/login"
                    className="inline-block px-6 py-2 bg-black text-white rounded-md hover:opacity-90 transition-opacity text-sm"
                    onClick={handleCloseVoucherSidebar}
                  >
                    Login
                  </Link>
                </div>
              ) : userVouchers.length === 0 ? (
                <div className="text-center py-8">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 text-gray-300">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <line x1="7" y1="7" x2="7.01" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-sm text-gray-600 mb-4">Belum ada voucher</p>
                  <Link
                    href="/user/purchase?view=vouchers"
                    className="inline-block px-6 py-2 bg-black text-white rounded-md hover:opacity-90 transition-opacity text-sm"
                    onClick={handleCloseVoucherSidebar}
                  >
                    Klaim Voucher
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {userVouchers.map((userVoucher) => {
                    const voucher = userVoucher.voucher;
                    const isExpired = voucher.expired ? new Date(voucher.expired) < new Date() : false;
                    const isUsed = userVoucher.used;

                    return (
                      <div
                        key={userVoucher.id}
                        className={`flex border rounded overflow-hidden transition-all ${
                          isUsed || isExpired
                            ? 'border-gray-300 bg-gray-50 opacity-60'
                            : 'border-gray-200 bg-white hover:shadow-md'
                        }`}
                      >
                        {/* Left Icon Section */}
                        <div className={`w-20 flex-shrink-0 flex flex-col items-center justify-center relative py-2 ${
                          isUsed || isExpired ? 'bg-gray-300' : voucher.type === 'shipping' ? 'bg-orange-500' : 'bg-red-600'
                        }`}>
                          {!isUsed && !isExpired && (
                            <div className="absolute top-1 left-0 right-0 text-center">
                              <span className="inline-block px-1.5 py-0.5 bg-yellow-400 text-red-700 text-[8px] font-bold rounded">
                                SPESIAL
                              </span>
                            </div>
                          )}
                          <div className="text-white mb-1">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="18" fontWeight="bold" fill="currentColor">
                                M
                              </text>
                            </svg>
                          </div>
                          <div className="text-white text-center px-1">
                            <div className="text-[8px] font-bold leading-tight">
                              {voucher.type === 'shipping' ? 'ONGKIR' : 'KOLEKSI'}
                            </div>
                            <div className="text-[8px] font-bold leading-tight">
                              {voucher.type === 'shipping' ? 'GRATIS' : 'PILIHAN'}
                            </div>
                          </div>
                          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"></div>
                          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"></div>
                        </div>

                        {/* Right Content Section */}
                        <div className="flex-1 p-2.5 flex flex-col justify-between">
                          <div>
                            <h3 className="text-[13px] font-semibold text-gray-900 mb-1 leading-tight line-clamp-2">
                              {voucher.judul_voucher ||
                                (voucher.type === 'shipping'
                                  ? `Gratis Ongkir s/d Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                  : `Diskon ${voucher.discount_percentage || '15'}% s/d Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                )
                              }
                            </h3>
                            <p className="text-[10px] text-gray-600 mb-1">
                              Min.Pembelian {voucher.minimal_pembelian || 1} produk
                            </p>
                            <div className="flex items-center gap-1 mb-1">
                              {isUsed ? (
                                <span className="px-1.5 py-0.5 text-[9px] font-semibold text-gray-600 bg-gray-200 rounded">
                                  Sudah Digunakan
                                </span>
                              ) : isExpired ? (
                                <span className="px-1.5 py-0.5 text-[9px] font-semibold text-white bg-red-600 rounded">
                                  Kadaluarsa
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 text-[9px] font-semibold text-red-600 border border-red-600 rounded">
                                  Penawaran terbatas
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-600">
                              Berlaku: <span className="font-medium">{voucher.expired ? Math.ceil((new Date(voucher.expired).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0} hari</span>
                            </p>
                          </div>
                          {!isUsed && !isExpired && (
                            <div className="mt-1.5 flex justify-end">
                              <button
                                onClick={() => {
                                  console.log('[Checkout Sidebar] Pakai button clicked');
                                  console.log('[Checkout Sidebar] Voucher data:', voucher);

                                  // Dispatch event to apply voucher
                                  const event = new CustomEvent('applyVoucherFromSidebar', {
                                    detail: voucher
                                  });
                                  window.dispatchEvent(event);
                                  console.log('[Checkout Sidebar] Event dispatched');
                                  handleCloseVoucherSidebar();
                                }}
                                className="px-3 py-1 border-2 border-red-600 text-red-600 text-[11px] font-semibold rounded hover:bg-red-50 transition-colors"
                              >
                                Pakai
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {user && userVouchers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <Link
                  href="/user/purchase?view=vouchers"
                  className="block text-center py-2 text-sm font-belleza text-black hover:underline"
                  onClick={handleCloseVoucherSidebar}
                >
                  Lihat Semua Voucher
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Content wrapper */}
      <div className="flex-grow bg-white">
      {/* Section 2: Checkout form - Simple 2-column layout */}
      <section className="bg-white">
        <form ref={formRef} onSubmit={async (e) => {
          e.preventDefault()
          if (!user) {
            alert('Silakan login terlebih dahulu')
            return
          }
          if (!checkoutId) {
            alert('pra_checkout_id tidak ditemukan. Kembali ke keranjang dan coba lagi.')
            return
          }
          try {
            setSubmitLoading(true)
            const fd = new FormData(e.currentTarget as HTMLFormElement)
            const firstName = (fd.get('first_name') as string || '').trim()
            const lastName = (fd.get('last_name') as string || '').trim()
            const email = (fd.get('email') as string || '').trim()
            const phone = (fd.get('phone') as string || '').trim()
            const address = (fd.get('address') as string || '').trim()
            const city = (fd.get('city') as string || '').trim()
            const province = (fd.get('province') as string || '').trim()
            const postalCode = (fd.get('postal_code') as string || '').trim()
            const kelurahan = (fd.get('kelurahan') as string || '').trim()
            const kecamatan = (fd.get('kecamatan') as string || '').trim()
            const shippingMethod = (fd.get('shipping_method') as string) || 'J&T Express'

            // minimal validation (last_name optional; allow single-name users)
            if (!firstName || !email || !phone || !address || !city || !province || !postalCode) {
              alert('Lengkapi data alamat pengiriman terlebih dahulu')
              setSubmitLoading(false)
              return
            }

            const shipping_address = {
              nama: `${firstName} ${lastName}`.trim(),
              telepon: phone,
              email,
              alamat: address,
              provinsi: province,
              kota: city,
              kabupaten: city,
              kecamatan: kecamatan || profileAddress?.kecamatan || '',
              kelurahan: kelurahan || profileAddress?.kelurahan || '',
              kode_pos: postalCode,
              catatan: ''
            }

            const order_summary = {
              discount: discountAmount || 0,
              voucher_code: voucherCode || null
            }

            const items = (viewItems || []).map((it: any) => ({
              produk_id: it.produk_id,
              nama_produk: it.produk?.nama_produk,
              size: it.size || null,
              quantity: Number(it.quantity || 1),
              harga_satuan: Number(it.produk?.harga || 0)
            }))

            const payload = {
              user_id: user.id,
              pra_checkout_id: praCheckoutData?.id || checkoutId, // Use UUID from praCheckoutData, not short_id
              shipping_address,
              shipping_method: shippingMethod,
              order_summary,
              subtotal: Number(subtotal),
              shipping_cost: Number(shippingCost),
              total: Number(totalAmount),
              items
            }

            if (Number(payload.total) <= 0) {
              alert('Total pembayaran 0 tidak dapat diproses. Silakan periksa voucher/discount Anda.')
              setSubmitLoading(false)
              return
            }
            const created = await checkoutSubmissionDb.create(payload as any)
            console.log('checkout_submissions created:', created)

            // Call Tripay sandbox to create payment and get checkout URL
            // Generate short order number (12 chars) for better display
            const shortOrderNumber = created.id.replace(/-/g, '').substring(0, 12).toUpperCase();

            const resp = await fetch('/api/tripay/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                merchantRef: shortOrderNumber, // use short order number for better display
                amount: Math.round(payload.total),
                customer: {
                  name: shipping_address.nama,
                  email: shipping_address.email,
                  phone: shipping_address.telepon
                },
                items: (() => {
                  // Selalu kirim detail produk yang sebenarnya
                  const detailed = items.map((it: any) => ({
                    sku: '',
                    name: `${it.nama_produk}${it.size ? ' - ' + String(it.size) : ''}`,
                    price: Math.round(Number(it.harga_satuan || 0)),
                    quantity: Number(it.quantity || 1)
                  }))

                  // Tambahkan ongkir sebagai item terpisah jika ada
                  if (Number(payload.shipping_cost) > 0) {
                    detailed.push({
                      sku: '',
                      name: 'Ongkos Kirim',
                      price: Math.round(Number(payload.shipping_cost)),
                      quantity: 1
                    })
                  }

                  // Tambahkan discount sebagai item dengan harga negatif jika ada
                  const discountAmount = Number(order_summary?.discount || 0)
                  if (discountAmount > 0) {
                    detailed.push({
                      sku: '',
                      name: `Diskon${order_summary?.voucher_code ? ' (' + order_summary.voucher_code + ')' : ''}`,
                      price: -Math.round(discountAmount),
                      quantity: 1
                    })
                  }

                  return detailed
                })(),
                method: paymentMethod,
                // Kembali ke halaman pending spesifik submission; halaman tersebut auto-redirect ke sukses/gagal.
                returnUrl: `${window.location.origin}/payment/${created.id}/pending`
              })
            })

            if (!resp.ok) {
              const err = await resp.json().catch(() => ({}))
              console.error('Tripay error:', err)
              alert('Gagal membuat transaksi pembayaran. Silakan coba lagi.')
              setSubmitLoading(false)
              return
            }

            const pay = await resp.json()
            const url = pay.checkout_url
            if (url) {
              // Persist Tripay info into checkout_submissions.order_summary
              const tripayInfo = {
                reference: pay.reference,
                method: paymentMethod,
                amount: Number(payload.total),
                checkout_url: url,
                pay_code: pay?.data?.pay_code || null,
                qr_url: pay?.data?.qr_url || pay?.data?.qr_string || null,
                expired_time: pay?.data?.expired_time || null
              }
              const mergedOrderSummary = { ...(payload.order_summary || {}), payment_method: paymentMethod, tripay: tripayInfo }
              try {
                const expiredIso = pay?.data?.expired_time ? new Date(pay.data.expired_time * 1000).toISOString() : null
                await checkoutSubmissionDb.update(created.id, {
                  order_summary: mergedOrderSummary,
                  payment_method: paymentMethod,
                  payment_reference: pay?.reference || null,
                  payment_details: {
                    provider: 'tripay',
                    ...tripayInfo
                  },
                  payment_expired_at: expiredIso
                })
              } catch (e) {
                console.warn('Gagal menyimpan info Tripay ke checkout_submissions:', e)
                // tetap redirect walau gagal menyimpan metadata
              }
              window.location.href = url
              return
            } else {
              alert('Gagal mendapatkan halaman pembayaran.')
            }
          } catch (err: any) {
            console.error('Gagal mengirim checkout_submissions', err)
            alert('Gagal mengirim checkout. Pastikan kebijakan RLS sudah benar untuk tabel checkout_submissions.')
          } finally {
            setSubmitLoading(false)
          }
        }}>
        {/* Hidden fields populated from user profile for submission */}
        <input type="hidden" name="first_name" />
        <input type="hidden" name="last_name" />
        <input type="hidden" name="email" />
        <input type="hidden" name="phone" />
        <input type="hidden" name="address" />
        <input type="hidden" name="city" />
        <input type="hidden" name="province" />
        <input type="hidden" name="postal_code" />
        <input type="hidden" name="kelurahan" />
        <input type="hidden" name="kecamatan" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16 mt-24 md:mt-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">

            {/* LEFT - Products */}
            <div className="hidden lg:block">
              <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-6">PRODUCT</h2>

              <div className="space-y-6">
                {loading ? (
                  <div className="text-center py-12">
                    <svg className="animate-spin h-8 w-8 text-gray-400 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="font-belleza text-sm text-gray-500">Memuat produk...</p>
                  </div>
                ) : viewItems.map((item: any) => (
                  <div key={item.id} className="border-b border-gray-200 pb-6">
                    <div className="flex gap-4">
                      <div className="relative w-20 h-20 bg-gray-100 flex-shrink-0">
                        {item.produk?.photo1 ? (
                          <Image
                            src={item.produk.photo1}
                            alt={item.produk?.nama_produk || 'Produk'}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <Image
                            src="/images/test1p.png"
                            alt="Produk"
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-gray-900 font-normal">{item.produk?.nama_produk || 'Produk'}</h3>
                        <p className="text-sm text-gray-900 mt-1">Rp {Number(item.produk?.harga || 0).toLocaleString('id-ID')}</p>
                        {item.size && (
                          <p className="text-sm text-gray-600 mt-1"><span className="font-medium">size:</span> {item.size}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900 font-normal">Rp {(Number(item.produk?.harga || 0) * Number(item.quantity || 1)).toLocaleString('id-ID')}</p>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        disabled={item.quantity <= 1}
                        className={`w-8 h-8 border border-gray-300 flex items-center justify-center transition-colors ${
                          item.quantity <= 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                        }`}
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-gray-900">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="w-8 h-8 border border-gray-300 flex items-center justify-center text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT - Cart Totals */}
            <div>
              <div className="border border-gray-200 p-6">
                <h2 className="text-xs lg:text-xs text-sm font-bold lg:font-semibold text-gray-900 uppercase tracking-wider mb-2">CART TOTALS</h2>

                {/* Products List - Mobile Only */}
                <div className="lg:hidden mb-6 pb-6 border-b border-gray-200">
                  <h3 className="text-xs font-normal text-gray-900 uppercase tracking-wider mb-4">PRODUCT</h3>
                  <div className="space-y-4">
                    {loading ? (
                      <div className="text-center py-8">
                        <svg className="animate-spin h-6 w-6 text-gray-400 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="font-belleza text-xs text-gray-500">Memuat produk...</p>
                      </div>
                    ) : viewItems.map((item: any) => (
                      <div key={item.id} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                        <div className="flex gap-3">
                          <div className="relative w-16 h-16 bg-gray-100 flex-shrink-0">
                            {item.produk?.photo1 ? (
                              <Image
                                src={item.produk.photo1}
                                alt={item.produk?.nama_produk || 'Produk'}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <Image
                                src="/images/test1p.png"
                                alt="Produk"
                                fill
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm text-gray-900 font-normal line-clamp-2">{item.produk?.nama_produk || 'Produk'}</h4>
                            <p className="text-xs text-gray-600 mt-1">Rp {Number(item.produk?.harga || 0).toLocaleString('id-ID')}</p>
                            {item.size && (
                              <p className="text-xs text-gray-600 mt-0.5"><span className="font-medium">size:</span> {item.size}</p>
                            )}
                            {/* Quantity controls */}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.id, -1)}
                                disabled={item.quantity <= 1}
                                className={`w-6 h-6 border border-gray-300 flex items-center justify-center text-xs transition-colors ${
                                  item.quantity <= 1
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                                }`}
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-xs text-gray-900">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQuantity(item.id, 1)}
                                className="w-6 h-6 border border-gray-300 flex items-center justify-center text-xs text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-colors"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm text-gray-900 font-normal">Rp {(Number(item.produk?.harga || 0) * Number(item.quantity || 1)).toLocaleString('id-ID')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ekspedisi dan alamat pengiriman */}
                <div className="pb-3 border-b border-gray-200">
                  <div className="mb-4">
                    <span className="text-gray-900 font-medium">Ekspedisi dan alamat pengiriman</span>
                  </div>

                  {/* Shipping Options with Custom Radio Buttons */}
                  <div className="space-y-1">
                    {ongkirLoading ? (
                      // Loading skeleton
                      <>
                        {['J&T Express', 'JNE', 'SiCepat', 'Anteraja'].map((courier) => (
                          <div key={courier} className="flex items-center gap-2 p-1.5 rounded border border-gray-200 animate-pulse">
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0"></div>
                            <div className="flex-1 flex items-center justify-between">
                              <div className="flex-1">
                                <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
                                <div className="h-2 bg-gray-200 rounded w-24"></div>
                              </div>
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        {/* Error message when all couriers are unavailable */}
                        {ongkirFetched && !ongkirLoading && isAllCouriersUnavailable() && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm font-medium text-red-600">
                              The shipping list is currently unavailable, please try again later.
                            </p>
                          </div>
                        )}

                        {isCourierAvailable('J&T Express') && (
                      <label
                        className={`flex items-center gap-2 p-1.5 rounded border cursor-pointer transition-all ${
                          selectedShipping === 'J&T Express'
                            ? 'border-black bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping_method"
                          value="J&T Express"
                          checked={selectedShipping === 'J&T Express'}
                          onChange={(e) => setSelectedShipping(e.target.value)}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          selectedShipping === 'J&T Express'
                            ? 'border-black bg-black'
                            : 'border-gray-300'
                        }`}>
                          {selectedShipping === 'J&T Express' && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-medium text-gray-900">J&T Express</span>
                            <p className="text-[10px] text-gray-500">
                              {renderEstimasi('J&T Express')}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-gray-900">{renderOngkirPrice('J&T Express', selectedShipping === 'J&T Express')}</span>
                        </div>
                      </label>
                    )}

                    {isCourierAvailable('JNE') && (
                      <label
                        className={`flex items-center gap-2 p-1.5 rounded border cursor-pointer transition-all ${
                          selectedShipping === 'JNE'
                            ? 'border-black bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping_method"
                          value="JNE"
                          checked={selectedShipping === 'JNE'}
                          onChange={(e) => setSelectedShipping(e.target.value)}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          selectedShipping === 'JNE'
                            ? 'border-black bg-black'
                            : 'border-gray-300'
                        }`}>
                          {selectedShipping === 'JNE' && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-medium text-gray-900">JNE</span>
                            <p className="text-[10px] text-gray-500">
                              {renderEstimasi('JNE')}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-gray-900">{renderOngkirPrice('JNE', selectedShipping === 'JNE')}</span>
                        </div>
                      </label>
                    )}

                    {isCourierAvailable('SiCepat') && (
                      <label
                        className={`flex items-center gap-2 p-1.5 rounded border cursor-pointer transition-all ${
                          selectedShipping === 'SiCepat'
                            ? 'border-black bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping_method"
                          value="SiCepat"
                          checked={selectedShipping === 'SiCepat'}
                          onChange={(e) => setSelectedShipping(e.target.value)}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          selectedShipping === 'SiCepat'
                            ? 'border-black bg-black'
                            : 'border-gray-300'
                        }`}>
                          {selectedShipping === 'SiCepat' && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-medium text-gray-900">SiCepat</span>
                            <p className="text-[10px] text-gray-500">
                              {renderEstimasi('SiCepat')}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-gray-900">{renderOngkirPrice('SiCepat', selectedShipping === 'SiCepat')}</span>
                        </div>
                      </label>
                    )}

                    {isCourierAvailable('Anteraja') && (
                      <label
                        className={`flex items-center gap-2 p-1.5 rounded border cursor-pointer transition-all ${
                          selectedShipping === 'Anteraja'
                            ? 'border-black bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping_method"
                          value="Anteraja"
                          checked={selectedShipping === 'Anteraja'}
                          onChange={(e) => setSelectedShipping(e.target.value)}
                          className="hidden"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          selectedShipping === 'Anteraja'
                            ? 'border-black bg-black'
                            : 'border-gray-300'
                        }`}>
                          {selectedShipping === 'Anteraja' && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-medium text-gray-900">Anteraja</span>
                            <p className="text-[10px] text-gray-500">
                              {renderEstimasi('Anteraja')}
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-gray-900">{renderOngkirPrice('Anteraja', selectedShipping === 'Anteraja')}</span>
                        </div>
                      </label>
                        )}
                      </>
                    )}
                  </div>

                  {/* Address */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      {addressLoading ? (
                        <div className="text-center py-4">
                          <svg className="animate-spin h-6 w-6 text-gray-400 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="text-xs text-gray-500">Memuat alamat...</p>
                        </div>
                      ) : profileAddress ? (
                        <>
                          <div className="flex items-start gap-2 mb-2">
                            <svg className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-900">{profileAddress.nama}</p>
                                <Link href="/user/purchase?view=address" className="text-xs text-gray-700 hover:text-gray-900 font-medium flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                  <span>Ubah</span>
                                </Link>
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5">{profileAddress.phone}</p>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed ml-6">
                            {[
                              profileAddress.street || null,
                              profileAddress.kelurahan ? `Kel. ${profileAddress.kelurahan}` : null,
                              profileAddress.kecamatan ? `Kec. ${profileAddress.kecamatan}` : null,
                              profileAddress.kabupaten || null,
                              profileAddress.provinsi || null,
                              profileAddress.postal || null
                            ].filter(Boolean).join(', ')}
                          </p>
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <p className="text-xs text-gray-600 mb-2">Alamat profil belum lengkap</p>
                          <Link href="/user/purchase?view=address" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
                            Lengkapi alamat
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Methods Dropdown */}
                <div className="py-4 border-b border-gray-200">
                  <div className="mb-4">
                    <span className="text-gray-900 font-medium">Metode pembayaran</span>
                  </div>
                  <div>
                    {/* Selected Payment Display */}
                    <button
                      type="button"
                      onClick={() => setIsPaymentDropdownOpen(!isPaymentDropdownOpen)}
                      className={`w-full flex items-center justify-between p-3 text-sm font-medium bg-white cursor-pointer transition-all duration-300 ${
                        isPaymentDropdownOpen
                          ? 'border border-b-0 border-black rounded-t-lg text-gray-900'
                          : 'border border-gray-200 rounded-lg hover:border-gray-300 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {!isPaymentDropdownOpen && paymentChannels.find((ch: any) => ch.code === paymentMethod) && channelLogos[(paymentMethod || '').toUpperCase()] && (
                          <div className="w-12 h-8 relative flex items-center justify-center">
                            <Image
                              src={channelLogos[(paymentMethod || '').toUpperCase()]}
                              alt={paymentChannels.find((ch: any) => ch.code === paymentMethod)?.name || ''}
                              width={48}
                              height={32}
                              className="object-contain"
                              quality={100}
                            />
                          </div>
                        )}
                        <span>
                          {isPaymentDropdownOpen ? (
                            'Pilih Pembayaran'
                          ) : (
                            paymentChannels.find((ch: any) => ch.code === paymentMethod)?.name || 'Pilih Pembayaran'
                          )}
                        </span>
                      </div>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isPaymentDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Options */}
                    <div
                      className={`border border-t-0 border-black rounded-b-lg bg-white overflow-hidden transition-all duration-300 ease-in-out ${
                        isPaymentDropdownOpen
                          ? 'max-h-96 opacity-100'
                          : 'max-h-0 opacity-0 border-0'
                      }`}
                    >
                      {paymentChannels.filter((ch: any) => ['QRIS', 'BRIVA', 'MANDIRIVA', 'BNIVA'].includes(ch.code)).map((ch: any) => (
                        <button
                          key={ch.code}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(ch.code)
                            setIsPaymentDropdownOpen(false)
                          }}
                          className={`w-full text-left p-3 text-sm transition-colors flex items-center justify-between ${
                            paymentMethod === ch.code
                              ? 'bg-gray-50 font-medium text-gray-900'
                              : 'hover:bg-gray-50 text-gray-900'
                          }`}
                        >
                          <span>{ch.name}</span>
                          {channelLogos[(ch.code || '').toUpperCase()] && (
                            <div className="w-12 h-8 relative flex items-center justify-center">
                              <Image
                                src={channelLogos[(ch.code || '').toUpperCase()]}
                                alt={ch.name}
                                width={48}
                                height={32}
                                className="object-contain"
                                quality={100}
                              />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Apply Voucher Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (voucherCode) {
                        // Remove voucher if already applied
                        const confirmRemove = confirm(`Hapus voucher ${voucherCode}?`);
                        if (confirmRemove) {
                          praCheckoutDb.update(praCheckoutData.id, {
                            voucher_code: null,
                            discount_amount: 0,
                            total_amount: subtotal
                          }).then(updatedData => {
                            setPraCheckoutData(updatedData);
                          });
                        }
                      } else {
                        // Open voucher sidebar
                        const event = new Event('openVoucherSidebar');
                        window.dispatchEvent(event);
                      }
                    }}
                    className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all text-sm font-medium ${
                      voucherCode
                        ? 'bg-green-50 border-2 border-green-500 text-green-700 hover:bg-green-100'
                        : 'border-2 border-dashed border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {voucherCode ? (
                      <>
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-semibold">Voucher Applied: {voucherCode}</span>
                        <svg className="w-4 h-4 text-green-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                        <span>Apply Voucher</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Subtotal with Dropdown */}
                <div className="py-3 border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsSubtotalDropdownOpen(!isSubtotalDropdownOpen)}
                    className="w-full flex justify-between items-center"
                  >
                    <span className="text-gray-900">Subtotal</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900">Rp {(subtotal + shippingCost).toLocaleString('id-ID')}</span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isSubtotalDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Dropdown Detail */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isSubtotalDropdownOpen ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Harga produk</span>
                        <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Biaya pengiriman</span>
                        <span>Rp {shippingCost.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Discount (if applicable) */}
                {discountAmount > 0 && (
                  <div className="py-3 border-b border-gray-200">
                    <div className="flex justify-between items-center text-green-600">
                      <span className="text-sm">Potongan Voucher ({voucherCode})</span>
                      <span className="text-sm font-semibold">-Rp {discountAmount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between py-4 border-b border-gray-200">
                  <span className="text-lg font-medium text-gray-900">Total Pembayaran</span>
                  <span className="text-lg font-medium text-gray-900">Rp {totalAmount.toLocaleString('id-ID')}</span>
                </div>

                {/* Checkout Button */}
                <button
                  type="submit"
                  disabled={isButtonDisabled}
                  className="w-full bg-black text-white py-3 mt-6 hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Memproses Pembayaran...
                    </span>
                  ) : (
                    'PROCEED TO CHECKOUT'
                  )}
                </button>

                {/* Validation message */}
                {!isFormValid && !submitLoading && (
                  <div className="mt-2 text-xs text-gray-600 text-center">
                    {!hasAddress && <p>• Harap lengkapi alamat pengiriman</p>}
                    {!hasShipping && <p>• Harap pilih metode pengiriman yang tersedia</p>}
                    {!hasPaymentMethod && <p>• Harap pilih metode pembayaran</p>}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
        </form>
      </section>
      </div>

      {/* Footer */}
      <section className="bg-black py-6 md:py-4 mt-auto">
        <div className="max-w-[1160px] mx-auto px-6 md:px-8 lg:px-10">
          {/* Mobile compact footer */}
          <div className="grid grid-cols-1 md:hidden gap-4">
            {/* Brand + contact */}
            <div className="space-y-3">
              <div className="-ml-1">
                <Image
                  src="/logo/logo2.png"
                  alt="MEORIS"
                  width={120}
                  height={40}
                  className="object-contain brightness-0 invert"
                />
              </div>
              <ul className="space-y-2 font-belleza text-gray-300">
                <li className="grid grid-cols-[20px_1fr] items-start gap-2">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-4 h-4"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/></svg>
                  <span className="text-xs leading-snug">Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat</span>
                </li>
                <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-4 h-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.09 4.18A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.16a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92z" fill="currentColor"/></svg>
                  <span className="text-xs">+6289695971729</span>
                </li>
                <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-4 h-4"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm16 2l-8 5-8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-xs">info@meoris.id</span>
                </li>
              </ul>
            </div>

            {/* Help & Support */}
            <div className="pb-2">
              <h4 className="font-cormorant text-base text-white whitespace-nowrap">Bantuan & Dukungan</h4>
              <div className="mt-1 w-10 h-[2px] bg-white"></div>
              <ul className="mt-3 space-y-2 font-belleza text-gray-300 text-xs">
                <li><a href="#" className="hover:underline hover:text-white cursor-pointer" onClick={(e) => { e.preventDefault(); openChat(); }}>Bantuan & Hubungi Kami</a></li>
                <li><Link href="/terms-condition" className="hover:underline hover:text-white">Syarat & Ketentuan</Link></li>
                <li><Link href="/privacy-policy" className="hover:underline hover:text-white">Kebijakan Privasi</Link></li>
              </ul>
            </div>

            {/* My Account */}
            <div className="pb-2">
              <h4 className="font-cormorant text-base text-white whitespace-nowrap">Akun Saya</h4>
              <div className="mt-1 w-10 h-[2px] bg-white"></div>
              <ul className="mt-3 space-y-2 font-belleza text-gray-300 text-xs">
                <li><Link href="/user/purchase?view=profile" className="hover:underline hover:text-white">Detail Akun</Link></li>
                <li><a href="#" aria-label="Buka keranjang" className="hover:underline hover:text-white" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('openCartSidebar')); }}>Keranjang</a></li>
                <li><a href="#" aria-label="Buka favorit" className="hover:underline hover:text-white" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event('openFavoriteSidebar')); }}>Favorit</a></li>
                <li><Link href="/produk/pesanan" className="hover:underline hover:text-white">Pesanan</Link></li>
              </ul>
            </div>
          </div>

          {/* Desktop: Right aligned with white text */}
          <div className="hidden md:flex items-center justify-end">
            <div className="font-belleza text-white/80 text-sm flex items-center flex-wrap justify-end gap-x-2">
              <span className="font-cormorant font-bold text-white">MEORIS</span>
              <span className="text-xs tracking-[0.2em] uppercase text-gray-400">Footwear</span>
              <span className="text-white/30 mx-1">•</span>
              <a href="#" className="hover:text-white transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); openChat(); }}>Bantuan & Hubungi Kami</a>
              <span className="text-white/30">•</span>
              <Link href="/terms-condition" className="hover:text-white transition-colors">Syarat & Ketentuan</Link>
              <span className="text-white/30">•</span>
              <Link href="/privacy-policy" className="hover:text-white transition-colors">Kebijakan Privasi</Link>
              <span className="text-white/30">•</span>
              <Link href="/user/purchase?view=profile" className="hover:text-white transition-colors">Detail Akun</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <>
      <Suspense fallback={null}>
        <CheckoutContent />
      </Suspense>
      <FloatingChat />
    </>
  );
}

