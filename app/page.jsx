import LandingUi from '../components/LandingUi';

export const metadata = {
    title: 'ClaukkPOS — Point of sale you pay for by the day',
    description:
        'ClaukkPOS: POS, inventory and sales management for retail. GHS 10 per business day or GHS 299 for 30 days.',
    keywords: [
        'POS',
        'point of sale',
        'inventory',
        'retail',
        'Ghana',
        'mobile money',
        'Paystack',
        'ClaukkPOS',
    ],
    openGraph: {
        title: 'ClaukkPOS — Point of sale you pay for by the day',
        description:
            'POS, inventory and sales management for modern retail. Try it for GHS 10 a day.',
        type: 'website',
        siteName: 'ClaukkPOS',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'ClaukkPOS — Point of sale you pay for by the day',
        description:
            'POS, inventory and sales management for modern retail. Try it for GHS 10 a day.',
    },
};


export default function Home() {
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
                                price: '299',
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