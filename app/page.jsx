import LandingUi from '../components/LandingUi';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: {
    absolute: 'ClaukkPOS | Sell Smarter. Manage Better. Grow Faster.',
  },

  description:
    'Run your business with ClaukkPOS — a powerful POS and inventory management system. Process sales, track stock, scan barcodes, manage employees and accept cash or mobile money, all from one platform.',

  keywords: [
    'ClaukkPOS',
    'POS software',
    'Point of sale system',
    'Inventory management software',
    'Retail POS software',
    'Stock management',
    'Sales management',
    'Barcode scanning POS',
    'POS software Ghana',
    'Inventory management Ghana',
    'Mobile money POS',
  ],

  openGraph: {
    title: 'ClaukkPOS | Sell Smarter. Manage Better. Grow Faster.',
    description:
      'Simplify your business operations with smarter sales, inventory, barcode scanning, staff management and mobile money payments.',
    type: 'website',
    siteName: 'ClaukkPOS',
    url: 'https://pos.claukk.com',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'ClaukkPOS | Sell Smarter. Manage Better. Grow Faster.',
    description:
      'Manage sales, inventory, staff and payments with ClaukkPOS. Everything your retail business needs in one platform.',
  },

  alternates: {
    canonical: 'https://pos.claukk.com',
  },
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in users go straight to the dashboard.
  // This runs on the server, so no landing-page flash.
  if (user) {
    redirect('/dashboard');
  }

  return (
    <>
      <LandingUi />

      {/* JSON-LD structured data for rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'ClaukkPOS',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'Point of sale, inventory and sales management for modern retail.',
            offers: [
              {
                '@type': 'Offer',
                price: '10',
                priceCurrency: 'GHS',
                name: '24-hour trial',
              },
              {
                '@type': 'Offer',
                price: '199',
                priceCurrency: 'GHS',
                name: '30 days',
              },
            ],
          }),
        }}
      />
    </>
  );
}