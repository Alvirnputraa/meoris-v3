# Perbaikan Upload Foto Pengembalian Barang

## Masalah
Ketika ada foto yang gagal diupload saat pengajuan pengembalian barang, sistem tetap melanjutkan proses dan menyimpan data ke database tanpa foto yang gagal. Hal ini menyebabkan:
1. Data pengembalian tersimpan di database tanpa foto lengkap
2. Gambar yang berhasil diupload tetap ada di storage
3. User melihat halaman review kosong karena foto tidak ada

## Solusi yang Telah Diimplementasikan

### 1. Backend (src/app/api/returns/submit/route.ts) ✅ SELESAI
Backend sudah diperbaiki dengan perubahan berikut:

**Perubahan:**
- Menambahkan array `uploadedFilePaths` untuk melacak semua file yang sudah terupload
- Jika ada 1 foto yang gagal diupload:
  - Langsung menghapus semua foto yang sudah terupload sebelumnya (rollback)
  - Return error response dengan status 400
  - Tidak melanjutkan ke insert database
- Jika insert database gagal:
  - Menghapus semua foto yang sudah terupload (rollback)
  - Return error response dengan status 500
- Menghapus sistem "warnings" - sekarang hanya ada sukses atau gagal total

**Kode yang Diperbaiki:**
```typescript
// Handle photo uploads
const photoFiles = formData.getAll('photos') as File[];
const photoPaths: string[] = [];
const uploadedFilePaths: string[] = []; // Track uploaded file paths for cleanup

console.log(`📸 Attempting to upload ${photoFiles.length} photos`);

// Upload all photos, if any fails, rollback all
for (const file of photoFiles) {
  // ... file validation ...

  if (uploadError) {
    console.error('❌ Error uploading photo:', uploadError);

    // Cleanup: Delete all previously uploaded files
    console.log('🧹 Rolling back uploaded files...');
    for (const filePath of uploadedFilePaths) {
      try {
        await supabase.storage.from('returns').remove([filePath]);
        console.log(`🗑️ Deleted: ${filePath}`);
      } catch (cleanupError) {
        console.error(`Failed to delete ${filePath}:`, cleanupError);
      }
    }

    // Return error response
    return NextResponse.json(
      {
        error: `Gagal mengunggah foto: ${file.name}`,
        details: `Kesalahan: ${uploadError.message}\nDetail: ${fileName}`,
        message: 'Semua foto harus berhasil diunggah. Silakan coba lagi.'
      },
      { status: 400 }
    );
  }

  if (uploadData) {
    uploadedFilePaths.push(uploadData.path); // Track uploaded file
    // Get public URL ...
  }
}

// If DB insert fails, also rollback
if (returnError) {
  console.error('Error creating return request:', returnError);

  // Cleanup: Delete all uploaded files since DB insert failed
  console.log('🧹 Rolling back uploaded files due to DB error...');
  for (const filePath of uploadedFilePaths) {
    try {
      await supabase.storage.from('returns').remove([filePath]);
      console.log(`🗑️ Deleted: ${filePath}`);
    } catch (cleanupError) {
      console.error(`Failed to delete ${filePath}:`, cleanupError);
    }
  }

  return NextResponse.json(
    { error: 'Gagal membuat pengajuan pengembalian: ' + returnError.message },
    { status: 500 }
  );
}
```

### 2. Frontend (src/app/user/purchase/page.tsx) - PERLU DISELESAIKAN MANUAL

**File sedang terbuka di editor, silakan lakukan perubahan berikut:**

**Lokasi:** Sekitar baris 2133-2170

**HAPUS bagian ini:**
```typescript
      // Check for warnings
      if (result.warnings && result.warnings.length > 0) {
        console.warn('⚠️ Upload warnings:', result.warnings);
        alert(`Pengajuan berhasil dikirim, namun ada ${result.warnings.length} foto yang gagal diupload:\n${result.warnings.join('\n')}`);
      }

      // Log photo count
      console.log(`📸 Photos uploaded: ${result.photoCount || 0}`);

      // Save submitted return data for detail view
      setSubmittedReturn({
        ...result.data,
        reason: returnReason,
        description: returnDescription,
        video_link: returnVideoLink,
        photo_previews: returnImagePreviews
      });

      // Close form and show detail
      setShowReturnForm(false);
      setShowReturnDetail(true);

      // Reset form
      setReturnReason('');
      setReturnDescription('');
      setReturnImages([]);
      setReturnImagePreviews([]);
      setReturnVideoLink('');

      // Refresh orders list and existing return status
      loadOrders();
      if (selectedOrder?.id) {
        loadExistingReturn(selectedOrder.id);
      }

      if (!result.warnings || result.warnings.length === 0) {
        alert('Pengajuan pengembalian berhasil dikirim!');
      }
```

**GANTI dengan:**
```typescript
      // Log photo count
      console.log(`📸 Photos uploaded: ${result.photoCount || 0}`);

      // Save submitted return data for detail view
      setSubmittedReturn({
        ...result.data,
        reason: returnReason,
        description: returnDescription,
        video_link: returnVideoLink,
        photo_previews: returnImagePreviews
      });

      // Close form and show detail
      setShowReturnForm(false);
      setShowReturnDetail(true);

      // Reset form
      setReturnReason('');
      setReturnDescription('');
      setReturnImages([]);
      setReturnImagePreviews([]);
      setReturnVideoLink('');

      // Refresh orders list and existing return status
      loadOrders();
      if (selectedOrder?.id) {
        loadExistingReturn(selectedOrder.id);
      }

      // Show success message
      alert('Pengajuan pengembalian berhasil dikirim!');
```

**Penjelasan Perubahan:**
- Menghapus pengecekan `result.warnings` karena backend tidak akan mengirim warnings lagi
- Jika ada error, akan langsung masuk ke blok `catch` di baris 2171
- Alert sukses akan selalu ditampilkan jika proses berhasil

## Cara Kerja Setelah Perbaikan

1. User mengisi form pengembalian dan upload beberapa foto
2. Frontend mengirim semua foto ke backend
3. Backend mencoba upload foto satu per satu:
   - **Jika semua berhasil:** Lanjut insert ke database → Return success
   - **Jika ada 1 yang gagal:** Hapus semua foto yang sudah terupload → Return error
4. Frontend:
   - **Jika response.ok:** Tampilkan halaman review dengan semua foto
   - **Jika !response.ok:** Tampilkan error, user bisa coba lagi

## Testing

Untuk test apakah perbaikan bekerja:

1. Buat nama file foto dengan karakter invalid (contoh: `{B1BA5C26-739E-4BA7-949F-63CF1B549317}.png`)
2. Upload foto tersebut bersama foto valid lainnya
3. Klik "Kirim Ajuan"
4. **Expected Result:**
   - Error muncul: "Gagal mengunggah foto: {B1BA5C26-739E-4BA7-949F-63CF1B549317}.png"
   - Tidak ada data yang tersimpan di database `returns`
   - Tidak ada foto yang tersimpan di storage bucket `returns`
   - User bisa rename file dan coba lagi

## Files yang Dimodifikasi

1. ✅ `src/app/api/returns/submit/route.ts` - Backend API (SELESAI)
2. ⏳ `src/app/user/purchase/page.tsx` - Frontend component (PERLU EDIT MANUAL)

## Catatan

- Backup file original sudah dibuat: `src/app/api/returns/submit/route.ts.backup`
- Jika ada masalah, restore dari backup tersebut
