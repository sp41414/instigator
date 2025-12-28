import { useState } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import { api } from "../../utils/axios";

export const useBlockUser = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const blockUser = async (userId: number) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.post(`/follows/${userId}/block`, {});

            return response.data.data.follow;
        } catch (err: any) {
            const errorMessage = parseErrorMessage(
                err.response?.data?.message || "Failed to block user",
            );
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return { blockUser, isLoading, error };
};
