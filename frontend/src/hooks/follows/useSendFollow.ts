import { useState } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import { api } from "../../utils/axios";

export const useSendFollow = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sendFollow = async (recipientId: number) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.post(
                `/follows`,
                { recipientId },
                { withCredentials: true },
            );

            return response.data.data.follow;
        } catch (err: any) {
            const errorMessage = parseErrorMessage(
                err.response?.data?.message || "Failed to send follow request",
            );
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return { sendFollow, isLoading, error };
};
