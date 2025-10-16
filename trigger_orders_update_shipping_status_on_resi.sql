-- =============================================
-- TRIGGER: Auto-update orders.shipping_status when shipping_resi is set
-- =============================================

-- This trigger sets shipping_status to 'Sedang dikirim' when a real
-- tracking number (resi) is provided. It ignores placeholder/default
-- values like 'Pesanan belum dikirim ke jasa kirim'.

-- Create or replace the function (separate block to avoid nested $$ quoting)
CREATE OR REPLACE FUNCTION public.set_shipping_status_on_resi()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
DECLARE
  v_placeholder CONSTANT TEXT := 'Pesanan belum dikirim ke jasa kirim';
  v_resi TEXT;
  v_status TEXT;
BEGIN
  v_resi := COALESCE(NEW.shipping_resi, '');
  v_status := COALESCE(NEW.shipping_status, '');

  IF TG_OP = 'INSERT' THEN
    -- On insert, if resi is already set to a non-placeholder value, mark as shipped
    IF v_resi <> '' AND v_resi <> v_placeholder AND length(v_resi) >= 6
       AND v_status NOT IN ('Terkirim','terkirim','Delivered','delivered','Selesai','selesai') THEN
      NEW.shipping_status := 'Sedang dikirim';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only act when resi changed
    IF NEW.shipping_resi IS DISTINCT FROM OLD.shipping_resi THEN
      IF v_resi <> '' AND v_resi <> v_placeholder AND length(v_resi) >= 6
         AND v_status NOT IN ('Terkirim','terkirim','Delivered','delivered','Selesai','selesai') THEN
        NEW.shipping_status := 'Sedang dikirim';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$func$;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_shipping_status_on_resi'
  ) THEN
    CREATE TRIGGER trg_set_shipping_status_on_resi
    BEFORE INSERT OR UPDATE OF shipping_resi ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.set_shipping_status_on_resi();
  END IF;
END $$;
