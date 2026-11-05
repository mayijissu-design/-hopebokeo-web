import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Dynamically generates a Data URL (base64 PNG) for a given text or donation link payload.
 */
export async function generateQRCodeDataUrl(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  if (!text || text.trim() === '') {
    throw new Error('QR code text payload cannot be empty');
  }

  const defaultOptions: QRCodeOptions = {
    width: options.width || 300,
    margin: options.margin ?? 2,
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#ffffff',
    },
  };

  try {
    const dataUrl = await QRCode.toDataURL(text, defaultOptions);
    return dataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Dynamically generates an SVG string for a given text or donation link payload.
 */
export async function generateQRCodeSVG(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  if (!text || text.trim() === '') {
    throw new Error('QR code text payload cannot be empty');
  }

  const defaultOptions: QRCodeOptions = {
    width: options.width || 300,
    margin: options.margin ?? 2,
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#ffffff',
    },
  };

  try {
    const svgString = await QRCode.toString(text, {
      ...defaultOptions,
      type: 'svg',
    });
    return svgString;
  } catch (error) {
    console.error('Error generating SVG QR code:', error);
    throw error;
  }
}

/**
 * Formats bank account details into a standardized donation link / QR payload with optional amount.
 * If a custom donation link or BCEL One deep link is provided, it returns that.
 * Otherwise, it formats bank name, account number, account name, amount, and currency into a standard payload string.
 */
export function formatDonationPayload(params: {
  accountNumber: string;
  bankName?: string;
  accountName?: string;
  amount?: number | string;
  currency?: string;
  note?: string;
  donationLink?: string;
  qrPayload?: string;
}): string {
  if (params.donationLink && params.donationLink.trim() !== '') {
    let link = params.donationLink.trim();
    if (params.amount && Number(params.amount) > 0) {
      link = link.replace(/\{amount\}/g, String(params.amount));
    }
    return link;
  }
  if (params.qrPayload && params.qrPayload.trim() !== '') {
    let payload = params.qrPayload.trim();
    if (params.amount && Number(params.amount) > 0) {
      payload = payload.replace(/\{amount\}/g, String(params.amount));
    }
    return payload;
  }

  // Format clean payload string
  const bank = params.bankName ? params.bankName.trim() : 'Bank';
  const accNo = params.accountNumber ? params.accountNumber.trim() : '';
  const accName = params.accountName ? params.accountName.trim() : '';
  const amt = params.amount && Number(params.amount) > 0 ? Number(params.amount) : null;
  const cur = params.currency || 'LAK';
  const note = params.note ? params.note.trim() : '';

  if (!accNo) return '';

  let result = `DONATION|BANK:${bank}|ACC:${accNo}|NAME:${accName}`;
  if (amt) {
    result += `|AMOUNT:${amt}|CUR:${cur}`;
  }
  if (note) {
    result += `|NOTE:${note}`;
  }

  return result;
}
