import React, { useEffect, useState } from 'react';
import { DataProvider } from '@plasmicapp/host';
import { marked } from 'marked'; // 1. Import marked

export function BlogProvider({ children, apiEndpoint, className }: any) {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!apiEndpoint) return;

        let baseUrl = apiEndpoint;
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = `https://${baseUrl}`;
        }
        baseUrl = baseUrl.replace(/\/$/, '');

        fetch(`${baseUrl}/api/posts`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then(async (data) => {
                if (Array.isArray(data)) {
                    const postsWithContent = await Promise.all(data.map(async (post) => {
                        try {
                            const contentRes = await fetch(post.url);
                            // 2. Get the raw markdown
                            const rawMarkdown = contentRes.ok ? await contentRes.text() : "Content could not be loaded.";

                            // 3. Convert it to HTML safely
                            const htmlContent = await marked.parse(rawMarkdown);

                            // 4. Store the HTML string instead of raw markdown
                            return { ...post, content: htmlContent };
                        } catch (e) {
                            return { ...post, content: "Error fetching content." };
                        }
                    }));

                    setPosts(postsWithContent);
                } else {
                    console.error("Blog API did not return an array:", data);
                    setPosts([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load posts:", err);
                setLoading(false);
            });
    }, [apiEndpoint]);

    return (
        <DataProvider name="posts" data={posts}>
            <DataProvider name="postsLoading" data={loading}>
                <div className={className} style={{ display: 'contents' }}>
                    {children}
                </div>
            </DataProvider>
        </DataProvider>
    );
}