import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Extract form data
    const orderId = formData.get('orderId') as string;
    const userId = formData.get('userId') as string;
    const reason = formData.get('reason') as string;
    const description = formData.get('description') as string;
    const videoLink = formData.get('videoLink') as string;

    // Validation
    if (!orderId || !userId) {
      return NextResponse.json(
        { error: 'Order ID dan User ID diperlukan' },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Alasan pengembalian diperlukan' },
        { status: 400 }
      );
    }

    if (!description) {
      return NextResponse.json(
        { error: 'Deskripsi pengembalian diperlukan' },
        { status: 400 }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, user_id, status, shipping_status')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (orderError || !order) {
      console.error('Order query error:', orderError);
      return NextResponse.json(
        {
          error: 'Pesanan tidak ditemukan atau tidak memiliki akses',
          details: orderError ? orderError.message : 'Order not found'
        },
        { status: 404 }
      );
    }

    // Validate order is paid (delivered/completed orders are considered paid)
    const isPaid =
      order.status === 'paid' ||
      order.status === 'PAID' ||
      order.status === 'delivered' ||
      order.status === 'completed';

    if (!isPaid) {
      return NextResponse.json(
        { error: 'Hanya pesanan yang sudah dibayar dapat diajukan pengembalian' },
        { status: 400 }
      );
    }

    // Validate order is delivered
    const isDelivered =
      order.status === 'delivered' ||
      order.status === 'completed' ||
      order.shipping_status?.toLowerCase().includes('terkirim') ||
      order.shipping_status === 'delivered';

    if (!isDelivered) {
      return NextResponse.json(
        { error: 'Hanya pesanan yang sudah diterima dapat diajukan pengembalian' },
        { status: 400 }
      );
    }

    // Check if return request already exists for this order
    const { data: existingReturn } = await supabase
      .from('returns')
      .select('id, status')
      .eq('order_id', orderId)
      .single();

    if (existingReturn && existingReturn.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Pengembalian untuk pesanan ini sudah pernah diajukan' },
        { status: 400 }
      );
    }

    // Handle photo uploads
    const photoFiles = formData.getAll('photos') as File[];
    const photoPaths: string[] = [];
    const uploadedFilePaths: string[] = []; // Track uploaded file paths for cleanup

    console.log(`📸 Attempting to upload ${photoFiles.length} photos`);

    // Upload all photos, if any fails, rollback all
    for (const file of photoFiles) {
      console.log('📸 File check:', {
        name: file instanceof File ? file.name : 'not a file',
        size: file instanceof File ? file.size : 0,
        type: file instanceof File ? file.type : 'unknown'
      });

      if (file && file instanceof File && file.size > 0) {
        const fileName = `return_${orderId}_${Date.now()}_${file.name}`;
        console.log(`📸 Uploading file: ${fileName}`);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('returns')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false
          });

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
          uploadedFilePaths.push(uploadData.path);

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('returns')
            .getPublicUrl(uploadData.path);

          console.log(`✅ Photo uploaded successfully: ${publicUrlData.publicUrl}`);
          photoPaths.push(publicUrlData.publicUrl);
        }
      } else {
        console.warn('⚠️ Skipping invalid file:', file);
      }
    }

    console.log(`📸 Upload complete. Success: ${photoPaths.length}`);

    // Prepare video paths (link URL)
    const videoPaths: string[] = videoLink ? [videoLink] : [];

    // Insert return request - only proceed if all photos uploaded successfully
    // return_number will be auto-generated by database trigger
    const { data: returnData, error: returnError } = await supabase
      .from('returns')
      .insert({
        user_id: userId,
        order_id: orderId,
        order_number: order.order_number,
        reason: reason,
        description: description,
        photo_paths: photoPaths,
        video_paths: videoPaths,
        status: 'pending'
      })
      .select('*, return_number')
      .single();

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

    // Create notification for return request submission
    // Format order ID: 10 characters uppercase without dashes
    const orderIdShort = orderId.toString().replace(/-/g, '').substring(0, 10).toUpperCase();
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        order_id: orderId,
        type: 'return_request_submitted',
        title: 'Permintaan Pengembalian',
        message: `Kami telah menerima permintaan pengajuan pengembalian anda untuk id pesanan ${orderIdShort} dan proses peninjauan memerlukan kurang dari 1 hari.`
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Don't fail the entire request if notification creation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Pengajuan pengembalian berhasil dikirim',
      data: returnData,
      return_number: returnData.return_number,
      photoCount: photoPaths.length
    });

  } catch (error) {
    console.error('Error in submit return API:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memproses permintaan' },
      { status: 500 }
    );
  }
}
