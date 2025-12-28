import { useState } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import { api } from "../../utils/axios";

export const useUpdateFollowStatus = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateFollowStatus = async (
        followId: string,
        status: "ACCEPTED" | "REFUSED",
    ) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.patch(`/follows/${followId}`, {
                status,
            });

            return response.data.data.follow;
        } catch (err: any) {
            const errorMessage = parseErrorMessage(
                err.response?.data?.message || "Failed to update follow status",
            );
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return { updateFollowStatus, isLoading, error };
};
