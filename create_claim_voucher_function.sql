-- =============================================
-- STORED PROCEDURE: claim_voucher
-- =============================================
-- This function handles the voucher claim process
-- Returns: JSON with success status and message

CREATE OR REPLACE FUNCTION claim_voucher(
    p_user_id UUID,
    p_voucher_code VARCHAR
)
RETURNS JSON AS $$
DECLARE
    v_voucher_id UUID;
    v_expired TIMESTAMP WITH TIME ZONE;
    v_max_claims INTEGER;
    v_current_claims INTEGER;
    v_already_claimed BOOLEAN;
BEGIN
    -- 1. Check if voucher exists and get details
    SELECT id, expired, max_claims, current_claims
    INTO v_voucher_id, v_expired, v_max_claims, v_current_claims
    FROM voucher
    WHERE voucher = p_voucher_code;

    -- If voucher not found
    IF v_voucher_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Kode voucher tidak valid'
        );
    END IF;

    -- 2. Check if voucher is expired
    IF v_expired < NOW() THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Voucher sudah kadaluarsa'
        );
    END IF;

    -- 3. Check if user already claimed this voucher
    SELECT EXISTS(
        SELECT 1 FROM user_vouchers
        WHERE user_id = p_user_id AND voucher_id = v_voucher_id
    ) INTO v_already_claimed;

    IF v_already_claimed THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Anda sudah pernah claim voucher ini'
        );
    END IF;

    -- 4. Check if voucher has reached max claims (NULL = unlimited)
    IF v_max_claims IS NOT NULL AND v_current_claims >= v_max_claims THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Voucher sudah habis diklaim'
        );
    END IF;

    -- 5. Insert into user_vouchers
    INSERT INTO user_vouchers (user_id, voucher_id, claimed_at, used)
    VALUES (p_user_id, v_voucher_id, NOW(), false);

    -- 6. Update current_claims in voucher table
    UPDATE voucher
    SET current_claims = current_claims + 1,
        updated_at = NOW()
    WHERE id = v_voucher_id;

    -- Return success
    RETURN json_build_object(
        'success', true,
        'message', 'Voucher berhasil diklaim!',
        'voucher_id', v_voucher_id
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Terjadi kesalahan: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION claim_voucher(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_voucher(UUID, VARCHAR) TO anon;
