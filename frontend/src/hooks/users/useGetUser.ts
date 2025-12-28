import { useState } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import type { Post } from "../posts/useGetFeed";
import { api } from "../../utils/axios";

interface UserProfile {
    user: {
        id: number;
        username: string;
        profile_picture_url?: string;
        email?: string;
        aboutMe?: string;
        _count?: {
            posts: number;
            sentFollows: number;
            receivedFollows: number;
        };
    };
    posts: Post[];
    nextCursor?: string | null;
    followStatus?: {
        id: string;
        status: "PENDING" | "ACCEPTED" | "REFUSED" | "BLOCKED";
        senderId: number;
        recipientId: number;
    } | null;
}

export function useGetUser() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function getUser(id?: number, cursor?: string, limit: number = 10) {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.append("limit", limit.toString());
            if (cursor) {
                params.append("cursor", cursor);
            }

            let response;
            if (!id || isNaN(id) || id <= 0) {
                response = await api.get(`/users/me?${params.toString()}`);
            } else {
                response = await api.get(`/users/${id}?${params.toString()}`);
            }

            const data = response.data.data;
            setUser(data);
            return data;
        } catch (err: any) {
            setError(parseErrorMessage(err.response?.data.message));
            return null;
        } finally {
            setLoading(false);
        }
    }

    return { user, getUser, error, loading };
}
