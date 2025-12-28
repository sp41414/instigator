import { useState } from "react";
import axios from "axios";
import { API_URL } from "../auth/useAuth";
import { parseErrorMessage } from "../../utils/parseError";

export const useDeleteFollow = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteFollow = async (followId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.delete(
                `${API_URL}/follows/${followId}`,
                { withCredentials: true },
            );

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
