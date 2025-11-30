"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Header from '@/components/layout/Header';
import FloatingChat from '@/components/FloatingChat';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { produkDb } from '@/lib/database';
import { useCart } from '@/lib/useCart';
import { useFavorites } from '@/lib/useFavorites';
import { formatPaymentMethod } from '@/lib/paymentMethodFormatter';
import LottiePlayer from '@/components/LottiePlayer';
import { useChatContext } from '@/lib/chat-context';

type TabType = 'all' | 'unpaid' | 'processing' | 'shipped' | 'completed' | 'cancelled' | 'returns';

function UserPurchaseContent() {
  const { user, logout } = useAuth();
  const { items: cartItems, count: cartCount } = useCart();
  const { openChat } = useChatContext();
  const { favorites, count: favoritesCount, toggleFavorite } = useFavorites();
  const [mounted, setMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showTopBar, setShowTopBar] = useState(true);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [selectedLang, setSelectedLang] = useState('Indonesia');

  // Mobile states
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileVoucherOpen, setIsMobileVoucherOpen] = useState(false);
  const [isMobileFavOpen, setIsMobileFavOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [mobileSearchResults, setMobileSearchResults] = useState<any[]>([]);
  const [mobileSearchLoading, setMobileSearchLoading] = useState(false);
  const [mobileHasSearched, setMobileHasSearched] = useState(false);
  const [showMobileAccountMenu, setShowMobileAccountMenu] = useState(false);

  // View state - Initialize from searchParams to prevent flash
  const [activeView, setActiveView] = useState<'purchase' | 'profile' | 'address' | 'vouchers' | 'notifications' | 'order-detail' | 'return-detail'>(() => {
    const viewParam = searchParams.get('view') as 'purchase' | 'profile' | 'address' | 'vouchers' | 'notifications' | 'order-detail' | 'return-detail';
    if (viewParam && ['purchase', 'profile', 'address', 'vouchers', 'notifications', 'order-detail', 'return-detail'].includes(viewParam)) {
      return viewParam;
    }
    return 'purchase';
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when mobile sidebar dropdown is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
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
  }, [isMobileSidebarOpen]);

  // Redirect to login if user is not authenticated - check immediately
  useEffect(() => {
    if (mounted && !user) {
      router.replace('/login');
    }
  }, [mounted, user, router]);

  // Timeout for loading profile/address - redirect to home after 1 minute
  useEffect(() => {
    if ((activeView === 'profile' || activeView === 'address') && (!mounted || !user)) {
      const timeout = setTimeout(() => {
        // Show error notification
        setShowToast(true);
        setToastMessage('Gagal Memuat Data');
        setToastType('error');

        // Redirect to home after showing notification
        setTimeout(() => {
          router.push('/home');
        }, 500);
      }, 60000); // 60000ms = 1 minute

      return () => clearTimeout(timeout);
    }
  }, [activeView, mounted, user, router]);

  // Function to load user addresses
  const loadUserAddresses = useCallback(async () => {
    if (!user || !user.id) return;

    setLoadingAddresses(true);
    try {
      console.log('Loading addresses for user:', user.id);
      const response = await fetch(`/api/user/addresses?userId=${user.id}`);
      const data = await response.json();
      console.log('Addresses API response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Gagal memuat alamat');
      }

      console.log('Setting addresses to state:', data.addresses || []);
      setUserAddresses(data.addresses || []);
    } catch (error: any) {
      console.error('Load addresses error:', error);
      setShowToast(true);
      setToastMessage(error.message || 'Gagal memuat alamat');
      setToastType('error');
    } finally {
      setLoadingAddresses(false);
    }
  }, [user]);

  // Load user addresses when address view is active OR when viewing return timeline
  useEffect(() => {
    const shouldLoadAddresses =
      user &&
      user.id &&
      (activeView === 'address' ||
       (activeView === 'order-detail' && searchParams.get('timeline') === 'return') ||
       (activeView === 'return-detail' && searchParams.get('timeline') === 'return'));

    if (shouldLoadAddresses) {
      loadUserAddresses();
    }
  }, [activeView, user, searchParams, loadUserAddresses]);

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [userVouchers, setUserVouchers] = useState<any[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [claimingVoucher, setClaimingVoucher] = useState(false);
  const [claimMessage, setClaimMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userReturns, setUserReturns] = useState<any[]>([]); // All returns for user
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [shippingHistory, setShippingHistory] = useState<any[]>([]);
  const [detailedTracking, setDetailedTracking] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(() => {
    // Initialize based on URL to prevent flickering
    return searchParams.get('action') === 'returnrequest';
  });
  const [showReturnDetail, setShowReturnDetail] = useState(() => {
    // Initialize based on URL to prevent flickering
    const timelineParam = searchParams.get('timeline');
    // Show return detail for ANY timeline parameter (including 'review')
    return timelineParam !== null;
  });
  const [showUpdateSize, setShowUpdateSize] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [pendingSizeChanges, setPendingSizeChanges] = useState<Record<string, string>>({}); // itemId -> new size
  const [returnReason, setReturnReason] = useState('');
  const [returnDescription, setReturnDescription] = useState('');
  const [returnImages, setReturnImages] = useState<File[]>([]);
  const [returnImagePreviews, setReturnImagePreviews] = useState<string[]>([]);
  const [returnVideoLink, setReturnVideoLink] = useState('');
  const [existingReturn, setExistingReturn] = useState<any>(null);
  const [submittedReturn, setSubmittedReturn] = useState<any>(null);
  const [loadingReturnData, setLoadingReturnData] = useState(false);
  const [submitReturnLoading, setSubmitReturnLoading] = useState(false);
  const fetchingReturnRef = useRef(false);
  const lastFetchedReturnNumberRef = useRef<string | null>(null);
  const [shippingMethod, setShippingMethod] = useState<'dropoff' | 'pickup' | null>('pickup');
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [showReturnInfo, setShowReturnInfo] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [orderDetailInitialized, setOrderDetailInitialized] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [userAddress, setUserAddress] = useState<any>(null);
  const [showPackagingConfirm, setShowPackagingConfirm] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(8);
  const [activeTimelineStep, setActiveTimelineStep] = useState<'review' | 'return' | 'shipping' | 'validation' | 'replacement'>(() => {
    const timelineParam = searchParams.get('timeline') as 'review' | 'return' | 'shipping' | 'validation' | 'replacement' | null;
    if (timelineParam && ['review', 'return', 'shipping', 'validation', 'replacement'].includes(timelineParam)) {
      return timelineParam;
    }
    return 'review';
  });
  const [selectedCourier, setSelectedCourier] = useState<'sicepat' | 'jnt'>('sicepat');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [returnShippingHistory, setReturnShippingHistory] = useState<any[]>([]);
  const [returnDetailedTracking, setReturnDetailedTracking] = useState<any>(null);
  const [replacementShippingHistory, setReplacementShippingHistory] = useState<any[]>([]);
  const [replacementDetailedTracking, setReplacementDetailedTracking] = useState<any>(null);
  const [returnTrackingLoading, setReturnTrackingLoading] = useState(false);
  const [replacementTrackingLoading, setReplacementTrackingLoading] = useState(false);

  // Change email states
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState<'verify' | 'new-email' | 'success'>('verify');
  const [verificationCode, setVerificationCode] = useState('');
  const [newEmailInput, setNewEmailInput] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  // Phone and gender states
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [genderInput, setGenderInput] = useState<'male' | 'female' | 'other' | ''>('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Address form states - Initialize from URL
  const [showAddAddressForm, setShowAddAddressForm] = useState(() => {
    return searchParams.get('action') === 'addaddress';
  });
  const [userAddresses, setUserAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddressData, setNewAddressData] = useState({
    nama: '',
    phone: '',
    street: '',
    postal: '',
    negara: 'Indonesia'
  });
  const [selectedProvinceId, setSelectedProvinceId] = useState('');
  const [selectedRegencyId, setSelectedRegencyId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedVillageId, setSelectedVillageId] = useState('');
  const [provinceOptions, setProvinceOptions] = useState<any[]>([]);
  const [regencyOptions, setRegencyOptions] = useState<any[]>([]);
  const [districtOptions, setDistrictOptions] = useState<any[]>([]);
  const [villageOptions, setVillageOptions] = useState<any[]>([]);
  const [provinceLoading, setProvinceLoading] = useState(false);
  const [regencyLoading, setRegencyLoading] = useState(false);
  const [districtLoading, setDistrictLoading] = useState(false);
  const [villageLoading, setVillageLoading] = useState(false);
  const [postalCodeOptions, setPostalCodeOptions] = useState<Array<{ code: string; kelurahan: string }>>([]);
  const [isManualPostalCode, setIsManualPostalCode] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // Popup states for location selection
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [popupType, setPopupType] = useState<'province' | 'regency' | 'district' | 'village' | 'postal' | null>(null);
  const [popupSearchQuery, setPopupSearchQuery] = useState('');

  // Function to show toast notification
  const showToastNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToastType(type);
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // Function to handle change email - send verification code
  const handleSendEmailChangeCode = async () => {
    if (!user || !user.email) {
      showToastNotification('User tidak ditemukan', 'error');
      return;
    }

    // Langsung show modal tanpa delay
    setShowChangeEmailModal(true);
    setEmailChangeStep('verify');
    setVerificationError(''); // Clear any previous error
    setSendingCode(true);

    try {
      const response = await fetch('/api/user/send-email-change-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengirim kode');
      }

      showToastNotification('Kode verifikasi telah dikirim ke email Anda', 'success');
    } catch (error: any) {
      showToastNotification(error.message || 'Gagal mengirim kode', 'error');
      // Tutup modal jika gagal kirim kode
      setShowChangeEmailModal(false);
    } finally {
      setSendingCode(false);
    }
  };

  // Function to verify code and proceed to email input
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setVerificationError('Masukkan kode 6 digit');
      return;
    }

    if (!user || !user.email) {
      showToastNotification('User tidak ditemukan', 'error');
      return;
    }

    setVerifyingCode(true);
    setVerificationError(''); // Clear any previous error
    try {
      // Verify the code with the API
      const response = await fetch('/api/user/verify-email-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: verificationCode,
          email: user.email,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kode verifikasi salah');
      }

      // If valid, move to next step
      showToastNotification('Kode verifikasi berhasil! Masukkan email baru.', 'success');
      setEmailChangeStep('new-email');
      setVerificationError(''); // Clear error on success
    } catch (error: any) {
      setVerificationError(error.message || 'Kode verifikasi salah');
    } finally {
      setVerifyingCode(false);
    }
  };

  // Function to change email with verified code
  const handleChangeEmail = async () => {
    if (!user || !user.email) {
      showToastNotification('User tidak ditemukan', 'error');
      return;
    }

    if (!newEmailInput || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmailInput)) {
      showToastNotification('Format email tidak valid', 'error');
      return;
    }

    if (newEmailInput === user.email) {
      showToastNotification('Email baru sama dengan email lama', 'error');
      return;
    }

    setVerifyingCode(true);
    try {
      console.log('Sending request to change email:', {
        code: verificationCode,
        currentEmail: user.email,
        newEmail: newEmailInput,
        userId: user.id,
      });

      const response = await fetch('/api/user/verify-and-change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: verificationCode,
          currentEmail: user.email,
          newEmail: newEmailInput,
          userId: user.id,
        }),
      });

      const data = await response.json();
      console.log('Response from API:', response.status, data);

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengubah email');
      }

      // Show success step in modal instead of toast
      setEmailChangeStep('success');
    } catch (error: any) {
      console.error('Error changing email:', error);
      showToastNotification(error.message || 'Gagal mengubah email', 'error');
    } finally {
      setVerifyingCode(false);
    }
  };

  // Function to update phone
  const handleUpdatePhone = async () => {
    if (!user || !user.id) {
      showToastNotification('User tidak ditemukan', 'error');
      return;
    }

    if (!phoneInput || phoneInput.trim() === '') {
      showToastNotification('Nomor telepon tidak boleh kosong', 'error');
      return;
    }

    setUpdatingProfile(true);
    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          phone: phoneInput.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengupdate nomor telepon');
      }

      showToastNotification('Nomor telepon berhasil diupdate', 'success');
      setShowPhoneModal(false);
      setPhoneInput('');

      // Refresh user data from database
      const { auth } = await import('@/lib/auth');
      await auth.refreshUser();
    } catch (error: any) {
      showToastNotification(error.message || 'Gagal mengupdate nomor telepon', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Function to update gender
  const handleUpdateGender = async () => {
    if (!user || !user.id) {
      showToastNotification('User tidak ditemukan', 'error');
      return;
    }

    if (!genderInput) {
      showToastNotification('Pilih jenis kelamin', 'error');
      return;
    }

    setUpdatingProfile(true);
    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          gender: genderInput,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengupdate jenis kelamin');
      }

      showToastNotification('Jenis kelamin berhasil diupdate', 'success');
      setShowGenderModal(false);
      setGenderInput('');

      // Refresh user data from database
      const { auth } = await import('@/lib/auth');
      await auth.refreshUser();
    } catch (error: any) {
      showToastNotification(error.message || 'Gagal mengupdate jenis kelamin', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };
  // Function to delete address
  const handleDeleteAddress = async (addressId: string) => {
    if (!user || !user.id) return;

    if (!confirm('Apakah Anda yakin ingin menghapus alamat ini?')) return;

    try {
      const response = await fetch(`/api/user/addresses?addressId=${addressId}&userId=${user.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus alamat');
      }

      showToastNotification('Alamat berhasil dihapus', 'success');
      await loadUserAddresses();
    } catch (error: any) {
      showToastNotification(error.message || 'Gagal menghapus alamat', 'error');
    }
  };

  // Function to set default address
  const handleSetDefaultAddress = async (addressId: string) => {
    if (!user || !user.id) {
      console.error('User not logged in');
      showToastNotification('User tidak ditemukan', 'error');
      return;
    }

    console.log('Setting default address:', addressId, 'for user:', user.id);
    setLoadingAddresses(true);

    try {
      const response = await fetch('/api/user/addresses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressId,
          userId: user.id,
          isDefault: true,
        }),
      });

      const data = await response.json();
      console.log('Set default response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengatur alamat default');
      }

      showToastNotification('Alamat default berhasil diatur', 'success');
      await loadUserAddresses();
    } catch (error: any) {
      console.error('Error setting default address:', error);
      showToastNotification(error.message || 'Gagal mengatur alamat default', 'error');
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Function to edit address
  const handleEditAddress = (address: any) => {
    setEditingAddressId(address.id);
    setNewAddressData({
      nama: address.nama,
      phone: address.phone,
      street: address.street,
      postal: address.postal,
      negara: 'Indonesia',
    });
    // Note: Region dropdowns will need to be re-selected by user
    // TODO: Store region IDs in database for proper edit functionality
    setSelectedProvinceId('');
    setSelectedRegencyId('');
    setSelectedDistrictId('');
    setSelectedVillageId('');

    // Set action parameter in URL
    const params = new URLSearchParams(window.location.search);
    params.set('action', 'addaddress');
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });

    setShowAddAddressForm(true);
  };

  // Function to update URL with timeline step
  const updateTimelineUrl = (step: 'review' | 'return' | 'shipping' | 'validation' | 'replacement') => {
    // Close mobile sidebar first to prevent overlay interference
    setIsMobileSidebarOpen(false);

    const params = new URLSearchParams(window.location.search);
    params.set('timeline', step);
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    setActiveTimelineStep(step);
  };

  // Function to open return form with URL update
  const openReturnForm = () => {
    // Close mobile sidebar first to prevent overlay interference
    setIsMobileSidebarOpen(false);

    const params = new URLSearchParams(window.location.search);
    params.set('action', 'returnrequest');
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    setShowReturnForm(true);
  };

  // Function to close return form with URL update
  const closeReturnForm = () => {
    // Close mobile sidebar first to prevent overlay interference
    setIsMobileSidebarOpen(false);

    const params = new URLSearchParams(window.location.search);
    params.delete('action');
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    setShowReturnForm(false);
  };

  // Fetch provinces
  useEffect(() => {
    if (!showAddAddressForm) return;

    setProvinceLoading(true);
    fetch('/api/wilayah/provinsi')
      .then((res) => res.json())
      .then((data) => setProvinceOptions(data))
      .catch((err) => console.error('Error loading provinces:', err))
      .finally(() => setProvinceLoading(false));
  }, [showAddAddressForm]);

  // Fetch regencies when province selected
  useEffect(() => {
    if (!selectedProvinceId) {
      setRegencyOptions([]);
      setDistrictOptions([]);
      setVillageOptions([]);
      return;
    }

    setRegencyLoading(true);
    fetch(`/api/wilayah/kabupaten?kode_provinsi=${selectedProvinceId}`)
      .then((res) => res.json())
      .then((data) => setRegencyOptions(data))
      .catch((err) => console.error('Error loading regencies:', err))
      .finally(() => setRegencyLoading(false));
  }, [selectedProvinceId]);

  // Fetch districts when regency selected
  useEffect(() => {
    if (!selectedRegencyId) {
      setDistrictOptions([]);
      setVillageOptions([]);
      return;
    }

    setDistrictLoading(true);
    fetch(`/api/wilayah/kecamatan?kode_kabupaten=${selectedRegencyId}`)
      .then((res) => res.json())
      .then((data) => setDistrictOptions(data))
      .catch((err) => console.error('Error loading districts:', err))
      .finally(() => setDistrictLoading(false));
  }, [selectedRegencyId]);

  // Fetch villages when district selected
  useEffect(() => {
    if (!selectedDistrictId) {
      setVillageOptions([]);
      return;
    }

    setVillageLoading(true);
    fetch(`/api/wilayah/desa?kode_kecamatan=${selectedDistrictId}`)
      .then((res) => res.json())
      .then((data) => setVillageOptions(data))
      .catch((err) => console.error('Error loading villages:', err))
      .finally(() => setVillageLoading(false));
  }, [selectedDistrictId]);

  // Fetch postal codes when district is selected
  useEffect(() => {
    if (!selectedDistrictId || !selectedRegencyId || !selectedProvinceId) {
      setPostalCodeOptions([]);
      return;
    }

    fetch(`/api/wilayah/kodepos?kode_provinsi=${selectedProvinceId}&kode_kabupaten=${selectedRegencyId}&kode_kecamatan=${selectedDistrictId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Array<{ id: string; code: string }>>;
      })
      .then((data) => {
        console.log('Received kodepos data:', data);
        const postalOptions = data.map((item) => ({
          code: item.code,
          kelurahan: '' // No kelurahan mapping available from API
        }));
        setPostalCodeOptions(postalOptions);
      })
      .catch((err) => {
        console.error('Gagal memuat kode pos', err);
        setPostalCodeOptions([]);
      });
  }, [selectedDistrictId, selectedRegencyId, selectedProvinceId]);

  // Handler for postal code select
  const handlePostalCodeSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'manual') {
      setIsManualPostalCode(true);
      // Don't clear the current value when switching to manual mode
    } else {
      setIsManualPostalCode(false);
      setNewAddressData({...newAddressData, postal: value});
    }
  };

  // Save new address
  const handleSaveAddress = async () => {
    if (!user) return;

    // Validation
    if (!newAddressData.nama || !newAddressData.phone || !newAddressData.street) {
      setShowToast(true);
      setToastMessage('Mohon lengkapi nama, telepon, dan alamat jalan');
      setToastType('error');
      return;
    }

    if (!selectedProvinceId || !selectedRegencyId || !selectedDistrictId || !selectedVillageId) {
      setShowToast(true);
      setToastMessage('Mohon pilih provinsi, kabupaten, kecamatan, dan kelurahan');
      setToastType('error');
      return;
    }

    setSavingAddress(true);

    try {
      const provinsi = provinceOptions.find(p => p.id === selectedProvinceId)?.name || '';
      const kabupaten = regencyOptions.find(r => r.id === selectedRegencyId)?.name || '';
      const kecamatan = districtOptions.find(d => d.id === selectedDistrictId)?.name || '';
      const kelurahan = villageOptions.find(v => v.id === selectedVillageId)?.name || '';

      const addressPayload = {
        userId: user.id,
        nama: newAddressData.nama,
        phone: newAddressData.phone,
        street: newAddressData.street,
        provinsi,
        kabupaten,
        kecamatan,
        kelurahan,
        postal: newAddressData.postal || '',
        isDefault: userAddresses.length === 0 // First address is default
      };

      let response;
      if (editingAddressId) {
        // Update existing address
        response = await fetch('/api/user/addresses', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addressId: editingAddressId,
            ...addressPayload
          })
        });
      } else {
        // Create new address
        response = await fetch('/api/user/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(addressPayload)
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menyimpan alamat');
      }

      setShowToast(true);
      setToastMessage(editingAddressId ? 'Alamat berhasil diupdate' : 'Alamat berhasil disimpan');
      setToastType('success');

      // Remove action parameter from URL
      const params = new URLSearchParams(window.location.search);
      params.delete('action');
      router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });

      setShowAddAddressForm(false);
      setEditingAddressId(null);

      // Reset form
      setNewAddressData({
        nama: '',
        phone: '',
        street: '',
        postal: '',
        negara: 'Indonesia'
      });
      setSelectedProvinceId('');
      setSelectedRegencyId('');
      setSelectedDistrictId('');
      setSelectedVillageId('');

      // Reload addresses
      await loadUserAddresses();

    } catch (error: any) {
      console.error('Error saving address:', error);
      setShowToast(true);
      setToastMessage(error.message || 'Gagal menyimpan alamat');
      setToastType('error');
    } finally {
      setSavingAddress(false);
    }
  };

  // Cancel add address form and reset
  const handleCancelAddAddress = () => {
    // Reset form
    setNewAddressData({
      nama: '',
      phone: '',
      street: '',
      postal: '',
      negara: 'Indonesia'
    });
    setSelectedProvinceId('');
    setSelectedRegencyId('');
    setSelectedDistrictId('');
    setSelectedVillageId('');
    setEditingAddressId(null);

    // Remove action parameter from URL
    const params = new URLSearchParams(window.location.search);
    params.delete('action');
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });

    // Go back to address list
    setShowAddAddressForm(false);
  };

  // Set active view based on URL query parameter
  useEffect(() => {
    const viewParam = searchParams.get('view') as 'purchase' | 'profile' | 'address' | 'vouchers' | 'order-detail' | 'return-detail';
    const orderParam = searchParams.get('order');
    const returnParam = searchParams.get('return');
    const timelineParam = searchParams.get('timeline') as 'review' | 'return' | 'shipping' | 'validation' | 'replacement' | null;
    const actionParam = searchParams.get('action');

    // Reset fetch ref if not viewing return-detail
    if (viewParam !== 'return-detail') {
      fetchingReturnRef.current = false;
      lastFetchedReturnNumberRef.current = null;
    }

    // Don't override showReturnDetail state if viewing return-detail page
    // The return-detail fetch logic will handle setting showReturnDetail
    if (viewParam !== 'return-detail') {
      // Check if return form should be shown
      // Note: If return already exists, this will be overridden by the order loading logic below
      if (actionParam === 'returnrequest') {
        setShowReturnForm(true);
        setShowReturnDetail(false);
      } else if (actionParam !== 'returnrequest' && !timelineParam) {
        // Only reset if no timeline parameter (to prevent flickering)
        setShowReturnForm(false);
      }

      // If timeline parameter exists (user viewing return detail), show return detail
      if (timelineParam && ['review', 'return', 'shipping', 'validation', 'replacement'].includes(timelineParam)) {
        setShowReturnDetail(true);
        setShowReturnForm(false);
      } else if (!timelineParam) {
        // Only reset to order detail view if NO timeline parameter
        if (!actionParam || actionParam !== 'returnrequest') {
          setShowReturnDetail(false);
        }
      }
    }

    // Check if update detail form should be shown
    if (actionParam === 'update-detail') {
      setShowUpdateSize(true);
    } else if (actionParam !== 'update-detail') {
      setShowUpdateSize(false);
    }

    // Check if add address form should be shown
    if (actionParam === 'addaddress') {
      setShowAddAddressForm(true);
    }

    // Check if return detail view should be shown (similar to addaddress pattern)
    if (actionParam === 'viewreturn' && timelineParam) {
      setShowReturnDetail(true);
      setShowReturnForm(false);
    }

    // Set timeline step from URL only
    if (timelineParam && ['review', 'return', 'shipping', 'validation', 'replacement'].includes(timelineParam)) {
      setActiveTimelineStep(timelineParam);
    }

    // Mark as initialized after processing URL params to prevent flickering
    if (viewParam === 'order-detail' || viewParam === 'return-detail') {
      // Small delay to ensure all states are set before showing content
      setTimeout(() => {
        setOrderDetailInitialized(true);
      }, 50);
    } else {
      setOrderDetailInitialized(false);
    }

    if (viewParam && ['purchase', 'profile', 'address', 'vouchers', 'order-detail', 'return-detail'].includes(viewParam)) {
      setActiveView(viewParam);
      // Expand account menu if profile or address view
      if (viewParam === 'profile' || viewParam === 'address') {
        setShowAccountMenu(true);
      }

      // Load return detail if viewing return-detail
      if (viewParam === 'return-detail' && returnParam) {
        // Skip if already fetching
        if (fetchingReturnRef.current) {
          console.log('⏸️ Already fetching, skipping...');
        }
        // Skip if already loaded this return_number
        else if (lastFetchedReturnNumberRef.current === returnParam) {
          console.log('✅ Already loaded return_number:', returnParam, '- skipping fetch');
          // Data already loaded, ensure loading states are false
          if (loadingDetail || loadingReturnData) {
            setLoadingDetail(false);
            setLoadingReturnData(false);
          }
        }
        // Fetch the return data
        else {
          console.log('🔍 Loading return detail for return_number:', returnParam);

          // Set loading state and ref
          fetchingReturnRef.current = true;
          lastFetchedReturnNumberRef.current = returnParam;
          setLoadingDetail(true);
          setLoadingReturnData(true);

          // Fetch return by return_number
          (async () => {
          try {
            console.log('📡 Fetching return data from database...');
            const { data: returnData, error: returnError } = await supabase
              .from('returns')
              .select(`
                *,
                replacement_items (
                  id,
                  product_id,
                  product_name,
                  product_size,
                  quantity,
                  product_photo,
                  product_price
                )
              `)
              .eq('return_number', returnParam)
              .eq('user_id', user?.id)
              .maybeSingle();

            if (returnError || !returnData) {
              console.error('Return not found:', returnError);
              setLoadingDetail(false);
              setLoadingReturnData(false);
              alert('Pengajuan pengembalian tidak ditemukan');
              router.push('/user/purchase');
              return;
            }

            console.log('🔍 Loaded return by return_number:', returnData);
            setSubmittedReturn(returnData);
            setExistingReturn(returnData);

            // Now fetch the order data
            const { data: orderData, error: orderError } = await supabase
              .from('orders')
              .select(`
                *,
                has_been_updated,
                updated_at,
                order_items (
                  *,
                  produk:produk_id (
                    id,
                    nama_produk,
                    photo1,
                    harga,
                    size1,
                    size2,
                    size3,
                    size4,
                    size5
                  )
                ),
                checkout:checkout_submission_id (
                  subtotal,
                  shipping_cost,
                  total,
                  shipping_address,
                  shipping_method,
                  payment_method,
                  order_summary
                )
              `)
              .eq('id', returnData.order_id)
              .eq('user_id', user?.id)
              .maybeSingle();

            if (orderError || !orderData) {
              console.error('Order not found:', orderError);
              setLoadingDetail(false);
              setLoadingReturnData(false);
              alert('Pesanan tidak ditemukan');
              router.push('/user/purchase');
              return;
            }

            // Parse shipping_address if it's a string
            if (orderData.shipping_address && typeof orderData.shipping_address === 'string') {
              try {
                orderData.shipping_address_json = JSON.parse(orderData.shipping_address);
              } catch (e) {
                orderData.shipping_address_json = null;
              }
            }

            console.log('✅ Setting states for return-detail view');
            setSelectedOrder(orderData);
            setShowReturnDetail(true);
            setShowReturnForm(false);
            console.log('✅ showReturnDetail set to TRUE');

            // Set timeline step based on URL parameter or return status
            const timelineParam = searchParams.get('timeline');
            if (timelineParam) {
              setActiveTimelineStep(timelineParam as 'review' | 'return' | 'shipping' | 'validation' | 'replacement');
            } else {
              // Auto-detect timeline step from status
              let correctStep: 'review' | 'return' | 'shipping' | 'validation' | 'replacement' = 'review';

              if (returnData.status === 'replacement_shipped') {
                correctStep = 'replacement';
              } else if (returnData.status === 'validating') {
                correctStep = 'validation';
              } else if (returnData.status === 'approved' && returnData.return_waybill) {
                correctStep = 'shipping';
              } else if (returnData.status === 'approved') {
                correctStep = 'return';
              } else if (returnData.status === 'pending') {
                correctStep = 'review';
              }

              setActiveTimelineStep(correctStep);
            }

            setLoadingDetail(false);
            setLoadingReturnData(false);
          } catch (err) {
            console.error('Error loading return detail:', err);
            setLoadingDetail(false);
            setLoadingReturnData(false);
            alert('Terjadi kesalahan saat memuat data pengembalian');
            router.push('/user/purchase');
          } finally {
            fetchingReturnRef.current = false;
          }
          })();
        }
      }

      // Load order if viewing order detail
      else if (viewParam === 'order-detail' && orderParam) {
        // Set loading state
        setLoadingDetail(true);

        // First try to find in userOrders
        const orderInList = userOrders.find(o =>
          o.order_number === orderParam ||
          o.id === orderParam || // Full UUID match
          o.id.replace(/-/g, '').substring(0, 12) === orderParam
        );

        if (orderInList) {
          setSelectedOrder(orderInList);
          setLoadingDetail(false);

          // Check if order has existing return and auto show return detail
          (async () => {
            try {
              setLoadingReturnData(true);
              const { data: existingReturnData } = await supabase
                .from('returns')
                .select(`
                  *,
                  replacement_items (
                    id,
                    product_id,
                    product_name,
                    product_size,
                    quantity,
                    product_photo,
                    product_price
                  )
                `)
                .eq('order_id', orderInList.id)
                .maybeSingle();

              if (existingReturnData) {
                console.log('🔍 Loaded return data:', existingReturnData);
                console.log('📸 Photo paths:', existingReturnData.photo_paths);
                console.log('🎥 Video paths:', existingReturnData.video_paths);

                // Only set submittedReturn if return is NOT expired
                if (existingReturnData.status !== 'expired') {
                  setSubmittedReturn(existingReturnData);
                  setExistingReturn(existingReturnData);

                  // Check if timeline parameter exists in URL
                  const params = new URLSearchParams(window.location.search);
                  const hasTimelineParam = params.get('timeline');

                  // Don't auto-show return detail for completed orders - let user click button
                  // UNLESS timeline parameter exists (meaning user explicitly clicked to view it)
                  if (existingReturnData.status === 'completed') {
                    if (hasTimelineParam) {
                      // User explicitly wants to see return detail via timeline parameter
                      setShowReturnDetail(true);
                      setShowReturnForm(false);
                    } else {
                      // Auto-hide for completed orders when no timeline param
                      setShowReturnDetail(false);
                      setShowReturnForm(false);
                    }
                  } else {
                    // For in-progress returns, only show return detail if timeline parameter exists
                    if (hasTimelineParam) {
                      setShowReturnDetail(true);
                      setShowReturnForm(false);

                      // Set timeline to correct step based on status
                      let correctStep: 'review' | 'return' | 'shipping' | 'validation' | 'replacement' = hasTimelineParam as any;

                      // Validate and correct the step if needed
                      if (existingReturnData.status === 'replacement_shipped') {
                        correctStep = 'replacement';
                      } else if (existingReturnData.status === 'validating') {
                        correctStep = 'validation';
                      } else if (existingReturnData.status === 'approved' && existingReturnData.return_waybill) {
                        correctStep = 'shipping';
                      } else if (existingReturnData.status === 'approved') {
                        correctStep = 'return';
                      } else if (existingReturnData.status === 'pending') {
                        correctStep = 'review';
                      }

                      setActiveTimelineStep(correctStep);
                    } else {
                      // No timeline parameter - show normal order detail
                      setShowReturnDetail(false);
                      setShowReturnForm(false);
                    }
                  }
                } else {
                  // If expired, don't set submittedReturn to avoid timeline parameter in URL
                  setSubmittedReturn(null);
                  setShowReturnDetail(false);
                  setShowReturnForm(false);
                }
              }
            } catch {
              // No return found, that's fine
              setShowReturnDetail(false);
            } finally {
              setLoadingReturnData(false);
            }
          })();
        } else if (user) {
          // If not in list, fetch directly from database
          // Try by order_number first
          (async () => {
            try {
              const { data: orderData, error } = await supabase
                .from('orders')
                .select(`
                  *,
                  has_been_updated,
                  updated_at,
                  order_items (
                    *,
                    produk:produk_id (
                      id,
                      nama_produk,
                      photo1,
                      harga,
                      size1,
                      size2,
                      size3,
                      size4,
                      size5
                    )
                  ),
                  checkout:checkout_submission_id (
                    subtotal,
                    shipping_cost,
                    total,
                    shipping_address,
                    shipping_method,
                    payment_method,
                    order_summary
                  )
                `)
                .eq('user_id', user.id)
                .eq('order_number', orderParam)
                .maybeSingle();

              if (orderData && !error) {
                // Parse shipping_address if it's a string
                if (orderData.shipping_address && typeof orderData.shipping_address === 'string') {
                  try {
                    orderData.shipping_address_json = JSON.parse(orderData.shipping_address);
                  } catch (e) {
                    orderData.shipping_address_json = null;
                  }
                }

                setSelectedOrder(orderData);
                setLoadingDetail(false);

                // Check if order has existing return
                try {
                  setLoadingReturnData(true);
                  const { data: existingReturnData } = await supabase
                    .from('returns')
                    .select(`
                      *,
                      replacement_items (
                        id,
                        product_id,
                        product_name,
                        product_size,
                        quantity,
                        product_photo,
                        product_price
                      )
                    `)
                    .eq('order_id', orderData.id)
                    .maybeSingle();

                  if (existingReturnData) {
                    console.log('🔍 [Second load] Return data:', existingReturnData);
                    console.log('📸 [Second load] Photo paths:', existingReturnData.photo_paths);
                    console.log('🎥 [Second load] Video paths:', existingReturnData.video_paths);

                    // Only set submittedReturn if return is NOT expired
                    if (existingReturnData.status !== 'expired') {
                      setSubmittedReturn(existingReturnData);

                      // Check if timeline parameter exists in URL
                      const params = new URLSearchParams(window.location.search);
                      const hasTimelineParam = params.get('timeline');

                      // Don't auto-show return detail for completed orders - let user click button
                      // UNLESS timeline parameter exists (meaning user explicitly clicked to view it)
                      if (existingReturnData.status === 'completed') {
                        if (hasTimelineParam) {
                          // User explicitly wants to see return detail via timeline parameter
                          setShowReturnDetail(true);
                          setShowReturnForm(false);
                        } else {
                          // Auto-hide for completed orders when no timeline param
                          setShowReturnDetail(false);
                          setShowReturnForm(false);
                        }
                      } else {
                        // For in-progress returns, show return detail
                        setShowReturnDetail(true);
                        setShowReturnForm(false);
                      }
                    } else {
                      // If expired, don't set submittedReturn to avoid timeline parameter in URL
                      setSubmittedReturn(null);
                      setShowReturnDetail(false);
                      setShowReturnForm(false);
                    }
                  }
                } catch {
                  setShowReturnDetail(false);
                } finally {
                  setLoadingReturnData(false);
                }
              } else {
                // If not found by order_number, try by UUID or payment reference
                try {
                  // Check if orderParam looks like a UUID (contains hyphens and is 36 chars)
                  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderParam);

                  let orderDataById = null;
                  let errorById = null;

                  if (isUUID) {
                    // If UUID, query orders table by id
                    const result = await supabase
                      .from('orders')
                      .select(`
                        *,
                        has_been_updated,
                        updated_at,
                        order_items (
                          *,
                          produk:produk_id (
                            id,
                            nama_produk,
                            photo1,
                            harga,
                            size1,
                            size2,
                            size3,
                            size4,
                            size5
                          )
                        ),
                        checkout:checkout_submission_id (
                          subtotal,
                          shipping_cost,
                          total,
                          shipping_address,
                          shipping_method,
                          payment_method,
                          order_summary
                        )
                      `)
                      .eq('user_id', user.id)
                      .eq('id', orderParam)
                      .maybeSingle();

                    orderDataById = result.data;
                    errorById = result.error;
                  } else {
                    // If not UUID, try to find in checkout_submissions by payment_reference
                    const { data: checkoutData, error: checkoutError } = await supabase
                      .from('checkout_submissions')
                      .select('*')
                      .eq('user_id', user.id)
                      .eq('payment_reference', orderParam)
                      .maybeSingle();

                    if (checkoutData && !checkoutError) {
                      // Convert checkout to pseudo-order format
                      const { data: productsData } = await supabase
                        .from('produk')
                        .select('id, nama_produk, photo1, harga, size1, size2, size3, size4, size5')
                        .in('id', checkoutData.items?.map((item: any) => item.produk_id) || []);

                      const productsMap = new Map(productsData?.map(p => [p.id, p]) || []);

                      orderDataById = {
                        id: checkoutData.id,
                        order_number: checkoutData.payment_reference,
                        status: checkoutData.status === 'submitted' ? 'pending' : checkoutData.status, // Use actual status for cancelled
                        total_amount: checkoutData.total,
                        created_at: checkoutData.created_at,
                        updated_at: checkoutData.updated_at,
                        user_id: checkoutData.user_id,
                        shipping_address_json: checkoutData.shipping_address,
                        payment_method: checkoutData.payment_method,
                        shipping_method: checkoutData.shipping_method,
                        payment_details: checkoutData.payment_details,
                        payment_expired_at: checkoutData.payment_expired_at,
                        checkout: {
                          subtotal: checkoutData.subtotal,
                          shipping_cost: checkoutData.shipping_cost,
                          total: checkoutData.total,
                          shipping_address: checkoutData.shipping_address,
                          payment_method: checkoutData.payment_method,
                          shipping_method: checkoutData.shipping_method,
                          order_summary: checkoutData.order_summary
                        },
                        order_items: checkoutData.items?.map((item: any) => {
                          const productDetail = productsMap.get(item.produk_id);
                          return {
                            id: `${checkoutData.id}-${item.produk_id}`,
                            price: item.harga_satuan,
                            quantity: item.quantity,
                            size: item.size,
                            produk: {
                              id: item.produk_id,
                              nama_produk: item.nama_produk,
                              photo1: productDetail?.photo1,
                              harga: productDetail?.harga,
                              size1: productDetail?.size1,
                              size2: productDetail?.size2,
                              size3: productDetail?.size3,
                              size4: productDetail?.size4,
                              size5: productDetail?.size5
                            }
                          };
                        }) || []
                      };
                      errorById = null;
                    } else {
                      errorById = checkoutError;
                    }
                  }

                  if (orderDataById && !errorById) {
                    // Parse shipping_address if it's a string
                    if (orderDataById.shipping_address && typeof orderDataById.shipping_address === 'string') {
                      try {
                        orderDataById.shipping_address_json = JSON.parse(orderDataById.shipping_address);
                      } catch (e) {
                        orderDataById.shipping_address_json = null;
                      }
                    }

                    setSelectedOrder(orderDataById);
                    setLoadingDetail(false);

                    // Check if order has existing return
                    try {
                      setLoadingReturnData(true);
                      const { data: existingReturnData } = await supabase
                        .from('returns')
                        .select(`
                          *,
                          replacement_items (
                            id,
                            product_name,
                            product_size,
                            quantity
                          )
                        `)
                        .eq('order_id', orderDataById.id)
                        .maybeSingle();

                      if (existingReturnData) {
                        // Only set submittedReturn if return is NOT expired
                        if (existingReturnData.status !== 'expired') {
                          setSubmittedReturn(existingReturnData);
                          setExistingReturn(existingReturnData);

                          // Check if timeline parameter exists in URL
                          const params = new URLSearchParams(window.location.search);
                          const hasTimelineParam = params.get('timeline');

                          // Don't auto-show return detail for completed orders - let user click button
                          // UNLESS timeline parameter exists (meaning user explicitly clicked to view it)
                          if (existingReturnData.status === 'completed') {
                            if (hasTimelineParam) {
                              // User explicitly wants to see return detail via timeline parameter
                              setShowReturnDetail(true);
                              setShowReturnForm(false);
                            } else {
                              // Auto-hide for completed orders when no timeline param
                              setShowReturnDetail(false);
                              setShowReturnForm(false);
                            }
                          } else {
                            // For in-progress returns, only show return detail if timeline parameter exists
                            if (hasTimelineParam) {
                              setShowReturnDetail(true);
                              setShowReturnForm(false);

                              // Set timeline to correct step based on status
                              let correctStep: 'review' | 'return' | 'shipping' | 'validation' | 'replacement' = hasTimelineParam as any;

                              // Validate and correct the step if needed
                              if (existingReturnData.status === 'replacement_shipped') {
                                correctStep = 'replacement';
                              } else if (existingReturnData.status === 'validating') {
                                correctStep = 'validation';
                              } else if (existingReturnData.status === 'approved' && existingReturnData.return_waybill) {
                                correctStep = 'shipping';
                              } else if (existingReturnData.status === 'approved') {
                                correctStep = 'return';
                              } else if (existingReturnData.status === 'pending') {
                                correctStep = 'review';
                              }

                              setActiveTimelineStep(correctStep);
                            } else {
                              // No timeline parameter - show normal order detail
                              setShowReturnDetail(false);
                              setShowReturnForm(false);
                            }
                          }
                        } else {
                          // If expired, don't set submittedReturn to avoid timeline parameter in URL
                          setSubmittedReturn(null);
                          setShowReturnDetail(false);
                          setShowReturnForm(false);
                        }
                      }
                    } catch {
                      setShowReturnDetail(false);
                    } finally {
                      setLoadingReturnData(false);
                    }
                  } else {
                    // Order not found by ID
                    setLoadingDetail(false);
                    setLoadingReturnData(false);
                  }
                } catch (err) {
                  console.error('Error fetching order by id:', err);
                  setLoadingDetail(false);
                  setLoadingReturnData(false);
                }
              }
            } catch (err) {
              console.error('Error fetching order:', err);
              setLoadingDetail(false);
              setLoadingReturnData(false);
            }
          })();
        }
      }
    }
  }, [searchParams, userOrders, user, router]); // Removed supabase from deps (it's a singleton)

  // Separate useEffect for timeline sync based on submittedReturn - NO AUTO-REDIRECT
  useEffect(() => {
    const timelineParam = searchParams.get('timeline');

    if (submittedReturn && submittedReturn.status !== 'expired') {
      // If timeline param exists, update activeTimelineStep to match
      if (timelineParam) {
        setActiveTimelineStep(timelineParam as 'review' | 'return' | 'shipping' | 'validation' | 'replacement');
      }
      // DO NOT auto-add timeline parameter - let user decide when to view return details
    } else if (timelineParam && !loadingReturnData && (!submittedReturn || submittedReturn.status === 'expired')) {
      // Only remove timeline param if:
      // 1. Data loading is complete (!loadingReturnData)
      // 2. There's no active return (!submittedReturn) OR return is expired
      console.log('🔄 Removing timeline parameter - no active return');
      const params = new URLSearchParams(window.location.search);
      params.delete('timeline');
      router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
    }
  }, [submittedReturn, searchParams, router, loadingReturnData]);

  // Load shipping history dari database
  const loadShippingHistory = async (orderId: string) => {
    try {
      console.log('Loading shipping history for order:', orderId);
      const { data, error } = await supabase
        .from('shipping_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false }); // Dari baru ke lama (terbaru di atas)

      if (error) {
        console.error('Error loading shipping history:', error);
        setShippingHistory([]);
      } else {
        setShippingHistory(data || []);
        console.log('Shipping history loaded:', data?.length || 0, 'records');
      }
    } catch (error) {
      console.error('Exception loading shipping history:', error);
      setShippingHistory([]);
    }
  };

  // Load existing return request for the order
  const loadExistingReturn = async (orderId: string) => {
    try {
      console.log('Checking existing return for order:', orderId);
      const { data, error } = await supabase
        .from('returns')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle();

      if (error) {
        console.error('Error loading existing return:', error);
        setExistingReturn(null);
      } else {
        setExistingReturn(data);
      }
    } catch (error) {
      console.error('Exception loading existing return:', error);
      setExistingReturn(null);
    }
  };

  // Load detailed tracking from Biteship API
  const loadDetailedTracking = async (waybillId: string) => {
    // Validate waybill ID
    if (!waybillId || waybillId === 'null' || waybillId === 'undefined') {
      console.warn('⚠️ Skipping tracking API - No valid waybill ID');
      setDetailedTracking(null);
      setTrackingLoading(false);
      return;
    }

    // Skip tracking for placeholder resi
    const placeholderResi = [
      'Menunggu pesanan dikirim ke jasa kirim',
      'Menunggu konfirmasi admin',
      'Pesanan belum dikirim ke jasa kirim'
    ];

    if (placeholderResi.includes(waybillId)) {
      console.warn('⚠️ Skipping tracking API - Placeholder resi:', waybillId);
      setDetailedTracking(null);
      setTrackingLoading(false);
      return;
    }

    setTrackingLoading(true);
    try {
      console.log('📦 Fetching detailed tracking for waybill:', waybillId);

      // Add timeout to prevent long waiting
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`/api/biteship/tracking/${waybillId}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('⚠️ Biteship API failed, falling back to database history');
        console.error('Failed to fetch tracking:', response.status);
        setDetailedTracking(null);
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        setDetailedTracking(result.data);
        console.log('Detailed tracking loaded:', result.data);
      } else {
        setDetailedTracking(null);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('⏱️ Tracking API timeout, falling back to database history');
      } else {
        console.error('❌ Error loading detailed tracking:', error);
      }
      console.log('✅ Using database webhook history as fallback');
      setDetailedTracking(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Load return shipping history dari database
  const loadReturnShippingHistory = async (returnId: string) => {
    try {
      console.log('Loading return shipping history for return:', returnId);
      const { data, error } = await supabase
        .from('return_shipping_history')
        .select('*')
        .eq('return_id', returnId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading return shipping history:', error);
        setReturnShippingHistory([]);
      } else {
        setReturnShippingHistory(data || []);
        console.log('Return shipping history loaded:', data?.length || 0, 'records');
      }
    } catch (error) {
      console.error('Exception loading return shipping history:', error);
      setReturnShippingHistory([]);
    }
  };

  // Load replacement shipping history dari database
  const loadReplacementShippingHistory = async (returnId: string) => {
    try {
      console.log('Loading replacement shipping history for return:', returnId);
      const { data, error } = await supabase
        .from('return_replacement_history')
        .select('*')
        .eq('return_id', returnId)
        .order('updated_at', { ascending: false });

      if (error && error.message) {
        // Only log real errors (not empty error objects)
        console.error('Error loading replacement shipping history:', error);
        setReplacementShippingHistory([]);
      } else {
        setReplacementShippingHistory(data || []);
        console.log('Replacement shipping history loaded:', data?.length || 0, 'records');
      }
    } catch (error) {
      console.error('Exception loading replacement shipping history:', error);
      setReplacementShippingHistory([]);
    }
  };

  // Load return tracking from Biteship API
  const loadReturnTracking = async (waybillId: string) => {
    if (!waybillId || waybillId === 'null' || waybillId === 'undefined') {
      console.warn('⚠️ Skipping return tracking API - No valid waybill ID');
      setReturnDetailedTracking(null);
      return;
    }

    setReturnTrackingLoading(true);
    try {
      console.log('📦 Fetching return tracking for waybill:', waybillId);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`/api/biteship/tracking/${waybillId}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('⚠️ Return tracking API failed, falling back to database');
        setReturnDetailedTracking(null);
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        setReturnDetailedTracking(result.data);
        console.log('Return tracking loaded:', result.data);
      } else {
        setReturnDetailedTracking(null);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('⏱️ Return tracking API timeout, falling back to database');
      } else {
        console.error('❌ Error loading return tracking:', error);
      }
      setReturnDetailedTracking(null);
    } finally {
      setReturnTrackingLoading(false);
    }
  };

  // Load shipping history when selectedOrder changes
  useEffect(() => {
    const currentView = searchParams.get('view');

    if (selectedOrder?.id) {
      loadShippingHistory(selectedOrder.id);
      loadExistingReturn(selectedOrder.id);

      // Only load detailed tracking for order-detail view, NOT for return-detail view
      if (currentView === 'order-detail') {
        // Load detailed tracking if waybill exists and valid (bukan placeholder)
        const isPlaceholderResi =
          selectedOrder.shipping_resi === 'Menunggu pesanan dikirim ke jasa kirim' ||
          selectedOrder.shipping_resi === 'Menunggu konfirmasi admin' ||
          selectedOrder.shipping_resi === 'Pesanan belum dikirim ke jasa kirim';

        if (selectedOrder.shipping_resi &&
            !isPlaceholderResi &&
            selectedOrder.shipping_resi.length > 5) {
          loadDetailedTracking(selectedOrder.shipping_resi);
        } else {
          setDetailedTracking(null);
          setTrackingLoading(false);
        }
      } else {
        // For return-detail view, don't load order tracking
        setDetailedTracking(null);
        setTrackingLoading(false);
      }
    } else {
      setShippingHistory([]);
      setDetailedTracking(null);
      setExistingReturn(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?.id, selectedOrder?.shipping_resi]);

  // Load return tracking when return waybill is available
  useEffect(() => {
    if (submittedReturn?.id && submittedReturn?.return_waybill && activeTimelineStep === 'shipping') {
      // Load both API tracking and database history
      loadReturnTracking(submittedReturn.return_waybill);
      loadReturnShippingHistory(submittedReturn.id);
    } else {
      setReturnDetailedTracking(null);
      setReturnShippingHistory([]);
    }
  }, [submittedReturn?.id, submittedReturn?.return_waybill, activeTimelineStep]);

  // Load replacement tracking from Biteship API
  const loadReplacementTracking = async (waybillId: string) => {
    if (!waybillId || waybillId === 'null' || waybillId === 'undefined') {
      console.warn('⚠️ Skipping replacement tracking API - No valid waybill ID');
      setReplacementDetailedTracking(null);
      return;
    }

    setReplacementTrackingLoading(true);
    try {
      console.log('📦 Fetching replacement tracking for waybill:', waybillId);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`/api/biteship/tracking/${waybillId}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('⚠️ Replacement tracking API failed, falling back to database');
        setReplacementDetailedTracking(null);
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        setReplacementDetailedTracking(result.data);
        console.log('✅ Replacement tracking loaded from API:', result.data);
      } else {
        setReplacementDetailedTracking(null);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('⏱️ Replacement tracking API timeout, falling back to database');
      } else {
        console.error('❌ Error loading replacement tracking:', error);
      }
      setReplacementDetailedTracking(null);
    } finally {
      setReplacementTrackingLoading(false);
    }
  };

  // Load replacement shipping history when replacement waybill is available
  useEffect(() => {
    if (submittedReturn?.id && submittedReturn?.replacement_waybill && activeTimelineStep === 'replacement') {
      // Load both API tracking and database history
      loadReplacementTracking(submittedReturn.replacement_waybill);
      loadReplacementShippingHistory(submittedReturn.id);
    } else {
      setReplacementDetailedTracking(null);
      setReplacementShippingHistory([]);
    }
  }, [submittedReturn?.id, submittedReturn?.replacement_waybill, activeTimelineStep]);

  // Auto-complete order when replacement is delivered
  useEffect(() => {
    const autoCompleteReplacementOrder = async () => {
      if (!selectedOrder?.id || !submittedReturn?.id) return;

      // Only proceed if on replacement timeline and replacement_shipped status
      if (activeTimelineStep !== 'replacement' || submittedReturn.status !== 'replacement_shipped') return;

      // Check if replacement is delivered from API tracking
      let isDelivered = false;

      if (replacementDetailedTracking?.history && replacementDetailedTracking.history.length > 0) {
        // Check Biteship API data
        isDelivered = replacementDetailedTracking.history.some((track: any) => track.status === 'delivered');
      } else if (replacementShippingHistory.length > 0) {
        // Check database fallback
        isDelivered = replacementShippingHistory.some((history: any) =>
          history.status?.toLowerCase().includes('delivered') ||
          history.status?.toLowerCase().includes('terkirim')
        );
      }

      if (!isDelivered) return;

      console.log('🎉 Replacement delivered! Auto-completing order...');

      try {
        // Update order status to completed
        const { error: orderError } = await supabase
          .from('orders')
          .update({ status: 'completed' })
          .eq('id', selectedOrder.id);

        if (orderError) {
          console.error('Error updating order status:', orderError);
          return;
        }

        // Update return status to completed
        const { error: returnError } = await supabase
          .from('returns')
          .update({ status: 'completed' })
          .eq('id', submittedReturn.id);

        if (returnError) {
          console.error('Error updating return status:', returnError);
          return;
        }

        console.log('✅ Order and return completed successfully!');

        // Show success toast
        setToastMessage('Pesanan selesai! Produk pengganti telah diterima.');
        setToastType('success');
        setShowToast(true);

        // Redirect to completed tab after 2 seconds
        setTimeout(() => {
          router.push('/user/purchase?pesanan-saya=completed');
        }, 2000);
      } catch (error) {
        console.error('Error auto-completing replacement order:', error);
      }
    };

    autoCompleteReplacementOrder();
  }, [replacementDetailedTracking, replacementShippingHistory, selectedOrder?.id, submittedReturn?.id, submittedReturn?.status, activeTimelineStep, router]);

  // Set active tab based on URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('pesanan-saya') as TabType;
    if (tabParam && ['all', 'unpaid', 'processing', 'shipped', 'completed', 'returns'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Load user vouchers
  useEffect(() => {
    const loadVouchers = async () => {
      if (!user || activeView !== 'vouchers') return;

      console.log('Loading vouchers for user:', user.id);
      setVouchersLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_vouchers')
          .select(`
            *,
            voucher:voucher_id (
              id,
              voucher,
              total_potongan,
              expired,
              type,
              minimal_purchase,
              minimal_pembelian,
              description,
              discount_percentage,
              judul_voucher
            )
          `)
          .eq('user_id', user.id)
          .order('claimed_at', { ascending: false });

        console.log('Vouchers data:', data);
        console.log('Vouchers error:', error);

        if (error) {
          console.error('Error loading vouchers:', error);
        } else if (data) {
          console.log('Setting vouchers:', data);
          setUserVouchers(data);
        }
      } catch (error) {
        console.error('Exception loading vouchers:', error);
      } finally {
        setVouchersLoading(false);
      }
    };

    loadVouchers();
  }, [user, activeView]);

  // Load notifications
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user || activeView !== 'notifications') return;

      console.log('Loading notifications for user:', user.id);
      setNotificationsLoading(true);
      try {
        // Use API route with service role to bypass RLS
        const response = await fetch(`/api/user/notifications?userId=${user.id}`);

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error loading notifications:', errorData);
          setNotifications([]);
        } else {
          const { notifications: data } = await response.json();
          console.log('Notifications loaded:', data.length, 'items');
          console.log('Notifications data:', data);
          setNotifications(data || []);
        }
      } catch (error) {
        console.error('Exception loading notifications:', error);
        setNotifications([]);
      } finally {
        setNotificationsLoading(false);
      }
    };

    loadNotifications();
  }, [user, activeView]);

  // Load user address (default address from user_addresses table)
  // This updates whenever userAddresses changes (e.g., when user sets a new default address)
  useEffect(() => {
    if (!userAddresses || userAddresses.length === 0) {
      console.log('No addresses available');
      setUserAddress(null);
      return;
    }

    // Find default address from userAddresses
    const defaultAddress = userAddresses.find((addr: any) => addr.is_default === true);

    if (defaultAddress) {
      // Map user_addresses fields to userAddress format
      setUserAddress({
        nama: defaultAddress.nama || '',
        phone: defaultAddress.phone || '',
        street: defaultAddress.street || '',
        kelurahan: defaultAddress.kelurahan || '',
        kecamatan: defaultAddress.kecamatan || '',
        kabupaten: defaultAddress.kabupaten || '',
        provinsi: defaultAddress.provinsi || '',
        postal: defaultAddress.postal || '',
        negara: defaultAddress.negara || 'Indonesia'
      });
      console.log('Default address set for return pickup:', defaultAddress.nama);
    } else {
      console.log('No default address found in userAddresses');
      setUserAddress(null);
    }
  }, [userAddresses]);

  // Countdown timer for packaging confirmation
  useEffect(() => {
    if (showPackagingConfirm && confirmCountdown > 0) {
      const timer = setTimeout(() => {
        setConfirmCountdown(confirmCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showPackagingConfirm, confirmCountdown]);

  // Reset countdown when modal opens
  useEffect(() => {
    if (showPackagingConfirm) {
      setConfirmCountdown(8);
    }
  }, [showPackagingConfirm]);

  // Load user orders function (extracted for reuse)
  const loadOrders = useCallback(async () => {
    if (!user) return;

    console.log('Loading orders for user:', user.id);
    setOrdersLoading(true);
    try {
      // Load confirmed orders from orders table
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          delivered_at,
          has_been_updated,
          updated_at,
          order_items (
            *,
            produk:produk_id (
              id,
              nama_produk,
              photo1,
              harga,
              size1,
              size2,
              size3,
              size4,
              size5
            )
          ),
          checkout:checkout_submission_id (
            subtotal,
            shipping_cost,
            total,
            shipping_address,
            shipping_method,
            payment_method,
            order_summary
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Load pending checkouts (submitted but not yet paid, and cancelled orders)
      const { data: pendingCheckouts, error: checkoutError } = await supabase
        .from('checkout_submissions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['submitted', 'cancelled'])
        .order('created_at', { ascending: false });

      console.log('Orders data:', ordersData);
      console.log('Pending checkouts:', pendingCheckouts);

      // Combine orders and pending checkouts
      let combinedOrders: any[] = [];

      if (ordersData) {
        combinedOrders = [...ordersData];
      }

      // Add pending checkouts as pseudo-orders
      if (pendingCheckouts && pendingCheckouts.length > 0) {
        // Get all product IDs from pending checkouts
        const productIds = pendingCheckouts.flatMap(checkout =>
          checkout.items?.map((item: any) => item.produk_id) || []
        );

        // Fetch product details including photos
        const { data: productsData } = await supabase
          .from('produk')
          .select('id, nama_produk, photo1, harga, size1, size2, size3, size4, size5')
          .in('id', productIds);

        // Create a map for quick product lookup
        const productsMap = new Map(productsData?.map(p => [p.id, p]) || []);

        const pseudoOrders = pendingCheckouts.map(checkout => ({
          id: checkout.id,
          order_number: checkout.payment_reference,
          status: checkout.status === 'submitted' ? 'pending' : checkout.status, // Use actual status for cancelled
          total_amount: checkout.total,
          created_at: checkout.created_at,
          updated_at: checkout.updated_at,
          user_id: checkout.user_id,
          shipping_address_json: checkout.shipping_address,
          payment_method: checkout.payment_method,
          shipping_method: checkout.shipping_method,
          payment_details: checkout.payment_details,
          payment_expired_at: checkout.payment_expired_at,
          checkout: {
            subtotal: checkout.subtotal,
            shipping_cost: checkout.shipping_cost,
            total: checkout.total,
            shipping_address: checkout.shipping_address,
            payment_method: checkout.payment_method,
            shipping_method: checkout.shipping_method,
            order_summary: checkout.order_summary
          },
          order_items: checkout.items?.map((item: any) => {
            const productDetail = productsMap.get(item.produk_id);
            return {
              id: `${checkout.id}-${item.produk_id}`,
              price: item.harga_satuan,
              quantity: item.quantity,
              size: item.size,
              produk: {
                id: item.produk_id,
                nama_produk: item.nama_produk,
                photo1: productDetail?.photo1,
                harga: productDetail?.harga,
                size1: productDetail?.size1,
                size2: productDetail?.size2,
                size3: productDetail?.size3,
                size4: productDetail?.size4,
                size5: productDetail?.size5
              }
            };
          }) || []
        }));

        combinedOrders = [...pseudoOrders, ...combinedOrders];
      }

      console.log('Combined orders:', combinedOrders);
      setUserOrders(combinedOrders);

      // Load all returns for this user (exclude expired)
      const { data: returnsData, error: returnsError } = await supabase
        .from('returns')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'expired'); // Exclude expired returns

      if (returnsData && !returnsError) {
        console.log('User returns:', returnsData);
        setUserReturns(returnsData);
      } else if (returnsError) {
        console.error('Error loading returns:', returnsError);
      }

    } catch (error) {
      console.error('Exception loading orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);

  // Load orders on mount and when dependencies change
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Claim voucher function
  const handleClaimVoucher = async () => {
    if (!user) {
      setClaimMessage({ type: 'error', text: 'Anda harus login terlebih dahulu' });
      return;
    }

    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setClaimMessage({ type: 'error', text: 'Masukkan kode voucher' });
      return;
    }

    setClaimingVoucher(true);
    setClaimMessage(null);

    try {
      // 1. Cek apakah voucher ada dan masih valid
      const { data: voucherData, error: voucherError } = await supabase
        .from('voucher')
        .select('*')
        .eq('voucher', code)
        .single();

      if (voucherError || !voucherData) {
        setClaimMessage({ type: 'error', text: 'Kode voucher tidak ditemukan' });
        setClaimingVoucher(false);
        return;
      }

      // 2. Cek apakah voucher sudah expired
      if (new Date(voucherData.expired) < new Date()) {
        setClaimMessage({ type: 'error', text: 'Voucher sudah kadaluarsa' });
        setClaimingVoucher(false);
        return;
      }

      // 3. Cek apakah user sudah pernah claim voucher ini
      const { data: existingClaim, error: claimCheckError } = await supabase
        .from('user_vouchers')
        .select('id')
        .eq('user_id', user.id)
        .eq('voucher_id', voucherData.id)
        .maybeSingle();

      if (existingClaim) {
        setClaimMessage({ type: 'error', text: 'Anda sudah memiliki voucher ini' });
        setClaimingVoucher(false);
        return;
      }

      // 4. Claim voucher - insert ke user_vouchers
      const { data: claimData, error: claimError } = await supabase
        .from('user_vouchers')
        .insert([{
          user_id: user.id,
          voucher_id: voucherData.id,
          used: false,
          claimed_at: new Date().toISOString()
        }])
        .select(`
          *,
          voucher:voucher_id (
            id,
            voucher,
            total_potongan,
            expired,
            type,
            minimal_purchase,
            minimal_pembelian,
            description,
            discount_percentage,
            judul_voucher
          )
        `)
        .single();

      if (claimError) {
        console.error('Claim error:', claimError);
        setClaimMessage({ type: 'error', text: 'Gagal menyimpan voucher' });
        setClaimingVoucher(false);
        return;
      }

      // 5. Berhasil - update UI
      setClaimMessage({ type: 'success', text: 'Voucher berhasil disimpan!' });
      setVoucherCode('');
      setUserVouchers([claimData, ...userVouchers]);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setClaimMessage(null);
      }, 3000);

    } catch (error) {
      console.error('Exception claiming voucher:', error);
      setClaimMessage({ type: 'error', text: 'Terjadi kesalahan, silakan coba lagi' });
    } finally {
      setClaimingVoucher(false);
    }
  };

  // Dummy data untuk pesanan yang sudah selesai
  const completedOrders = [
    {
      id: 'ORD-001',
      date: '2024-01-15',
      items: [
        {
          id: 1,
          name: 'Kemeja Pria Lengan Panjang Formal',
          variant: 'Hitam, XL',
          price: 250000,
          quantity: 2,
          image: '/images/product1.jpg'
        },
        {
          id: 2,
          name: 'Celana Chino Premium',
          variant: 'Navy, 32',
          price: 350000,
          quantity: 1,
          image: '/images/product2.jpg'
        }
      ],
      total: 850000,
      status: 'Selesai'
    },
    {
      id: 'ORD-002',
      date: '2024-01-10',
      items: [
        {
          id: 3,
          name: 'Sepatu Sneakers Casual',
          variant: 'Putih, 42',
          price: 450000,
          quantity: 1,
          image: '/images/product3.jpg'
        }
      ],
      total: 450000,
      status: 'Selesai'
    },
    {
      id: 'ORD-003',
      date: '2024-01-05',
      items: [
        {
          id: 4,
          name: 'Tas Ransel Laptop 15 inch',
          variant: 'Hitam',
          price: 320000,
          quantity: 1,
          image: '/images/product4.jpg'
        },
        {
          id: 5,
          name: 'Dompet Kulit Pria',
          variant: 'Coklat',
          price: 180000,
          quantity: 1,
          image: '/images/product5.jpg'
        }
      ],
      total: 500000,
      status: 'Selesai'
    }
  ];

  const tabs = [
    { id: 'all' as TabType, label: 'All' },
    { id: 'unpaid' as TabType, label: 'Belum Bayar' },
    { id: 'processing' as TabType, label: 'Sedang Dikemas' },
    { id: 'shipped' as TabType, label: 'Dikirim' },
    { id: 'completed' as TabType, label: 'Selesai' },
    { id: 'returns' as TabType, label: 'Pengembalian Barang' },
  ];

  // Function to update URL when view changes
  const updateView = (view: 'purchase' | 'profile' | 'address' | 'vouchers' | 'notifications' | 'order-detail') => {
    // Close mobile sidebar first to prevent overlay interference
    setIsMobileSidebarOpen(false);

    setActiveView(view);
    router.push(`/user/purchase?view=${view}`);
  };

  // Filter orders based on active tab
  const getFilteredOrders = () => {
    if (!userOrders || userOrders.length === 0) return [];

    switch (activeTab) {
      case 'all':
        return userOrders;
      case 'unpaid':
        return userOrders.filter(order =>
          order.status === 'UNPAID' ||
          order.status === 'pending' ||
          !order.status
        );
      case 'processing':
        return userOrders.filter(order => {
          // Order sedang dikemas atau baru confirmed (belum ada resi)
          if (order.status === 'processing' || order.status === 'confirmed') {
            // Cek apakah sudah punya resi
            const hasRealResi = order.shipping_resi &&
                               !order.shipping_resi.startsWith('Menunggu') &&
                               order.shipping_resi.length > 10;

            // Jika sudah ada resi, masuk ke tab shipped
            if (hasRealResi) {
              return false;
            }

            return true;
          }

          // Order yang sudah paid dan punya resi, tapi masih dalam status confirmed
          if (order.status === 'paid' && order.shipping_resi) {
            // Cek shipping_status, jika masih confirmed atau belum ada status tracking, masuk processing
            const status = order.shipping_status || '';
            // Hanya yang benar-benar masih confirmed atau dikemas
            return status === '' ||
                   status === 'Menunggu pesanan diserahkan ke pihak jasa kirim' ||
                   status.toLowerCase().includes('dikemas');
          }

          return false;
        });
      case 'shipped':
        return userOrders.filter(order => {
          // Only exclude order dengan return in-progress (not completed)
          const hasInProgressReturn = userReturns.some(ret =>
            ret.order_id === order.id &&
            ret.status !== 'expired' &&
            ret.status !== 'completed'
          );
          if (hasInProgressReturn) {
            return false; // Order dengan return in-progress masuk ke tab returns
          }

          // Include order yang sudah delivered (tetap di shipped tab selama belum completed)
          if (order.status === 'delivered') {
            return true;
          }

          // Exclude order yang sudah completed
          if (order.status === 'completed') {
            return false;
          }

          // Order dengan status shipped
          if (order.status === 'shipped') {
            return true;
          }

          // Order dengan status processing yang sudah punya resi valid
          if (order.status === 'processing' && order.shipping_resi) {
            const hasRealResi = !order.shipping_resi.startsWith('Menunggu') &&
                               order.shipping_resi.length > 10;
            if (hasRealResi) {
              return true;
            }
          }

          // Order yang sudah paid dan punya resi, DAN sudah mulai dikirim (bukan confirmed lagi)
          if (order.status === 'paid' && order.shipping_resi && order.shipping_status) {
            const status = order.shipping_status;
            // Masuk shipped jika statusnya BUKAN 'Menunggu pesanan diserahkan ke pihak jasa kirim' dan bukan dikemas
            // Ini akan include: Menunggu penjemputan kurir, Kurir menuju lokasi, Pesanan telah diserahkan, Dalam Pengiriman
            return status !== '' &&
                   status !== 'Menunggu pesanan diserahkan ke pihak jasa kirim' &&
                   !status.toLowerCase().includes('dikemas');
          }

          return false;
        });
      case 'completed':
        return userOrders.filter(order => {
          // Include order completed, even if it has a completed return
          // Only exclude if return is still in progress (not completed)
          const hasInProgressReturn = userReturns.some(ret =>
            ret.order_id === order.id &&
            ret.status !== 'expired' &&
            ret.status !== 'completed'
          );
          if (hasInProgressReturn) {
            return false; // Order dengan return in-progress masuk ke tab returns
          }

          return order.status === 'completed';
        });
      case 'cancelled':
        return userOrders.filter(order =>
          order.status === 'cancelled' ||
          order.status === 'failed'
        );
      case 'returns':
        return userOrders.filter(order => {
          // Hanya tampilkan order dengan return yang belum selesai
          // Exclude return yang sudah completed atau expired
          const hasInProgressReturn = userReturns.some(ret =>
            ret.order_id === order.id &&
            ret.status !== 'expired' &&
            ret.status !== 'completed'
          );
          return hasInProgressReturn || order.status === 'returned' || order.status === 'refunded';
        });
      default:
        return userOrders;
    }
  };

  const filteredOrders = getFilteredOrders().filter(order => {
    // Filter berdasarkan searchQuery (hanya ID pesanan)
    if (!searchQuery.trim()) return true;

    const searchLower = searchQuery.toLowerCase().trim();
    const orderId = order.id.replace(/-/g, '').substring(0, 10).toUpperCase();

    // Cari berdasarkan ID pesanan (format: 71BA3037DF)
    return orderId.toLowerCase().includes(searchLower);
  });

  // Function to get count for each tab
  const getTabCount = (tabId: TabType): number => {
    if (!userOrders || userOrders.length === 0) return 0;

    switch (tabId) {
      case 'all':
        return userOrders.length;
      case 'unpaid':
        return userOrders.filter(order =>
          order.status === 'UNPAID' ||
          order.status === 'pending' ||
          !order.status
        ).length;
      case 'processing':
        return userOrders.filter(order => {
          // Order sedang dikemas atau baru confirmed (belum ada resi)
          if (order.status === 'processing' || order.status === 'confirmed') {
            // Cek apakah sudah punya resi
            const hasRealResi = order.shipping_resi &&
                               !order.shipping_resi.startsWith('Menunggu') &&
                               order.shipping_resi.length > 10;

            // Jika sudah ada resi, masuk ke tab shipped (jangan count di processing)
            if (hasRealResi) {
              return false;
            }

            return true;
          }

          // Order yang sudah paid dan punya resi, tapi masih dalam status confirmed
          if (order.status === 'paid' && order.shipping_resi) {
            // Cek shipping_status, jika masih confirmed atau belum ada status tracking, masuk processing
            const status = order.shipping_status || '';
            // Hanya yang benar-benar masih confirmed atau dikemas
            return status === '' ||
                   status === 'Menunggu pesanan diserahkan ke pihak jasa kirim' ||
                   status.toLowerCase().includes('dikemas');
          }

          return false;
        }).length;
      case 'shipped':
        return userOrders.filter(order => {
          // Only exclude order dengan return in-progress (not completed)
          const hasInProgressReturn = userReturns.some(ret =>
            ret.order_id === order.id &&
            ret.status !== 'expired' &&
            ret.status !== 'completed'
          );
          if (hasInProgressReturn) {
            return false; // Order dengan return in-progress masuk ke tab returns
          }

          // Include order yang sudah delivered (tetap di shipped tab selama belum completed)
          if (order.status === 'delivered') {
            return true;
          }

          // Exclude order yang sudah completed
          if (order.status === 'completed') {
            return false;
          }

          // Order dengan status shipped
          if (order.status === 'shipped') {
            return true;
          }

          // Order dengan status processing yang sudah punya resi valid
          if (order.status === 'processing' && order.shipping_resi) {
            const hasRealResi = !order.shipping_resi.startsWith('Menunggu') &&
                               order.shipping_resi.length > 10;
            if (hasRealResi) {
              return true;
            }
          }

          // Order yang sudah paid dan punya resi, DAN sudah mulai dikirim (bukan confirmed lagi)
          if (order.status === 'paid' && order.shipping_resi && order.shipping_status) {
            const status = order.shipping_status;
            // Masuk shipped jika statusnya BUKAN 'Menunggu pesanan diserahkan ke pihak jasa kirim' dan bukan dikemas
            // Ini akan include: Menunggu penjemputan kurir, Kurir menuju lokasi, Pesanan telah diserahkan, Dalam Pengiriman
            return status !== '' &&
                   status !== 'Menunggu pesanan diserahkan ke pihak jasa kirim' &&
                   !status.toLowerCase().includes('dikemas');
          }

          return false;
        }).length;
      case 'completed':
        return userOrders.filter(order => {
          // Include order completed, even if it has a completed return
          // Only exclude if return is still in progress (not completed)
          const hasInProgressReturn = userReturns.some(ret =>
            ret.order_id === order.id &&
            ret.status !== 'expired' &&
            ret.status !== 'completed'
          );
          if (hasInProgressReturn) {
            return false; // Order dengan return in-progress masuk ke tab returns
          }

          return order.status === 'completed';
        }).length;
      case 'cancelled':
        return userOrders.filter(order =>
          order.status === 'cancelled' ||
          order.status === 'failed'
        ).length;
      case 'returns':
        return userOrders.filter(order => {
          // Hanya hitung order dengan return yang belum selesai
          // Exclude return yang sudah completed atau expired
          const hasInProgressReturn = userReturns.some(ret =>
            ret.order_id === order.id &&
            ret.status !== 'expired' &&
            ret.status !== 'completed'
          );
          return hasInProgressReturn || order.status === 'returned' || order.status === 'refunded';
        }).length;
      default:
        return 0;
    }
  };

  // Function to get payment URL
  const getPaymentUrl = (order: any) => {
    // Try to get Tripay checkout URL from various sources
    const checkoutUrl =
      order.payment_details?.checkout_url ||
      order.checkout?.order_summary?.tripay?.checkout_url ||
      null;

    // For pending orders with valid Tripay checkout URL
    if (checkoutUrl && (order.status === 'pending' || order.status === 'UNPAID' || order.status === 'submitted')) {
      return checkoutUrl;
    }

    // Default to internal payment page
    return `/payment/${order.id}`;
  };

  // Function to open detail view
  const handleOpenDetail = (order: any) => {
    // Close mobile sidebar first to prevent overlay interference
    setIsMobileSidebarOpen(false);

    // Just navigate - let useEffect handle all the state changes
    // Update URL dengan 12 karakter pertama dari UUID (tanpa dash) untuk match dengan order_number
    const orderId = order.order_number || order.id.replace(/-/g, '').substring(0, 12).toUpperCase();
    router.push(`/user/purchase?view=order-detail&order=${orderId}`);
  };

  // Function to close detail view
  const handleCloseDetail = () => {
    // Close mobile sidebar first to prevent overlay interference
    setIsMobileSidebarOpen(false);

    // Clear states before navigation
    setSelectedOrder(null);
    setShowReturnForm(false);
    setShowReturnDetail(false);
    setSubmittedReturn(null);

    // Navigate back - let useEffect handle activeView
    router.push('/user/purchase?view=purchase');
  };

  // Handle image upload for return form
  const handleReturnImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setReturnImages(prev => [...prev, ...files]);

      // Create previews
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReturnImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Remove image from return form
  const handleRemoveReturnImage = (index: number) => {
    setReturnImages(prev => prev.filter((_, i) => i !== index));
    setReturnImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Handle return form submission
  const handleSubmitReturn = async () => {
    if (!returnReason) {
      alert('Pilih alasan pengembalian');
      return;
    }
    if (!returnDescription) {
      alert('Masukkan deskripsi');
      return;
    }

    if (!selectedOrder || !user) {
      alert('Data pesanan atau user tidak ditemukan');
      return;
    }

    // Set loading state
    setSubmitReturnLoading(true);

    try {
      // Validate files before submission
      const validFiles = returnImages.filter(file => {
        if (!file || !(file instanceof File)) {
          console.warn('⚠️ Invalid file detected:', file);
          return false;
        }
        if (file.size === 0) {
          console.warn('⚠️ Empty file detected:', file.name);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) { // 10MB max
          console.warn('⚠️ File too large (>10MB):', file.name);
          alert(`File ${file.name} terlalu besar (maksimal 10MB)`);
          return false;
        }
        return true;
      });

      console.log(`📸 [Frontend] Valid files: ${validFiles.length}/${returnImages.length}`);

      // Prepare form data
      const formData = new FormData();
      formData.append('orderId', selectedOrder.id);
      formData.append('userId', user.id);
      formData.append('reason', returnReason);
      formData.append('description', returnDescription);

      if (returnVideoLink) {
        formData.append('videoLink', returnVideoLink);
      }

      // Append photos with validation
      console.log(`📸 [Frontend] Appending ${validFiles.length} photos to formData`);
      validFiles.forEach((file, index) => {
        console.log(`📸 [Frontend] Photo ${index + 1}:`, {
          name: file.name,
          size: file.size,
          type: file.type
        });
        formData.append('photos', file);
      });

      console.log('📤 [Frontend] Submitting return request...');

      // Submit return request
      const response = await fetch('/api/returns/submit', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengirim pengajuan pengembalian');
      }

      console.log('✅ [Frontend] Return submitted successfully:', result);
      // Log photo count
      console.log(`📸 Photos uploaded: ${result.photoCount || 0}`);
      console.log(`🔢 Return Number: ${result.return_number}`);

      // Show simple success alert
      alert('Permintaan pengembalian berhasil terkirim.');

      // Navigate using return number instead of order number
      if (result.return_number) {
        window.location.href = `/user/purchase?view=return-detail&return=${result.return_number}&timeline=review`;
      } else {
        // Fallback to old method if return_number not available
        const orderId = selectedOrder.order_number || selectedOrder.id.replace(/-/g, '').substring(0, 12).toUpperCase();
        window.location.href = `/user/purchase?view=order-detail&order=${orderId}&timeline=review`;
      }
    } catch (error) {
      console.error('❌ [Frontend] Error submitting return:', error);
      alert(error instanceof Error ? error.message : 'Terjadi kesalahan saat mengirim pengajuan pengembalian. Silakan coba lagi.');
    } finally {
      setSubmitReturnLoading(false);
    }
  };

  // Handle print resi
  const handlePrintResi = async () => {
    if (!submittedReturn || !selectedOrder || !user) {
      alert('Data pengembalian tidak lengkap');
      return;
    }

    // Fetch user address from user_addresses (prioritize default address)
    const { data: userAddresses, error: addrError } = await supabase
      .from("user_addresses")
      .select('*')
      .eq('user_id', user?.id)
      .order('is_default', { ascending: false })
      .limit(1);

    if (addrError) {
      console.error("Error fetching user address:", addrError);
    }

    const defaultAddress = userAddresses?.[0];

    // Fallback to users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select('nama, phone, shipping_phone, shipping_street, shipping_postal_code')
      .eq('id', user?.id)
      .single();

    if (userError) {
      console.error("Error fetching user data:", userError);
    }

    // Parse shipping address
    let customerAddress: any = {};
    let provinsi = defaultAddress?.provinsi || '-';
    let kota = defaultAddress?.kabupaten || '-';

    if (selectedOrder.shipping_address) {
      try {
        const shippingAddr = typeof selectedOrder.shipping_address === 'string'
          ? JSON.parse(selectedOrder.shipping_address)
          : selectedOrder.shipping_address;

        customerAddress = {
          nama: shippingAddr.nama || defaultAddress?.nama || userData?.nama || user?.nama || 'Pelanggan',
          telepon: shippingAddr.telepon || defaultAddress?.phone || userData?.shipping_phone || userData?.phone || '-',
          alamat: `${shippingAddr.alamat || shippingAddr.street || defaultAddress?.street || userData?.shipping_street || '-'}, ${shippingAddr.kecamatan || shippingAddr.district || defaultAddress?.kecamatan || ''}, ${shippingAddr.kota || shippingAddr.city || defaultAddress?.kabupaten || ''}, ${shippingAddr.provinsi || shippingAddr.province || defaultAddress?.provinsi || ''}, ${shippingAddr.kode_pos || shippingAddr.postal_code || defaultAddress?.postal || userData?.shipping_postal_code || ''}`
        };
      } catch (e) {
        customerAddress = {
          nama: defaultAddress?.nama || userData?.nama || user?.nama || 'Pelanggan',
          telepon: defaultAddress?.phone || userData?.shipping_phone || userData?.phone || '-',
          alamat: selectedOrder.shipping_address
        };
      }
    } else {
      // Use user_addresses data first, then fallback to users table
      if (defaultAddress) {
        customerAddress = {
          nama: defaultAddress.nama || user?.nama || 'Pelanggan',
          telepon: defaultAddress.phone || userData?.phone || '-',
          alamat: `${defaultAddress.street || '-'}, ${defaultAddress.kelurahan || ''}, ${defaultAddress.kecamatan || ''}, ${defaultAddress.kabupaten || ''}, ${defaultAddress.provinsi || ''}, ${defaultAddress.postal || ''}`
        };
      } else {
        customerAddress = {
          nama: userData?.nama || user?.nama || 'Pelanggan',
          telepon: userData?.shipping_phone || userData?.phone || '-',
          alamat: `${userData?.shipping_street || '-'}, ${userData?.shipping_postal_code || ''}`
        };
      }
    }

    const orderItems = selectedOrder?.order_items || [];
    const firstProduct = orderItems[0];
    const fullOrderId = selectedOrder.id || "-";
    const shortOrderId = fullOrderId !== "-" ? fullOrderId.replace(/-/g, '').substring(0, 10).toUpperCase() : "-";

    const returnData = {
      orderId: fullOrderId,
      shortOrderId: shortOrderId,
      expedisi: submittedReturn?.return_courier === 'jnt' ? 'J&T Express' : submittedReturn?.return_courier?.toUpperCase() || 'J&T Express',
      resiNumber: submittedReturn.return_waybill || "-",
      status: submittedReturn.status,
      provinsi: provinsi,
      kota: kota,
      product: {
        name: firstProduct?.produk?.nama_produk || "Produk",
        size: firstProduct?.size || "-",
        quantity: firstProduct?.quantity || 1,
        image: firstProduct?.produk?.photo1 || "/images/bg22.png"
      },
      storeAddress: {
        recipient: "Meoris Footwear",
        phone: "+6289695971729",
        address: "Sambong mangkubumi Rt 001/Rw 002, Kec. Mangkubumi, Kota Tasikmalaya, Jawa Barat 46181"
      },
      customerAddress: customerAddress,
      reason: submittedReturn.reason || "Tidak ada alasan",
      createdAt: submittedReturn.created_at
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka window cetak. Pastikan popup tidak diblokir.');
      return;
    }

    const resiContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Resi Pengembalian - ${returnData.resiNumber}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            font-family: 'Arial', sans-serif;
            padding: 15px;
            background: white;
          }
          .resi-wrapper {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
          }
          .resi-container {
            border: 3px dashed #333;
            padding: 0;
            background: white;
          }

          /* Header Section */
          .header-section {
            background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
            background-color: #1a1a1a;
            color: white;
            padding: 18px 25px;
            text-align: center;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .brand-name {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 7px;
            margin-bottom: 4px;
          }
          .brand-subtitle {
            font-size: 11px;
            letter-spacing: 4px;
            text-transform: uppercase;
            opacity: 0.9;
          }

          /* Resi Number Section */
          .resi-banner {
            background: #f8f8f8;
            background-color: #f8f8f8;
            padding: 15px 25px;
            text-align: center;
            border-bottom: 3px solid #333;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .resi-label {
            font-size: 11px;
            color: #666;
            letter-spacing: 2px;
            margin-bottom: 12px;
            text-transform: uppercase;
          }
          .barcode-card {
            padding: 18px 28px;
            background: white;
            background-color: #ffffff;
            border: 2px solid #333;
            display: inline-block;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #barcode {
            height: 70px;
            margin-bottom: 12px;
          }
          .resi-code {
            font-size: 20px;
            font-weight: bold;
            color: #000;
            letter-spacing: 2.5px;
            font-family: 'Courier New', monospace;
            text-align: center;
          }

          /* Content Body */
          .content-body {
            padding: 25px;
          }

          /* Address Boxes */
          .address-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            margin-bottom: 25px;
          }
          .address-box {
            border: 2px solid #333;
            padding: 18px;
            background: #fafafa;
            background-color: #fafafa;
            position: relative;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .address-box::before {
            content: '';
            position: absolute;
            top: -2px;
            left: 15px;
            background: #fafafa;
            padding: 0 10px;
          }
          .address-header {
            position: absolute;
            top: -11px;
            left: 15px;
            background: #333;
            background-color: #333;
            color: white;
            padding: 4px 13px;
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .address-name {
            font-size: 16px;
            font-weight: bold;
            color: #000;
            margin-top: 4px;
            margin-bottom: 7px;
          }
          .address-phone {
            font-size: 13px;
            color: #333;
            margin-bottom: 9px;
            font-weight: 600;
          }
          .address-detail {
            font-size: 12px;
            line-height: 1.65;
            color: #555;
          }

          /* Info Grid */
          .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 25px;
          }
          .info-card {
            border: 2px solid #e0e0e0;
            padding: 12px;
            text-align: center;
            background: white;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .info-label {
            font-size: 10px;
            color: #999;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 7px;
          }
          .info-value {
            font-size: 14px;
            font-weight: bold;
            color: #000;
          }

          /* Product Table */
          .product-section {
            margin-bottom: 25px;
          }
          .section-header {
            background: #333;
            background-color: #333;
            color: white;
            padding: 9px 14px;
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 1.8px;
            text-transform: uppercase;
            margin-bottom: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .product-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #333;
            border-top: none;
          }
          .product-table th {
            background: #f0f0f0;
            background-color: #f0f0f0;
            padding: 10px 14px;
            text-align: left;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 2px solid #ddd;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .product-table td {
            padding: 12px 14px;
            font-size: 13px;
            border-bottom: 1px solid #e0e0e0;
            background: white;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .product-table tr:last-child td {
            border-bottom: none;
          }

          /* Footer */
          .footer-section {
            margin-top: 25px;
            padding-top: 18px;
            border-top: 2px dashed #999;
            text-align: center;
          }
          .footer-text {
            font-size: 11px;
            color: #666;
            line-height: 1.7;
          }
          .footer-contact {
            margin-top: 7px;
            font-size: 12px;
            font-weight: bold;
            color: #333;
          }

          /* Signature Section */
          .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 35px;
            margin-top: 30px;
            padding: 0 25px;
          }
          .signature-box {
            text-align: center;
          }
          .signature-label {
            font-size: 11px;
            color: #666;
            margin-bottom: 40px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          .signature-line {
            border-top: 1px solid #333;
            padding-top: 7px;
            font-size: 12px;
            color: #333;
            font-weight: bold;
          }

          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body {
              padding: 0;
            }
            .resi-wrapper {
              max-width: 100%;
            }
            .header-section {
              background: #1a1a1a !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .section-header {
              background: #333 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .address-header {
              background: #333 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              margin: 0.5cm;
              size: A4;
            }
          }
        </style>
      </head>
      <body>
        <div class="resi-wrapper">
          <div class="resi-container">

            <!-- Header -->
            <div class="header-section">
              <div class="brand-name">MEORIS</div>
              <div class="brand-subtitle">Footwear</div>
            </div>

            <!-- Resi Banner -->
            <div class="resi-banner">
              <div class="resi-label">Nomor Resi</div>
              <div class="barcode-card">
                <svg id="barcode"></svg>
                <div class="resi-code">${returnData.resiNumber}</div>
              </div>
            </div>

            <!-- Content Body -->
            <div class="content-body">

              <!-- Address Section -->
              <div class="address-section">
                <div class="address-box">
                  <div class="address-header">Pengirim</div>
                  <div class="address-name">${returnData.customerAddress.nama}</div>
                  <div class="address-phone">${returnData.customerAddress.telepon}</div>
                  <div class="address-detail">${returnData.customerAddress.alamat}</div>
                </div>

                <div class="address-box">
                  <div class="address-header">Penerima</div>
                  <div class="address-name">${returnData.storeAddress.recipient}</div>
                  <div class="address-phone">${returnData.storeAddress.phone}</div>
                  <div class="address-detail">${returnData.storeAddress.address}</div>
                </div>
              </div>

              <!-- Info Grid -->
              <div class="info-grid">
                <div class="info-card">
                  <div class="info-label">No. Pesanan</div>
                  <div class="info-value">${returnData.shortOrderId}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">Ekspedisi</div>
                  <div class="info-value">${returnData.expedisi}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">Tanggal</div>
                  <div class="info-value">${new Date(returnData.createdAt).toLocaleDateString("id-ID", {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}</div>
                </div>
              </div>

              <!-- Location Card -->
              <div class="info-card" style="margin-bottom: 25px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 0;">
                <div style="text-align: center; padding: 0 10px;">
                  <div style="font-size: 12px; font-weight: bold; color: #000;">${returnData.provinsi}</div>
                </div>
                <div style="width: 2px; height: 30px; background: #e0e0e0;"></div>
                <div style="text-align: center; padding: 0 10px;">
                  <div style="font-size: 12px; font-weight: bold; color: #000;">${returnData.kota}</div>
                </div>
              </div>

              <!-- Product Table -->
              <div class="product-section">
                <div class="section-header">Detail Produk</div>
                <table class="product-table">
                  <thead>
                    <tr>
                      <th>Nama Produk</th>
                      <th style="text-align: center; width: 120px;">Ukuran</th>
                      <th style="text-align: center; width: 120px;">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>${returnData.product.name}</strong></td>
                      <td style="text-align: center;">${returnData.product.size}</td>
                      <td style="text-align: center;">${returnData.product.quantity} pcs</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Footer -->
              <div class="footer-section">
                <div class="footer-text">
                  Simpan resi ini sebagai bukti pengiriman pengembalian.<br>
                  Terima kasih atas kepercayaan Anda kepada MEORIS.
                </div>
              </div>
            </div>

            <!-- Signature Section -->
            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-label">Pengirim</div>
                <div class="signature-line">(${returnData.customerAddress.nama})</div>
              </div>
              <div class="signature-box">
                <div class="signature-label">Penerima</div>
                <div class="signature-line">(Meoris Footwear)</div>
              </div>
            </div>

            <div style="height: 20px;"></div>

          </div>
        </div>

        <script>
          window.onload = function() {
            try {
              // Generate barcode Code 128 - automatically encodes alphanumeric
              JsBarcode("#barcode", "${returnData.resiNumber}", {
                format: "CODE128",
                width: 2,
                height: 70,
                displayValue: false,
                margin: 10,
                background: "#ffffff",
                lineColor: "#000000",
                valid: function(valid) {
                  if (!valid) {
                    console.error("Barcode generation failed for: ${returnData.resiNumber}");
                  }
                }
              });
            } catch (e) {
              console.error("Error generating barcode:", e);
              // Fallback: show text only
              document.getElementById("barcode").innerHTML = '<text x="50%" y="50%" text-anchor="middle" style="font-size: 14px;">Barcode tidak dapat digenerate</text>';
            }

            // Trigger print after barcode is generated
            setTimeout(function() {
              window.print();
            }, 800);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(resiContent);
    printWindow.document.close();
  };

  // Generate next 3 days for schedule picker
  const getNext3Days = () => {
    const days = [];
    const today = new Date();
    // Start from tomorrow (i+1), not today
    for (let i = 1; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' });
      const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const value = date.toISOString().split('T')[0];
      days.push({ dayName, dateStr, value });
    }
    return days;
  };

  // Show packaging confirmation modal
  const handleConfirmShipping = () => {
    if (!submittedReturn || !user) {
      alert('Data tidak lengkap');
      return;
    }
    setShowPackagingConfirm(true);
  };

  // Actual submit after packaging confirmation
  const handleActualSubmit = async () => {
    setShowPackagingConfirm(false);

    if (!user || !submittedReturn) {
      alert('Data tidak lengkap');
      return;
    }

    try {
      const response = await fetch('/api/returns/arrange-shipping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnId: submittedReturn.id,
          userId: user.id,
          shippingMethod: 'pickup', // Always use pickup
          scheduledDate: null,
          courier: selectedCourier, // Send selected courier
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal mengatur pengiriman');
      }

      // Success - Show toast notification
      showToastNotification(`Pickup berhasil dijadwalkan! Nomor Resi: ${data.waybill} - Kurir: ${data.courier}`, 'success');

      // Reload return data
      const { data: updatedReturn } = await supabase
        .from('returns')
        .select('*')
        .eq('id', submittedReturn.id)
        .maybeSingle();

      if (updatedReturn) {
        setSubmittedReturn(updatedReturn);
      }

      // Auto redirect to shipping timeline after success
      setTimeout(() => {
        updateTimelineUrl('shipping');
      }, 1000);

    } catch (error: any) {
      console.error('Error confirming shipping:', error);
      showToastNotification(error.message || 'Terjadi kesalahan saat mengatur pengiriman', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNPAID':
      case 'pending':
        return 'text-yellow-600';
      case 'PAID':
      case 'paid':
        return 'text-green-600';
      case 'FAILED':
      case 'cancelled':
        return 'text-red-600';
      case 'processing':
        return 'text-green-600';
      case 'shipped':
        return 'text-green-600';
      case 'delivered':
      case 'completed':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  // Mobile search handler
  const handleMobileSearch = async () => {
    if (!mobileSearchQuery.trim()) return;
    setMobileSearchLoading(true);
    setMobileHasSearched(true);
    try {
      const results = await produkDb.search(mobileSearchQuery.trim());
      setMobileSearchResults(results || []);
    } catch (error) {
      console.error('Error searching products:', error);
      setMobileSearchResults([]);
    } finally {
      setMobileSearchLoading(false);
    }
  };

  const handleCloseMobileSearch = () => {
    setIsMobileSearchOpen(false);
    setMobileSearchQuery('');
    setMobileSearchResults([]);
    setMobileHasSearched(false);
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'unpaid':
      case 'pending':
        return 'Belum Bayar';
      case 'paid':
        return 'Sedang dikemas';
      case 'processing':
        return 'Sedang dikemas';
      case 'shipped':
        return 'Dikirim';
      case 'delivered':
      case 'completed':
        return 'Selesai';
      case 'cancelled':
        return 'Dibatalkan';
      case 'failed':
        return 'Gagal';
      default:
        return status || 'Pending';
    }
  };

  // Helper function to open location popup
  const openLocationPopup = (type: 'province' | 'regency' | 'district' | 'village' | 'postal') => {
    setPopupType(type);
    setPopupSearchQuery('');
    setShowLocationPopup(true);
  };

  // Helper function to close location popup
  const closeLocationPopup = () => {
    setShowLocationPopup(false);
    setPopupType(null);
    setPopupSearchQuery('');
  };

  // Helper function to handle location selection
  const handleLocationSelect = (id: string, name: string) => {
    if (popupType === 'province') {
      setSelectedProvinceId(id);
      setSelectedRegencyId('');
      setSelectedDistrictId('');
      setSelectedVillageId('');
    } else if (popupType === 'regency') {
      setSelectedRegencyId(id);
      setSelectedDistrictId('');
      setSelectedVillageId('');
    } else if (popupType === 'district') {
      setSelectedDistrictId(id);
      setSelectedVillageId('');
      setNewAddressData({...newAddressData, postal: ''});
      setPostalCodeOptions([]);
      setIsManualPostalCode(false);
    } else if (popupType === 'village') {
      setSelectedVillageId(id);
    } else if (popupType === 'postal') {
      if (id === 'manual') {
        setIsManualPostalCode(true);
        setNewAddressData({...newAddressData, postal: ''});
      } else {
        setNewAddressData({...newAddressData, postal: id});
      }
    }
    closeLocationPopup();
  };

  // Get current popup data based on type
  const getPopupData = () => {
    if (!popupType) return { title: '', data: [], loading: false, disabled: false };

    switch (popupType) {
      case 'province':
        return {
          title: 'Pilih Provinsi',
          data: provinceOptions,
          loading: provinceLoading,
          disabled: false
        };
      case 'regency':
        return {
          title: 'Pilih Kabupaten/Kota',
          data: regencyOptions,
          loading: regencyLoading,
          disabled: !selectedProvinceId
        };
      case 'district':
        return {
          title: 'Pilih Kecamatan',
          data: districtOptions,
          loading: districtLoading,
          disabled: !selectedRegencyId
        };
      case 'village':
        return {
          title: 'Pilih Kelurahan',
          data: villageOptions,
          loading: villageLoading,
          disabled: !selectedDistrictId
        };
      case 'postal':
        return {
          title: 'Pilih Kode Pos',
          data: postalCodeOptions.map(p => ({ id: p.code, name: p.code })),
          loading: false,
          disabled: !selectedDistrictId
        };
      default:
        return { title: '', data: [], loading: false, disabled: false };
    }
  };

  // Filter popup data based on search query
  const getFilteredPopupData = () => {
    const { data } = getPopupData();
    if (!popupSearchQuery.trim()) return data;

    return data.filter((item: any) =>
      item.name.toLowerCase().includes(popupSearchQuery.toLowerCase())
    );
  };

  // Get selected value display name
  const getSelectedLocationName = (type: 'province' | 'regency' | 'district' | 'village' | 'postal') => {
    switch (type) {
      case 'province':
        return provinceOptions.find(p => p.id === selectedProvinceId)?.name || '';
      case 'regency':
        return regencyOptions.find(r => r.id === selectedRegencyId)?.name || '';
      case 'district':
        return districtOptions.find(d => d.id === selectedDistrictId)?.name || '';
      case 'village':
        return villageOptions.find(v => v.id === selectedVillageId)?.name || '';
      case 'postal':
        return newAddressData.postal || '';
      default:
        return '';
    }
  };

  // Location Popup Component
  const LocationPopup = () => {
    if (!showLocationPopup || !popupType) return null;

    const { title, loading, disabled } = getPopupData();
    const filteredData = getFilteredPopupData();

    if (disabled) {
      closeLocationPopup();
      return null;
    }

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-white/30">
        <div className="bg-white shadow-xl w-full max-w-md max-h-[60vh] md:max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          </div>

          {/* Search Field */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                value={popupSearchQuery}
                onChange={(e) => setPopupSearchQuery(e.target.value)}
                placeholder="Cari..."
                className="w-full pl-10 pr-4 py-2 text-sm text-gray-900 placeholder:text-gray-600 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                autoFocus
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                {popupSearchQuery ? 'Tidak ada hasil yang ditemukan' : 'Tidak ada data'}
              </div>
            ) : (
              <div className="space-y-1">
                {/* Show Input Manual first for postal code popup */}
                {popupType === 'postal' && selectedDistrictId && (
                  <button
                    onClick={() => handleLocationSelect('manual', 'Input Manual')}
                    className="w-full text-left px-3 py-2.5 text-sm text-gray-900 hover:bg-gray-50 hover:text-gray-600 transition-colors border-b border-gray-200 pb-3 mb-1"
                  >
                    Input Manual
                  </button>
                )}
                {filteredData.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => handleLocationSelect(item.id, item.name)}
                    className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200">
            <button
              onClick={closeLocationPopup}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Don't render content until user is authenticated
  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LottiePlayer
          src="/images/7iaKJ6872I.json"
          autoplay
          loop
          style={{ width: '200px', height: '200px' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top black bar */}
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

      {/* Header component - Always rendered for sidebars, but header bar hidden on mobile */}
      <Header variant="docs" topBarVisible={true} />

      {/* Mobile Header (only visible on mobile) */}
      <div className="md:hidden fixed top-8 left-0 right-0 z-[60] bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Animated Hamburger Menu */}
          <button
            type="button"
            aria-label={isMobileSidebarOpen ? "Tutup menu" : "Buka menu"}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative w-10 h-10 flex items-center justify-center"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          >
            <div className="w-6 h-5 flex flex-col justify-center items-center">
              <span className={`w-6 h-0.5 bg-gray-800 rounded-full transition-all duration-300 ease-in-out ${isMobileSidebarOpen ? 'rotate-45 translate-y-[3px]' : 'mb-1'}`}></span>
              <span className={`w-6 h-0.5 bg-gray-800 rounded-full transition-all duration-300 ease-in-out ${isMobileSidebarOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100 mb-1'}`}></span>
              <span className={`w-6 h-0.5 bg-gray-800 rounded-full transition-all duration-300 ease-in-out ${isMobileSidebarOpen ? '-rotate-45 -translate-y-[3px]' : ''}`}></span>
            </div>
          </button>

          {/* Right: 4 Icons */}
          <div className="flex items-center gap-2">
            {/* Search Icon */}
            <button
              type="button"
              aria-label="Cari"
              className="relative p-1 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => setIsMobileSearchOpen(true)}
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
              onClick={() => window.dispatchEvent(new Event('openVoucherSidebar'))}
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
              onClick={() => window.dispatchEvent(new Event('openFavoriteSidebar'))}
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
              onClick={() => window.dispatchEvent(new Event('openCartSidebar'))}
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

      {/* Mobile Sidebar Navigation */}
      {isMobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-[58] bg-black/30 transition-opacity duration-200 ease-out animate-fadeIn"
            onClick={() => setIsMobileSidebarOpen(false)}
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
                    onClick={() => setIsMobileSidebarOpen(false)}
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
                    onClick={() => setIsMobileSidebarOpen(false)}
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
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-black transition-colors duration-200"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium">Pesanan</span>
                  </Link>
                </li>

                {/* Notifikasi Menu */}
                <li className="animate-menu-item">
                  <Link
                    href="/user/purchase?view=notifications"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-black transition-colors duration-200"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="text-sm font-medium">Notifikasi</span>
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
                        onClick={() => setShowMobileAccountMenu(!showMobileAccountMenu)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 hover:text-black transition-colors duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="text-sm font-medium">Informasi Akun</span>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`text-gray-400 transition-transform duration-200 ${showMobileAccountMenu ? 'rotate-180' : ''}`}>
                          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>

                      {/* Submenu */}
                      {showMobileAccountMenu && (
                        <ul className="bg-gray-50 py-1">
                          <li>
                            <Link
                              href="/user/purchase?view=profile"
                              onClick={() => setIsMobileSidebarOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 pl-14 hover:bg-gray-100 text-gray-600 hover:text-black transition-colors duration-200"
                            >
                              <span className="text-sm">Informasi Akun</span>
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/user/purchase?view=address"
                              onClick={() => setIsMobileSidebarOpen(false)}
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
                        onClick={async () => {
                          try {
                            await logout();
                            setIsMobileSidebarOpen(false);
                            router.push('/');
                          } catch (error) {
                            console.error('Logout error:', error);
                          }
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
                      onClick={() => setIsMobileSidebarOpen(false)}
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

      {/* Mobile Search Sidebar */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={handleCloseMobileSearch}
            aria-hidden="true"
          />
          <aside className="absolute right-0 top-0 h-full w-80 md:w-96 max-w-[92%] bg-white shadow-2xl p-6 flex flex-col">
            <button
              type="button"
              aria-label="Tutup pencarian"
              className="absolute -left-12 top-6 w-14 h-10 bg-white rounded-l-lg rounded-r-none text-black flex items-center justify-center"
              onClick={handleCloseMobileSearch}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="flex items-center justify-between">
              <span className="font-cormorant text-xl md:text-2xl text-black">Cari Produk</span>
            </div>

            <div className="mt-6">
              <input
                type="text"
                placeholder="Cari produk"
                value={mobileSearchQuery}
                onChange={(e) => {
                  setMobileSearchQuery(e.target.value);
                  setMobileHasSearched(false);
                  setMobileSearchResults([]);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleMobileSearch()}
                className="w-full rounded-none border border-gray-300 px-4 py-3 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black/40"
              />
              <div className="mt-3">
                <button
                  onClick={handleMobileSearch}
                  disabled={mobileSearchLoading || !mobileSearchQuery.trim()}
                  className="w-full rounded-none bg-black text-white px-4 py-2 font-belleza text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {mobileSearchLoading ? 'Mencari...' : 'Cari'}
                </button>
              </div>
            </div>

            <div className="mt-6">
              <p className="font-cormorant text-black">Hasil pencarian</p>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-5">
              {mobileSearchLoading ? (
                <p className="text-sm text-gray-600">Mencari produk...</p>
              ) : mobileHasSearched ? (
                mobileSearchResults.length > 0 ? (
                  mobileSearchResults.map((product: any) => (
                    <Link
                      key={product.id}
                      href={`/produk/${product.id}/detail`}
                      className="flex items-center gap-4 hover:bg-gray-50 p-2 rounded cursor-pointer"
                      onClick={handleCloseMobileSearch}
                    >
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
                  <p className="text-sm text-gray-600">Tidak ada hasil untuk "{mobileSearchQuery}"</p>
                )
              ) : (
                <p className="text-sm text-gray-600">Masukkan kata kunci untuk mencari produk</p>
              )}
            </div>
          </aside>
        </div>
      )}

      <div className={`${activeView === 'order-detail' ? 'pt-[92px]' : activeView === 'purchase' ? 'pt-[140px]' : 'pt-[92px]'} md:pt-[130px] pb-12`}>
        <div className="mx-auto mt-0 md:mt-8 md:px-4" style={{maxWidth: '1080px', width: '100%'}}>
          <div className="flex gap-3 md:gap-4 lg:gap-6">
            {/* Sidebar - Hidden on mobile */}
            <aside className="hidden md:block w-48 lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 lg:p-6">
                {/* Profile Section */}
                <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                    {mounted && user ? ((user as any)?.nama?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()) : 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-belleza text-sm font-semibold text-gray-900 truncate">
                      {mounted && user ? ((user as any)?.nama || user.email) : 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate pointer-events-none select-none">
                      {mounted && user ? user.email : ''}
                    </p>
                  </div>
                </div>

                {/* Menu List */}
                <nav className="mt-3 md:mt-4 space-y-0.5 md:space-y-1 font-belleza">
                  <div className="relative">
                    <button
                      onClick={() => setShowAccountMenu(!showAccountMenu)}
                      className={`w-full flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm rounded transition-colors ${
                        activeView === 'profile' || activeView === 'address'
                          ? 'text-gray-900 bg-gray-100'
                          : 'text-gray-700 hover:text-black hover:bg-gray-100'
                      }`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="flex-1 text-left">Akun Saya</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform ${showAccountMenu ? 'rotate-180' : ''}`}>
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {showAccountMenu && (
                      <div className="mt-1 ml-9 space-y-1">
                        <button
                          onClick={() => updateView('profile')}
                          className={`w-full text-left block px-3 py-2 text-xs rounded transition-colors ${
                            activeView === 'profile'
                              ? 'text-gray-900 bg-gray-100'
                              : 'text-gray-600 hover:text-black hover:bg-gray-100'
                          }`}
                        >
                          Informasi Akun
                        </button>
                        <button
                          onClick={() => updateView('address')}
                          className={`w-full text-left block px-3 py-2 text-xs rounded transition-colors ${
                            activeView === 'address'
                              ? 'text-gray-900 bg-gray-100'
                              : 'text-gray-600 hover:text-black hover:bg-gray-100'
                          }`}
                        >
                          Alamat Saya
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => updateView('purchase')}
                    className={`w-full flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm rounded transition-colors ${
                      activeView === 'purchase'
                        ? 'text-gray-900 bg-gray-100'
                        : 'text-gray-700 hover:text-black hover:bg-gray-100'
                    }`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Pesanan Saya
                  </button>

                  <button
                    onClick={() => updateView('notifications')}
                    className={`w-full flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm rounded transition-colors ${
                      activeView === 'notifications'
                        ? 'text-gray-900 bg-gray-100'
                        : 'text-gray-700 hover:text-black hover:bg-gray-100'
                    }`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Notifikasi
                  </button>

                  <button
                    onClick={() => updateView('vouchers')}
                    className={`w-full flex items-center gap-2 md:gap-3 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm rounded transition-colors ${
                      activeView === 'vouchers'
                        ? 'text-gray-900 bg-gray-100'
                        : 'text-gray-700 hover:text-black hover:bg-gray-100'
                    }`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 0 0-2 2v3a2 2 0 1 1 0 4v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3a2 2 0 1 1 0-4V7a2 2 0 0 0-2-2H5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Voucher Saya
                  </button>
                </nav>
              </div>
            </aside>

            {/* Tabs Navigation - Mobile Only (Completely separated from content) */}
            {activeView === 'purchase' && (
              <div className="md:hidden fixed top-[92px] left-0 right-0 z-[55] bg-white">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide px-3 py-2" style={{WebkitOverflowScrolling: 'touch'}}>
                  {tabs.filter((tab) => tab.id !== 'all').map((tab) => {
                    const count = getTabCount(tab.id);
                    return (
                      <div key={tab.id} className="relative flex-shrink-0">
                        <button
                          onClick={() => setActiveTab(tab.id)}
                          className={`px-3 py-1.5 text-[11px] font-belleza whitespace-nowrap rounded-full transition-all ${
                            activeTab === tab.id
                              ? 'bg-gray-500 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                          }`}
                        >
                          {tab.label} {count > 0 && <span className={activeTab === tab.id ? 'text-white/90' : 'text-gray-800'}>({count})</span>}
                        </button>
                        {activeTab === tab.id && (
                          <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gray-500"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Main Content */}
            <main className="flex-1">
              <div className="bg-white md:rounded-lg md:shadow-sm mt-0 md:mt-0">
                {activeView === 'purchase' && (
                  <>
                    {/* Tabs Navigation - Desktop */}
                    <div className="hidden md:block border-b border-gray-200">
                      <div className="flex items-center overflow-x-auto scrollbar-hide">
                        {tabs.map((tab) => {
                          const count = getTabCount(tab.id);
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`px-3 md:px-4 lg:px-6 py-2 md:py-3 lg:py-4 text-xs md:text-sm font-belleza whitespace-nowrap border-b-2 transition-colors ${
                                activeTab === tab.id
                                  ? 'border-gray-500 text-gray-900'
                                  : 'border-transparent text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              {tab.label} {count > 0 && `(${count})`}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Search Bar - Fixed on mobile, static on desktop */}
                    <div className="md:hidden">
                      <div className="fixed top-[131px] left-0 right-0 z-[54] bg-white border-t border-b border-gray-200 p-3">
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          <input
                            type="text"
                            placeholder="Cari berdasarkan No. Pesanan"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 transition-all placeholder:text-gray-400 text-gray-900 font-belleza text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Search Bar - Desktop Only */}
                    <div className="hidden md:block p-6 border-b border-gray-200">
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Cari berdasarkan No. Pesanan"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 transition-all placeholder:text-gray-400 text-gray-900 font-belleza text-sm"
                        />
                      </div>
                    </div>

                    {/* Order List or Empty State */}
                    <div className="mt-[60px] md:mt-0">
                      {ordersLoading ? (
                        <div className="p-6 md:p-12 flex items-center justify-center">
                          <p className="text-gray-600">Memuat pesanan...</p>
                        </div>
                      ) : filteredOrders.length > 0 ? (
                        <div className="divide-y divide-gray-200">
                        {filteredOrders.map((order) => {
                          // Check if order has return request
                          const orderReturn = userReturns.find(ret =>
                            ret.order_id === order.id && ret.status !== 'expired'
                          );
                          const hasReturnRequest = !!orderReturn;
                          const isReturnCompleted = orderReturn?.status === 'completed';

                          return (
                          <div key={order.id} className="p-3 md:p-3 lg:p-4">
                            {/* Order Header */}
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                              <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-600">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="md:w-[14px] md:h-[14px] flex-shrink-0">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
                                  </svg>
                                  <span className="flex-shrink-0">{new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                                <span className="text-gray-300 flex-shrink-0">|</span>
                                <span className="text-[10px] md:text-xs text-gray-900 font-semibold truncate">{order.id.replace(/-/g, '').slice(0, 10).toUpperCase()}</span>
                              </div>
                              <span className={`flex-shrink-0 text-[10px] md:text-xs px-2 py-0.5 rounded whitespace-nowrap ml-2 ${
                                // If return is completed, show green badge
                                isReturnCompleted
                                  ? 'bg-green-100 text-green-700'
                                  // If order has return request (not completed), show gray badge in ALL tabs
                                  : hasReturnRequest
                                  ? 'bg-gray-100 text-gray-700'
                                  : order.status === 'UNPAID' || order.status === 'pending' || !order.status
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : order.status === 'processing'
                                  ? 'bg-blue-100 text-blue-700'
                                  : order.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : order.status === 'delivered'
                                  ? 'bg-teal-100 text-teal-700'
                                  : order.status === 'shipped'
                                  ? 'bg-green-100 text-green-700'
                                  : order.status === 'paid' && order.shipping_resi
                                  ? 'bg-blue-100 text-blue-700'
                                  : order.status === 'paid'
                                  ? 'bg-green-100 text-green-700'
                                  : order.status === 'FAILED' || order.status === 'failed' || order.status === 'cancelled'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {/* Badge text logic */}
                                {isReturnCompleted ? 'Selesai' :
                                 hasReturnRequest ? 'Proses Pengembalian' :
                                 order.status === 'UNPAID' || order.status === 'pending' || !order.status ? 'Belum Bayar' :
                                 order.status === 'processing' ? 'Sedang Dikemas' :
                                 order.status === 'completed' ? 'Selesai' :
                                 order.status === 'delivered' ? 'Terkirim' :
                                 order.status === 'shipped' ? 'Dikirim' :
                                 order.status === 'paid' && order.shipping_resi && !order.shipping_resi.startsWith('Menunggu') && order.shipping_resi.length > 10 ? 'Dikirim' :
                                 order.status === 'paid' ? 'Sedang Dikemas' :
                                 order.status === 'cancelled' ? 'Dibatalkan' :
                                 order.status === 'FAILED' || order.status === 'failed' ? 'Gagal' :
                                 order.status || 'Pending'}
                              </span>
                            </div>

                            {/* Order Items */}
                            <div className="space-y-2 md:space-y-3">
                              {order.order_items?.map((item: any, itemIndex: number) => (
                                <div key={`${order.id}-${item.id}-${itemIndex}`} className="flex gap-2 md:gap-3">
                                  {/* Product Image */}
                                  <div className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0 bg-gray-100 rounded border border-gray-200 overflow-hidden">
                                    {item.produk?.photo1 ? (
                                      <img
                                        src={item.produk.photo1}
                                        alt={item.produk?.nama_produk || 'Product'}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="md:w-[32px] md:h-[32px]">
                                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#9CA3AF" strokeWidth="2"/>
                                          <circle cx="8.5" cy="8.5" r="1.5" fill="#9CA3AF"/>
                                          <path d="M21 15l-5-5L5 21" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                      </div>
                                    )}
                                  </div>

                                  {/* Product Info */}
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-xs md:text-sm font-medium text-gray-900 mb-0.5 truncate">{item.produk?.nama_produk || 'Produk'}</h3>
                                    {item.size && <p className="text-[10px] md:text-xs text-gray-500 mb-1">Size: {item.size}</p>}
                                    <p className="text-[10px] md:text-xs text-gray-600">x{item.quantity}</p>
                                  </div>

                                  {/* Product Price */}
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-xs md:text-sm font-semibold text-gray-900">
                                      Rp{(item.price || 0).toLocaleString('id-ID')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Order Footer */}
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              {/* Total Belanja - Mobile: di atas buttons, Desktop: di kanan */}
                              <div className="flex justify-end mb-2 md:hidden">
                                <div className="text-right">
                                  <p className="text-[10px] text-gray-600">Total Belanja</p>
                                  <p className="text-sm font-bold text-gray-900">
                                    Rp {(order.total_amount || 0).toLocaleString('id-ID')}
                                  </p>
                                </div>
                              </div>

                              {/* Buttons and Total - Combined for desktop */}
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {order.status === 'UNPAID' || order.status === 'pending' || !order.status ? (
                                    <>
                                      <a
                                        href={getPaymentUrl(order)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs text-white bg-gray-500 rounded hover:bg-gray-600 transition-colors font-semibold"
                                      >
                                        Bayar Sekarang
                                      </a>
                                      <button
                                        onClick={() => handleOpenDetail(order)}
                                        className="px-2.5 md:px-3 py-1.5 text-[10px] md:text-xs text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                                      >
                                        Lihat Detail
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={openChat}
                                        className="px-2.5 md:px-3 py-1.5 text-[10px] md:text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors whitespace-nowrap"
                                      >
                                        Laporkan Kendala
                                      </button>
                                      <button
                                        onClick={() => handleOpenDetail(order)}
                                        className="px-2.5 md:px-3 py-1.5 text-[10px] md:text-xs text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
                                      >
                                        Lihat Detail
                                      </button>
                                    </>
                                  )}
                                </div>

                                {/* Total Belanja - Desktop only */}
                                <div className="hidden md:block text-right">
                                  <p className="text-xs text-gray-600">Total Belanja</p>
                                  <p className="text-base font-bold text-gray-900">
                                    Rp {(order.total_amount || 0).toLocaleString('id-ID')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Empty State */
                      <div className="p-12 flex flex-col items-center justify-center">
                        <div className="w-32 h-32 mb-6 relative">
                          {/* Empty state illustration */}
                          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Clipboard */}
                            <rect x="50" y="40" width="100" height="130" rx="8" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="3"/>
                            <rect x="75" y="30" width="50" height="20" rx="4" fill="#9CA3AF"/>
                            <line x1="70" y1="70" x2="130" y2="70" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round"/>
                            <line x1="70" y1="90" x2="130" y2="90" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round"/>
                            <line x1="70" y1="110" x2="110" y2="110" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round"/>

                            {/* Magnifying glass */}
                            <circle cx="140" cy="130" r="25" fill="#60A5FA" opacity="0.8"/>
                            <circle cx="140" cy="130" r="20" fill="white"/>
                            <line x1="157" y1="147" x2="175" y2="165" stroke="#60A5FA" strokeWidth="8" strokeLinecap="round"/>

                            {/* Decorative dots */}
                            <circle cx="30" cy="80" r="4" fill="#FCD34D" opacity="0.6"/>
                            <circle cx="170" cy="60" r="6" fill="#FCA5A5" opacity="0.6"/>
                            <circle cx="180" cy="100" r="5" fill="#93C5FD" opacity="0.6"/>
                          </svg>
                        </div>
                        <p className="text-gray-600 font-belleza text-lg">Belum ada pesanan</p>
                      </div>
                    )}
                    </div>
                  </>
                )}

                {activeView === 'profile' && (
                  <>
                    {!mounted || !user ? (
                      /* Loading State with Lottie */
                      <div className="p-4 md:p-8 flex items-center justify-center min-h-[500px]">
                        <LottiePlayer
                          src="/images/7iaKJ6872I.json"
                          autoplay
                          loop
                          style={{ width: '120px', height: '120px' }}
                        />
                      </div>
                    ) : (
                      /* Profile Form */
                      <div className="p-4 md:p-8">
                        {/* Breadcrumb - Mobile Only */}
                        <div className="mb-3 md:hidden">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Link href="/home" className="hover:text-gray-600 transition-colors">
                              Home
                            </Link>
                            <span>&gt;</span>
                            <span className="text-gray-900 font-medium">Profile</span>
                          </div>
                        </div>

                        <div className="mb-4 md:mb-6">
                          <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">Profil Saya</h2>
                          <p className="text-sm text-gray-600">Kelola informasi profil Anda untuk mengontrol, melindungi dan mengamankan akun</p>
                        </div>

                      {/* Avatar Section - Mobile Only (Top Center) */}
                      <div className="md:hidden flex flex-col items-center mb-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                          {mounted && user ? ((user as any)?.nama?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase()) : 'U'}
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-6 md:gap-12">
                        {/* Left side - Form */}
                        <div className="flex-1 space-y-3 md:space-y-6">
                          {/* Nama - Read Only */}
                          <div className="flex flex-col md:flex-row md:items-center">
                            <label className="hidden md:block md:w-32 text-sm text-gray-900 md:text-left md:mr-6">Nama</label>
                            <div className="flex-1">
                              {/* Mobile */}
                              <div className="md:hidden">
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Lengkap</label>
                                <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center">
                                  <p className="text-sm text-gray-900 flex-1">
                                    {mounted && user ? ((user as any)?.nama || 'Belum diatur') : '-'}
                                  </p>
                                </div>
                              </div>
                              {/* Desktop */}
                              <div className="hidden md:flex items-center gap-3">
                                <p className="text-sm text-gray-900">
                                  {mounted && user ? ((user as any)?.nama || 'Belum diatur') : '-'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Email - Mobile Card Style */}
                          <div className="flex flex-col md:flex-row md:items-center">
                            <label className="hidden md:block md:w-32 text-sm text-gray-900 md:text-left md:mr-6">Email</label>
                            <div className="flex-1">
                              {/* Mobile: Card with icon */}
                              <div className="md:hidden">
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                                  <p className="text-sm text-gray-900 flex-1 break-all">{mounted && user ? user.email : 'email'}</p>
                                  <button
                                    onClick={handleSendEmailChangeCode}
                                    className="text-xs font-medium text-gray-700 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
                                  >
                                    Ubah
                                  </button>
                                </div>
                              </div>
                              {/* Desktop: Normal layout */}
                              <div className="hidden md:flex items-center gap-3">
                                <p className="text-sm text-gray-900">{mounted && user ? user.email : 'email'}</p>
                                <button
                                  onClick={handleSendEmailChangeCode}
                                  className="text-sm text-blue-600 hover:text-blue-700"
                                >
                                  Ubah
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Nomor Telepon - Mobile Card Style */}
                          <div className="flex flex-col md:flex-row md:items-center">
                            <label className="hidden md:block md:w-32 text-sm text-gray-900 md:text-left md:mr-6">Nomor Telepon</label>
                            <div className="flex-1">
                              {/* Mobile: Card with icon */}
                              <div className="md:hidden">
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nomor Telepon</label>
                                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                                  <p className="text-sm text-gray-900 flex-1">
                                    {mounted && user ? ((user as any)?.phone || 'Belum diatur') : '-'}
                                  </p>
                                  <button
                                    onClick={() => {
                                      setPhoneInput((user as any)?.phone || '');
                                      setShowPhoneModal(true);
                                    }}
                                    className="text-xs font-medium text-gray-700 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    {mounted && user && (user as any)?.phone ? 'Ubah' : 'Tambah'}
                                  </button>
                                </div>
                              </div>
                              {/* Desktop: Normal layout */}
                              <div className="hidden md:flex items-center gap-3">
                                <p className="text-sm text-gray-900">
                                  {mounted && user ? ((user as any)?.phone || '-') : '-'}
                                </p>
                                <button
                                  onClick={() => {
                                    setPhoneInput((user as any)?.phone || '');
                                    setShowPhoneModal(true);
                                  }}
                                  className="text-sm text-blue-600 hover:text-blue-700"
                                >
                                  {mounted && user && (user as any)?.phone ? 'Ubah' : 'Tambah'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Jenis Kelamin - Mobile Card Style */}
                          <div className="flex flex-col md:flex-row md:items-center">
                            <label className="hidden md:block md:w-32 text-sm text-gray-900 md:text-left md:mr-6">Jenis Kelamin</label>
                            <div className="flex-1">
                              {/* Mobile: Card with icon */}
                              <div className="md:hidden">
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Jenis Kelamin</label>
                                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
                                  <p className="text-sm text-gray-900 flex-1">
                                    {mounted && user
                                      ? (user as any)?.gender === 'male'
                                        ? 'Laki-laki'
                                        : (user as any)?.gender === 'female'
                                        ? 'Perempuan'
                                        : (user as any)?.gender === 'other'
                                        ? 'Lainnya'
                                        : 'Belum diatur'
                                      : '-'}
                                  </p>
                                  <button
                                    onClick={() => {
                                      setGenderInput((user as any)?.gender || '');
                                      setShowGenderModal(true);
                                    }}
                                    className="text-xs font-medium text-gray-700 hover:text-gray-800 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    {mounted && user && (user as any)?.gender ? 'Ubah' : 'Tambah'}
                                  </button>
                                </div>
                              </div>
                              {/* Desktop: Normal layout */}
                              <div className="hidden md:flex items-center gap-3">
                                <p className="text-sm text-gray-900">
                                  {mounted && user
                                    ? (user as any)?.gender === 'male'
                                      ? 'Laki-laki'
                                      : (user as any)?.gender === 'female'
                                      ? 'Perempuan'
                                      : (user as any)?.gender === 'other'
                                      ? 'Lainnya'
                                      : '-'
                                    : '-'}
                                </p>
                                <button
                                  onClick={() => {
                                    setGenderInput((user as any)?.gender || '');
                                    setShowGenderModal(true);
                                  }}
                                  className="text-sm text-blue-600 hover:text-blue-700"
                                >
                                  {mounted && user && (user as any)?.gender ? 'Ubah' : 'Tambah'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Button Simpan */}
                          <div className="flex flex-col md:flex-row md:items-center pt-2">
                            <div className="hidden md:block md:w-32 md:mr-6"></div>
                            <div className="flex-1">
                              <button className="w-full md:w-auto px-8 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white text-sm font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
                                Simpan Perubahan
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    )}
                  </>
                )}

                {activeView === 'address' && (
                  <>
                    {!mounted || !user ? (
                      /* Loading State with Lottie */
                      <div className="p-4 md:p-8 flex items-center justify-center min-h-[500px]">
                        <LottiePlayer
                          src="/images/7iaKJ6872I.json"
                          autoplay
                          loop
                          style={{ width: '120px', height: '120px' }}
                        />
                      </div>
                    ) : !showAddAddressForm ? (
                      /* Address List */
                      <div className="p-4 md:p-8">
                        {/* Breadcrumb - Mobile Only */}
                        <div className="mb-3 md:hidden">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Link href="/home" className="hover:text-gray-600 transition-colors">
                              Home
                            </Link>
                            <span>&gt;</span>
                            <span className="text-gray-900 font-medium">Alamat</span>
                          </div>
                        </div>

                        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <h2 className="text-lg md:text-xl font-semibold text-gray-900">Alamat Saya</h2>
                          <button
                            onClick={() => {
                              const params = new URLSearchParams(window.location.search);
                              params.set('action', 'addaddress');
                              router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
                              setShowAddAddressForm(true);
                            }}
                            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded transition-colors flex items-center gap-2"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Tambah Alamat Baru
                          </button>
                        </div>

                      {/* Address Cards */}
                      <div className="space-y-4">
                        {loadingAddresses ? (
                          <div className="text-center py-8 text-gray-500">Memuat alamat...</div>
                        ) : userAddresses.length === 0 ? (
                          <div className="text-center py-12 text-gray-500">
                            <p className="mb-2">Belum ada alamat tersimpan</p>
                            <p className="text-sm">Klik "Tambah Alamat Baru" untuk menambah alamat</p>
                          </div>
                        ) : (
                          userAddresses.map((address) => (
                            <div key={address.id} className="border border-gray-300 rounded-lg p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3 flex-wrap">
                                  {address.is_default && (
                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 border border-gray-300 rounded font-medium">Alamat Utama</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => handleEditAddress(address)}
                                    className="text-sm text-gray-700 hover:text-gray-800"
                                  >
                                    Ubah
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <button
                                    onClick={() => handleDeleteAddress(address.id)}
                                    className="text-sm text-gray-700 hover:text-gray-800"
                                  >
                                    Hapus
                                  </button>
                                  {!address.is_default && (
                                    <>
                                      <span className="text-gray-300">|</span>
                                      <button
                                        onClick={() => handleSetDefaultAddress(address.id)}
                                        disabled={loadingAddresses}
                                        className="text-sm text-gray-700 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {loadingAddresses ? 'Memproses...' : 'Atur sebagai default'}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-3 text-sm">
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Nama</p>
                                  <p className="text-gray-900 font-medium">{address.nama}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Nomor Telepon</p>
                                  <p className="text-gray-900 font-medium">{address.phone}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Alamat</p>
                                  <p className="text-gray-700">{address.street}, Kel. {address.kelurahan}, Kec. {address.kecamatan}, {address.kabupaten}, {address.provinsi}, {address.postal}, Indonesia</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    ) : (
                      /* Add Address Form */
                      <div className="p-4 md:p-5">
                        {/* Breadcrumb - Mobile Only */}
                        <div className="mb-3 md:hidden">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Link href="/home" className="hover:text-gray-600 transition-colors">
                              Home
                            </Link>
                            <span>&gt;</span>
                            <button
                              onClick={() => {
                                const params = new URLSearchParams(window.location.search);
                                params.delete('action');
                                router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
                                setShowAddAddressForm(false);
                              }}
                              className="hover:text-gray-600 transition-colors"
                            >
                              Alamat
                            </button>
                            <span>&gt;</span>
                            <span className="text-gray-900 font-medium">Tambah Alamat Baru</span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h2 className="text-lg font-semibold text-gray-900">Tambah Alamat Baru</h2>
                        </div>

                        {/* Two Column Layout: Form + Preview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Left: Form */}
                          <div className="space-y-3">
                            {/* Nama */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nama Lengkap <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={newAddressData.nama}
                                onChange={(e) => setNewAddressData({...newAddressData, nama: e.target.value})}
                                className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                              />
                            </div>

                            {/* Phone */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Nomor Telepon <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="tel"
                                value={newAddressData.phone}
                                onChange={(e) => setNewAddressData({...newAddressData, phone: e.target.value})}
                                className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                              />
                            </div>

                            {/* Alamat Jalan */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Alamat Jalan <span className="text-red-500">*</span>
                              </label>
                              <textarea
                                value={newAddressData.street}
                                onChange={(e) => setNewAddressData({...newAddressData, street: e.target.value})}
                                className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                rows={2}
                              />
                            </div>

                            {/* Provinsi */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Provinsi <span className="text-red-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => openLocationPopup('province')}
                                disabled={provinceLoading}
                                className={`w-full px-3 py-1.5 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 text-left flex items-center justify-between ${!selectedProvinceId ? 'text-gray-500' : 'text-gray-900'} ${provinceLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-gray-50'}`}
                              >
                                <span>
                                  {provinceLoading ? 'Memuat provinsi...' : (getSelectedLocationName('province') || 'Pilih Provinsi')}
                                </span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>

                            {/* Kabupaten/Kota */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Kabupaten/Kota <span className="text-red-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => openLocationPopup('regency')}
                                disabled={!selectedProvinceId || regencyLoading}
                                className={`w-full px-3 py-1.5 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 text-left flex items-center justify-between ${!selectedRegencyId ? 'text-gray-500' : 'text-gray-900'} ${!selectedProvinceId || regencyLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-gray-50'}`}
                              >
                                <span>
                                  {regencyLoading ? 'Memuat kabupaten/kota...' : !selectedProvinceId ? 'Harap memilih provinsi terlebih dahulu' : (getSelectedLocationName('regency') || 'Pilih Kabupaten/Kota')}
                                </span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>

                            {/* Kecamatan */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Kecamatan <span className="text-red-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => openLocationPopup('district')}
                                disabled={!selectedRegencyId || districtLoading}
                                className={`w-full px-3 py-1.5 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 text-left flex items-center justify-between ${!selectedDistrictId ? 'text-gray-500' : 'text-gray-900'} ${!selectedRegencyId || districtLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-gray-50'}`}
                              >
                                <span>
                                  {districtLoading ? 'Memuat kecamatan...' : !selectedRegencyId ? 'Harap memilih kabupaten/kota terlebih dahulu' : (getSelectedLocationName('district') || 'Pilih Kecamatan')}
                                </span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>

                            {/* Kelurahan */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Kelurahan <span className="text-red-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => openLocationPopup('village')}
                                disabled={!selectedDistrictId || villageLoading}
                                className={`w-full px-3 py-1.5 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 text-left flex items-center justify-between ${!selectedVillageId ? 'text-gray-500' : 'text-gray-900'} ${!selectedDistrictId || villageLoading ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-gray-50'}`}
                              >
                                <span>
                                  {villageLoading ? 'Memuat kelurahan...' : !selectedDistrictId ? 'Harap memilih kecamatan terlebih dahulu' : (getSelectedLocationName('village') || 'Pilih Kelurahan')}
                                </span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>

                            {/* Kode Pos - Button with Manual Option */}
                            <div className="group">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Kode Pos
                              </label>
                              {!isManualPostalCode ? (
                                <button
                                  type="button"
                                  onClick={() => openLocationPopup('postal')}
                                  disabled={!selectedDistrictId}
                                  className={`w-full px-3 py-1.5 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 text-left flex items-center justify-between ${!newAddressData.postal ? 'text-gray-500' : 'text-gray-900'} ${!selectedDistrictId ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer hover:bg-gray-50'}`}
                                >
                                  <span>
                                    {!selectedDistrictId
                                      ? 'Pilih kecamatan terlebih dahulu'
                                      : postalCodeOptions.length === 0
                                        ? 'Pilih atau input manual'
                                        : (getSelectedLocationName('postal') || 'Pilih kode pos')}
                                  </span>
                                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                              ) : (
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={newAddressData.postal}
                                    onChange={(e) => {
                                      // Only allow numbers and limit to 5 digits
                                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
                                      setNewAddressData({...newAddressData, postal: value});
                                    }}
                                    placeholder="Masukkan kode pos (5 digit)"
                                    className="w-full px-3 py-1.5 pr-24 text-sm text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                  />
                                  <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsManualPostalCode(false);
                                        // Keep the manually entered postal code value
                                      }}
                                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsManualPostalCode(false);
                                        // Reset to empty value when canceling
                                        setNewAddressData({...newAddressData, postal: ''});
                                      }}
                                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 font-semibold"
                                    >
                                      Batal
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 pt-3">
                              <button
                                onClick={handleSaveAddress}
                                disabled={savingAddress}
                                className="px-4 py-1.5 text-sm bg-gray-500 hover:bg-gray-600 text-white transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                              >
                                {savingAddress ? 'Menyimpan...' : 'Simpan Alamat'}
                              </button>
                              <button
                                onClick={handleCancelAddAddress}
                                className="px-4 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                              >
                                Batal
                              </button>
                            </div>
                          </div>

                          {/* Right: Preview Alamat */}
                          <div className="bg-gray-50 rounded-lg p-4 h-fit sticky top-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Preview Alamat</h3>

                            {newAddressData.nama || newAddressData.phone || newAddressData.street || selectedProvinceId ? (
                              <div className="space-y-2 text-xs">
                                {newAddressData.nama && (
                                  <div>
                                    <p className="font-semibold text-gray-900">{newAddressData.nama}</p>
                                  </div>
                                )}

                                {newAddressData.phone && (
                                  <div>
                                    <p className="text-gray-700">{newAddressData.phone}</p>
                                  </div>
                                )}

                                {newAddressData.street && (
                                  <div className="pt-1 border-t border-gray-200">
                                    <p className="text-gray-700">{newAddressData.street}</p>
                                  </div>
                                )}

                                {(selectedVillageId || selectedDistrictId || selectedRegencyId || selectedProvinceId) && (
                                  <div className="text-gray-700">
                                    {selectedVillageId && villageOptions.find(v => v.id === selectedVillageId) && (
                                      <span>{villageOptions.find(v => v.id === selectedVillageId)?.name}</span>
                                    )}
                                    {selectedDistrictId && districtOptions.find(d => d.id === selectedDistrictId) && (
                                      <span>{selectedVillageId ? ', ' : ''}{districtOptions.find(d => d.id === selectedDistrictId)?.name}</span>
                                    )}
                                    {selectedRegencyId && regencyOptions.find(r => r.id === selectedRegencyId) && (
                                      <span>{selectedDistrictId ? ', ' : ''}{regencyOptions.find(r => r.id === selectedRegencyId)?.name}</span>
                                    )}
                                    {selectedProvinceId && provinceOptions.find(p => p.id === selectedProvinceId) && (
                                      <span>{selectedRegencyId ? ', ' : ''}{provinceOptions.find(p => p.id === selectedProvinceId)?.name}</span>
                                    )}
                                  </div>
                                )}

                                {newAddressData.postal && (
                                  <div>
                                    <p className="text-gray-700">{newAddressData.postal}</p>
                                  </div>
                                )}

                                <div>
                                  <p className="text-gray-500 italic">{newAddressData.negara || 'Indonesia'}</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic">Isi form untuk melihat preview alamat</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {(activeView === 'order-detail' || activeView === 'return-detail') && (loadingDetail || selectedOrder) && (
                  <>
                    {!orderDetailInitialized || loadingDetail || isTransitioning ? (
                      // Skeleton Loading State - show until initialized and data loaded, or during transition
                      <div className="p-6 animate-pulse">
                        {/* Header Skeleton */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="h-4 w-32 bg-gray-200 rounded"></div>
                          <div className="h-8 w-40 bg-gray-200 rounded"></div>
                        </div>

                        {/* Order Info Skeleton */}
                        <div className="bg-gray-50 rounded p-3 mb-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[1, 2, 3, 4].map((i) => (
                              <div key={i}>
                                <div className="h-3 w-20 bg-gray-200 rounded mb-2"></div>
                                <div className="h-4 w-24 bg-gray-300 rounded"></div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Warning/Status Skeleton */}
                        <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-4">
                          <div className="flex gap-3">
                            <div className="w-5 h-5 bg-gray-200 rounded-full flex-shrink-0"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-48 bg-gray-200 rounded"></div>
                              <div className="h-3 w-full bg-gray-200 rounded"></div>
                            </div>
                          </div>
                        </div>

                        {/* Product Items Skeleton */}
                        <div className="space-y-3 mb-4">
                          {[1, 2].map((i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                              <div className="flex gap-3">
                                <div className="w-20 h-20 bg-gray-200 rounded flex-shrink-0"></div>
                                <div className="flex-1 space-y-2">
                                  <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                                  <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                                  <div className="h-3 w-1/3 bg-gray-200 rounded"></div>
                                </div>
                                <div className="text-right">
                                  <div className="h-4 w-24 bg-gray-200 rounded ml-auto"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Shipping/Payment Details Skeleton */}
                        <div className="space-y-3">
                          {[1, 2].map((i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                              <div className="h-4 w-32 bg-gray-200 rounded mb-3"></div>
                              <div className="space-y-2">
                                <div className="h-3 w-full bg-gray-200 rounded"></div>
                                <div className="h-3 w-5/6 bg-gray-200 rounded"></div>
                                <div className="h-3 w-4/6 bg-gray-200 rounded"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className={`transition-opacity duration-200 ${orderDetailInitialized ? 'opacity-100' : 'opacity-0'}`}>
                        {/* Conditional Rendering: Show Order Detail OR Return Form OR Return Detail OR Update Size */}
                        {showUpdateSize ? (
                          // Update Size View
                          <div className="p-6">
                            {/* Back Button */}
                            <div className="mb-4">
                              <button
                                onClick={() => {
                                  setShowUpdateSize(false);
                                  setPendingSizeChanges({}); // Clear pending changes
                                  // Remove action parameter from URL
                                  const params = new URLSearchParams(window.location.search);
                                  params.delete('action');
                                  router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
                                }}
                                className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Kembali ke detail pesanan
                              </button>
                            </div>

                            {/* Header */}
                            <h3 className="text-base font-semibold text-gray-900 mb-6">Perbarui Detail pesanan</h3>

                            {/* Order Items List */}
                            <div className="space-y-3">
                              {selectedOrder.order_items?.map((item: any) => (
                                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                  <div className="flex gap-3">
                                    {/* Thumbnail */}
                                    <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                      {item.produk?.photo1 ? (
                                        <img
                                          src={item.produk.photo1}
                                          alt={item.produk?.nama_produk || 'Product'}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#9CA3AF" strokeWidth="2"/>
                                          </svg>
                                        </div>
                                      )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1">
                                      <h4 className="text-sm font-medium text-gray-900 mb-1">{item.produk?.nama_produk || 'Produk'}</h4>
                                      <p className="text-xs text-gray-600 mb-2">Ukuran: <span className="font-semibold">{item.size || '-'}</span></p>
                                      <p className="text-xs text-gray-600 mb-3">Jumlah: <span className="font-semibold">x{item.quantity}</span></p>

                                      {/* Size Selection Boxes - Always shown */}
                                      {(() => {
                                        const sizes = [
                                          item.produk?.size1,
                                          item.produk?.size2,
                                          item.produk?.size3,
                                          item.produk?.size4,
                                          item.produk?.size5
                                        ].filter(Boolean) as string[];

                                        if (sizes.length === 0) {
                                          return (
                                            <p className="text-xs text-red-600 italic">
                                              Data ukuran tidak tersedia untuk produk ini
                                            </p>
                                          );
                                        }

                                        return (
                                          <div>
                                            <p className="text-xs font-medium text-gray-700 mb-2">Pilih ukuran:</p>
                                            <div className="flex items-center gap-1 md:gap-1.5 flex-wrap">
                                              {sizes.map((size) => {
                                                // Get current size: check pending changes first, then original size
                                                const currentSize = pendingSizeChanges[item.id] || item.size;
                                                const isSelected = currentSize === size;

                                                return (
                                                  <button
                                                    key={size}
                                                    onClick={() => {
                                                      // Store change temporarily, don't save to database yet
                                                      setPendingSizeChanges(prev => ({
                                                        ...prev,
                                                        [item.id]: size
                                                      }));
                                                    }}
                                                    className={`px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs border transition ${
                                                      isSelected
                                                        ? 'border-black bg-black text-white'
                                                        : 'border-gray-300 text-black hover:border-black'
                                                    }`}
                                                  >
                                                    {size}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Perbarui Pesanan Button */}
                            <div className="mt-6 flex justify-end">
                              <button
                                onClick={() => {
                                  // Double check if order has been updated
                                  if (selectedOrder?.has_been_updated) {
                                    setShowToast(true);
                                    setToastMessage('Pesanan ini sudah pernah diperbarui sebelumnya');
                                    setToastType('error');
                                    return;
                                  }
                                  setShowUpdateConfirm(true);
                                }}
                                disabled={selectedOrder?.has_been_updated || Object.keys(pendingSizeChanges).length === 0}
                                className={`px-6 py-2.5 text-white text-sm font-medium rounded transition-colors ${
                                  selectedOrder?.has_been_updated
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : Object.keys(pendingSizeChanges).length === 0
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-black hover:bg-gray-800'
                                }`}
                              >
                                {selectedOrder?.has_been_updated
                                  ? 'Pesanan sudah diperbarui'
                                  : Object.keys(pendingSizeChanges).length === 0
                                  ? 'Pilih ukuran terlebih dahulu'
                                  : 'Perbarui pesanan'}
                              </button>
                            </div>

                            {/* Confirmation Modal */}
                            {showUpdateConfirm && (
                              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-lg max-w-md w-full p-6">
                                  <div className="flex items-start gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                      <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                      </svg>
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="text-base font-semibold text-gray-900 mb-2">Perhatian!</h3>
                                      <p className="text-sm text-gray-600">
                                        Update pesanan hanya dapat dilakukan <span className="font-semibold">satu kali</span>. Pastikan Anda sudah yakin dengan perubahan ukuran yang dipilih sebelum melanjutkan.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex gap-3 justify-end mt-6">
                                    <button
                                      onClick={() => setShowUpdateConfirm(false)}
                                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                                    >
                                      Batal
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (updatingOrder) return; // Prevent double click

                                        try {
                                          setUpdatingOrder(true);

                                          // Check if there are any pending changes
                                          if (Object.keys(pendingSizeChanges).length === 0) {
                                            throw new Error('Tidak ada perubahan ukuran yang dipilih');
                                          }

                                          // Step 1: Update all size changes in order_items
                                          const updatePromises = Object.entries(pendingSizeChanges).map(([itemId, newSize]) => {
                                            return supabase
                                              .from('order_items')
                                              .update({ size: newSize })
                                              .eq('id', itemId);
                                          });

                                          const updateResults = await Promise.all(updatePromises);

                                          // Check if any update failed
                                          const failedUpdate = updateResults.find(result => result.error);
                                          if (failedUpdate) {
                                            throw new Error('Gagal memperbarui ukuran produk');
                                          }

                                          // Step 2: Call API to mark order as updated
                                          const response = await fetch('/api/orders/update-status', {
                                            method: 'POST',
                                            headers: {
                                              'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({
                                              orderId: searchParams.get('order'),
                                              userId: user?.id
                                            })
                                          });

                                          const result = await response.json();

                                          if (!response.ok) {
                                            throw new Error(result.error || 'Gagal memperbarui pesanan');
                                          }

                                          // Step 3: Hard refresh page to show updated data
                                          const orderParam = searchParams.get('order');
                                          const redirectUrl = `/user/purchase?view=order-detail&order=${orderParam}`;

                                          // Show success message briefly before reload
                                          setShowToast(true);
                                          setToastMessage('Pesanan berhasil diperbarui');
                                          setToastType('success');

                                          // Reload page after short delay
                                          setTimeout(() => {
                                            window.location.href = redirectUrl;
                                          }, 500);

                                        } catch (error: any) {
                                          console.error('Error updating order:', error);
                                          setUpdatingOrder(false);
                                          setShowUpdateConfirm(false);
                                          setShowToast(true);
                                          setToastMessage(error.message || 'Gagal memperbarui pesanan');
                                          setToastType('error');
                                        }
                                      }}
                                      disabled={updatingOrder}
                                      className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors inline-flex items-center gap-2 ${
                                        updatingOrder
                                          ? 'bg-gray-600 cursor-not-allowed'
                                          : 'bg-black hover:bg-gray-800'
                                      }`}
                                    >
                                      {updatingOrder && (
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                      )}
                                      {updatingOrder ? 'Memperbarui...' : 'Ya, Perbarui Pesanan'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : showReturnDetail ? (
                      // Return Detail Card
                      <div className="p-6">
                        {/* Back Button - Top Left */}
                        <div className="mb-4">
                          <button
                            onClick={() => setShowReturnDetail(false)}
                            className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Kembali ke Detail Pesanan
                          </button>
                        </div>

                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0 mb-6">
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">Detail Pengembalian</h3>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-600 hidden md:inline">Status Pengembalian: </span>
                            <span className={`font-semibold ${
                              submittedReturn?.status === 'approved' ? 'text-green-600' :
                              submittedReturn?.status === 'pending' ? 'text-yellow-600' :
                              submittedReturn?.status === 'validating' ? 'text-blue-600' :
                              submittedReturn?.status === 'completed' ? 'text-green-700' :
                              submittedReturn?.status === 'rejected' ? 'text-red-600' :
                              submittedReturn?.status === 'replacement_shipped' ? 'text-purple-600' :
                              'text-gray-600'
                            }`}>
                              {submittedReturn?.status === 'pending' ? 'Menunggu Persetujuan' :
                               submittedReturn?.status === 'approved' ? 'Disetujui' :
                               submittedReturn?.status === 'validating' ? 'Sedang Divalidasi' :
                               submittedReturn?.status === 'completed' ? 'Selesai' :
                               submittedReturn?.status === 'rejected' ? 'Ditolak' :
                               submittedReturn?.status === 'replacement_shipped' ? 'Pergantian dan Pengiriman' :
                               submittedReturn?.status}
                            </span>
                          </div>
                        </div>


                        {/* Timeline Horizontal */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between relative px-2">
                            {/* Progress Line - single line with gradient effect */}
                            {(() => {
                              // Calculate progress based on status - now using percentages that account for 5 steps evenly spaced
                              // 0% -> 25% -> 50% -> 75% -> 100% for 5 steps
                              let progressPercent = 0;
                              if (submittedReturn?.validasi === 'approved') {
                                progressPercent = 100; // Reached last step
                              } else if (submittedReturn?.status === 'validating') {
                                progressPercent = 75; // Step 4 of 5
                              } else if (submittedReturn?.return_waybill) {
                                progressPercent = 50; // Step 3 of 5
                              } else if (submittedReturn?.status === 'approved') {
                                progressPercent = 25; // Step 2 of 5
                              } else {
                                progressPercent = 0; // Step 1 of 5
                              }

                              return (
                                <>
                                  {/* Background gray line (full width between first and last step centers) */}
                                  <div className="absolute top-5 h-0.5 bg-gray-200 z-0" style={{left: '24px', right: '24px'}}></div>
                                  {/* Red progress line (completed part) */}
                                  <div className="absolute top-5 left-[24px] h-0.5 bg-red-600 z-[1]" style={{width: `calc((100% - 48px) * ${progressPercent / 100})`}}></div>
                                </>
                              );
                            })()}

                            {/* Step 1: Peninjauan */}
                            <button
                              onClick={() => updateTimelineUrl('review')}
                              className={`flex flex-col items-center z-10 bg-white px-1 cursor-pointer transition-all hover:scale-105 ${activeTimelineStep === 'review' ? 'ring-1 ring-red-600 ring-offset-1 rounded-lg' : ''}`}
                            >
                              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center mb-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                              <p className="text-xs text-center text-gray-900 font-medium leading-tight">Peninjauan<br/>Meoris</p>
                            </button>

                            {/* Step 2: Atur pengiriman */}
                            <button
                              onClick={() => updateTimelineUrl('return')}
                              className={`flex flex-col items-center z-10 bg-white px-1 ${['approved', 'validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status) ? 'cursor-pointer transition-all hover:scale-105' : 'cursor-not-allowed opacity-60'} ${activeTimelineStep === 'return' ? 'ring-1 ring-red-600 ring-offset-1 rounded-lg' : ''}`}
                              disabled={!['approved', 'validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status)}
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${['approved', 'validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status) ? 'bg-red-600' : 'bg-gray-200'}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke={['approved', 'validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status) ? 'white' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke={['approved', 'validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status) ? 'white' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                              <p className={`text-xs text-center leading-tight ${['approved', 'validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status) ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>Atur<br/>pengiriman</p>
                            </button>

                            {/* Step 3: Pengiriman Barang */}
                            <button
                              onClick={() => updateTimelineUrl('shipping')}
                              className={`flex flex-col items-center z-10 bg-white px-1 ${submittedReturn?.return_waybill || ['validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status) ? 'cursor-pointer transition-all hover:scale-105' : 'cursor-not-allowed opacity-60'} ${activeTimelineStep === 'shipping' ? 'ring-1 ring-red-600 ring-offset-1 rounded-lg' : ''}`}
                              disabled={!submittedReturn?.return_waybill && !['validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status)}
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${submittedReturn?.return_waybill || ['validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status) ? 'bg-red-600' : 'bg-gray-200'}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m-4 0v-1m4 1v-1m6 1a2 2 0 104 0m-4 0a2 2 0 114 0m-4 0v-1m4 1v-1" stroke={submittedReturn?.return_waybill || ['validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status) ? 'white' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                              <p className={`text-xs text-center leading-tight ${submittedReturn?.return_waybill || ['validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status) ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>Pengiriman<br/>Barang</p>
                            </button>

                            {/* Step 4: Sedang Divalidasi */}
                            <button
                              onClick={() => updateTimelineUrl('validation')}
                              className={`flex flex-col items-center z-10 bg-white px-1 ${['validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status) ? 'cursor-pointer transition-all hover:scale-105' : 'cursor-not-allowed opacity-60'} ${activeTimelineStep === 'validation' ? 'ring-1 ring-red-600 ring-offset-1 rounded-lg' : ''}`}
                              disabled={!['validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status)}
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${['validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status) ? 'bg-red-600' : 'bg-gray-200'}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke={['validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status) ? 'white' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                              <p className={`text-xs text-center leading-tight ${['validating', 'replacement_shipped', 'completed'].includes(submittedReturn?.status) ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>Sedang<br/>Divalidasi</p>
                            </button>

                            {/* Step 5: Pergantian */}
                            <button
                              onClick={() => updateTimelineUrl('replacement')}
                              className={`flex flex-col items-center z-10 bg-white px-1 ${submittedReturn?.status === 'replacement_shipped' || submittedReturn?.status === 'completed' ? 'cursor-pointer transition-all hover:scale-105' : 'cursor-not-allowed opacity-60'} ${activeTimelineStep === 'replacement' ? 'ring-1 ring-red-600 ring-offset-1 rounded-lg' : ''}`}
                              disabled={submittedReturn?.status !== 'replacement_shipped' && submittedReturn?.status !== 'completed'}
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${submittedReturn?.status === 'replacement_shipped' || submittedReturn?.status === 'completed' ? 'bg-red-600' : 'bg-gray-200'}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" stroke={submittedReturn?.status === 'replacement_shipped' || submittedReturn?.status === 'completed' ? 'white' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                              <p className={`text-xs text-center leading-tight ${submittedReturn?.status === 'replacement_shipped' || submittedReturn?.status === 'completed' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>Pergantian &<br/>Pengiriman</p>
                            </button>
                          </div>
                        </div>

                        {/* Content based on active timeline step */}
                        {activeTimelineStep === 'review' && (
                          <>
                            <div className={`rounded-lg p-4 mb-4 ${
                              submittedReturn?.status === 'rejected'
                                ? 'bg-red-50 border border-red-200'
                                : 'bg-gray-100'
                            }`}>
                              <h4 className={`text-sm font-semibold mb-2 ${
                                submittedReturn?.status === 'rejected'
                                  ? 'text-red-900'
                                  : 'text-gray-900'
                              }`}>
                                {submittedReturn?.status === 'rejected'
                                  ? 'Pengembalian ditolak'
                                  : 'Peninjauan Meoris'}
                              </h4>
                              <p className={`text-xs ${
                                submittedReturn?.status === 'rejected'
                                  ? 'text-red-800'
                                  : 'text-gray-700'
                              }`}>
                                {submittedReturn?.status === 'rejected'
                                  ? (submittedReturn?.notes || 'Permintaan pengembalian Anda ditolak.')
                                  : submittedReturn?.status === 'approved'
                                    ? 'Permintaan pengembalian Anda telah disetujui. Silakan lanjut ke tahap Pengembalian Barang untuk mengatur pengiriman.'
                                    : 'Permintaan pengembalian anda sedang ditinjau, biasanya memerlukan waktu kurang dari 1 hari'}
                              </p>
                            </div>

                            {/* Detail Permintaan Pengembalian */}
                            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Detail Permintaan Pengembalian</h4>
                              {submittedReturn?.return_number && (
                                <div className="flex items-center gap-2 mb-5">
                                  <p className="text-xs text-gray-500">
                                    No. Pengajuan: <span className="font-semibold text-gray-700">{submittedReturn.return_number}</span>
                                  </p>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(submittedReturn.return_number);
                                      setShowToast(true);
                                      setToastMessage('Nomor pengajuan berhasil disalin!');
                                      setToastType('success');
                                    }}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                    title="Salin nomor pengajuan"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M8 4V16C8 17.1046 8.89543 18 10 18H18C19.1046 18 20 17.1046 20 16V7.24162C20 6.7034 19.7831 6.18789 19.3982 5.81161L16.6569 3.11612C16.2823 2.75013 15.7794 2.54297 15.2552 2.54297H10C8.89543 2.54297 8 3.43841 8 4.54297V4Z" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V9C4 7.89543 4.89543 7 6 7H8" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              )}

                              {/* Return Info Card */}
                              <div className="mb-3 bg-gray-100 px-3 py-2.5 space-y-2">
                                <p className="text-xs text-gray-900 leading-relaxed">
                                  {submittedReturn?.reason || '-'}
                                </p>
                                <p className="text-xs text-gray-900 leading-relaxed whitespace-pre-wrap">
                                  {submittedReturn?.description || '-'}
                                </p>
                                {submittedReturn?.video_paths && Array.isArray(submittedReturn.video_paths) && submittedReturn.video_paths.length > 0 && submittedReturn.video_paths[0] ? (
                                  <a
                                    href={submittedReturn.video_paths[0]}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline break-all block"
                                  >
                                    {submittedReturn.video_paths[0]}
                                  </a>
                                ) : (
                                  <p className="text-xs text-gray-500">Tidak ada link video</p>
                                )}
                              </div>

                              {/* Foto Produk */}
                              <div>
                                <p className="text-xs font-medium text-gray-600 mb-2">Foto Produk</p>
                                {submittedReturn?.photo_paths && Array.isArray(submittedReturn.photo_paths) && submittedReturn.photo_paths.length > 0 ? (
                                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
                                    {submittedReturn.photo_paths.map((photo: string, index: number) => (
                                      <a
                                        key={index}
                                        href={photo}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block aspect-square rounded overflow-hidden border border-gray-300 hover:border-blue-500 hover:shadow-sm transition-all bg-gray-50"
                                      >
                                        <img
                                          src={photo}
                                          alt={`Foto ${index + 1}`}
                                          className="w-full h-full object-contain p-0.5"
                                          onError={(e) => {
                                            console.error(`Failed to load image ${index + 1}:`, photo);
                                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23f3f4f6" width="100" height="100"/%3E%3Ctext fill="%23999" font-size="10" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EError%3C/text%3E%3C/svg%3E';
                                          }}
                                        />
                                      </a>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
                                    Tidak ada foto yang diupload
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}

                        {activeTimelineStep === 'return' && (
                          <div className="mb-6">
                            {submittedReturn?.status === 'approved' || submittedReturn?.status === 'validating' || submittedReturn?.status === 'replacement_shipped' || submittedReturn?.status === 'completed' ? (
                              <>
                                {submittedReturn?.status === 'approved' && (
                                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                    <div className="flex gap-3">
                                      <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                      </svg>
                                      <div className="flex-1">
                                        <p className="text-xs text-yellow-800 mb-1">
                                          Permintaan disetujui, Harap kemas paket anda sebelum melanjutkan tahap ini.
                                        </p>
                                        {submittedReturn?.approved_at && (() => {
                                          const approvedDate = new Date(submittedReturn.approved_at);
                                          const deadlineDate = new Date(approvedDate.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days
                                          // Round deadline to end of the hour (:59) for consistency with hourly cron job
                                          deadlineDate.setMinutes(59);
                                          deadlineDate.setSeconds(59);

                                          const now = new Date();
                                          const timeLeft = deadlineDate.getTime() - now.getTime();
                                          const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                                          const daysLeft = Math.floor(hoursLeft / 24);

                                          const formatDate = (date: Date) => {
                                            const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                                            return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
                                          };

                                          const formatTime = (date: Date) => {
                                            const hours = date.getHours().toString().padStart(2, '0');
                                            const minutes = date.getMinutes().toString().padStart(2, '0');
                                            return `${hours}:${minutes}`;
                                          };

                                          return (
                                            <p className={`text-xs font-semibold ${timeLeft > 0 ? 'text-red-700' : 'text-red-900'}`}>
                                              {timeLeft > 0 ? (
                                                <>
                                                  Atur pengiriman sebelum <span className="underline">{formatDate(deadlineDate)}</span> pukul {formatTime(deadlineDate)}
                                                </>
                                              ) : (
                                                'Batas waktu pengaturan pengiriman telah lewat. Pengembalian akan dibatalkan otomatis.'
                                              )}
                                            </p>
                                          );
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Arrange Shipping - Show when no waybill yet */}
                                {!submittedReturn?.return_waybill && (
                                  <>
                                    {/* Alamat Penjemputan */}
                                    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-semibold text-gray-900">Alamat Penjemputan</h4>
                                        <button
                                          onClick={() => {
                                            const params = new URLSearchParams(window.location.search);
                                            params.set('view', 'address');
                                            router.push(`/user/purchase?${params.toString()}`);
                                          }}
                                          className="text-xs text-gray-700 hover:text-gray-800 font-medium transition-colors"
                                        >
                                          Edit alamat
                                        </button>
                                      </div>
                                      <p className="text-xs text-gray-600 mb-3">Kurir akan menjemput paket ke alamat yang anda pilih</p>

                                      {/* Alamat User */}
                                      <div className="bg-gray-50 rounded p-3 text-xs text-gray-700">
                                        {userAddress ? (
                                          <>
                                            <p className="font-semibold mb-1">{userAddress.nama}</p>
                                            <p className="mb-1">{userAddress.phone}</p>
                                            <p className="leading-relaxed">
                                              {[
                                                userAddress.street || null,
                                                userAddress.kelurahan ? `Kel. ${userAddress.kelurahan}` : null,
                                                userAddress.kecamatan ? `Kec. ${userAddress.kecamatan}` : null,
                                                userAddress.kabupaten || null,
                                                userAddress.provinsi || null,
                                                userAddress.postal || null,
                                                userAddress.negara || 'Indonesia'
                                              ].filter(Boolean).join(', ')}
                                            </p>
                                          </>
                                        ) : (
                                          <p className="text-gray-500">Alamat belum diatur</p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Metode Pengiriman */}
                                    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Metode Pengiriman</h4>
                                      <div className="flex items-start gap-3 p-3 border border-gray-200 rounded bg-gray-50 mb-4">
                                        <input
                                          type="radio"
                                          checked
                                          readOnly
                                          className="mt-0.5"
                                        />
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">Pickup by Courier</p>
                                          <p className="text-xs text-gray-600 mt-1">Kurir akan menjemput paket di alamat Anda</p>
                                        </div>
                                      </div>

                                      {/* Pilih Kurir */}
                                      <div>
                                        <h5 className="text-xs font-semibold text-gray-900 mb-2">Pilih Kurir</h5>
                                        <div className="space-y-2">
                                          {/* SiCepat */}
                                          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50 transition">
                                            <input
                                              type="radio"
                                              name="courier"
                                              value="sicepat"
                                              checked={selectedCourier === 'sicepat'}
                                              onChange={(e) => setSelectedCourier(e.target.value as 'sicepat' | 'jnt')}
                                              className="text-red-600 focus:ring-red-500"
                                            />
                                            <div className="flex items-center gap-3 flex-1">
                                              <span className="text-sm font-medium text-gray-900">SiCepat</span>
                                            </div>
                                          </label>

                                          {/* J&T */}
                                          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded cursor-pointer hover:bg-gray-50 transition">
                                            <input
                                              type="radio"
                                              name="courier"
                                              value="jnt"
                                              checked={selectedCourier === 'jnt'}
                                              onChange={(e) => setSelectedCourier(e.target.value as 'sicepat' | 'jnt')}
                                              className="text-red-600 focus:ring-red-500"
                                            />
                                            <div className="flex items-center gap-3 flex-1">
                                              <span className="text-sm font-medium text-gray-900">J&T Express</span>
                                            </div>
                                          </label>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Instruksi */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                      <h5 className="text-sm font-semibold text-blue-900 mb-3">Instruksi pada tahap ini :</h5>
                                      <ol className="text-xs text-blue-800 space-y-2 list-decimal list-inside">
                                        <li>Kemas barang dengan aman terlebih dahulu sebelum melanjutkan tahap selanjutnya.</li>
                                        <li>Kemas barang menggunakan bubble wrap atau box agar barang aman.</li>
                                        <li>Pilih alamat penjemputan paket.</li>
                                        <li>Pilih kurir yang akan digunakan.</li>
                                        <li>Konfirmasi pengiriman untuk mendapatkan nomor resi dan alamat pengiriman di tahap selanjutnya.</li>
                                      </ol>
                                    </div>

                                    {/* Button Konfirmasi */}
                                    <button
                                      onClick={() => setShowPackagingConfirm(true)}
                                      disabled={!userAddress}
                                      className="w-full py-3 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                      Konfirmasi Pengiriman
                                    </button>
                                  </>
                                )}

                                {/* Show Pickup Address Info when waybill exists */}
                                {submittedReturn?.return_waybill && (
                                  <>
                                    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Alamat Penjemputan</h4>
                                      <p className="text-xs text-gray-600 mb-3">Kurir akan mengambil paket ke alamat ini</p>

                                      {/* Alamat User */}
                                      <div className="bg-gray-50 rounded p-3 text-xs text-gray-700">
                                        {userAddress ? (
                                          <>
                                            <p className="font-semibold mb-1">{userAddress.nama}</p>
                                            <p className="mb-1">{userAddress.phone}</p>
                                            <p className="leading-relaxed">
                                              {[
                                                userAddress.street || null,
                                                userAddress.kelurahan ? `Kel. ${userAddress.kelurahan}` : null,
                                                userAddress.kecamatan ? `Kec. ${userAddress.kecamatan}` : null,
                                                userAddress.kabupaten || null,
                                                userAddress.provinsi || null,
                                                userAddress.postal || null,
                                                userAddress.negara || 'Indonesia'
                                              ].filter(Boolean).join(', ')}
                                            </p>
                                          </>
                                        ) : (
                                          <p className="text-gray-500">Alamat belum diatur</p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Metode Pengiriman - Read Only */}
                                    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Metode Pengiriman</h4>
                                      <div className="flex items-start gap-3 p-3 border border-gray-200 rounded bg-gray-50 mb-3">
                                        <input
                                          type="radio"
                                          checked
                                          readOnly
                                          className="mt-0.5"
                                        />
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">Pickup by Courier</p>
                                          <p className="text-xs text-gray-600 mt-1">Kurir akan menjemput paket di alamat Anda</p>
                                        </div>
                                      </div>

                                      {/* Ekspedisi yang dipilih */}
                                      <div>
                                        <h5 className="text-xs font-semibold text-gray-900 mb-2">Ekspedisi yang dipilih:</h5>
                                        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded bg-white">
                                          <span className="text-sm font-medium text-gray-900">
                                            {submittedReturn?.return_courier === 'jnt' ? 'J&T Express' : submittedReturn?.return_courier === 'sicepat' ? 'SiCepat' : submittedReturn?.return_courier?.toUpperCase() || '-'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </>
                            ) : (
                              <div className="bg-gray-100 rounded-lg p-4">
                                <p className="text-xs text-gray-700">
                                  Tahap pengembalian barang akan tersedia setelah permintaan disetujui.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {activeTimelineStep === 'shipping' && (
                          <div className="mb-6">
                            {submittedReturn?.return_waybill ? (
                              <>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                  <div className="flex gap-3">
                                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                      <h4 className="text-sm font-semibold text-green-900 mb-1">Pengiriman Berhasil Dijadwalkan</h4>
                                      <p className="text-xs text-green-800">
                                        Kurir akan menjemput paket ke alamat anda yang dipilih sebelumnya dengan estimasi hari ini paling lambat {(() => {
                                          const today = new Date();
                                          const h3Date = new Date(today);
                                          h3Date.setDate(today.getDate() + 3);
                                          const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                                          return days[h3Date.getDay()];
                                        })()}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Shipping Details */}
                                <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <h4 className="text-sm font-semibold text-gray-900">Detail Pengiriman</h4>
                                    {/* Cetak Resi Button - Compact */}
                                    <button
                                      onClick={handlePrintResi}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-md hover:opacity-90 transition text-xs"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                      </svg>
                                      Cetak Resi
                                    </button>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-3">Tulis detail dibawah ini pada paket atau cetak resi</p>
                                  <div className="space-y-3">
                                    <div>
                                      <p className="text-sm font-medium text-gray-600 mb-1">Ekspedisi:</p>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {submittedReturn?.return_courier === 'jnt' ? 'J&T Express' : submittedReturn?.return_courier === 'sicepat' ? 'SiCepat' : submittedReturn?.return_courier?.toUpperCase() || '-'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-600 mb-1">Nomor Resi:</p>
                                      <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-gray-900">{submittedReturn?.return_waybill || '-'}</p>
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(submittedReturn?.return_waybill || '');
                                            showToastNotification('Nomor resi berhasil disalin!');
                                          }}
                                          className="text-gray-500 hover:text-gray-700 transition"
                                          title="Salin nomor resi"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-600 mb-1">Alamat Pengiriman:</p>
                                      <div className="text-sm text-gray-900 leading-relaxed">
                                        <p className="font-semibold">Meoris Store</p>
                                        <p className="mt-0.5">+62 896-9597-1729</p>
                                        <p className="mt-1">
                                          Sambong mangkubumi Rt 001/Rw 002, Kota Tasikmalaya, Jawa Barat, 46181, Indonesia
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Instructions */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                  <h5 className="text-sm font-semibold text-blue-900 mb-3">Instruksi:</h5>
                                  <ol className="text-xs text-blue-800 space-y-2 list-decimal list-inside">
                                    <li>Anda wajib menyertakan detail nama ekspedisi, nomor resi dan alamat pengiriman diatas pada paket.</li>
                                    <li>Anda bisa mencetak resi atau tulis detail nama ekspedisi, nomor resi, dan alamat pengiriman.</li>
                                    <li>Pastikan paket sudah dikemas dan terdapat detail nomor resi dan alamat pengiriman.</li>
                                    <li>Serahkan paket pada kurir.</li>
                                    <li>Ongkos kirim telah ditanggung meoris.</li>
                                  </ol>
                                </div>

                                {/* Return Tracking Card */}
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Status Pengiriman Return</h4>
                                  <p className="text-xs text-gray-600 mb-3">Tracking paket pengembalian</p>

                                  {returnTrackingLoading ? (
                                    <div className="flex flex-col items-center justify-center py-8">
                                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                      <p className="text-xs text-gray-500 mt-2">Memuat detail tracking...</p>
                                    </div>
                                  ) : returnDetailedTracking?.history && returnDetailedTracking.history.length > 0 ? (
                                    <div className="space-y-3 mt-3">
                                      {[...returnDetailedTracking.history].reverse().map((track: any, index: number) => {
                                        const isLatest = index === 0;
                                        const isDelivered = track.status === 'delivered';

                                        return (
                                          <div key={index} className="flex gap-2">
                                            <div className="flex flex-col items-center">
                                              <div className={`w-2 h-2 rounded-full ${
                                                isDelivered ? 'bg-green-600' :
                                                isLatest ? 'bg-blue-600' :
                                                'bg-gray-400'
                                              }`}></div>
                                              {index < returnDetailedTracking.history.length - 1 && (
                                                <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>
                                              )}
                                            </div>
                                            <div className={`flex-1 ${index < returnDetailedTracking.history.length - 1 ? 'pb-3' : ''}`}>
                                              <p className="text-[10px] text-gray-500">
                                                {new Date(track.updated_at).toLocaleString('id-ID', {
                                                  day: '2-digit',
                                                  month: 'short',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                              </p>
                                              <p className={`text-xs mt-0.5 leading-relaxed ${
                                                isLatest ? 'font-semibold text-gray-900' : 'text-gray-600'
                                              }`}>
                                                {track.note || track.service_type || 'Update status'}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : returnShippingHistory.length > 0 ? (
                                    // Fallback ke database history
                                    <div className="space-y-3 mt-3">
                                      {returnShippingHistory.map((history, index) => {
                                        const isLatest = index === 0;
                                        const isDelivered = history.biteship_status === 'delivered';

                                        return (
                                          <div key={history.id} className="flex gap-2">
                                            <div className="flex flex-col items-center">
                                              <div className={`w-2 h-2 rounded-full ${
                                                isDelivered ? 'bg-green-600' :
                                                isLatest ? 'bg-blue-600' :
                                                'bg-gray-400'
                                              }`}></div>
                                              {index < returnShippingHistory.length - 1 && (
                                                <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>
                                              )}
                                            </div>
                                            <div className={`flex-1 ${index < returnShippingHistory.length - 1 ? 'pb-2' : ''}`}>
                                              <p className="text-[10px] text-gray-500">
                                                {new Date(history.updated_at || history.created_at).toLocaleString('id-ID', {
                                                  day: '2-digit',
                                                  month: 'short',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                              </p>
                                              <p className={`text-xs mt-0.5 ${
                                                isLatest ? 'font-semibold text-gray-900' : 'text-gray-600'
                                              }`}>
                                                {history.note || history.status_display || 'Update status'}
                                              </p>
                                              {history.courier_company && (
                                                <p className="text-[10px] text-gray-500 mt-0.5">
                                                  via {history.courier_company === 'jnt' ? 'J&T Express' : history.courier_company === 'sicepat' ? 'SiCepat' : history.courier_company.toUpperCase()}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="mt-3 text-center py-4">
                                      <p className="text-xs text-gray-500">
                                        Informasi tracking pengiriman akan tampil disini.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="bg-gray-100 rounded-lg p-4">
                                <p className="text-xs text-gray-700">
                                  Tahap pengiriman barang akan tersedia setelah Anda mengatur pengiriman dan mendapatkan nomor resi.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {activeTimelineStep === 'validation' && (
                          <>
                            {/* Info Card dengan Icon Cek */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                              <div className="flex gap-3">
                                {/* Icon Cek di tengah */}
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </div>
                                </div>

                                <div className="flex-1">
                                  <h4 className="text-sm font-semibold text-gray-900 mb-1">Barang sudah kami terima</h4>
                                  <p className="text-xs text-gray-700">
                                    Kami memerlukan waktu untuk validasi barang, biasanya memerlukan waktu kurang dari 1 hari.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Card Status Validasi */}
                            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Status Validasi</h4>

                              {/* Validation Status Display */}
                              {submittedReturn?.status_validasi ? (
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className={`text-xs font-medium ${
                                    submittedReturn?.validasi === 'approved' ? 'text-green-700' :
                                    submittedReturn?.validasi === 'rejected' ? 'text-red-700' :
                                    'text-gray-900'
                                  }`}>
                                    {submittedReturn.status_validasi}
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-1">
                                    {new Date(submittedReturn.updated_at).toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>

                                  {/* Validation Result Badge - Only show for approved/rejected */}
                                  {submittedReturn?.validasi && (
                                    <div className="mt-2">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        submittedReturn.validasi === 'approved'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {submittedReturn.validasi === 'approved' ? '✓ Disetujui' : '✗ Ditolak'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">Belum ada status validasi</p>
                              )}
                            </div>
                          </>
                        )}

                        {activeTimelineStep === 'replacement' && (
                          <>
                            {/* Info Label - Replacement Shipped/Delivered */}
                            {(() => {
                              // Check if replacement is delivered
                              let isDelivered = false;

                              if (replacementDetailedTracking?.history && replacementDetailedTracking.history.length > 0) {
                                isDelivered = replacementDetailedTracking.history.some((track: any) => track.status === 'delivered');
                              } else if (replacementShippingHistory.length > 0) {
                                isDelivered = replacementShippingHistory.some((history: any) =>
                                  history.status?.toLowerCase().includes('delivered') ||
                                  history.status?.toLowerCase().includes('terkirim')
                                );
                              }

                              return (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                  <div className="flex gap-3">
                                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                      {isDelivered ? (
                                        <p className="text-sm text-green-900">Produk pengganti berhasil terkirim.</p>
                                      ) : (
                                        <>
                                          <h4 className="text-sm font-semibold text-green-900">Produk pengganti telah dikirim.</h4>
                                          <p className="text-xs text-green-800 mt-1">
                                            Produk pengganti Anda sedang dalam proses pengiriman ke alamat tujuan.
                                          </p>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Shipping Address - Replacement */}
                            <div className="mb-6">
                              <h3 className="text-sm font-semibold text-gray-900 mb-2">Alamat Pengiriman</h3>
                              <div className="bg-white border border-gray-200 rounded p-3">
                                {selectedOrder.shipping_address_json ? (
                                  <>
                                    <p className="text-sm font-semibold text-gray-900">{selectedOrder.shipping_address_json.nama}</p>
                                    <p className="text-xs text-gray-600 mt-0.5">{selectedOrder.shipping_address_json.telepon}</p>
                                    <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                                      {[
                                        selectedOrder.shipping_address_json.alamat || null,
                                        (selectedOrder.shipping_address_json.kelurahan || userAddress?.kelurahan) ? `Kel. ${selectedOrder.shipping_address_json.kelurahan || userAddress?.kelurahan}` : null,
                                        (selectedOrder.shipping_address_json.kecamatan || userAddress?.kecamatan) ? `Kec. ${selectedOrder.shipping_address_json.kecamatan || userAddress?.kecamatan}` : null,
                                        selectedOrder.shipping_address_json.kabupaten || null,
                                        selectedOrder.shipping_address_json.provinsi || null,
                                        selectedOrder.shipping_address_json.kode_pos || null,
                                        'Indonesia'
                                      ].filter(Boolean).join(', ')}
                                    </p>
                                  </>
                                ) : (
                                  <p className="text-xs text-gray-500">Alamat pengiriman tidak tersedia</p>
                                )}
                              </div>
                            </div>

                            {/* Shipping Tracking - Replacement */}
                            {(submittedReturn?.replacement_waybill || replacementShippingHistory.length > 0) && (
                              <div className="mb-6">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2">Tracking Pengiriman</h3>
                                <div className="bg-white border border-gray-200 rounded p-3">
                                  {/* Courier/Ekspedisi Info */}
                                  <div className="mb-3">
                                    <p className="text-[10px] text-gray-600">Ekspedisi</p>
                                    <p className="text-xs font-semibold text-gray-900 mt-0.5">
                                      {submittedReturn?.replacement_courier?.toUpperCase() || '-'}
                                    </p>
                                  </div>

                                  {submittedReturn?.replacement_waybill && (
                                    <div className="mb-3">
                                      <p className="text-[10px] text-gray-600">No. Resi</p>
                                      <p className="text-xs font-semibold text-gray-900 mt-0.5">
                                        {submittedReturn.replacement_waybill}
                                      </p>
                                    </div>
                                  )}

                                  {/* Timeline dari Biteship API (Detail) atau Database (Fallback) */}
                                  {replacementTrackingLoading ? (
                                    <div className="mt-3 text-center py-6">
                                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                      <p className="text-xs text-gray-500 mt-2">Memuat detail tracking...</p>
                                    </div>
                                  ) : replacementDetailedTracking?.history && replacementDetailedTracking.history.length > 0 ? (
                                    // Timeline dari Biteship API (Priority 1)
                                    <div className="space-y-3 mt-3">
                                      {[...replacementDetailedTracking.history].reverse().map((track: any, index: number) => {
                                        const isLatest = index === 0; // Setelah reverse, terbaru di index 0
                                        const isDelivered = track.status === 'delivered';

                                        return (
                                          <div key={index} className="flex gap-2">
                                            <div className="flex flex-col items-center">
                                              <div className={`w-2 h-2 rounded-full ${
                                                isDelivered ? 'bg-green-600' :
                                                isLatest ? 'bg-blue-600' :
                                                'bg-gray-400'
                                              }`}></div>
                                              {index < replacementDetailedTracking.history.length - 1 && (
                                                <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>
                                              )}
                                            </div>
                                            <div className={`flex-1 ${index < replacementDetailedTracking.history.length - 1 ? 'pb-3' : ''}`}>
                                              <p className="text-[10px] text-gray-500">
                                                {new Date(track.updated_at).toLocaleString('id-ID', {
                                                  day: '2-digit',
                                                  month: 'short',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                              </p>
                                              <p className={`text-xs mt-0.5 leading-relaxed ${
                                                isLatest ? 'font-semibold text-gray-900' : 'text-gray-600'
                                              }`}>
                                                {track.note || track.service_type || 'Update status'}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : replacementShippingHistory.length > 0 ? (
                                    // Fallback ke database history (Priority 2)
                                    <div className="space-y-3 mt-3">
                                      {replacementShippingHistory.map((history, index) => {
                                        const isLatest = index === 0; // Terbaru di atas (index 0)
                                        const isDelivered = history.status?.toLowerCase().includes('delivered') ||
                                                          history.status?.toLowerCase().includes('terkirim');

                                        return (
                                          <div key={history.id} className="flex gap-2">
                                            <div className="flex flex-col items-center">
                                              <div className={`w-2 h-2 rounded-full ${
                                                isDelivered ? 'bg-green-600' :
                                                isLatest ? 'bg-blue-600' :
                                                'bg-gray-400'
                                              }`}></div>
                                              {index < replacementShippingHistory.length - 1 && (
                                                <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>
                                              )}
                                            </div>
                                            <div className={`flex-1 ${index < replacementShippingHistory.length - 1 ? 'pb-2' : ''}`}>
                                              <p className="text-[10px] text-gray-500">
                                                {new Date(history.updated_at).toLocaleString('id-ID', {
                                                  day: '2-digit',
                                                  month: 'short',
                                                  year: 'numeric',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                })}
                                              </p>
                                              <p className={`text-xs mt-0.5 ${
                                                isLatest ? 'font-semibold text-gray-900' : 'text-gray-600'
                                              }`}>
                                                {history.status || 'Update status'}
                                              </p>
                                              {history.note && (
                                                <p className="text-[10px] text-gray-500 mt-0.5">
                                                  {history.note}
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="mt-3 text-center py-4">
                                      <p className="text-xs text-gray-500">
                                        {submittedReturn?.replacement_waybill
                                          ? 'Menunggu update tracking dari kurir'
                                          : 'Produk pengganti belum dikirim'}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Produk Section - Single Card */}
                            <div className="mb-6">
                              <div className="bg-gray-50 rounded-lg p-4">
                                {/* No. Pesanan */}
                                <div className="mb-4 pb-3 border-b border-gray-200">
                                  <div className="mb-2">
                                    <p className="text-[10px] text-gray-600 mb-0.5">No. Pesanan</p>
                                    <p className="text-xs font-semibold text-gray-900">{selectedOrder?.id?.replace(/-/g, '').substring(0, 10).toUpperCase() || '-'}</p>
                                  </div>
                                </div>

                            {/* Produk List */}
                            <div className="space-y-3">
                              {/* Show original products only if NOT in replacement timeline */}
                              {activeTimelineStep !== 'replacement' && (
                                <>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Produk</h4>
                                  {selectedOrder.order_items?.map((item: any) => (
                                    <div key={item.id} className="flex gap-3">
                                      <div className="w-16 h-16 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
                                        {item.produk?.photo1 ? (
                                          <img src={item.produk.photo1} alt={item.produk?.nama_produk} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#9CA3AF" strokeWidth="2"/>
                                            </svg>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-gray-900">{item.produk?.nama_produk}</p>
                                        {item.size && <p className="text-[10px] text-gray-500 mt-1">Ukuran: {item.size}</p>}
                                        <p className="text-[10px] text-gray-500 mt-1">Total: {item.quantity}x</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs font-semibold text-gray-900">Rp{(item.price || 0).toLocaleString('id-ID')}</p>
                                      </div>
                                    </div>
                                  ))}
                                </>
                              )}

                              {/* Produk Pengganti - Only show in replacement timeline */}
                              {activeTimelineStep === 'replacement' && submittedReturn?.replacement_items && submittedReturn.replacement_items.length > 0 && (
                                <>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Produk Pengganti</h4>
                                  {submittedReturn.replacement_items.map((item: any, index: number) => (
                                    <div key={index} className="flex gap-3 bg-gray-50 p-2 rounded">
                                      <div className="w-16 h-16 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
                                        {item.product_photo ? (
                                          <img src={item.product_photo} alt={item.product_name} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#9CA3AF" strokeWidth="2"/>
                                            </svg>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-gray-900">{item.product_name}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">Ukuran: {item.product_size}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">Total: {item.quantity}x</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs font-semibold text-gray-900">
                                          {item.product_price ? `Rp${item.product_price.toLocaleString('id-ID')}` : '-'}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : !showReturnForm ? (
                      // Order Detail Card
                      <div className="p-6">
                        {/* Header with Back Button and Return Button */}
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={handleCloseDetail}
                            className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Kembali ke Pesanan Saya
                          </button>

                          <div className="flex items-center gap-2">
                            {/* Perbarui Detail Pesanan Button - Only for PAID status and not yet updated */}
                            {selectedOrder.status === 'paid' && !selectedOrder.has_been_updated && (
                              <button
                                onClick={async () => {
                                  // Refresh order data before opening form
                                  const orderParam = searchParams.get('order');
                                  if (orderParam && user?.id) {
                                    const { data: freshOrder } = await supabase
                                      .from('orders')
                                      .select('has_been_updated')
                                      .eq('order_number', orderParam)
                                      .eq('user_id', user.id)
                                      .single();

                                    if (freshOrder?.has_been_updated) {
                                      // Update local state
                                      setSelectedOrder({
                                        ...selectedOrder,
                                        has_been_updated: true
                                      });
                                      setShowToast(true);
                                      setToastMessage('Pesanan ini sudah pernah diperbarui sebelumnya');
                                      setToastType('error');
                                      return;
                                    }
                                  }

                                  setShowUpdateSize(true);
                                  // Update URL to include action parameter
                                  const params = new URLSearchParams(window.location.search);
                                  params.set('action', 'update-detail');
                                  router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                              >
                                Perbarui detail pesanan
                              </button>
                            )}

                            {/* Show return button based on order status and return existence */}
                            {(() => {
                              const isDelivered = selectedOrder.status?.toLowerCase() === 'delivered';
                              const isCompleted = selectedOrder.status?.toLowerCase() === 'completed';

                            // If data is loading, show loading spinner instead of button (prevent flicker)
                            // Only show loading for delivered/completed orders (where return button is relevant)
                            if (loadingReturnData && (isDelivered || isCompleted)) {
                              return (
                                <div className="inline-flex items-center gap-2 px-4 py-2 text-xs text-gray-500">
                                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Memuat...
                                </div>
                              );
                            }

                            // If completed and has return history, show "Lihat detail pengembalian"
                            if (isCompleted && existingReturn) {
                              return (
                                <button
                                  onClick={async () => {
                                    // Reload return data with replacement_items from database
                                    try {
                                      const { data: freshReturnData } = await supabase
                                        .from('returns')
                                        .select(`
                                          *,
                                          replacement_items (
                                            id,
                                            product_id,
                                            product_name,
                                            product_size,
                                            quantity,
                                            product_photo,
                                            product_price
                                          )
                                        `)
                                        .eq('id', existingReturn.id)
                                        .single();

                                      if (freshReturnData) {
                                        console.log('🔄 Reloaded return data with replacement_items:', freshReturnData);
                                        setSubmittedReturn(freshReturnData);
                                        setExistingReturn(freshReturnData);
                                        setShowReturnDetail(true);
                                        setShowReturnForm(false);

                                        // Set timeline to correct step based on status
                                        let correctStep: 'review' | 'return' | 'shipping' | 'validation' | 'replacement' = 'review';
                                        if (freshReturnData.status === 'completed' || freshReturnData.status === 'replacement_shipped') {
                                          correctStep = 'replacement';
                                        } else if (freshReturnData.status === 'validating') {
                                          correctStep = 'validation';
                                        } else if (freshReturnData.status === 'approved' && freshReturnData.return_waybill) {
                                          correctStep = 'shipping';
                                        } else if (freshReturnData.status === 'approved') {
                                          correctStep = 'return';
                                        }

                                        setActiveTimelineStep(correctStep);

                                        // Redirect to return-detail view with return_number
                                        if (freshReturnData.return_number) {
                                          router.push(`/user/purchase?view=return-detail&return=${freshReturnData.return_number}&timeline=${correctStep}`);
                                        } else {
                                          // Fallback to old method if no return_number
                                          const params = new URLSearchParams(window.location.search);
                                          params.set('timeline', correctStep);
                                          router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
                                        }
                                      } else {
                                        setSubmittedReturn(existingReturn);
                                        setShowReturnDetail(true);
                                        setShowReturnForm(false);

                                        // Set timeline for existing return
                                        let correctStep: 'review' | 'return' | 'shipping' | 'validation' | 'replacement' = 'review';
                                        if (existingReturn.status === 'completed' || existingReturn.status === 'replacement_shipped') {
                                          correctStep = 'replacement';
                                        } else if (existingReturn.status === 'validating') {
                                          correctStep = 'validation';
                                        } else if (existingReturn.status === 'approved' && existingReturn.return_waybill) {
                                          correctStep = 'shipping';
                                        } else if (existingReturn.status === 'approved') {
                                          correctStep = 'return';
                                        }

                                        setActiveTimelineStep(correctStep);

                                        // Redirect to return-detail view with return_number
                                        if (existingReturn.return_number) {
                                          router.push(`/user/purchase?view=return-detail&return=${existingReturn.return_number}&timeline=${correctStep}`);
                                        } else {
                                          // Fallback to old method if no return_number
                                          const params = new URLSearchParams(window.location.search);
                                          params.set('timeline', correctStep);
                                          router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
                                        }
                                      }
                                    } catch (error) {
                                      console.error('Error reloading return data:', error);
                                      setSubmittedReturn(existingReturn);
                                      setShowReturnDetail(true);
                                      setShowReturnForm(false);

                                      // Set timeline for existing return (error fallback)
                                      let correctStep: 'review' | 'return' | 'shipping' | 'validation' | 'replacement' = 'review';
                                      if (existingReturn.status === 'completed' || existingReturn.status === 'replacement_shipped') {
                                        correctStep = 'replacement';
                                      } else if (existingReturn.status === 'validating') {
                                        correctStep = 'validation';
                                      } else if (existingReturn.status === 'approved' && existingReturn.return_waybill) {
                                        correctStep = 'shipping';
                                      } else if (existingReturn.status === 'approved') {
                                        correctStep = 'return';
                                      }

                                      setActiveTimelineStep(correctStep);

                                      // Redirect to return-detail view with return_number
                                      if (existingReturn.return_number) {
                                        router.push(`/user/purchase?view=return-detail&return=${existingReturn.return_number}&timeline=${correctStep}`);
                                      } else {
                                        // Fallback to old method if no return_number
                                        const params = new URLSearchParams(window.location.search);
                                        params.set('timeline', correctStep);
                                        router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
                                      }
                                    }
                                  }}
                                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  Lihat detail pengembalian
                                </button>
                              );
                            }

                            // If delivered, show either "Lihat detail pengembalian" or "Ajukan Pengembalian"
                            if (isDelivered) {
                              if (existingReturn) {
                                return (
                                  <button
                                    onClick={async () => {
                                      try {
                                        const { data: freshReturnData } = await supabase
                                          .from('returns')
                                          .select(`
                                            *,
                                            replacement_items (
                                              id,
                                              product_id,
                                              product_name,
                                              product_size,
                                              quantity,
                                              product_photo,
                                              product_price
                                            )
                                          `)
                                          .eq('id', existingReturn.id)
                                          .single();

                                        if (freshReturnData) {
                                          setSubmittedReturn(freshReturnData);
                                          setExistingReturn(freshReturnData);
                                          setShowReturnDetail(true);
                                          setShowReturnForm(false);

                                          // Set timeline to correct step based on status
                                          let correctStep: 'review' | 'return' | 'shipping' | 'validation' | 'replacement' = 'review';
                                          if (freshReturnData.status === 'completed' || freshReturnData.status === 'replacement_shipped') {
                                            correctStep = 'replacement';
                                          } else if (freshReturnData.status === 'validating') {
                                            correctStep = 'validation';
                                          } else if (freshReturnData.status === 'approved' && freshReturnData.return_waybill) {
                                            correctStep = 'shipping';
                                          } else if (freshReturnData.status === 'approved') {
                                            correctStep = 'return';
                                          }

                                          setActiveTimelineStep(correctStep);

                                          // Redirect to return-detail view with return_number
                                          if (freshReturnData.return_number) {
                                            router.push(`/user/purchase?view=return-detail&return=${freshReturnData.return_number}&timeline=${correctStep}`);
                                          } else {
                                            // Fallback to old method if no return_number
                                            const params = new URLSearchParams(window.location.search);
                                            params.set('timeline', correctStep);
                                            router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
                                          }
                                        } else {
                                          setSubmittedReturn(existingReturn);
                                          setShowReturnDetail(true);
                                          setShowReturnForm(false);

                                          // Set timeline for existing return
                                          let correctStep: 'review' | 'return' | 'shipping' | 'validation' | 'replacement' = 'review';
                                          if (existingReturn.status === 'completed' || existingReturn.status === 'replacement_shipped') {
                                            correctStep = 'replacement';
                                          } else if (existingReturn.status === 'validating') {
                                            correctStep = 'validation';
                                          } else if (existingReturn.status === 'approved' && existingReturn.return_waybill) {
                                            correctStep = 'shipping';
                                          } else if (existingReturn.status === 'approved') {
                                            correctStep = 'return';
                                          }

                                          setActiveTimelineStep(correctStep);

                                          // Redirect to return-detail view with return_number
                                          if (existingReturn.return_number) {
                                            router.push(`/user/purchase?view=return-detail&return=${existingReturn.return_number}&timeline=${correctStep}`);
                                          } else {
                                            // Fallback to old method if no return_number
                                            const params = new URLSearchParams(window.location.search);
                                            params.set('timeline', correctStep);
                                            router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
                                          }
                                        }
                                      } catch (error) {
                                        console.error('Error reloading return data:', error);
                                        setSubmittedReturn(existingReturn);
                                        setShowReturnDetail(true);
                                        setShowReturnForm(false);

                                        // Set timeline for existing return (error fallback)
                                        let correctStep: 'review' | 'return' | 'shipping' | 'validation' | 'replacement' = 'review';
                                        if (existingReturn.status === 'completed' || existingReturn.status === 'replacement_shipped') {
                                          correctStep = 'replacement';
                                        } else if (existingReturn.status === 'validating') {
                                          correctStep = 'validation';
                                        } else if (existingReturn.status === 'approved' && existingReturn.return_waybill) {
                                          correctStep = 'shipping';
                                        } else if (existingReturn.status === 'approved') {
                                          correctStep = 'return';
                                        }

                                        setActiveTimelineStep(correctStep);

                                        // Redirect to return-detail view with return_number
                                        if (existingReturn.return_number) {
                                          router.push(`/user/purchase?view=return-detail&return=${existingReturn.return_number}&timeline=${correctStep}`);
                                        } else {
                                          // Fallback to old method if no return_number
                                          const params = new URLSearchParams(window.location.search);
                                          params.set('timeline', correctStep);
                                          router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false });
                                        }
                                      }
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Lihat detail pengembalian
                                  </button>
                                );
                              } else {
                                return (
                                  <button
                                    onClick={openReturnForm}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M3 10h18M3 10l6-6m-6 6l6 6m12-6l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                    Ajukan Pengembalian
                                  </button>
                                );
                              }
                            }

                            return null;
                            })()}
                          </div>
                        </div>

                      <div className="space-y-4">
                        {/* Order Info */}
                        <div className="bg-gray-50 rounded p-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <p className="text-xs text-gray-600 mb-0.5">No. Pesanan</p>
                              <p className="text-xs font-semibold text-gray-900">{selectedOrder.id.replace(/-/g, '').slice(0, 10).toUpperCase()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-0.5">Status</p>
                              <p className={`text-xs font-semibold ${getStatusColor(selectedOrder.status)}`}>
                                {getStatusText(selectedOrder.status)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-0.5">Tanggal</p>
                              <p className="text-xs text-gray-900">
                                {new Date(selectedOrder.created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 mb-0.5">Total</p>
                              <p className="text-xs font-bold text-gray-900">
                                Rp{(selectedOrder.total_amount || selectedOrder.checkout?.total || 0).toLocaleString('id-ID')}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Cancelled Order Warning - Only for CANCELLED orders */}
                        {(selectedOrder.status === 'cancelled' || selectedOrder.status === 'failed') && (
                          <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-4">
                            <div className="flex gap-3">
                              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-red-800">
                                  Pesanan dibatalkan
                                </p>
                                <p className="text-sm text-red-700 mt-1">
                                  Pesanan Anda telah dibatalkan otomatis oleh sistem.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Payment Deadline Warning - Only for PENDING orders */}
                        {(selectedOrder.status === 'pending' || selectedOrder.status === 'belum bayar') && selectedOrder.created_at && (() => {
                          // Use payment_expired_at if available, otherwise calculate from created_at
                          let deadline: Date;

                          if (selectedOrder.payment_expired_at) {
                            // Use the actual payment_expired_at from database
                            deadline = new Date(selectedOrder.payment_expired_at);
                          } else {
                            // Fallback: Calculate payment deadline: created_at + 24 hours, rounded UP to next hour
                            const createdAt = new Date(selectedOrder.created_at);
                            deadline = new Date(createdAt.getTime() + (24 * 60 * 60 * 1000)); // +24 hours

                            // Round UP to next hour (:00) because cron runs every hour at :00
                            if (deadline.getMinutes() > 0 || deadline.getSeconds() > 0) {
                              deadline.setHours(deadline.getHours() + 1);
                            }
                            deadline.setMinutes(0);
                            deadline.setSeconds(0);
                            deadline.setMilliseconds(0);
                          }

                          // Format date in Indonesian
                          const paymentDeadline = deadline.toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          }) + ' pukul ' + deadline.toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          });

                          return (
                            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                              <div className="flex gap-3">
                                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-yellow-800">
                                    Selesaikan pembayaran Anda
                                  </p>
                                  <p className="text-sm text-yellow-700 mt-1">
                                    Batas waktu pembayaran Anda sampai <span className="font-semibold">{paymentDeadline}</span>
                                  </p>
                                  <p className="text-xs text-yellow-600 mt-1">
                                    Pesanan akan dibatalkan otomatis jika tidak dibayar sebelum batas waktu.
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Shipping Deadline Info - Only for PAID orders waiting admin confirmation */}
                        {selectedOrder.status === 'paid' && (selectedOrder.shipping_resi === 'Menunggu pesanan dikirim ke jasa kirim' || selectedOrder.shipping_resi === 'Menunggu konfirmasi admin') && (
                          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-4">
                            <p className="text-sm text-amber-900">
                              Pesanan akan dikirim paling lambat pada tanggal{' '}
                              <span className="font-semibold">
                                {new Date(new Date(selectedOrder.created_at).getTime() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </span>
                            </p>
                          </div>
                        )}

                        {/* Delivered Warning - Shows when order is delivered (2-day return window) */}
                        {!showReturnDetail && (() => {
                          const isDelivered = selectedOrder.status === 'delivered';
                          const deliveredAt = selectedOrder.delivered_at;

                          if (!isDelivered || !deliveredAt) return null;

                          // If still loading return data, show loading state to prevent flicker
                          if (loadingReturnData) {
                            return (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                                <div className="flex items-start gap-2">
                                  <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-600">Memuat status pesanan...</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // Check if there's an active return request (pending, approved, validating, or replacement_shipped)
                          // Check both submittedReturn and existingReturn to handle race conditions
                          const returnData = submittedReturn || existingReturn;
                          const hasActiveReturn = returnData && ['pending', 'approved', 'validating', 'replacement_shipped'].includes(returnData.status);

                          // If there's an active return, show return processing message instead
                          if (hasActiveReturn) {
                            return (
                              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                                <div className="flex items-start gap-2">
                                  <svg className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-orange-800">
                                      Permintaan Pengembalian Sedang Diproses
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // Normal auto-complete message when NO active return
                          // Calculate remaining days for return window (2 days from delivered)
                          const delivered = new Date(deliveredAt);
                          let deadline = new Date(delivered.getTime() + (2 * 24 * 60 * 60 * 1000)); // Add 2 days

                          // Round UP to next hour (:00) because cron runs every hour at :00
                          if (deadline.getMinutes() > 0 || deadline.getSeconds() > 0) {
                            deadline.setHours(deadline.getHours() + 1);
                          }
                          deadline.setMinutes(0);
                          deadline.setSeconds(0);
                          deadline.setMilliseconds(0);

                          const autoCompleteDate = deadline.toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          }) + ' pukul ' + deadline.toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          });

                          const now = new Date();
                          const timeRemaining = deadline.getTime() - now.getTime();
                          const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
                          const daysRemaining = Math.ceil(hoursRemaining / 24);

                          return (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                              <div className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-green-800">
                                    Pesanan Anda telah terkirim
                                  </p>
                                  <p className="text-xs text-green-700 mt-1">
                                    Pesanan akan terselesaikan otomatis pada <span className="font-semibold">{autoCompleteDate}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Completed Order Message */}
                        {selectedOrder.status === 'completed' && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-green-800">
                                  Pesanan anda telah terselesaikan
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Shipping Address */}
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">Alamat Pengiriman</h3>
                          <div className="bg-white border border-gray-200 rounded p-3">
                            {selectedOrder.shipping_address_json ? (
                              <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  <p className="text-sm font-semibold text-gray-900">{selectedOrder.shipping_address_json.nama}</p>
                                </div>
                                <div className="flex items-start gap-2">
                                  <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  <p className="text-xs text-gray-600 tracking-wide">{selectedOrder.shipping_address_json.telepon}</p>
                                </div>
                                <div className="flex items-start gap-2">
                                  <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <p className="text-xs text-gray-600 leading-relaxed">
                                    {[
                                      selectedOrder.shipping_address_json.alamat || null,
                                      (selectedOrder.shipping_address_json.kelurahan || userAddress?.kelurahan) ? `Kel. ${selectedOrder.shipping_address_json.kelurahan || userAddress?.kelurahan}` : null,
                                      (selectedOrder.shipping_address_json.kecamatan || userAddress?.kecamatan) ? `Kec. ${selectedOrder.shipping_address_json.kecamatan || userAddress?.kecamatan}` : null,
                                      selectedOrder.shipping_address_json.kabupaten || null,
                                      selectedOrder.shipping_address_json.provinsi || null,
                                      selectedOrder.shipping_address_json.kode_pos || null,
                                      'Indonesia'
                                    ].filter(Boolean).join(', ')}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">Alamat pengiriman tidak tersedia</p>
                            )}
                          </div>
                        </div>

                        {/* Shipping Info for Pending Orders */}
                        {(selectedOrder.status === 'pending' || selectedOrder.status === 'UNPAID') && !selectedOrder.shipping_resi && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">Pengiriman</h3>
                            <div className="bg-white border border-gray-200 rounded p-3">
                              <div className="space-y-2">
                                <div>
                                  <p className="text-xs text-gray-600">Ekspedisi</p>
                                  <p className="text-xs font-semibold text-gray-900 mt-0.5">
                                    {selectedOrder.checkout?.shipping_method || selectedOrder.shipping_method || '-'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Nomor resi</p>
                                  <p className="text-xs text-gray-500 mt-0.5">Belum ada</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Shipping Tracking */}
                        {(selectedOrder.shipping_resi || shippingHistory.length > 0) && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">Tracking Pengiriman</h3>
                            <div className="bg-white border border-gray-200 rounded p-3">
                              {/* Courier/Ekspedisi Info */}
                              <div className="mb-3">
                                <p className="text-xs font-medium text-gray-700">Ekspedisi</p>
                                <p className="text-xs font-semibold text-gray-900 mt-0.5">
                                  {(() => {
                                    // Priority 1: Biteship data (dari generate resi via admin)
                                    const biteshipData = selectedOrder.shipping_address_json?.biteship;
                                    if (biteshipData?.courier_code) {
                                      const courierCode = String(biteshipData.courier_code).toUpperCase();
                                      const courierService = biteshipData.courier_service ? ` ${String(biteshipData.courier_service).toUpperCase()}` : '';
                                      return `${courierCode}${courierService}`;
                                    }

                                    // Priority 2: shipping_method dari order
                                    if (selectedOrder.shipping_method) {
                                      return selectedOrder.shipping_method;
                                    }

                                    // Priority 3: shipping_method dari checkout_submissions (via relation)
                                    if (selectedOrder.checkout?.shipping_method) {
                                      return selectedOrder.checkout.shipping_method;
                                    }

                                    // Priority 4: Cek di checkout_submissions table langsung
                                    if (selectedOrder.checkout_submissions?.shipping_method) {
                                      return selectedOrder.checkout_submissions.shipping_method;
                                    }

                                    // Debug log
                                    console.log('🚚 Debug Ekspedisi:', {
                                      hasBiteship: !!biteshipData,
                                      hasShippingMethod: !!selectedOrder.shipping_method,
                                      hasCheckoutShippingMethod: !!selectedOrder.checkout?.shipping_method,
                                      hasCheckoutSubmissionsShippingMethod: !!selectedOrder.checkout_submissions?.shipping_method,
                                      selectedOrder
                                    });

                                    return '-';
                                  })()}
                                </p>
                              </div>

                              <div className="mb-3">
                                <p className="text-xs font-medium text-gray-700">No. Resi</p>
                                {selectedOrder.shipping_resi &&
                                 selectedOrder.shipping_resi !== 'Menunggu konfirmasi admin' &&
                                 selectedOrder.shipping_resi !== 'Menunggu pesanan dikirim ke jasa kirim' ? (
                                  <p className="text-xs font-semibold text-gray-900 mt-0.5">
                                    {selectedOrder.shipping_resi}
                                  </p>
                                ) : (
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    Belum ada resi
                                  </p>
                                )}
                              </div>

                              {/* Timeline dari Biteship API (Detail) atau Database (Fallback) */}
                              {trackingLoading ? (
                                <div className="mt-3 text-center py-6">
                                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                  <p className="text-xs text-gray-500 mt-2">Memuat detail tracking...</p>
                                </div>
                              ) : detailedTracking?.history && detailedTracking.history.length > 0 ? (
                                <div className="space-y-3 mt-3">
                                  {[...detailedTracking.history].reverse().map((track: any, index: number) => {
                                    const isLatest = index === 0; // Setelah reverse, terbaru di index 0
                                    const isDelivered = track.status === 'delivered';

                                    return (
                                      <div key={index} className="flex gap-2">
                                        <div className="flex flex-col items-center">
                                          <div className={`w-2 h-2 rounded-full ${
                                            isDelivered ? 'bg-green-600' :
                                            isLatest ? 'bg-blue-600' :
                                            'bg-gray-400'
                                          }`}></div>
                                          {index < detailedTracking.history.length - 1 && (
                                            <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>
                                          )}
                                        </div>
                                        <div className={`flex-1 ${index < detailedTracking.history.length - 1 ? 'pb-3' : ''}`}>
                                          <p className="text-[10px] text-gray-500">
                                            {new Date(track.updated_at).toLocaleString('id-ID', {
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                          <p className={`text-xs mt-0.5 leading-relaxed ${
                                            isLatest ? 'font-semibold text-gray-900' : 'text-gray-600'
                                          }`}>
                                            {track.note || track.service_type || 'Update status'}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : shippingHistory.length > 0 ? (
                                // Fallback ke database history
                                <div className="space-y-3 mt-3">
                                  {shippingHistory.map((history, index) => {
                                    const isLatest = index === 0; // Terbaru di atas (index 0)
                                    const isDelivered = history.biteship_status === 'delivered';

                                    return (
                                      <div key={history.id} className="flex gap-2">
                                        <div className="flex flex-col items-center">
                                          <div className={`w-2 h-2 rounded-full ${
                                            isDelivered ? 'bg-green-600' :
                                            isLatest ? 'bg-blue-600' :
                                            'bg-gray-400'
                                          }`}></div>
                                          {index < shippingHistory.length - 1 && (
                                            <div className="w-0.5 flex-1 bg-gray-200 mt-1"></div>
                                          )}
                                        </div>
                                        <div className={`flex-1 ${index < shippingHistory.length - 1 ? 'pb-2' : ''}`}>
                                          <p className="text-[10px] text-gray-500">
                                            {new Date(history.created_at).toLocaleString('id-ID', {
                                              day: '2-digit',
                                              month: 'short',
                                              year: 'numeric',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                          <p className={`text-xs mt-0.5 ${
                                            isLatest ? 'font-semibold text-gray-900' : 'text-gray-600'
                                          }`}>
                                            {history.status_display}
                                          </p>
                                          {history.courier_name && (
                                            <p className="text-[10px] text-gray-500 mt-0.5">
                                              via {history.courier_name}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="mt-3 text-center py-4">
                                  <p className="text-xs text-gray-500">
                                    {selectedOrder.shipping_resi
                                      ? 'Informasi tracking pengiriman akan tampil disini.'
                                      : 'Pesanan sedang diproses. Nomor resi akan tersedia setelah paket dikirim.'
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Order Items */}
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">Produk Pesanan</h3>
                          <div className="bg-white border border-gray-200 rounded divide-y divide-gray-200">
                            {selectedOrder.order_items?.map((item: any) => (
                              <div key={item.id} className="flex gap-3 p-3">
                                <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                  {item.produk?.photo1 ? (
                                    <img
                                      src={item.produk.photo1}
                                      alt={item.produk?.nama_produk || 'Product'}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#9CA3AF" strokeWidth="2"/>
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-xs font-medium text-gray-900 leading-tight">{item.produk?.nama_produk || 'Produk'}</h4>
                                  {item.size && <p className="text-xs font-semibold text-gray-700 mt-1">Size: {item.size}</p>}
                                  <p className="text-xs font-semibold text-gray-700 mt-1">x{item.quantity}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-semibold text-gray-900">
                                    Rp{(item.price || 0).toLocaleString('id-ID')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Order Summary */}
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">Ringkasan Pembayaran</h3>
                          <div className="bg-white border border-gray-200 rounded p-3">
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Subtotal Produk</span>
                                <span className="text-gray-900">Rp{(selectedOrder.checkout?.subtotal || 0).toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Subtotal Pengiriman</span>
                                <span className="text-gray-900">Rp{(selectedOrder.checkout?.shipping_cost || 0).toLocaleString('id-ID')}</span>
                              </div>
                              {selectedOrder.checkout?.order_summary?.discount > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Diskon</span>
                                  <span className="text-red-600">-Rp{(selectedOrder.checkout.order_summary.discount || 0).toLocaleString('id-ID')}</span>
                                </div>
                              )}
                              <div className="border-t border-gray-200 pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-semibold text-gray-900">Total Pesanan</span>
                                  <span className="text-base font-bold text-gray-900">
                                    Rp{(() => {
                                      // Calculate total: subtotal + shipping - discount
                                      const subtotal = Number(selectedOrder.checkout?.subtotal || 0);
                                      const shippingCost = Number(selectedOrder.checkout?.shipping_cost || 0);
                                      const discount = Number(selectedOrder.checkout?.order_summary?.discount || selectedOrder.discount_amount || 0);
                                      const calculatedTotal = subtotal + shippingCost - discount;

                                      // Fallback to stored total_amount if calculation fails
                                      return calculatedTotal > 0 ? calculatedTotal : (selectedOrder.total_amount || selectedOrder.checkout?.total || 0);
                                    })().toLocaleString('id-ID')}
                                  </span>
                                </div>
                              </div>
                              {(selectedOrder.payment_method || selectedOrder.checkout?.payment_method) && (
                                <div className="pt-2 mt-2 border-t border-gray-200">
                                  <p className="text-xs text-gray-600">Metode Pembayaran</p>
                                  <p className="text-xs font-medium text-gray-900 mt-0.5">
                                    {formatPaymentMethod(selectedOrder.payment_method || selectedOrder.checkout?.payment_method)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {(selectedOrder.status === 'UNPAID' || selectedOrder.status === 'pending') && (
                          <div className="flex gap-2">
                            <a
                              href={getPaymentUrl(selectedOrder)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded hover:bg-red-700 transition-colors"
                            >
                              Bayar Sekarang
                            </a>
                          </div>
                        )}
                      </div>
                      </div>
                    ) : (
                      // Return Form Card (Replaces Order Detail)
                      <div className="p-6">
                        {/* Back Button */}
                        <div className="flex items-center justify-between mb-4">
                          <button
                            onClick={closeReturnForm}
                            className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Kembali ke Detail Pesanan
                          </button>
                        </div>

                        <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-200">Permintaan Pengembalian</h3>
                        <div className="space-y-4">
                          {/* Order ID Display */}
                          <div>
                            <p className="text-xs text-gray-700 font-medium mb-1">No. Pesanan</p>
                            <p className="text-xs font-semibold text-gray-900">
                              {selectedOrder.id.replace(/-/g, '').slice(0, 10).toUpperCase()}
                            </p>
                          </div>

                          {/* Product List */}
                          <div>
                            <p className="text-xs text-gray-700 font-medium mb-1.5">Produk</p>
                            <div className="bg-white border border-gray-200 rounded divide-y divide-gray-200">
                              {selectedOrder.order_items?.map((item: any) => (
                                <div key={item.id} className="flex gap-2 p-2">
                                  <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                                    {item.produk?.photo1 ? (
                                      <img
                                        src={item.produk.photo1}
                                        alt={item.produk?.nama_produk || 'Product'}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#9CA3AF" strokeWidth="2"/>
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-medium text-gray-900 leading-tight truncate">{item.produk?.nama_produk || 'Produk'}</h4>
                                    {item.size && <p className="text-[10px] text-gray-600 mt-0.5">Size: {item.size}</p>}
                                    <p className="text-[10px] text-gray-600 mt-0.5">x{item.quantity}</p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-[11px] font-semibold text-gray-900">
                                      Rp{(item.price || 0).toLocaleString('id-ID')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Reason Dropdown */}
                          <div>
                            <label className="block text-xs font-medium text-gray-800 mb-1.5">
                              Alasan Pengembalian <span className="text-red-600">*</span>
                            </label>
                            <select
                              value={returnReason}
                              onChange={(e) => setReturnReason(e.target.value)}
                              className="w-full px-3 py-2 text-xs text-gray-900 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500"
                            >
                              <option value="" className="text-gray-500">Pilih alasan</option>
                              <option value="damaged" className="text-gray-900">Produk rusak/cacat</option>
                              <option value="mismatch" className="text-gray-900">Produk tidak sesuai</option>
                              <option value="other" className="text-gray-900">Lainnya</option>
                            </select>
                          </div>

                          {/* Description Field */}
                          <div>
                            <label className="block text-xs font-medium text-gray-800 mb-1.5">
                              Deskripsi <span className="text-red-600">*</span>
                            </label>
                            <textarea
                              value={returnDescription}
                              onChange={(e) => setReturnDescription(e.target.value)}
                              rows={4}
                              placeholder="Jelaskan detail masalah produk..."
                              className="w-full px-3 py-2 text-xs text-gray-900 placeholder:text-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500 resize-none"
                            />
                          </div>

                          {/* Image Upload */}
                          <div>
                            <label className="block text-xs font-medium text-gray-800 mb-1.5">
                              Upload Foto Produk
                            </label>
                            <div className="space-y-2">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleReturnImageChange}
                                className="hidden"
                                id="return-image-upload"
                              />
                              <label
                                htmlFor="return-image-upload"
                                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors cursor-pointer"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Pilih Gambar
                              </label>
                              <p className="text-xs text-gray-500">Format: JPG, PNG. Max 5MB per file</p>
                            </div>

                            {/* Image Previews */}
                            {returnImagePreviews.length > 0 && (
                              <div className="grid grid-cols-4 gap-1.5 mt-2">
                                {returnImagePreviews.map((preview, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={preview}
                                      alt={`Preview ${index + 1}`}
                                      className="w-full h-16 object-cover rounded border border-gray-200"
                                    />
                                    <button
                                      onClick={() => handleRemoveReturnImage(index)}
                                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Video Link Field */}
                          <div>
                            <label className="block text-xs font-medium text-gray-800 mb-1.5">
                              Link Video Unboxing
                            </label>
                            <input
                              type="url"
                              value={returnVideoLink}
                              onChange={(e) => setReturnVideoLink(e.target.value)}
                              placeholder="Taruh link video unboxing anda disini"
                              className="w-full px-3 py-2 text-xs text-gray-900 placeholder:text-gray-500 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:border-gray-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Masukkan link video dari YouTube, Google Drive, atau platform lainnya</p>
                          </div>

                          {/* Submit Button */}
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={handleSubmitReturn}
                              disabled={submitReturnLoading || !returnDescription.trim() || !returnVideoLink.trim()}
                              className="flex-1 px-4 py-2.5 bg-gray-500 text-white text-xs font-semibold hover:bg-gray-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              {submitReturnLoading ? (
                                <>
                                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Mengirim...
                                </>
                              ) : (
                                'Kirim Permintaan Pengembalian'
                              )}
                            </button>
                            <button
                              onClick={() => setShowReturnForm(false)}
                              disabled={submitReturnLoading}
                              className="px-4 py-2.5 bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                      </div>
                    )}
                  </>
                )}

                {activeView === 'vouchers' && (
                  <>
                    {/* Voucher List - Shopee Style */}
                    <div className="p-4 md:p-8">
                      {/* Header */}
                      <div className="mb-4 md:mb-6">
                        <h2 className="text-lg md:text-2xl font-semibold text-gray-900">Voucher Saya</h2>
                      </div>

                      {/* Add Voucher Section */}
                      <div className="mb-6 bg-gray-50 p-6 rounded">
                        <div className="flex items-center gap-4">
                          <label className="text-base font-medium text-gray-900 whitespace-nowrap">
                            Tambah Voucher
                          </label>
                          <input
                            type="text"
                            placeholder="Masukkan kode voucher"
                            value={voucherCode}
                            onChange={(e) => setVoucherCode(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && voucherCode.trim() && !claimingVoucher) {
                                handleClaimVoucher();
                              }
                            }}
                            disabled={claimingVoucher}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm text-gray-900 placeholder:text-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          <button
                            onClick={handleClaimVoucher}
                            disabled={!voucherCode.trim() || claimingVoucher}
                            className={`px-8 py-2 font-medium rounded transition-colors text-sm disabled:cursor-not-allowed ${
                              voucherCode.trim() && !claimingVoucher
                                ? 'bg-black text-white hover:bg-gray-800'
                                : 'bg-gray-300 text-gray-700'
                            }`}
                          >
                            {claimingVoucher ? 'Menyimpan...' : 'Simpan'}
                          </button>
                        </div>

                        {/* Message Display */}
                        {claimMessage && (
                          <div className={`mt-3 px-4 py-2 rounded text-sm ${
                            claimMessage.type === 'success'
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-red-100 text-red-800 border border-red-300'
                          }`}>
                            {claimMessage.text}
                          </div>
                        )}
                      </div>

                      {/* Tab Navigation */}
                      <div className="mb-6 border-b border-gray-200">
                        <div className="flex items-center gap-8">
                          <button className="pb-3 text-sm font-medium text-red-600 border-b-2 border-red-600">
                            Semua ({userVouchers.length})
                          </button>
                        </div>
                      </div>

                      {vouchersLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <p className="text-gray-600">Memuat voucher...</p>
                        </div>
                      ) : userVouchers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {userVouchers.map((userVoucher) => {
                            const voucher = userVoucher.voucher;
                            const isExpired = new Date(voucher.expired) < new Date();
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
                                <div className={`w-24 flex-shrink-0 flex flex-col items-center justify-center relative ${
                                  isUsed || isExpired ? 'bg-gray-300' : voucher.type === 'shipping' ? 'bg-orange-500' : 'bg-red-600'
                                }`}>
                                  {/* Badge */}
                                  {!isUsed && !isExpired && (
                                    <div className="absolute top-1.5 left-0 right-0 text-center">
                                      <span className="inline-block px-1.5 py-0.5 bg-yellow-400 text-red-700 text-[9px] font-bold rounded">
                                        Voucher Spesial
                                      </span>
                                    </div>
                                  )}

                                  {/* Icon */}
                                  <div className="text-white mb-1.5">
                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="20" fontWeight="bold" fill="currentColor">
                                        M
                                      </text>
                                    </svg>
                                  </div>

                                  {/* Category Label */}
                                  <div className="text-white text-center px-1.5">
                                    <div className="text-[9px] font-bold leading-tight">
                                      {voucher.type === 'shipping' ? 'ONGKIR' : 'VOUCHER'}
                                    </div>
                                    <div className="text-[9px] font-bold leading-tight">
                                      {voucher.type === 'shipping' ? 'GRATIS' : 'DISKON'}
                                    </div>
                                  </div>

                                  {/* Decorative circles */}
                                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full"></div>
                                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full"></div>
                                </div>

                                {/* Right Content Section */}
                                <div className="flex-1 p-3 flex flex-col justify-between">
                                  <div>
                                    {/* Title */}
                                    <h3 className="text-sm font-semibold text-gray-900 mb-1 leading-tight">
                                      {voucher.judul_voucher ||
                                        (voucher.type === 'shipping'
                                          ? `Gratis Ongkir s/d Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                          : `Diskon ${voucher.discount_percentage || '15'}% s/d Rp${(voucher.total_potongan / 1000).toFixed(0)}RB`
                                        )
                                      }
                                    </h3>

                                    {/* Min Purchase */}
                                    <p className="text-[11px] text-gray-600 mb-1.5">
                                      Min.Pembelian {voucher.minimal_pembelian || 1} produk
                                    </p>

                                    {/* Status Badges */}
                                    <div className="flex items-center gap-1.5 mb-1.5">
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

                                    {/* Expiry Date */}
                                    <p className="text-[11px] text-gray-600">
                                      Berlaku: <span className="font-medium">{Math.ceil((new Date(voucher.expired).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} hari</span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Empty State */
                        <div className="py-16 flex flex-col items-center justify-center">
                          <div className="w-32 h-32 mb-6">
                            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect x="30" y="50" width="140" height="100" rx="8" fill="#E5E7EB" stroke="#9CA3AF" strokeWidth="3"/>
                              <circle cx="30" cy="100" r="15" fill="#F9FAFB"/>
                              <circle cx="170" cy="100" r="15" fill="#F9FAFB"/>
                              <line x1="60" y1="80" x2="140" y2="80" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" strokeDasharray="5,5"/>
                              <line x1="60" y1="100" x2="100" y2="100" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round"/>
                              <line x1="60" y1="120" x2="120" y2="120" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round"/>
                            </svg>
                          </div>
                          <p className="text-gray-600 font-belleza text-lg mb-2">Belum ada voucher</p>
                          <p className="text-gray-500 text-sm mb-6">Claim voucher di halaman home untuk mendapatkan potongan harga</p>
                          <Link
                            href="/"
                            className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold rounded transition-colors"
                          >
                            Lihat Voucher Tersedia
                          </Link>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {activeView === 'notifications' && (
                  <div className="p-4 md:p-8">
                    {/* Breadcrumb - Mobile Only */}
                    <div className="mb-3 md:hidden">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Link href="/home" className="hover:text-gray-600 transition-colors">
                          Home
                        </Link>
                        <span>&gt;</span>
                        <span className="text-gray-900 font-medium">Notifikasi</span>
                      </div>
                    </div>

                    <h2 className="text-lg md:text-2xl font-semibold text-gray-900 mb-6">Notifikasi</h2>

                    {/* Loading State */}
                    {notificationsLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                      </div>
                    ) : notifications.length > 0 ? (
                      /* Notifications List - Compact Design */
                      <div className="space-y-2">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start gap-3 p-3">
                              {/* Icon - Smaller & More Compact */}
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                notif.type === 'order_created'
                                  ? 'bg-yellow-100'
                                  : notif.type === 'payment_success'
                                  ? 'bg-green-100'
                                  : notif.type === 'order_shipped'
                                  ? 'bg-red-100'
                                  : notif.type === 'order_delivered'
                                  ? 'bg-green-100'
                                  : notif.type === 'order_completed'
                                  ? 'bg-green-100'
                                  : notif.type === 'order_cancelled'
                                  ? 'bg-red-100'
                                  : notif.type === 'return_cancelled'
                                  ? 'bg-red-100'
                                  : notif.type === 'return_request_approved'
                                  ? 'bg-green-100'
                                  : 'bg-blue-100'
                              }`}>
                                {notif.type === 'order_created' ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-yellow-600">
                                    <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : notif.type === 'payment_success' ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-600">
                                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : notif.type === 'order_shipped' ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-600">
                                    <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 16a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM18.5 16a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : notif.type === 'order_delivered' ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-600">
                                    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : notif.type === 'order_completed' ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-600">
                                    <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : notif.type === 'order_cancelled' ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-600">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  </svg>
                                ) : notif.type === 'return_cancelled' ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-600">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : notif.type === 'return_request_approved' ? (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-600">
                                    <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : (
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-600">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                  </svg>
                                )}
                              </div>

                              {/* Content - More Compact */}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-sm">
                                  {notif.title}
                                </h3>
                                <p className="text-xs text-gray-600 mt-0.5 mb-1.5">
                                  {notif.message}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs text-gray-400">
                                    {new Date(notif.created_at).toLocaleDateString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                  {notif.order_id && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <Link
                                        href={`/user/purchase?view=order-detail&order=${notif.order_id}`}
                                        className="text-xs text-gray-700 hover:text-gray-800 font-medium hover:underline"
                                      >
                                        Lihat Pesanan
                                      </Link>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Empty State */
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-300 mb-4">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <p className="text-gray-500 font-belleza text-base">Belum ada notifikasi</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Packaging Confirmation Modal */}
      {showPackagingConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Apakah paket sudah dikemas kembali?
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-600 text-center mb-6">
              Harap kemas kembali produk dengan baik dan aman sebelum melanjutkan.
              Pastikan produk dalam kondisi yang sama seperti saat diterima.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPackagingConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Belum Siap
              </button>
              <button
                onClick={handleActualSubmit}
                disabled={confirmCountdown > 0}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  confirmCountdown > 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {confirmCountdown > 0
                  ? `Tunggu ${confirmCountdown} detik`
                  : 'Saya telah mengemas paket'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Email Modal */}
      {showChangeEmailModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
            {emailChangeStep === 'success' ? (
              <>
                {/* Step 3: Success */}
                <div className="text-center py-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                    <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Email Berhasil Diubah!</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Email Anda telah berhasil diubah menjadi <strong>{newEmailInput}</strong>.
                    Silakan login ulang menggunakan email baru Anda.
                  </p>
                  <button
                    onClick={() => {
                      window.location.href = '/login';
                    }}
                    className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                  >
                    Login Sekarang
                  </button>
                </div>
              </>
            ) : emailChangeStep === 'verify' ? (
              <>
                {/* Step 1: Verify Code */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Verifikasi Email</h3>
                  <button
                    onClick={() => {
                      setShowChangeEmailModal(false);
                      setVerificationCode('');
                      setVerificationError('');
                      setEmailChangeStep('verify');
                    }}
                    disabled={sendingCode}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {sendingCode ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-sm text-gray-600">Mengirim kode verifikasi ke email Anda...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      Kode verifikasi telah dikirim ke email <strong>{user?.email}</strong>. Masukkan kode 6 digit untuk melanjutkan.
                    </p>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-900 mb-2">Kode Verifikasi</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => {
                          setVerificationCode(e.target.value.replace(/\D/g, ''));
                          setVerificationError(''); // Clear error when user types
                        }}
                        placeholder="000000"
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 text-center text-2xl font-mono tracking-widest text-gray-900 placeholder:text-gray-500 ${
                          verificationError
                            ? 'border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-gray-500'
                        }`}
                      />
                      {verificationError && (
                        <p className="mt-2 text-sm text-red-600">{verificationError}</p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowChangeEmailModal(false);
                          setVerificationCode('');
                          setVerificationError('');
                          setEmailChangeStep('verify');
                        }}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleVerifyCode}
                        disabled={verifyingCode || verificationCode.length !== 6}
                        className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {verifyingCode ? 'Memverifikasi...' : 'Lanjutkan'}
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Step 2: Input New Email */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Email Baru</h3>
                  <button
                    onClick={() => {
                      setShowChangeEmailModal(false);
                      setVerificationCode('');
                      setVerificationError('');
                      setNewEmailInput('');
                      setEmailChangeStep('verify');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Masukkan alamat email baru Anda. Anda akan diminta login ulang setelah email berhasil diubah.
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">Email Baru</label>
                  <input
                    type="email"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    placeholder="newemail@example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm text-gray-900 placeholder:text-gray-600"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEmailChangeStep('verify');
                      setNewEmailInput('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Kembali
                  </button>
                  <button
                    onClick={handleChangeEmail}
                    disabled={verifyingCode || !newEmailInput}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {verifyingCode ? 'Mengubah...' : 'Ubah Email'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Phone Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {(user as any)?.phone ? 'Ubah Nomor Telepon' : 'Tambah Nomor Telepon'}
              </h3>
              <button
                onClick={() => {
                  setShowPhoneModal(false);
                  setPhoneInput('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Masukkan nomor telepon Anda. Nomor ini dapat digunakan untuk keperluan verifikasi dan komunikasi.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">Nomor Telepon</label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm text-gray-900 placeholder:text-gray-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPhoneModal(false);
                  setPhoneInput('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleUpdatePhone}
                disabled={updatingProfile || !phoneInput}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {updatingProfile ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gender Modal */}
      {showGenderModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {(user as any)?.gender ? 'Ubah Jenis Kelamin' : 'Tambah Jenis Kelamin'}
              </h3>
              <button
                onClick={() => {
                  setShowGenderModal(false);
                  setGenderInput('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Pilih jenis kelamin Anda.
            </p>

            <div className="mb-4 space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="genderSelect"
                  value="male"
                  checked={genderInput === 'male'}
                  onChange={(e) => setGenderInput(e.target.value as any)}
                  className="w-4 h-4 text-gray-500"
                />
                <span className="text-sm text-gray-900">Laki-laki</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="genderSelect"
                  value="female"
                  checked={genderInput === 'female'}
                  onChange={(e) => setGenderInput(e.target.value as any)}
                  className="w-4 h-4 text-gray-500"
                />
                <span className="text-sm text-gray-900">Perempuan</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="genderSelect"
                  value="other"
                  checked={genderInput === 'other'}
                  onChange={(e) => setGenderInput(e.target.value as any)}
                  className="w-4 h-4 text-gray-500"
                />
                <span className="text-sm text-gray-900">Lainnya</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowGenderModal(false);
                  setGenderInput('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleUpdateGender}
                disabled={updatingProfile || !genderInput}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {updatingProfile ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in-down">
          <div className={`${toastType === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {toastType === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              )}
            </svg>
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Location Popup */}
      <LocationPopup />

    </div>
  );
}

export default function UserPurchasePage() {
  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LottiePlayer
            src="/images/7iaKJ6872I.json"
            autoplay
            loop
            style={{ width: '200px', height: '200px' }}
          />
        </div>
      }>
        <UserPurchaseContent />
      </Suspense>
      <FloatingChat />
    </>
  );
}
