import { useState } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import { useAuth } from "../auth/useAuth";
import { api } from "../../utils/axios";

export const useDeleteAccount = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { dispatch } = useAuth();

    const deleteAccount = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await api.delete(`/users/me`);

            dispatch({ type: "LOGOUT" });
        } catch (err: any) {
            const errorMessage = parseErrorMessage(
                err.response?.data?.message || "Failed to delete account",
            );
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return { deleteAccount, isLoading, error };
};
