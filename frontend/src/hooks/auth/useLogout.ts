import { useState } from "react";
import { API_URL, useAuth } from "./useAuth";
import axios from "axios";
import { parseErrorMessage } from "../../utils/parseError";

export const useLogout = () => {
    const { dispatch } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const logout = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post(
                `${API_URL}/auth/logout`,
                {},
                { withCredentials: true },
            );

            dispatch({ type: "LOGOUT" });
            return response.data;
        } catch (err: any) {
            setError(parseErrorMessage(err.response?.data.message));
            throw err;
        }
    };

    return { logout, isLoading, error };
};
