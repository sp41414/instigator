import { useCallback, useState } from "react";
import { API_URL } from "../auth/useAuth";
import axios from "axios";
import { parseErrorMessage } from "../../utils/parseError";

export interface Post {
    id: string;
    text: string | null;
    createdAt: string;
    updatedAt?: string;
    file_urls: string[];
    _count: {
        comments: number;
        likes: number;
    };
    user: {
        id: number;
        username: string;
        profile_picture_url: string | null;
    };
    likes: { id: string }[];
}

interface FeedData {
    posts: Post[];
    nextCursor: string | null;
}

export const useGetFeed = () => {
    const [feed, setFeed] = useState<FeedData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const getFeed = useCallback(async (cursor?: string, limit: number = 10) => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.append("limit", limit.toString());
            if (cursor) {
                params.append("cursor", cursor);
            }

            const response = await axios.get(
                `${API_URL}/posts?${params.toString()}`,
                { withCredentials: true },
            );

            const data = response.data?.data;

            setFeed((prev) => {
                if (!prev || !cursor) {
                    return data;
                } else {
                    return {
                        ...data,
                        posts: [...prev.posts, ...data.posts],
                    };
                }
            });

            setHasMore(data.posts.length === limit && data.nextCursor !== null);
        } catch (err: any) {
            setError(
                parseErrorMessage(
                    err.response?.data?.message || "Failed to load feed",
                ),
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadMore = useCallback(() => {
        if (feed?.nextCursor && !isLoading && hasMore) {
            getFeed(feed.nextCursor);
        }
    }, [feed?.nextCursor, isLoading, hasMore, getFeed]);

    const refreshFeed = useCallback(() => {
        getFeed();
    }, [getFeed]);

    return {
        feed,
        getFeed: refreshFeed,
        loadMore,
        error,
        isLoading,
        hasMore,
    };
};
