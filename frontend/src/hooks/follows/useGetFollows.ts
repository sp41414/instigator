import { useState, useCallback } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import { api } from "../../utils/axios";

export interface FollowUser {
    id: number;
    username: string;
    aboutMe: string | null;
    profile_picture_url: string | null;
    createdAt: string;
}

export interface Follow {
    id: string;
    status?: "PENDING" | "ACCEPTED" | "REFUSED" | "BLOCKED";
    createdAt: string;
    acceptedAt?: string | null;
    sender?: FollowUser;
    recipient?: FollowUser;
    user?: FollowUser;
}

interface GetFollowsResponse {
    accepted: Follow[];
    blocked: Follow[];
    pending: Follow[];
    incoming: Follow[];
}

export const useGetFollows = () => {
    const [follows, setFollows] = useState<GetFollowsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const getFollows = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.get(`/follows`);

            const data: GetFollowsResponse = response.data?.data;
            setFollows(data);
        } catch (err: any) {
            setError(
                parseErrorMessage(
                    err.response?.data?.message || "Failed to load follows",
                ),
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { follows, getFollows, error, isLoading };
};
