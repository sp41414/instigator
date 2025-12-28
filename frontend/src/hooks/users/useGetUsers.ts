import { useState, useCallback } from "react";
import { api } from "../../utils/axios";
import { parseErrorMessage } from "../../utils/parseError";

export interface UserWithStatus {
    id: number;
    username: string;
    profile_picture_url: string | null;
    aboutMe: string | null;
    _count: {
        posts: number;
        sentFollows: number;
        receivedFollows: number;
    };
    followStatus: {
        id: string;
        status: "PENDING" | "ACCEPTED" | "REFUSED" | "BLOCKED";
        senderId: number;
        recipientId: number;
    } | null;
}

interface GetUsersResponse {
    users: UserWithStatus[];
    nextCursor: number | null;
}

export const useGetUsers = () => {
    const [users, setUsers] = useState<UserWithStatus[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [nextCursor, setNextCursor] = useState<number | null>(null);

    const getUsers = useCallback(
        async (cursor?: number, limit: number = 20, search?: string) => {
            setIsLoading(true);
            setError(null);

            try {
                const params = new URLSearchParams();
                params.append("limit", limit.toString());
                if (cursor) {
                    params.append("cursor", cursor.toString());
                }
                if (search) {
                    params.append("search", search);
                }

                const response = await api.get(`/users?${params.toString()}`, {
                    withCredentials: true,
                });

                const data: GetUsersResponse = response.data?.data;

                setUsers((prev) => {
                    if (!prev || !cursor) {
                        return data.users;
                    } else {
                        return [...prev, ...data.users];
                    }
                });

                setNextCursor(data.nextCursor);
                setHasMore(
                    data.users.length === limit && data.nextCursor !== null,
                );
            } catch (err: any) {
                setError(
                    parseErrorMessage(
                        err.response?.data?.message || "Failed to load users",
                    ),
                );
            } finally {
                setIsLoading(false);
            }
        },
        [],
    );

    const loadMore = useCallback(() => {
        if (nextCursor && !isLoading && hasMore) {
            getUsers(nextCursor);
        }
    }, [nextCursor, isLoading, hasMore, getUsers]);

    const refresh = useCallback(() => {
        getUsers();
    }, [getUsers]);

    return {
        users,
        getUsers,
        loadMore,
        refresh,
        error,
        isLoading,
        hasMore,
        nextCursor,
    };
};
