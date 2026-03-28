'use client';

import { useEffect, useState } from 'react';
import { HiOutlineExternalLink } from 'react-icons/hi';
import styles from './news.module.css';

interface Article {
    title: string;
    description: string;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    source: { name: string };
    author: string | null;
}

export default function NewsPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await fetch('/api/news');
                const data = await res.json();
                setArticles(data.articles || []);
            } catch {
                console.error('Failed to fetch news');
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, []);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner" /></div>;
    }

    return (
        <div className={styles.page}>
            <div className="page-header">
                <h1>Agriculture News</h1>
                <p>Latest news and updates from the agriculture sector</p>
            </div>

            {articles.length === 0 ? (
                <div className="empty-state">
                    <p>No news articles available. Please configure your NEWS_API_KEY in .env.local to fetch latest agriculture news.</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {articles.map((article, i) => (
                        <a
                            key={i}
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.card}
                        >
                            {article.urlToImage && (
                                <div className={styles.imageWrapper}>
                                    <img
                                        src={article.urlToImage}
                                        alt={article.title}
                                        className={styles.image}
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                </div>
                            )}
                            <div className={styles.content}>
                                <div className={styles.meta}>
                                    <span className={styles.source}>{article.source?.name}</span>
                                    <span className={styles.date}>{formatDate(article.publishedAt)}</span>
                                </div>
                                <h3 className={styles.title}>{article.title}</h3>
                                {article.description && (
                                    <p className={styles.desc}>{article.description}</p>
                                )}
                                <span className={styles.readMore}>
                                    Read more <HiOutlineExternalLink />
                                </span>
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
