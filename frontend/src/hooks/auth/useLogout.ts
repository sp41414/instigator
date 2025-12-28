import { useState } from "react";
import { useAuth } from "./useAuth";
import { parseErrorMessage } from "../../utils/parseError";
import { api } from "../../utils/axios";

export const useLogout = () => {
    const { dispatch } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const logout = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.post(`/auth/logout`);

            dispatch({ type: "LOGOUT" });
            return response.data;
        } catch (err: any) {
            setError(parseErrorMessage(err.response?.data.message));
            throw err;
        }
    };

    return { logout, isLoading, error };
};
