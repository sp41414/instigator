import { useState } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import { api } from "../../utils/axios";

export const useDeleteFollow = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteFollow = async (followId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.delete(`/follows/${followId}`);

            return response.data.data.follow;
        } catch (err: any) {
            const errorMessage = parseErrorMessage(
                err.response?.data?.message || "Failed to delete follow",
            );
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return { deleteFollow, isLoading, error };
};
