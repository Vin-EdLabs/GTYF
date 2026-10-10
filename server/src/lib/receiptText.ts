import { fillTemplate } from '@gtyf/shared';
import type { SiteSettings } from '@gtyf/shared/content';

/**
 * The receipt's wording, from the editable site settings (Admin → Website →
 * Donation & thank-you text), so the web page, PDF and email always agree.
 */
export interface ReceiptWords {
  title: string;
  receivedFrom: string;
  thankYou: string;
  signOff: string;
}

export function receiptWords(settings: SiteSettings, firstName: string): ReceiptWords {
  const vars = { name: firstName, org: settings.organisation.name };
  return {
    title: settings.thanks.receiptTitle,
    receivedFrom: settings.thanks.receivedFrom,
    thankYou: fillTemplate(settings.thanks.message, vars),
    signOff: fillTemplate(settings.thanks.signOff, vars),
  };
}
