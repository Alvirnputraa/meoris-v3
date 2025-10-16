import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isPaid(s?: string | null) {
  const k = (s || '').toLowerCase();
  return k === 'paid' || k === 'success'
}
function isFailed(s?: string | null) {
  return (s || '').toLowerCase() === 'failed'
}
function isPendingLike(s?: string | null) {
  const k = (s || '').toLowerCase()
  return k === 'submitted' || k === 'draft' || k === 'pending'
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await ctx.params
  try {
    // 1) Try orders by id or by checkout_submission_id
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id,status,checkout_submission_id')
      .or(`id.eq.${orderId},checkout_submission_id.eq.${orderId}`)
      .order('created_at', { ascending: false })
      .limit(1)

    const order = Array.isArray(orders) ? orders[0] : orders
    if (order) {
      if (isPaid(order.status)) {
        return NextResponse.redirect(new URL(`/payment/${orderId}/succes`, request.url), 302)
      }
      if (isFailed(order.status)) {
        return NextResponse.redirect(new URL(`/payment/${orderId}/failed`, request.url), 302)
      }
      return NextResponse.redirect(new URL(`/payment/${orderId}/pending`, request.url), 302)
    }

    // 2) Fallback to checkout_submissions status
    const { data: sub } = await supabaseAdmin
      .from('checkout_submissions')
      .select('id,status')
      .eq('id', orderId)
      .maybeSingle()

    if (sub) {
      if (isPaid(sub.status)) {
        return NextResponse.redirect(new URL(`/payment/${orderId}/succes`, request.url), 302)
      }
      if (isFailed(sub.status)) {
        return NextResponse.redirect(new URL(`/payment/${orderId}/failed`, request.url), 302)
      }
      if (isPendingLike(sub.status)) {
        return NextResponse.redirect(new URL(`/payment/${orderId}/pending`, request.url), 302)
      }
    }

    // Unknown: go to pending as safe default
    return NextResponse.redirect(new URL(`/payment/${orderId}/pending`, request.url), 302)
  } catch {
    return NextResponse.redirect(new URL(`/payment/${orderId}/pending`, request.url), 302)
  }
}
