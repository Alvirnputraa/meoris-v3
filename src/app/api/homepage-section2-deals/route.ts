import { NextRequest, NextResponse } from 'next/server';
import { homepageSection2DealsDb } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const deals = activeOnly 
      ? await homepageSection2DealsDb.getActive(limit)
      : await homepageSection2DealsDb.getAll(limit, offset);

    return NextResponse.json({
      success: true,
      data: deals,
      message: 'Deals retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch deals',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.produk_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'produk_id is required',
          message: 'Product ID is required'
        },
        { status: 400 }
      );
    }

    const deal = await homepageSection2DealsDb.create({
      produk_id: body.produk_id,
      harga_diskon: body.harga_diskon || null,
      discount_percentage: body.discount_percentage || null,
      urutan_tampilan: body.urutan_tampilan || 1,
      is_active: body.is_active !== undefined ? body.is_active : true,
      mulai_tayang: body.mulai_tayang || null,
      selesai_tayang: body.selesai_tayang || null
    });

    return NextResponse.json({
      success: true,
      data: deal,
      message: 'Deal created successfully'
    });
  } catch (error) {
    console.error('Error creating deal:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create deal',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}