-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'order_created', 'payment_success', 'order_shipped', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON public.notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to create notification for new order (UNPAID)
CREATE OR REPLACE FUNCTION create_notification_on_order_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if order status is UNPAID or pending
  IF NEW.status IN ('UNPAID', 'pending') THEN
    INSERT INTO public.notifications (
      user_id,
      order_id,
      type,
      title,
      message
    ) VALUES (
      NEW.user_id,
      NEW.id,
      'order_created',
      'Pesanan Baru',
      'Harap selesaikan pembayaran pesanan anda dalam 1 x 24 jam'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create notification when new order is created
DROP TRIGGER IF EXISTS trigger_notification_on_order_insert ON public.orders;
CREATE TRIGGER trigger_notification_on_order_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_order_insert();

-- Function to create notification when order is paid
CREATE OR REPLACE FUNCTION create_notification_on_payment_success()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification if status changed from UNPAID/pending to paid
  IF (OLD.status IN ('UNPAID', 'pending') OR OLD.status IS NULL)
     AND NEW.status = 'paid' THEN
    INSERT INTO public.notifications (
      user_id,
      order_id,
      type,
      title,
      message
    ) VALUES (
      NEW.user_id,
      NEW.id,
      'payment_success',
      'Pembayaran Berhasil',
      'Pembayaran berhasil. Pesananmu sekarang sedang dikemas'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create notification when order status changes to paid
DROP TRIGGER IF EXISTS trigger_notification_on_payment_success ON public.orders;
CREATE TRIGGER trigger_notification_on_payment_success
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_on_payment_success();

-- Grant permissions
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
