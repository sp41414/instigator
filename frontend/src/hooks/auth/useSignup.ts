import { useState } from "react";
import { useAuth, API_URL } from "./useAuth";
import axios from "axios";
import { parseErrorMessage } from "../../utils/parseError";

export const useSignup = () => {
    const { dispatch } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const signup = async (username: string, password: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post(
                `${API_URL}/auth/signup`,
                { username, password },
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                    withCredentials: true,
                },
            );

            dispatch({
                type: "LOGIN_SUCCESS",
                payload: response.data.data.user,
            });

            return response.data;
        } catch (err: any) {
            setError(parseErrorMessage(err.response?.data.message));
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { signup, error, isLoading };
};
