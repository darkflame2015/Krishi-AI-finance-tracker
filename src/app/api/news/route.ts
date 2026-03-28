import { NextResponse } from 'next/server';

export async function GET() {
    const apiKey = process.env.NEWS_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: 'News API key not configured' },
            { status: 500 }
        );
    }

    try {
        const response = await fetch(
            `https://newsapi.org/v2/everything?q=agriculture+farming+India+crop&language=en&sortBy=publishedAt&pageSize=20&apiKey=${apiKey}`,
            { next: { revalidate: 1800 } }
        );

        if (!response.ok) {
            throw new Error(`NewsAPI returned ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('News API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch news', articles: [] },
            { status: 500 }
        );
    }
}
