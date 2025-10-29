import { NextRequest, NextResponse } from 'next/server';
import { homepageSection2DealsDb } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;

    const deal = await homepageSection2DealsDb.update(id, body);

    return NextResponse.json({
      success: true,
      data: deal,
      message: 'Deal updated successfully'
    });
  } catch (error) {
    console.error('Error updating deal:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update deal',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await homepageSection2DealsDb.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Deal deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete deal',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}