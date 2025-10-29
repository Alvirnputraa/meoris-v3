"use client";
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import LottiePlayer from '@/components/LottiePlayer'
import { ChangeEvent, Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/useCart'
import { useFavorites } from '@/lib/useFavorites'
import { keranjangDb, produkDb, userDb } from '@/lib/database'
type ProvinceOption = { id: string; name: string }
type RegencyOption = { id: string; name: string }
type DistrictOption = { id: string; name: string }
type VillageOption = { id: string; name: string; postalCode: string }
type PostalCodeOption = { code: string; kelurahan: string }

const normalizeLocation = (value: string) =>
  value
    ?.toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()

function AccountContent() {
  const { user, logout, isLoading, hydrated } = useAuth()
  const router = useRouter()
  const sp = useSearchParams()
  const tab = ((sp?.get('tab') || 'detail') as 'detail' | 'alamat')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isFavOpen, setIsFavOpen] = useState(false)
  const [selectedFavorites, setSelectedFavorites] = useState<Set<string>>(new Set())
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const { items: cartItems, count: cartCount, loading: cartLoading, refresh } = useCart()
  const { favorites, loading: favoritesLoading, toggleFavorite, count: favoritesCount } = useFavorites()
  const [viewItems, setViewItems] = useState<any[]>([])
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [accountSplash, setAccountSplash] = useState(true)
  const [mounted, setMounted] = useState(false)
  // Address form states
  const [shipNama, setShipNama] = useState('')
  const [shipPhone, setShipPhone] = useState('')
  const [shipStreet, setShipStreet] = useState('')
  const [shipKecamatan, setShipKecamatan] = useState('')
const [shipProvinsi, setShipProvinsi] = useState('')
  const [shipPostal, setShipPostal] = useState('')
  const [shipNegara] = useState('Indonesia')
  const [shipKabupaten, setShipKabupaten] = useState('')
  const [shipKelurahan, setShipKelurahan] = useState('')
const [selectedProvinceId, setSelectedProvinceId] = useState('')
  const [selectedRegencyId, setSelectedRegencyId] = useState('')
  const [selectedDistrictId, setSelectedDistrictId] = useState('')
  const [selectedVillageId, setSelectedVillageId] = useState('')
  const [initialLocation, setInitialLocation] = useState<{ provinceId: string; regencyId: string; districtId: string; villageId: string }>({
    provinceId: '',
    regencyId: '',
    districtId: '',
    villageId: '',
  })
  const [provinceOptions, setProvinceOptions] = useState<ProvinceOption[]>([])
  const [provinceLoading, setProvinceLoading] = useState(false)
  const [provinceError, setProvinceError] = useState<string | null>(null)
  const [regencyOptions, setRegencyOptions] = useState<RegencyOption[]>([])
  const [regencyLoading, setRegencyLoading] = useState(false)
  const [regencyError, setRegencyError] = useState<string | null>(null)
  const [districtOptions, setDistrictOptions] = useState<DistrictOption[]>([])
  const [districtLoading, setDistrictLoading] = useState(false)
  const [districtError, setDistrictError] = useState<string | null>(null)
  const [villageOptions, setVillageOptions] = useState<VillageOption[]>([])
  const [villageLoading, setVillageLoading] = useState(false)
  const [villageError, setVillageError] = useState<string | null>(null)
  const [postalCodeOptions, setPostalCodeOptions] = useState<PostalCodeOption[]>([])
  const [isManualPostalCode, setIsManualPostalCode] = useState(false)
  const [isManualProvince, setIsManualProvince] = useState(false)
  const [isManualRegency, setIsManualRegency] = useState(false)
  const [isManualDistrict, setIsManualDistrict] = useState(false)
  const [isManualVillage, setIsManualVillage] = useState(false)

  const [savingAddr, setSavingAddr] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [toastShow, setToastShow] = useState(false)

  // Short splash loading for auth/loading state
  useEffect(() => {
    const t = setTimeout(() => setAccountSplash(false), 800)
    return () => clearTimeout(t)
  }, [])

  // Mount flag to keep SSR/CSR markup consistent
  useEffect(() => { setMounted(true) }, [])
  // Init address fields from user when available
  useEffect(() => {
    if (!user) return
    // Fetch full user row to ensure latest address values
    let cancelled = false
    ;(async () => {
      try {
        const full = await userDb.getById(user.id)
        if (cancelled || !full) return
        const u: any = full as any
        setShipNama(u?.shipping_nama || '')
        setShipPhone(u?.shipping_phone || '')
        setShipStreet(u?.shipping_street || '')
        setShipKabupaten(
          u?.shipping_kabupaten ||
          u?.shipping_city ||
          u?.shipping_kota ||
          u?.shipping_address_json?.kabupaten ||
          u?.shipping_address_json?.kota ||
          u?.shipping_kecamatan || ''
        )
        setShipKecamatan(u?.shipping_kecamatan || '')
        setShipProvinsi(u?.shipping_provinsi || '')
        setShipPostal(u?.shipping_postal_code || '')
        setShipKelurahan(u?.shipping_kelurahan || u?.shipping_address_json?.kelurahan || '')
        setInitialLocation({
          provinceId: u?.shipping_provinsi_id || '',
          regencyId: u?.shipping_kabupaten_id || '',
          districtId: u?.shipping_kecamatan_id || '',
          villageId: u?.shipping_kelurahan_id || '',
        })
      } catch (e) {
        // fallback to basic auth user if fetch fails
        const u: any = user as any
        setShipNama(u?.shipping_nama || '')
        setShipPhone(u?.shipping_phone || '')
        setShipStreet(u?.shipping_street || '')
        setShipKabupaten(
          u?.shipping_kabupaten ||
          u?.shipping_city ||
          u?.shipping_kota ||
          u?.shipping_address_json?.kabupaten ||
          u?.shipping_address_json?.kota ||
          u?.shipping_kecamatan || ''
        )
        setShipKecamatan(u?.shipping_kecamatan || '')
        setShipProvinsi(u?.shipping_provinsi || '')
        setShipPostal(u?.shipping_postal_code || '')
        setShipKelurahan(u?.shipping_kelurahan || (u?.shipping_address_json?.kelurahan) || '')
        setInitialLocation({
          provinceId: u?.shipping_provinsi_id || '',
          regencyId: u?.shipping_kabupaten_id || '',
          districtId: u?.shipping_kecamatan_id || '',
          villageId: u?.shipping_kelurahan_id || '',
        })
      }
    })()
    return () => { cancelled = true }
  }, [user])

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message })
    // Small tick to allow mount before anim in
    setTimeout(() => setToastShow(true), 10)
    // Animate out slightly before unmount
    setTimeout(() => setToastShow(false), 2300)
    setTimeout(() => setToast(null), 2600)
  }

  const handleSaveAddress = async () => {
    if (!user) return
    setSavingAddr(true)
    try {
      const sanitizedPostal = (shipPostal || '').replace(/[^0-9]/g, '').slice(0, 5)
      if (sanitizedPostal !== shipPostal) {
        setShipPostal(sanitizedPostal)
      }
      await userDb.update(user.id, {
        shipping_nama: shipNama || null,
        shipping_phone: shipPhone || null,
        shipping_street: shipStreet || null,
        shipping_kabupaten: shipKabupaten || null,
        shipping_kecamatan: shipKecamatan || null,
        shipping_provinsi: shipProvinsi || null,
        shipping_postal_code: sanitizedPostal || null,
        shipping_negara: shipNegara || 'Indonesia',
        shipping_provinsi_id: selectedProvinceId || null,
        shipping_kabupaten_id: selectedRegencyId || null,
        shipping_kecamatan_id: selectedDistrictId || null,
        shipping_kelurahan_id: selectedVillageId || null,
        shipping_kelurahan: shipKelurahan || null,
        shipping_address_json: {
          nama: shipNama,
          phone: shipPhone,
          street: shipStreet,
          kabupaten: shipKabupaten,
          kota: shipKabupaten,
          kabupaten_id: selectedRegencyId || null,
          kecamatan: shipKecamatan,
          kecamatan_id: selectedDistrictId || null,
          kelurahan: shipKelurahan,
          kelurahan_id: selectedVillageId || null,
          provinsi: shipProvinsi,
          provinsi_id: selectedProvinceId || null,
          postal_code: sanitizedPostal,
          negara: shipNegara || 'Indonesia'
        } as any
      } as any)
      showToast('success', 'Alamat berhasil disimpan')
    } catch (e) {
      console.error('Gagal menyimpan alamat', e)
      showToast('error', 'Gagal menyimpan alamat')
    } finally {
      setSavingAddr(false)
    }
  }

  // Handle checkbox selection in favorites
  const handleFavoriteCheckbox = (favoriteId: string, checked: boolean) => {
    setSelectedFavorites(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(favoriteId);
      } else {
        newSet.delete(favoriteId);
      }
      return newSet;
    });
  };

  // Clear selected favorites when sidebar closes
  const handleCloseFavSidebar = () => {
    setIsFavOpen(false);
    setSelectedFavorites(new Set());
  };

  // Handle search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    setHasSearched(true);
    try {
      const results = await produkDb.search(searchQuery.trim());
      setSearchResults(results || []);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Clear search when sidebar closes
  const handleCloseSearchSidebar = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const handleProvinceSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    setProvinceError(null)
    setInitialLocation({ provinceId: '', regencyId: '', districtId: '', villageId: '' })
    setSelectedProvinceId(value)
    if (value) {
      const matched = provinceOptions.find((province) => province.id === value)
      setShipProvinsi(matched?.name ?? '')
    } else {
      setShipProvinsi('')
    }
    setRegencyOptions([])
    setSelectedRegencyId('')
    setRegencyError(null)
    setShipKecamatan('')
    setDistrictOptions([])
    setSelectedDistrictId('')
    setDistrictError(null)
    setVillageOptions([])
    setSelectedVillageId('')
    setVillageError(null)
    setShipKelurahan('')
    setShipPostal('')
  }

  const handleRegencySelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    setRegencyError(null)
    setInitialLocation((prev) => ({ ...prev, regencyId: '', districtId: '', villageId: '' }))
    setSelectedRegencyId(value)
    if (value) {
      const matched = regencyOptions.find((regency) => regency.id === value)
      setShipKabupaten(matched?.name ?? '')
    } else {
      setShipKabupaten('')
    }
    setShipKecamatan('')
    setDistrictOptions([])
    setSelectedDistrictId('')
    setDistrictError(null)
    setVillageOptions([])
    setSelectedVillageId('')
    setVillageError(null)
    setShipKelurahan('')
    setShipPostal('')
  }

  const handleDistrictSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    setDistrictError(null)
    setInitialLocation((prev) => ({ ...prev, districtId: '', villageId: '' }))
    setSelectedDistrictId(value)
    if (value) {
      const matched = districtOptions.find((district) => district.id === value)
      setShipKecamatan(matched?.name ?? '')
    } else {
      setShipKecamatan('')
    }
    setVillageOptions([])
    setSelectedVillageId('')
    setVillageError(null)
    setShipKelurahan('')
    setShipPostal('')
    setPostalCodeOptions([])
    setIsManualPostalCode(false) // Reset manual mode when district changes
  }

  const handleVillageSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    setVillageError(null)
    setInitialLocation((prev) => ({ ...prev, villageId: '' }))
    setSelectedVillageId(value)

    if (value) {
      const matched = villageOptions.find((village) => village.id === value)
      console.log('Selected village:', matched)
      setShipKelurahan(matched?.name ?? '')
      // Don't auto-fill postal code anymore, let user select from dropdown
    } else {
      setShipKelurahan('')
      setShipPostal('')
    }
  }

  const handlePostalCodeSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    if (value === 'manual') {
      setIsManualPostalCode(true)
      // Don't clear the current value when switching to manual mode
      // This preserves the user's current selection
    } else {
      setIsManualPostalCode(false)
      setShipPostal(value)
    }
  }

  // Sinkronkan tampilan lokal dengan data hook agar bisa optimistik tanpa flicker
  useEffect(() => {
    setViewItems(cartItems || [])
  }, [cartItems])

  useEffect(() => {
    if (isCartOpen && user) {
      refresh()
    }
  }, [isCartOpen, user, refresh])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setProvinceLoading(true)
    setProvinceError(null)
    setProvinceOptions([])
    fetch('/api/wilayah/provinsi', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<ProvinceOption[]>
      })
      .then((data) => {
        if (!active) return
        setProvinceOptions(data)
      })
      .catch((err) => {
        if (!active || (err as any)?.name === 'AbortError') return
        console.error('Gagal memuat provinsi', err)
        setProvinceError('Tidak dapat memuat provinsi. Silakan refresh halaman atau input manual')
      })
      .finally(() => {
        if (active) setProvinceLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
  if (!selectedProvinceId) {
      setRegencyOptions([])
      setRegencyError(null)
      setRegencyLoading(false)
      setDistrictOptions([])
      setDistrictError(null)
      setDistrictLoading(false)
      setSelectedDistrictId('')
      setVillageOptions([])
      setVillageError(null)
      setVillageLoading(false)
      setSelectedVillageId('')
      setShipKabupaten('')
      return
    }

    let active = true
    const controller = new AbortController()
    setRegencyLoading(true)
    setRegencyError(null)
    setRegencyOptions([])
    setDistrictOptions([])
    setDistrictError(null)
    setDistrictLoading(false)
    setSelectedDistrictId('')
    setVillageOptions([])
    setVillageError(null)
    setVillageLoading(false)
    setSelectedVillageId('')

    fetch(`/api/wilayah/kabupaten?kode_provinsi=${selectedProvinceId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<RegencyOption[]>
      })
      .then((data) => {
        if (!active) return
        setRegencyOptions(data)
      })
      .catch((err) => {
        if (!active || (err as any)?.name === 'AbortError') return
        console.error('Gagal memuat kota/kabupaten', err)
        setRegencyError('Tidak dapat memuat kota/kabupaten. Silakan refresh halaman atau input manual')
      })
      .finally(() => {
        if (active) setRegencyLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [selectedProvinceId])

  useEffect(() => {
    if (!selectedRegencyId) {
      setDistrictOptions([])
      setDistrictError(null)
      setDistrictLoading(false)
      setSelectedDistrictId('')
      setVillageOptions([])
      setVillageError(null)
      setVillageLoading(false)
      setSelectedVillageId('')
      return
    }

    const regency = regencyOptions.find((item) => item.id === selectedRegencyId)
    if (!regency) {
      setDistrictOptions([])
      setSelectedDistrictId('')
      setVillageOptions([])
      setSelectedVillageId('')
      setShipKabupaten('')
      setShipKecamatan('')
      setShipKelurahan('')
      setShipPostal('')
      return
    }

    setShipKabupaten(regency.name)

    let active = true
    const controller = new AbortController()
    setDistrictLoading(true)
    setDistrictError(null)
    setDistrictOptions([])
    setSelectedDistrictId('')
    setVillageOptions([])
    setSelectedVillageId('')
    setVillageError(null)
    setVillageLoading(false)
    setShipKecamatan('')
    setShipKelurahan('')

    fetch(`/api/wilayah/kecamatan?kode_kabupaten=${selectedRegencyId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<DistrictOption[]>
      })
      .then((data) => {
        if (!active) return
        setDistrictOptions(data)
      })
      .catch((err) => {
        if (!active || (err as any)?.name === 'AbortError') return
        console.error('Gagal memuat kecamatan', err)
        setDistrictError('Tidak dapat memuat kecamatan. Silakan refresh halaman atau input manual')
      })
      .finally(() => {
        if (active) setDistrictLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [selectedRegencyId, regencyOptions])

  useEffect(() => {
    if (!selectedDistrictId) {
      setVillageOptions([])
      setVillageError(null)
      setVillageLoading(false)
      setSelectedVillageId('')
      setShipKelurahan('')
      return
    }

    const district = districtOptions.find((item) => item.id === selectedDistrictId)
    if (district) {
      setShipKecamatan(district.name)
    }

    let active = true
    const controller = new AbortController()
    setVillageLoading(true)
    setVillageError(null)
    setVillageOptions([])
    setSelectedVillageId('')
    setShipKelurahan('')

    fetch(`/api/wilayah/desa?kode_kecamatan=${selectedDistrictId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Array<{ id: string; name: string; postalCode?: string }>>
      })
      .then((data) => {
        if (!active) return
      console.log('Received desa data:', data)
      const villages: VillageOption[] = data.map((item) => ({
        id: item.id,
        name: item.name,
        postalCode: (item.postalCode || '').toString().trim(),
      }))
      console.log('Processed villages:', villages)
      setVillageOptions(villages)
    })
      .catch((err) => {
        if (!active || (err as any)?.name === 'AbortError') return
        console.error('Gagal memuat kelurahan/desa', err)
        setVillageError('Tidak dapat memuat kelurahan/desa. Silakan refresh halaman atau input manual')
      })
      .finally(() => {
        if (active) setVillageLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [selectedDistrictId, districtOptions])

  useEffect(() => {
    if (!selectedProvinceId) return
    const matched = provinceOptions.find((province) => province.id === selectedProvinceId)
    if (matched && shipProvinsi !== matched.name) {
      setShipProvinsi(matched.name)
    }
  }, [selectedProvinceId, provinceOptions, shipProvinsi])

  useEffect(() => {
    if (!selectedVillageId) {
      setShipKelurahan('')
      return
    }
    const village = villageOptions.find((item) => item.id === selectedVillageId)
    if (!village) {
      setShipKelurahan('')
      setShipPostal('')
      return
    }
    setShipKelurahan(village.name)
  }, [selectedVillageId, villageOptions])

  // Fetch postal codes when district is selected
  useEffect(() => {
    if (!selectedDistrictId || !selectedRegencyId || !selectedProvinceId) {
      setPostalCodeOptions([])
      return
    }

    let active = true
    const controller = new AbortController()

    fetch(`/api/wilayah/kodepos?kode_provinsi=${selectedProvinceId}&kode_kabupaten=${selectedRegencyId}&kode_kecamatan=${selectedDistrictId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Array<{ id: string; code: string }>>
      })
      .then((data) => {
        if (!active) return
        console.log('Received kodepos data:', data)
        const postalOptions: PostalCodeOption[] = data.map((item) => ({
          code: item.code,
          kelurahan: '' // No kelurahan mapping available from API
        }))
        setPostalCodeOptions(postalOptions)
      })
      .catch((err) => {
        if (!active || (err as any)?.name === 'AbortError') return
        console.error('Gagal memuat kode pos', err)
        setPostalCodeOptions([])
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [selectedDistrictId, selectedRegencyId, selectedProvinceId])

  useEffect(() => {
    const { provinceId } = initialLocation
    if (!provinceId || !provinceOptions.length || selectedProvinceId) return
    const matched = provinceOptions.find((province) => province.id === provinceId)
    if (matched) {
      setSelectedProvinceId(provinceId)
      setShipProvinsi(matched.name)
      setInitialLocation((prev) => ({ ...prev, provinceId: '' }))
    }
  }, [initialLocation.provinceId, provinceOptions, selectedProvinceId])

  useEffect(() => {
    const { regencyId } = initialLocation
    if (!regencyId || !regencyOptions.length || selectedRegencyId) return
    const matched = regencyOptions.find((regency) => regency.id === regencyId)
    if (matched) {
      setSelectedRegencyId(regencyId)
      setShipKabupaten(matched.name)
      setInitialLocation((prev) => ({ ...prev, regencyId: '' }))
    }
  }, [initialLocation.regencyId, regencyOptions, selectedRegencyId])

  useEffect(() => {
    const { districtId } = initialLocation
    if (!districtId || !districtOptions.length || selectedDistrictId) return
    const matched = districtOptions.find((district) => district.id === districtId)
    if (matched) {
      setSelectedDistrictId(districtId)
      setShipKecamatan(matched.name)
      setInitialLocation((prev) => ({ ...prev, districtId: '' }))
    }
  }, [initialLocation.districtId, districtOptions, selectedDistrictId])

  useEffect(() => {
    const { villageId } = initialLocation
    if (!villageId || !villageOptions.length || selectedVillageId) return
    if (villageOptions.some((village) => village.id === villageId)) {
      setSelectedVillageId(villageId)
      setInitialLocation((prev) => ({ ...prev, villageId: '' }))
    }
  }, [initialLocation.villageId, villageOptions, selectedVillageId])

  useEffect(() => {
    if (initialLocation.provinceId || !shipProvinsi || !provinceOptions.length || selectedProvinceId) return
    const target = normalizeLocation(shipProvinsi)
    const matched = provinceOptions.find((province) => normalizeLocation(province.name) === target)
    if (matched) {
      setSelectedProvinceId(matched.id)
      setShipProvinsi(matched.name)
    }
  }, [initialLocation.provinceId, shipProvinsi, provinceOptions, selectedProvinceId])

  useEffect(() => {
    if (initialLocation.regencyId || !shipKabupaten || !regencyOptions.length || selectedRegencyId) return
    const target = normalizeLocation(shipKabupaten)
    const matched = regencyOptions.find((regency) => normalizeLocation(regency.name) === target)
    if (matched) {
      setSelectedRegencyId(matched.id)
      setShipKabupaten(matched.name)
    }
  }, [initialLocation.regencyId, shipKabupaten, regencyOptions, selectedRegencyId])

  useEffect(() => {
    if (initialLocation.districtId || !shipKecamatan || !districtOptions.length || selectedDistrictId) return
    const target = normalizeLocation(shipKecamatan)
    const matched = districtOptions.find((district) => normalizeLocation(district.name) === target)
    if (matched) {
      setSelectedDistrictId(matched.id)
      setShipKecamatan(matched.name)
    }
  }, [initialLocation.districtId, shipKecamatan, districtOptions, selectedDistrictId])

  useEffect(() => {
    if (initialLocation.villageId || !shipKelurahan || !villageOptions.length || selectedVillageId) return
    const target = normalizeLocation(shipKelurahan)
    const matched = villageOptions.find((village) => normalizeLocation(village.name) === target)
    if (matched) {
      setSelectedVillageId(matched.id)
    }
  }, [initialLocation.villageId, shipKelurahan, villageOptions, selectedVillageId])

  // Sticky header removed on this page

  const handleRemoveCartItem = async (itemId: string) => {
    try {
      setRemovingId(itemId)
      // Optimistic: hilangkan dari tampilan dulu
      setViewItems((items) => items.filter((it: any) => it.id !== itemId))
      await keranjangDb.removeItem(itemId)
      // Jangan panggil refresh untuk menghindari flicker; realtime akan menyinkronkan
    } catch (e) {
      console.error('Gagal menghapus item keranjang', e)
    } finally {
      setRemovingId(null)
    }
  }

  // Detect touch/mobile devices (incl. desktop mode on mobile)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const touch = (
      'ontouchstart' in window ||
      (navigator as any).maxTouchPoints > 0 ||
      window.matchMedia('(hover: none)').matches ||
      window.matchMedia('(any-pointer: coarse)').matches
    )
    const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    setIsTouchDevice(touch || isMobileUA)
  }, [])

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout()
      // Redirect to home page after logout
      window.location.href = '/'
    } catch (error) {
      console.error('Logout error:', error)
    }
  }
  // If user is not logged in, redirect to login (wait until auth finished loading)
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

  const showSplash = mounted && (isLoading || accountSplash)

  return (
    !mounted ? null : showSplash ? (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" strategy="afterInteractive" />
        <LottiePlayer autoplay loop mode="normal" src="/images/7iaKJ6872I.json" style={{ width: 120, height: 120 }} />
      </div>
    ) : !user ? (
      <div className="min-h-screen bg-white" />
    ) : (
    <main className="min-h-screen flex flex-col font-belleza">
      
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 h-full w-80 md:w-96 max-w-[75%] bg-gradient-to-br from-white via-gray-50 to-gray-100 shadow-2xl overflow-hidden transform transition-transform">
            {/* Header dengan gradient */}
            <div className="relative bg-gradient-to-r from-black via-gray-900 to-black p-4 pt-6">
              <button
                type="button"
                aria-label="Tutup menu"
                className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer transition-all hover:scale-110"
                onClick={() => setIsSidebarOpen(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              
              {/* Brand Logo */}
              <div className="mt-2">
                <span className="font-cormorant text-2xl font-bold text-white tracking-wider">MEORIS</span>
                <div className="mt-0.5 text-[10px] tracking-[0.3em] uppercase text-gray-300">Footwear</div>
              </div>

              {/* User Profile Card */}
              {user && (
                <div className="mt-4 p-2.5 rounded-lg bg-white/10 backdrop-blur border border-white/20">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-xs">
                      {(user as any)?.nama?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{(user as any)?.nama || 'User'}</p>
                      <p className="text-xs text-gray-300 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Menu */}
            <nav className="p-3 pt-5">
              <ul className="space-y-1 font-belleza">
                <li>
                  <a
                    href="/home"
                    onClick={() => setIsSidebarOpen(false)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-black group-hover:to-gray-800 text-gray-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base font-medium flex-1">Beranda</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                </li>
                <li>
                  <a
                    href="/produk"
                    onClick={() => setIsSidebarOpen(false)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-black group-hover:to-gray-800 text-gray-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base font-medium flex-1">Produk</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                </li>
                <li>
                  <a
                    href="/my-account"
                    onClick={() => setIsSidebarOpen(false)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-black group-hover:to-gray-800 text-gray-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base font-medium flex-1">Informasi Akun</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                </li>
                <li>
                  <a
                    href="/pengembalian"
                    onClick={() => setIsSidebarOpen(false)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-black group-hover:to-gray-800 text-gray-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base font-medium flex-1">Pengembalian Barang</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                </li>

                {/* Divider */}
                <li className="py-1.5">
                  <div className="border-t border-gray-300"></div>
                </li>

                <li>
                  <Link
                    href="/produk/pesanan"
                    onClick={() => setIsSidebarOpen(false)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-black group-hover:to-gray-800 text-gray-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base font-medium flex-1">Pesanan</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/histori/transaksi"
                    onClick={() => setIsSidebarOpen(false)}
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white hover:shadow-md text-gray-700 hover:text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-black group-hover:to-gray-800 text-gray-600 group-hover:text-white transition-all duration-200 shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <span className="font-cormorant text-base font-medium flex-1">History Transaksi</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                </li>
              </ul>

              {/* Logout Button */}
              <div className="mt-4 pt-3 border-t border-gray-300">
                <button
                  onClick={() => {
                    setIsSidebarOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg text-xs"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </nav>
          </aside>
        </div>
      )}
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-16 md:top-20 z-[80] px-4 py-3 rounded shadow-md text-white font-belleza transition-all duration-300 transform ${toastShow ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'} ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {toast.message}
        </div>
      )}

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
                  setHasSearched(false) // Reset hasSearched when user types
                  setSearchResults([]) // Clear previous search results
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
                          Rp {Number(product.harga || 0).toLocaleString("id-ID")}
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
      {isCartOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsCartOpen(false)} aria-hidden="true" />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
            <button type="button" aria-label="Tutup keranjang" className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center" onClick={() => setIsCartOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="flex items-center justify-between">
              <span className="font-cormorant text-xl md:text-2xl text-black">Item Keranjang</span>
            </div>
            <div className="mt-6 space-y-5">
              {viewItems.length === 0 ? (
                <p className="text-sm text-gray-600">Keranjang kosong</p>
              ) : (
                viewItems.map((item: any) => (
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
              <p className="font-cormorant text-center text-lg text-black"><span className="font-bold">Subtotal</span> : Rp {viewItems.reduce((sum, it:any) => sum + (Number(it.produk?.harga || 0) * Number(it.quantity || 1)), 0).toLocaleString('id-ID')}</p>
              <div className="mt-4 flex flex-col items-stretch gap-3">
                {viewItems.length === 0 ? (
                  <button
                    disabled
                    className="inline-flex items-center justify-center rounded-none border border-gray-300 bg-gray-300 text-gray-500 px-4 py-2 font-belleza text-sm cursor-not-allowed w-full"
                  >
                    Checkout
                  </button>
                ) : (
                  <Link
                    href="/produk/detail-checkout"
                    className="inline-flex items-center justify-center rounded-none border border-black bg-black text-white px-4 py-2 font-belleza text-sm hover:opacity-90 transition w-full"
                    onClick={() => {
                      setIsCartOpen(false);
                    }}
                  >
                    Checkout
                  </Link>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
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
      {/* Desktop header (fixed) */}
      <div className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="w-full flex items-center justify-between px-6 md:px-8 lg:px-10 py-3">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Buka menu" className="p-1 rounded hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer" onClick={() => setIsSidebarOpen(true)}>
              <Image src="/images/sidebar.png" alt="Menu" width={28} height={28} />
            </button>
            <Link href="/" aria-label="Meoris beranda" className="select-none">
              <span className="font-cormorant font-bold text-2xl tracking-wide text-black">MEORIS</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <a href="#" aria-label="Cari" onClick={(e) => { e.preventDefault(); setIsSearchOpen(true); }} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="#" aria-label="Favorit" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); setIsFavOpen(true); }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{favoritesCount}</span>
            </a>
            <a href="#" aria-label="Keranjang" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                <circle cx="9" cy="21" r="1" fill="currentColor"/>
                <circle cx="20" cy="21" r="1" fill="currentColor"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{cartCount}</span>
            </a>
            <div className="relative" onMouseEnter={() => setIsUserMenuOpen(true)} onMouseLeave={() => setIsUserMenuOpen(false)}>
              <Link href="/my-account" aria-label="Akun" className="p-1 hover:bg-gray-100 rounded-full transition-colors block">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <div className={`absolute right-0 top-full w-48 bg-white border border-gray-200 shadow-lg py-2 transition z-[60] ${isUserMenuOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                <div className="px-4 py-2 text-sm text-gray-700 truncate">{(user as any)?.nama || 'Nama'}</div>
                <Link href="/my-account?tab=detail" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Informasi Akun</Link>
                <Link href="/my-account?tab=alamat" className="block px-4 py-2 text-sm text-black hover:bg-gray-50">Alamat</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile header (fixed) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Buka menu" className="p-1 rounded hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer" onClick={() => setIsSidebarOpen(true)}>
              <Image src="/images/sidebar.png" alt="Menu" width={28} height={28} />
            </button>
            <Link href="/" aria-label="Meoris beranda" className="select-none">
              <span className="font-cormorant font-bold text-xl tracking-wide text-black">MEORIS</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <a href="#" aria-label="Cari" onClick={(e) => { e.preventDefault(); setIsSearchOpen(true); }} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <a href="#" aria-label="Favorit" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); setIsFavOpen(true); }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{favoritesCount}</span>
            </a>
            <a href="#" aria-label="Keranjang" className="relative p-1 hover:bg-gray-100 rounded-full transition-colors" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                <circle cx="9" cy="21" r="1" fill="currentColor"/>
                <circle cx="20" cy="21" r="1" fill="currentColor"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-black text-white text-[10px] leading-4 text-center">{cartCount}</span>
            </a>
            <Link href="/my-account" aria-label="Akun" className="p-1 hover:bg-gray-100 rounded-full transition-colors block">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700 hover:text-black transition-colors">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>
      {/* Hero with title + breadcrumb */}
      <div className="flex-grow">
      <section className="relative overflow-hidden bg-transparent pt-[76px]">
        {/* Background image with fixed effect */}
        <div
          className="absolute inset-0 -z-10 bg-center bg-cover bg-fixed"
          aria-hidden="true"
          style={{ backgroundImage: 'url(/images/bgg1.png)' }}
        />
        <div className={`max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16 flex flex-col items-center justify-center`}>
          <h1 className="font-cormorant text-3xl md:text-4xl text-black text-center">Akun Saya</h1>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 font-belleza">
            <Link href="/" className="hover:underline">Beranda</Link>
            <span>&gt;</span>
            <span className="text-black">Detail Akun</span>
          </div>
        </div>
      </section>
      

      {/* Dashboard layout */}
      <section className="bg-white py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
            {/* Sidebar */}
            <aside>
              <ul className="border border-gray-200 divide-y divide-gray-200">
                <li>
                  <Link
                    href="/my-account?tab=detail"
                    className={`block px-2 py-1.5 font-belleza text-[11px] ${tab === 'detail' ? 'bg-black text-white' : 'text-gray-800 hover:bg-gray-50'}`}
                    aria-current={tab === 'detail' ? 'page' : undefined}
                  >
                    Detail Akun
                  </Link>
                </li>
                <li>
                  <Link
                    href="/my-account?tab=alamat"
                    className={`block px-2 py-1.5 font-belleza text-[11px] ${tab === 'alamat' ? 'bg-black text-white' : 'text-gray-800 hover:bg-gray-50'}`}
                    aria-current={tab === 'alamat' ? 'page' : undefined}
                  >
                    Alamat
                  </Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-2 py-1.5 font-belleza text-[11px] text-gray-800 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </li>
              </ul>
            </aside>

            {/* Content */}
            <div>
              {tab === 'alamat' ? (
                <>
                  {/* Modern Header with Gradient - More Compact */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4 md:p-5 shadow-xl mb-5">
                    <div className="relative z-10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                            <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/>
                          </svg>
                        </div>
                        <div>
                          <h2 className="font-cormorant text-xl md:text-2xl text-white font-bold">Alamat Pengiriman</h2>
                          <p className="text-xs text-gray-300 font-belleza mt-0.5">Kelola alamat pengiriman utama Anda</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
                    {/* Left: Address form - More Compact */}
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                      {/* Form Header - More Compact */}
                      <div className="bg-gradient-to-r from-gray-50 to-white p-2.5 md:p-3.5 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-700">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/>
                            <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                          </svg>
                          <h3 className="font-cormorant text-base font-semibold text-gray-900">Informasi Alamat</h3>
                        </div>
                      </div>

                      <div className="p-3 md:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                          {/* Column 1 */}
                          <div className="space-y-2.5 md:space-y-3.5">
                            {/* Nama Penerima - Without Icon */}
                            <div className="group">
                              <label className="block font-belleza text-xs font-semibold text-gray-700 mb-1">
                                Nama Penerima
                              </label>
                              <input 
                                type="text" 
                                value={shipNama} 
                                onChange={(e)=>setShipNama(e.target.value)} 
                                placeholder="Masukkan nama penerima" 
                                className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all duration-200 hover:border-gray-300"
                              />
                            </div>

                            {/* Nomor HP - Without Icon */}
                            <div className="group">
                              <label className="block font-belleza text-xs font-semibold text-gray-700 mb-1">
                                Nomor HP
                              </label>
                              <input 
                                type="tel" 
                                value={shipPhone} 
                                onChange={(e)=>setShipPhone(e.target.value)} 
                                placeholder="Contoh: 08123456789" 
                                className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all duration-200 hover:border-gray-300"
                              />
                            </div>

                            {/* Alamat Lengkap - Without Icon */}
                            <div className="group">
                              <label className="block font-belleza text-xs font-semibold text-gray-700 mb-1">
                                Alamat Lengkap
                              </label>
                              <textarea 
                                value={shipStreet} 
                                onChange={(e)=>setShipStreet(e.target.value)} 
                                placeholder="Nama jalan, nomor rumah, RT/RW" 
                                rows={3}
                                className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all duration-200 hover:border-gray-300 resize-none"
                              />
                            </div>

                            {/* Provinsi - Enhanced Dropdown with Manual Input */}
                            <div className="group">
                              <label className="block font-belleza text-xs font-semibold text-gray-700 mb-1">
                                Provinsi
                              </label>
                              {!isManualProvince ? (
                                <div className="relative">
                                  <select
                                    value={selectedProvinceId}
                                    onChange={handleProvinceSelect}
                                    className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 pr-10 text-sm text-black bg-white focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 focus:shadow-lg transition-all duration-300 hover:border-gray-300 hover:shadow-md appearance-none cursor-pointer"
                                    style={{
                                      backgroundImage: 'none'
                                    }}
                                  >
                                    <option value="" className="text-gray-500">
                                      {provinceLoading ? 'Memuat provinsi...' : 'Pilih provinsi'}
                                    </option>
                                    {provinceOptions.map((province) => (
                                      <option key={province.id} value={province.id} className="text-black py-2">
                                        {province.name}
                                      </option>
                                    ))}
                                  </select>
                                  {/* Custom Arrow Icon */}
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    {provinceLoading ? (
                                      <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 group-hover:text-gray-600 transition-colors duration-200">
                                        <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={shipProvinsi}
                                    onChange={(e) => {
                                      setShipProvinsi(e.target.value)
                                      setSelectedProvinceId('')
                                    }}
                                    placeholder="Contoh: Jawa Barat"
                                    className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 pr-24 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all duration-200 hover:border-gray-300"
                                  />
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsManualProvince(false)
                                        // Keep the manually entered value and set it as selected
                                        if (shipProvinsi) {
                                          // Find matching option or keep manual value
                                          const matched = provinceOptions.find((province) =>
                                            province.name.toLowerCase() === shipProvinsi.toLowerCase()
                                          )
                                          if (matched) {
                                            setSelectedProvinceId(matched.id)
                                          } else {
                                            // Keep manual mode if no match found
                                            return
                                          }
                                        }
                                      }}
                                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsManualProvince(false)
                                        // Reset to empty value when canceling
                                        setShipProvinsi('')
                                        setSelectedProvinceId('')
                                      }}
                                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 font-semibold"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              )}
                              {provinceError && !isManualProvince ? (
                                <p className="mt-1.5 text-xs text-red-600 flex items-start gap-1 animate-shake">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 mt-0.5">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                  </svg>
                                  Tidak dapat memuat provinsi. Silakan refresh halaman atau periksa koneksi anda
                                </p>
                              ) : null}
                            </div>

                            {/* Kota/Kabupaten - Enhanced Dropdown with Manual Input */}
                            <div className="group">
                              <label className="block font-belleza text-xs font-semibold text-gray-700 mb-1">
                                Kota/Kabupaten
                              </label>
                              {!isManualRegency ? (
                                <div className="relative">
                                  <select
                                    value={selectedRegencyId}
                                    onChange={handleRegencySelect}
                                    disabled={!selectedProvinceId || regencyLoading || regencyOptions.length === 0}
                                    className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 pr-10 text-sm text-black bg-white focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 focus:shadow-lg transition-all duration-300 hover:border-gray-300 hover:shadow-md disabled:bg-gradient-to-br disabled:from-gray-50 disabled:to-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200 appearance-none cursor-pointer"
                                    style={{
                                      backgroundImage: 'none'
                                    }}
                                  >
                                    <option value="" className="text-gray-500">
                                      {!selectedProvinceId
                                        ? 'Pilih provinsi terlebih dahulu'
                                        : regencyLoading
                                          ? 'Memuat kota/kabupaten...'
                                          : regencyOptions.length === 0
                                            ? 'Data tidak tersedia'
                                            : 'Pilih kota/kabupaten'}
                                    </option>
                                    {regencyOptions.map((regency) => (
                                      <option key={regency.id} value={regency.id} className="text-black py-2">
                                        {regency.name}
                                      </option>
                                    ))}
                                  </select>
                                  {/* Custom Arrow Icon */}
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    {regencyLoading ? (
                                      <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 group-hover:text-gray-600 transition-colors duration-200">
                                        <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={shipKabupaten}
                                    onChange={(e) => {
                                      setShipKabupaten(e.target.value)
                                      setSelectedRegencyId('')
                                    }}
                                    placeholder="Contoh: Kabupaten Tasikmalaya / Kota Tasikmalaya"
                                    className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 pr-24 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all duration-200 hover:border-gray-300"
                                  />
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsManualRegency(false)
                                        // Keep the manually entered value and set it as selected
                                        if (shipKabupaten) {
                                          // Find matching option or keep manual value
                                          const matched = regencyOptions.find((regency) =>
                                            regency.name.toLowerCase() === shipKabupaten.toLowerCase()
                                          )
                                          if (matched) {
                                            setSelectedRegencyId(matched.id)
                                          } else {
                                            // Keep manual mode if no match found
                                            return
                                          }
                                        }
                                      }}
                                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsManualRegency(false)
                                        // Reset to empty value when canceling
                                        setShipKabupaten('')
                                        setSelectedRegencyId('')
                                      }}
                                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 font-semibold"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              )}
                              {regencyError && !isManualRegency ? (
                                <p className="mt-1.5 text-xs text-red-600 flex items-start gap-1 animate-shake">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 mt-0.5">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                  </svg>
                                  Tidak dapat memuat kota/kabupaten. Silakan refresh halaman atau periksa koneksi anda
                                </p>
                              ) : null}
                            </div>

                            {/* Kecamatan - Enhanced Dropdown with Manual Input */}
                            <div className="group">
                              <label className="block font-belleza text-xs font-semibold text-gray-700 mb-1">
                                Kecamatan
                              </label>
                              {!isManualDistrict ? (
                                <div className="relative">
                                  <select
                                    value={selectedDistrictId}
                                    onChange={handleDistrictSelect}
                                    disabled={!selectedRegencyId || districtLoading || districtOptions.length === 0}
                                    className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 pr-10 text-sm text-black bg-white focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 focus:shadow-lg transition-all duration-300 hover:border-gray-300 hover:shadow-md disabled:bg-gradient-to-br disabled:from-gray-50 disabled:to-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200 appearance-none cursor-pointer"
                                    style={{
                                      backgroundImage: 'none'
                                    }}
                                  >
                                    <option value="" className="text-gray-500">
                                      {!selectedRegencyId
                                        ? 'Pilih kota/kabupaten terlebih dahulu'
                                        : districtLoading
                                          ? 'Memuat kecamatan...'
                                          : districtOptions.length === 0
                                            ? 'Data tidak tersedia'
                                            : 'Pilih kecamatan'}
                                    </option>
                                    {districtOptions.map((district) => (
                                      <option key={district.id} value={district.id} className="text-black py-2">
                                        {district.name}
                                      </option>
                                    ))}
                                  </select>
                                  {/* Custom Arrow Icon */}
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    {districtLoading ? (
                                      <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 group-hover:text-gray-600 transition-colors duration-200">
                                        <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={shipKecamatan}
                                    onChange={(e) => {
                                      setShipKecamatan(e.target.value)
                                      setSelectedDistrictId('')
                                    }}
                                    placeholder="Contoh: Kawalu"
                                    className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 pr-24 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all duration-200 hover:border-gray-300"
                                  />
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsManualDistrict(false)
                                        // Keep the manually entered value and set it as selected
                                        if (shipKecamatan) {
                                          // Find matching option or keep manual value
                                          const matched = districtOptions.find((district) =>
                                            district.name.toLowerCase() === shipKecamatan.toLowerCase()
                                          )
                                          if (matched) {
                                            setSelectedDistrictId(matched.id)
                                          } else {
                                            // Keep manual mode if no match found
                                            return
                                          }
                                        }
                                      }}
                                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsManualDistrict(false)
                                        // Reset to empty value when canceling
                                        setShipKecamatan('')
                                        setSelectedDistrictId('')
                                      }}
                                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 font-semibold"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              )}
                              {districtError && !isManualDistrict ? (
                                <p className="mt-1.5 text-xs text-red-600 flex items-start gap-1 animate-shake">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 mt-0.5">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                  </svg>
                                  Tidak dapat memuat kecamatan. Silakan refresh halaman atau periksa koneksi anda
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {/* Column 2 */}
                          <div className="space-y-2.5 md:space-y-3.5">
                            {/* Kecamatan - Enhanced Dropdown with Manual Input */}
                            <div className="group">
                              <label className="block font-belleza text-xs font-semibold text-gray-700 mb-1">
                                Provinsi
                              </label>
                              {!isManualProvince ? (
                                <div className="relative">
                                  <select
                                    value={selectedProvinceId}
                                    onChange={handleProvinceSelect}
                                    className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 pr-10 text-sm text-black bg-white focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 focus:shadow-lg transition-all duration-300 hover:border-gray-300 hover:shadow-md appearance-none cursor-pointer"
                                    style={{
                                      backgroundImage: 'none'
                                    }}
                                  >
                                    <option value="" className="text-gray-500">
                                      {provinceLoading ? 'Memuat provinsi...' : 'Pilih provinsi'}
                                    </option>
                                    {provinceOptions.map((province) => (
                                      <option key={province.id} value={province.id} className="text-black py-2">
                                        {province.name}
                                      </option>
                                    ))}
                                  </select>
                                  {/* Custom Arrow Icon */}
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    {provinceLoading ? (
                                      <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 group-hover:text-gray-600 transition-colors duration-200">
                                        <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={shipProvinsi}
                                    onChange={(e) => {
                                      setShipProvinsi(e.target.value)
                                      setSelectedProvinceId('')
                                    }}
                                    placeholder="Contoh: Jawa Barat"
                                    className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 pr-24 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all duration-200 hover:border-gray-300"
                                  />
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsManualProvince(false)
                                        // Keep the manually entered value and set it as selected
                                        if (shipProvinsi) {
                                          // Find matching option or keep manual value
                                          const matched = provinceOptions.find((province) =>
                                            province.name.toLowerCase() === shipProvinsi.toLowerCase()
                                          )
                                          if (matched) {
                                            setSelectedProvinceId(matched.id)
                                          } else {
                                            // Keep manual mode if no match found
                                            return
                                          }
                                        }
                                      }}
                                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsManualProvince(false)
                                        // Reset to empty value when canceling
                                        setShipProvinsi('')
                                        setSelectedProvinceId('')
                                      }}
                                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 font-semibold"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              )}
                              {provinceError && !isManualProvince ? (
                                <p className="mt-1.5 text-xs text-red-600 flex items-start gap-1 animate-shake">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 mt-0.5">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                  </svg>
                                  Tidak dapat memuat provinsi. Silakan refresh halaman atau periksa koneksi anda
                                </p>
                              ) : null}
                            </div>

                            {/* Kelurahan - Enhanced Dropdown with Manual Input */}
                            <div className="group">
                              <label className="block font-belleza text-xs font-semibold text-gray-700 mb-1">
                                Kelurahan/Desa
                              </label>
                              {!isManualVillage ? (
                                <div className="relative">
                                  <select
                                    value={selectedVillageId}
                                    onChange={handleVillageSelect}
                                    disabled={!selectedDistrictId || villageLoading || villageOptions.length === 0}
                                    className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 pr-10 text-sm text-black bg-white focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 focus:shadow-lg transition-all duration-300 hover:border-gray-300 hover:shadow-md disabled:bg-gradient-to-br disabled:from-gray-50 disabled:to-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200 appearance-none cursor-pointer"
                                    style={{
                                      backgroundImage: 'none'
                                    }}
                                  >
                                    <option value="" className="text-gray-500">
                                      {!selectedDistrictId
                                        ? 'Pilih kecamatan terlebih dahulu'
                                        : villageLoading
                                          ? 'Memuat kelurahan/desa...'
                                          : villageOptions.length === 0
                                            ? 'Data tidak tersedia'
                                            : 'Pilih kelurahan/desa'}
                                    </option>
                                    {villageOptions.map((village) => (
                                      <option key={village.id} value={village.id} className="text-black py-2">
                                        {village.name}
                                      </option>
                                    ))}
                                  </select>
                                  {/* Custom Arrow Icon */}
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    {villageLoading ? (
                                      <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 group-hover:text-gray-600 transition-colors duration-200">
                                        <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={shipKelurahan}
                                    onChange={(e) => {
                                      setShipKelurahan(e.target.value)
                                      setSelectedVillageId('')
                                    }}
                                    placeholder="Contoh: Tugujaya"
                                    className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 pr-24 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all duration-200 hover:border-gray-300"
                                  />
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsManualVillage(false)
                                        // Keep the manually entered value and set it as selected
                                        if (shipKelurahan) {
                                          // Find matching option or keep manual value
                                          const matched = villageOptions.find((village) =>
                                            village.name.toLowerCase() === shipKelurahan.toLowerCase()
                                          )
                                          if (matched) {
                                            setSelectedVillageId(matched.id)
                                          } else {
                                            // Keep manual mode if no match found
                                            return
                                          }
                                        }
                                      }}
                                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsManualVillage(false)
                                        // Reset to empty value when canceling
                                        setShipKelurahan('')
                                        setSelectedVillageId('')
                                      }}
                                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 font-semibold"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              )}
                              {villageError && !isManualVillage ? (
                                <p className="mt-1.5 text-xs text-red-600 flex items-start gap-1 animate-shake">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 mt-0.5">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                  </svg>
                                  Tidak dapat memuat kelurahan/desa. Silakan refresh halaman atau periksa koneksi anda
                                </p>
                              ) : null}
                            </div>

                            {/* Postal Code - Dropdown with Manual Option */}
                            <div className="group">
                              <label className="block font-belleza text-xs font-semibold text-gray-700 mb-1">
                                Kode Pos
                              </label>
                              {!isManualPostalCode ? (
                                <div className="relative">
                                  <select
                                    value={shipPostal}
                                    onChange={handlePostalCodeSelect}
                                    disabled={!selectedDistrictId}
                                    className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 pr-10 text-sm text-black bg-white focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 focus:shadow-lg transition-all duration-300 hover:border-gray-300 hover:shadow-md disabled:bg-gradient-to-br disabled:from-gray-50 disabled:to-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200 appearance-none cursor-pointer"
                                    style={{
                                      backgroundImage: 'none'
                                    }}
                                  >
                                    <option value="" className="text-gray-500">
                                      {!selectedDistrictId
                                        ? 'Pilih kecamatan terlebih dahulu'
                                        : postalCodeOptions.length === 0
                                          ? 'Pilih atau input manual'
                                          : 'Pilih kode pos'}
                                    </option>
                                    {postalCodeOptions.map((postal) => (
                                      <option key={postal.code} value={postal.code} className="text-black py-2">
                                        {postal.code}
                                      </option>
                                    ))}
                                    {selectedDistrictId && (
                                      <option value="manual" className="text-blue-600 py-2 font-semibold">
                                        Input Manual
                                      </option>
                                    )}
                                  </select>
                                  {/* Custom Arrow Icon */}
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 group-hover:text-gray-600 transition-colors duration-200">
                                      <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </div>
                                </div>
                              ) : (
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={shipPostal}
                                    onChange={(e) => {
                                      // Only allow numbers and limit to 5 digits
                                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 5)
                                      setShipPostal(value)
                                    }}
                                    placeholder="Masukkan kode pos (5 digit)"
                                    className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 pr-24 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all duration-200 hover:border-gray-300"
                                  />
                                  <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsManualPostalCode(false)
                                        // Keep the manually entered postal code value
                                        // Don't clear the value, just switch back to dropdown mode
                                      }}
                                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsManualPostalCode(false)
                                        // Reset to empty value when canceling
                                        setShipPostal('')
                                      }}
                                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 font-semibold"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Negara - Without Icon */}
                            <div className="group">
                              <label className="block font-belleza text-xs font-semibold text-gray-700 mb-1">
                                Negara
                              </label>
                              <input 
                                type="text" 
                                value="Indonesia" 
                                readOnly 
                                aria-readonly="true" 
                                className="w-full rounded-lg border-2 border-gray-200 px-3.5 py-2.5 text-sm text-gray-600 bg-gray-50 focus:outline-none cursor-not-allowed" 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Save Button - More Compact */}
                        <div className="mt-5 md:mt-6 pt-3 md:pt-4 border-t border-gray-200">
                          <button 
                            onClick={handleSaveAddress} 
                            disabled={savingAddr} 
                            className="group relative w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-gray-900 to-black text-white px-6 py-2.5 font-semibold text-sm hover:from-black hover:to-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-black/20"
                          >
                            {savingAddr ? (
                              <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Menyimpan...
                              </>
                            ) : (
                              <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="transition-transform group-hover:scale-110">
                                  <path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" fill="currentColor"/>
                                </svg>
                                Simpan Alamat
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: Preview card - More Compact */}
                    <aside className="hidden lg:block sticky top-24">
                      <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                        {/* Card Header - Compact */}
                        <div className="bg-gradient-to-r from-gray-900 to-black p-3.5 text-white">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/>
                                </svg>
                              </div>
                              <div>
                                <h3 className="font-cormorant text-base font-bold">Pratinjau Alamat</h3>
                                <p className="text-[10px] text-gray-300">Live preview</p>
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full bg-white/20 backdrop-blur-sm text-white">
                              Utama
                            </span>
                          </div>
                        </div>

                        {/* Card Body - Compact */}
                        <div className="p-4">
                          <div className="space-y-2">
                            {shipNama && (
                              <div>
                                <p className="font-belleza text-xs md:text-sm text-gray-700">Nama</p>
                                <p className="font-belleza text-base text-black">{shipNama}</p>
                              </div>
                            )}

                            {shipPhone && (
                              <div>
                                <p className="font-belleza text-xs md:text-sm text-gray-700">Nomor Telepon</p>
                                <p className="font-belleza text-base text-black">{shipPhone}</p>
                              </div>
                            )}

                            {(shipStreet || shipKelurahan || shipKecamatan || shipKabupaten || shipProvinsi || shipPostal) && (
                              <div>
                                <p className="font-belleza text-xs md:text-sm text-gray-700">Alamat</p>
                                <p className="font-belleza text-base text-gray-900">
                                  {[
                                    shipStreet || null,
                                    shipKelurahan ? `Kel. ${shipKelurahan}` : null,
                                    shipKecamatan ? `Kec. ${shipKecamatan}` : null,
                                    shipKabupaten || null,
                                    shipProvinsi || null,
                                    shipPostal || null,
                                    (shipNegara || 'Indonesia')
                                  ].filter(Boolean).join(', ')}
                                </p>
                              </div>
                            )}

                            {!shipNama && !shipPhone && !shipStreet && !shipKabupaten && (
                              <div className="text-center py-4">
                                <p className="font-belleza text-xs text-gray-500">Mulai isi formulir untuk melihat preview</p>
                              </div>
                            )}
                          </div>

                          {/* Info Footer - Compact */}
                          <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
                            <div className="flex items-start gap-2">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-600 flex-shrink-0 mt-0.5">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                              </svg>
                              <p className="text-[11px] text-blue-800 font-belleza leading-relaxed">
                                Pastikan data sudah benar. Alamat ini akan digunakan untuk pengiriman pesanan Anda.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="font-cormorant text-xl md:text-2xl text-black">Detail Akun</h2>
                  <div className="mt-2 text-sm text-gray-600 font-belleza">Perbarui informasi akun dan kata sandi Anda.</div>
                  <div className="mt-5 max-w-3xl">
                    <div className="bg-white border border-gray-200 shadow-sm p-5 md:p-6 space-y-4">
                    {/* Nama */}
                    <div>
                      <label className="block font-belleza text-xs text-gray-700 mb-1">Nama</label>
                      <div className="relative">
                        <input type="text" defaultValue={user.nama} className="w-full rounded-md border border-gray-300 px-3 py-2 pr-9 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40" />
                        <span className="absolute inset-y-0 right-2 my-auto p-1.5 rounded">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                        </span>
                      </div>
                    </div>
                    {/* Email */}
                    <div>
                      <label className="block font-belleza text-xs text-gray-700 mb-1">Email</label>
                      <div className="relative">
                        <input type="email" defaultValue={user.email} className="w-full rounded-md border border-gray-300 px-3 py-2 pr-9 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40" />
                        <span className="absolute inset-y-0 right-2 my-auto p-1.5 rounded">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">Kami akan mengirimkan notifikasi ke email ini.</p>
                    </div>
                    {/* Password */}
                    <div>
                      <label className="block font-belleza text-xs text-gray-700 mb-1">Password</label>
                      <div className="relative">
                        <input type="password" defaultValue="********" className="w-full rounded-md border border-gray-300 px-3 py-2 pr-9 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40" />
                        <span className="absolute inset-y-0 right-2 my-auto p-1.5 rounded">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" fill="currentColor"/><path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.</p>
                    </div>
                    <div className="pt-2">
                      <button className="inline-flex items-center gap-2 rounded-none border border-black bg-black text-white px-4 py-2 text-sm hover:opacity-90">Simpan Perubahan</button>
                    </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
      </div>
      {/* Footer (compact mobile version) */}
      <footer className="bg-white py-6 md:py-4 mt-auto">
        <div className="w-full flex justify-center md:justify-end">
          <div className="w-full max-w-6xl md:max-w-7xl px-4 md:px-6">
            {/* Mobile: Original Layout */}
            <div className="grid grid-cols-1 md:hidden gap-4">
              {/* Brand + contact */}
              <div className="space-y-3">
                <div className="-ml-1">
                  <span className="font-cormorant font-bold text-xl tracking-wide text-black">MEORIS</span>
                  <div className="mt-1 text-[9px] tracking-[0.3em] uppercase text-gray-600">Footwear</div>
                </div>
                <ul className="space-y-2 font-belleza text-gray-700">
                  <li className="grid grid-cols-[20px_1fr] items-start gap-2">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black w-4 h-4"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 10.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor"/></svg>
                    <span className="text-xs leading-snug">Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat</span>
                  </li>
                  <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black w-4 h-4"><path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 11.19 19a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.09 4.18A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.78.59 2.63a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.45-1.16a2 2 0 0 1 2.11-.45c.85.27 1.73.47 2.63.59A2 2 0 0 1 22 16.92z" fill="currentColor"/></svg>
                    <span className="text-xs">+6289695971729</span>
                  </li>
                  <li className="grid grid-cols-[20px_1fr] items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black w-4 h-4"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm16 2l-8 5-8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span className="text-xs">info@meoris.erdanpee.com</span>
                  </li>
                </ul>
              </div>

              {/* Information */}
              <div className="pb-2">
                <h4 className="font-cormorant text-base text-black whitespace-nowrap">Informasi</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-belleza text-gray-700 text-xs">
                  <li><Link href="/docs/notifikasi" className="hover:underline">Notifikasi</Link></li>
                </ul>
              </div>

              {/* Help & Support */}
              <div className="pb-2">
                <h4 className="font-cormorant text-base text-black whitespace-nowrap">Bantuan & Dukungan</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-belleza text-gray-700 text-xs">
                  <li><Link href="/docs/pengembalian" className="hover:underline">Pengembalian</Link></li>
                  <li><Link href="/docs/syarat&ketentuan" className="hover:underline">Syarat & Ketentuan</Link></li>
                  <li><Link href="/docs/kebijakan-privacy" className="hover:underline">Kebijakan Privasi</Link></li>
                </ul>
              </div>

              {/* My Account */}
              <div className="pb-2">
                <h4 className="font-cormorant text-base text-black whitespace-nowrap">Akun Saya</h4>
                <div className="mt-1 w-10 h-[2px] bg-black"></div>
                <ul className="mt-3 space-y-2 font-belleza text-gray-700 text-xs">
                  <li><Link href="/my-account" className="hover:underline">Detail Akun</Link></li>
                  <li><a href="#" aria-label="Buka keranjang" className="hover:underline" onClick={(e) => { e.preventDefault(); setIsCartOpen(true); }}>Keranjang</a></li>
                  <li><a href="#" aria-label="Buka favorit" className="hover:underline" onClick={(e) => { e.preventDefault(); setIsFavOpen(true); }}>Favorit</a></li>
                  <li><Link href="/produk/pesanan" className="hover:underline">Pesanan</Link></li>
                </ul>
              </div>
            </div>

            {/* Desktop: Right aligned */}
            <div className="hidden md:flex items-center justify-end">
              <div className="font-belleza text-gray-600 text-sm flex items-center flex-wrap justify-end gap-x-2">
                <span className="font-cormorant font-bold text-black">MEORIS</span>
                <span className="text-xs tracking-[0.2em] uppercase text-gray-500">Footwear</span>
                <span className="text-gray-300 mx-1">•</span>
                <Link href="/docs/notifikasi" className="hover:text-black transition-colors">Notifikasi</Link>
                <span className="text-gray-300">•</span>
                <Link href="/docs/pengembalian" className="hover:text-black transition-colors">Pengembalian</Link>
                <span className="text-gray-300">•</span>
                <Link href="/docs/syarat&ketentuan" className="hover:text-black transition-colors">Syarat & Ketentuan</Link>
                <span className="text-gray-300">•</span>
                <Link href="/docs/kebijakan-privacy" className="hover:text-black transition-colors">Kebijakan Privasi</Link>
                <span className="text-gray-300">•</span>
                <Link href="/my-account" className="hover:text-black transition-colors">Detail Akun</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
    )
  )
}

export default function MyAccountPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AccountContent />
    </Suspense>
  );
}

