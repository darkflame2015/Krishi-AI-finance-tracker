'use client';

import { useEffect, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { HiOutlineTrendingUp, HiOutlineRefresh } from 'react-icons/hi';
import styles from './crop-analytics.module.css';

interface Commodity {
    commodity: string;
    market: string;
    state: string;
    minPrice: number;
    maxPrice: number;
    modalPrice: number;
    date: string;
}

export default function CropAnalyticsPage() {
    const [commodities, setCommodities] = useState<Commodity[]>([]);
    const [loading, setLoading] = useState(true);
    const [source, setSource] = useState('');
    const [selectedCommodity, setSelectedCommodity] = useState<string | null>(null);
    const [message, setMessage] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/commodities');
            const data = await res.json();
            setCommodities(data.commodities || []);
            setSource(data.source || '');
            setMessage(data.message || '');
        } catch {
            console.error('Failed to fetch commodity data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Group commodities by name
    const grouped = commodities.reduce((acc, c) => {
        if (!acc[c.commodity]) acc[c.commodity] = [];
        acc[c.commodity].push(c);
        return acc;
    }, {} as Record<string, Commodity[]>);

    const commodityNames = Object.keys(grouped);
    const selected = selectedCommodity || commodityNames[0];
    const selectedData = grouped[selected] || [];

    // Create chart data from multiple markets
    const chartData = selectedData.map((c) => ({
        market: c.market?.substring(0, 12) || 'N/A',
        min: c.minPrice,
        max: c.maxPrice,
        modal: c.modalPrice,
    }));

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    return (
        <div className={styles.page}>
            <div className="page-header">
                <h1>Crop Analytics</h1>
                <p>Current market prices and valuation of agricultural commodities</p>
            </div>

            {message && (
                <div className={styles.notice}>
                    <p>{message}</p>
                </div>
            )}

            {commodities.length === 0 ? (
                <div className="empty-state">
                    <HiOutlineTrendingUp size={48} />
                    <h3>No Commodity Data</h3>
                    <p>Configure DATA_GOV_API_KEY in your .env.local file to fetch real-time commodity prices from data.gov.in</p>
                    <button className="btn btn-primary" onClick={fetchData}>
                        <HiOutlineRefresh /> Retry
                    </button>
                </div>
            ) : (
                <>
                    {/* Commodity Selector */}
                    <div className={styles.selector}>
                        {commodityNames.slice(0, 15).map((name) => (
                            <button
                                key={name}
                                className={`${styles.selectorBtn} ${selected === name ? styles.active : ''}`}
                                onClick={() => setSelectedCommodity(name)}
                            >
                                {name}
                            </button>
                        ))}
                    </div>

                    {/* Price Chart */}
                    {chartData.length > 0 && (
                        <div className={styles.chartCard}>
                            <h3>Price Comparison — {selected}</h3>
                            <p className={styles.chartSubtitle}>Across different markets (₹/quintal)</p>
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                                    <XAxis dataKey="market" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: 8, border: '1px solid var(--border-light)' }}
                                        formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                                    />
                                    <Line type="monotone" dataKey="min" stroke="var(--accent-blue)" strokeWidth={2} dot={{ r: 4 }} name="Min Price" />
                                    <Line type="monotone" dataKey="modal" stroke="var(--accent-green)" strokeWidth={2} dot={{ r: 4 }} name="Modal Price" />
                                    <Line type="monotone" dataKey="max" stroke="var(--accent-amber)" strokeWidth={2} dot={{ r: 4 }} name="Max Price" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Table */}
                    <div className={styles.tableSection}>
                        <h3>Market Prices — {selected}</h3>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Market</th>
                                        <th>State</th>
                                        <th>Min Price (₹)</th>
                                        <th>Modal Price (₹)</th>
                                        <th>Max Price (₹)</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedData.map((c, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 600 }}>{c.market}</td>
                                            <td>{c.state}</td>
                                            <td>₹{c.minPrice.toLocaleString('en-IN')}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>₹{c.modalPrice.toLocaleString('en-IN')}</td>
                                            <td>₹{c.maxPrice.toLocaleString('en-IN')}</td>
                                            <td>{c.date}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Source */}
                    {source && (
                        <div className={styles.sourceTag}>
                            Data source: {source}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
