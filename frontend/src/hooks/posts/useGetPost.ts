import { useState, useCallback } from "react";
import axios from "axios";
import { API_URL } from "../auth/useAuth";
import { parseErrorMessage } from "../../utils/parseError";
import type { Post } from "./useGetFeed";

export interface Comment {
    id: string;
    text: string | null;
    createdAt: string;
    updatedAt: string;
    file_urls: string[];
    user: {
        id: number;
        username: string;
        profile_picture_url: string | null;
        createdAt: string;
        aboutMe: string | null;
    };
    likes: { id: string }[];
    _count: {
        likes: number;
    };
}

export const useGetPost = () => {
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);

    const getPost = useCallback(
        async (postId: string, cursor?: string, limit: number = 10) => {
            if (cursor) {
                setIsLoadingMore(true);
            } else {
                setIsLoading(true);
            }
            setError(null);
            try {
                const params = new URLSearchParams();
                params.append("limit", limit.toString());
                if (cursor) {
                    params.append("cursor", cursor);
                }

                const response = await axios.get(
                    `${API_URL}/posts/${postId}?${params.toString()}`,
                    {
                        withCredentials: true,
                    },
                );

                const data = response.data.data;

                if (!cursor) {
                    setPost(data.post);
                    setComments(data.comments);
                } else {
                    setComments((prev) => [...prev, ...data.comments]);
                }

                setNextCursor(data.nextCursor);
                setHasMore(
                    data.comments.length === limit && data.nextCursor !== null,
                );
            } catch (err: any) {
                const msg = parseErrorMessage(
                    err.response?.data?.message || "Could not find post",
                );
                setError(msg);
            } finally {
                setIsLoading(false);
                setIsLoadingMore(false);
            }
        },
        [],
    );

    const loadMoreComments = useCallback(
        (postId: string) => {
            if (nextCursor && !isLoadingMore && hasMore) {
                getPost(postId, nextCursor);
            }
        },
        [nextCursor, isLoadingMore, hasMore, getPost],
    );

    return {
        post,
        comments,
        getPost,
        loadMoreComments,
        isLoading,
        isLoadingMore,
        error,
        setPost,
        setComments,
        hasMore,
    };
};
