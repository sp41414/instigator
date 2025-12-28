import { useState } from "react";
import { useAuth } from "./useAuth";
import { parseErrorMessage } from "../../utils/parseError";
import { api } from "../../utils/axios";

export const useSetupUsername = () => {
    const { dispatch } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const setupUsername = async (username: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.post(`/auth/setup-username`, {
                username,
            });

            dispatch({ type: "UPDATE_USER", payload: response.data.data.user });
            return response.data;
        } catch (err: any) {
            const errorMessage = parseErrorMessage(err.response?.data.message);
            setError(errorMessage);
            if (errorMessage.includes("don't need to set up a username")) {
                dispatch({ type: "NEEDS_USERNAME", payload: false });
            }
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { error, isLoading, setupUsername };
};
