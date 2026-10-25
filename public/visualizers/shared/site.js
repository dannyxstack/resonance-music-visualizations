// Public launch settings. Never put API keys or private verification documents here.
export const site = Object.freeze({
  name: 'BeatLuma',
  url: 'https://beatluma.com',
  studio: 'Novakite Studio',
  studioUrl: 'https://novakitestudio.com',
  supportEmail: '', // Suggested: support@beatluma.com. Set only after the mailbox/forwarding works.
  legalName: '', // Optional PUBLIC operator name. Do not put private Dodo KYC documents/details here.
  abn: '', // TODO: Paste your actual 11-digit ABN here; blank values are not published.
  updated: '2026-10-25',
  currency: 'USD',
  proMonthlyPrice: 7.99,
  paidPurchasesEnabled: false, // Dodo onboarding and payment integration are a separate step.
});

// These limits match server/main.go. Changes must be coordinated with the API policy.
export const plans = Object.freeze([
  { id: 'guest', maxSeconds: 30, maxWidth: 1280, watermark: true, maxProjects: 0 },
  { id: 'free', maxSeconds: 300, maxWidth: 1280, watermark: true, maxProjects: 3, monthlyExports: 3 },
  { id: 'pro', maxSeconds: 0, maxWidth: 1920, watermark: false, maxProjects: 100 },
]);

export const launchGaps = () => [
  ...(!site.supportEmail ? ['monitored support email'] : []),
  ...(!/^\d{11}$/.test(site.abn.replace(/\s/g, '')) ? ['ABN'] : []),
];
