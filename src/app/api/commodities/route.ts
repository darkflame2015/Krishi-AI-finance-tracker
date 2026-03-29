import { NextResponse } from 'next/server';

interface CommodityPrice {
    commodity: string;
    market: string;
    state: string;
    minPrice: number;
    maxPrice: number;
    modalPrice: number;
    date: string;
}

export async function GET() {
    try {
        // Using data.gov.in API for real commodity prices
        const apiKey = process.env.DATA_GOV_API_KEY;

        if (apiKey) {
            const response = await fetch(
                `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=100`,
                { next: { revalidate: 3600 } }
            );

            if (response.ok) {
                const data = await response.json();
                const records = (data.records && Array.isArray(data.records)) ? data.records : [];
                const commodities: CommodityPrice[] = records.map((r: Record<string, string>) => ({
                    commodity: r.commodity || r.Commodity || 'Unknown',
                    market: r.market || r.Market || 'Unknown',
                    state: r.state || r.State || 'Unknown',
                    minPrice: parseFloat(String(r.min_price || r.Min_x0020_Price || '0').replace(/,/g, '')),
                    maxPrice: parseFloat(String(r.max_price || r.Max_x0020_Price || '0').replace(/,/g, '')),
                    modalPrice: parseFloat(String(r.modal_price || r.Modal_x0020_Price || '0').replace(/,/g, '')),
                    date: r.arrival_date || r.Arrival_Date || new Date().toISOString().split('T')[0],
                }));
                return NextResponse.json({ commodities, source: 'data.gov.in' });
            }
        }

        // Fallback: return empty with message
        return NextResponse.json({
            commodities: [] as CommodityPrice[],
            source: 'none',
            message: 'Configure DATA_GOV_API_KEY in .env.local for real commodity data from data.gov.in',
        });
    } catch (error) {
        console.error('Commodities API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch commodity prices', commodities: [] },
            { status: 500 }
        );
    }
}
