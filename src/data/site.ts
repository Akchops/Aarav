/**
 * Brand and contact details. The single source for every page, the footer, the
 * Contact page and the contact function. These are the owner's own details,
 * given directly — do not edit without Aarav's say-so.
 */
export const site = {
  brand: 'Aarav',
  role: 'Website Builder',
  status: 'Taking new clients',

  email: 'aaravchopra1202@gmail.com',
  mailto: 'mailto:aaravchopra1202@gmail.com',

  // Displayed exactly as given.
  phoneDisplay: '9049512356',
  // ASSUMPTION — TODO: confirm with Aarav. The +91 (India) country code was not
  // stated; it was added so the link dials correctly from any country.
  phoneTel: 'tel:+919049512356',
  // ASSUMPTION — TODO: confirm with Aarav that this number is on WhatsApp, with +91.
  whatsapp: 'https://wa.me/919049512356',
} as const;
