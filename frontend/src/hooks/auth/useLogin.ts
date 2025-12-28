import axios from "axios";
import { useState } from "react";
import { useAuth } from "./useAuth";
import { parseErrorMessage } from "../../utils/parseError";
import { api } from "../../utils/axios";

export const useLogin = () => {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { dispatch } = useAuth();

    const login = async (username: string, password: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.post(`/auth/login`, {
                username,
                password,
            });

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

    return { error, isLoading, login };
};
