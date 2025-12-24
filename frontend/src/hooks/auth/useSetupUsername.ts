import { useState } from "react";
import { useAuth, API_URL } from "./useAuth";
import { parseErrorMessage } from "../../utils/parseError";
import axios from "axios";

export const useSetupUsername = () => {
    const { dispatch } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const setupUsername = async (username: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post(
                `${API_URL}/auth/setup-username`,
                { username },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    withCredentials: true,
                },
            );

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
