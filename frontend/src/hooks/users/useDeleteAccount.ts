import { useState } from "react";
import axios from "axios";
import { API_URL } from "../auth/useAuth";
import { parseErrorMessage } from "../../utils/parseError";
import { useAuth } from "../auth/useAuth";

export const useDeleteAccount = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { dispatch } = useAuth();

    const deleteAccount = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await axios.delete(`${API_URL}/users/me`, {
                withCredentials: true,
            });

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
