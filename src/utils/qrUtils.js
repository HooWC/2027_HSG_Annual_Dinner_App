/**
 * Parse QR payload: "Employee ID, Full Name"
 * Examples:
 *   A751, Hoo Weng Chin
 *   A751,Hoo Weng Chin
 */
export function parseEmployeeQr(raw) {
  const text = String(raw || '').trim();
  if (!text) {
    throw new Error('Empty QR code');
  }

  const commaIndex = text.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Invalid QR format. Expected: Employee ID, Full Name');
  }

  const employeeId = text.slice(0, commaIndex).trim();
  const fullName = text.slice(commaIndex + 1).trim();

  if (!employeeId || !fullName) {
    throw new Error('Invalid QR data. Missing Employee ID or Full Name');
  }

  return { employeeId, fullName };
}
