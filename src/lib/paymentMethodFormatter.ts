/**
 * Format payment method code to display name
 * @param method - Payment method code (e.g., "BRIVA", "MANDIRIVA", "BCAVA", "QRIS")
 * @returns Formatted payment method name
 */
export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return '-';

  const methodUpper = method.toUpperCase().trim();

  // Mapping payment methods to display names
  const methodMap: Record<string, string> = {
    // Virtual Accounts
    'BRIVA': 'Virtual Account BRI',
    'MANDIRIVA': 'Virtual Account Mandiri',
    'BCAVA': 'Virtual Account BCA',
    'BNIVA': 'Virtual Account BNI',
    'PERMATAVA': 'Virtual Account Permata',
    'CIMBVA': 'Virtual Account CIMB Niaga',
    'MYBVA': 'Virtual Account Maybank',
    'BSIVA': 'Virtual Account BSI',
    'BTPNVA': 'Virtual Account BTPN',
    'DANAMONVA': 'Virtual Account Danamon',

    // E-Wallets
    'OVO': 'OVO',
    'GOPAY': 'GoPay',
    'DANA': 'DANA',
    'SHOPEEPAY': 'ShopeePay',
    'LINKAJA': 'LinkAja',

    // QRIS
    'QRIS': 'QRIS',
    'QRISC': 'QRIS',
    'QRISCPM': 'QRIS',
  };

  // Return mapped name or original if not found in map
  return methodMap[methodUpper] || method;
}
