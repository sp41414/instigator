import { useState } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import { useAuth } from "../auth/useAuth";
import { api } from "../../utils/axios";

export const useUpdateProfile = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { dispatch } = useAuth();

    const updateProfile = async (data: {
        username?: string;
        about?: string;
        password?: string;
        email?: string;
    }) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.put(`/users/me`, data);

            if (response.data.data.user) {
                dispatch({
                    type: "UPDATE_USER",
                    payload: response.data.data.user,
                });
            }

            return response.data.data.user;
        } catch (err: any) {
            const errorMessage = parseErrorMessage(
                err.response?.data?.message || "Failed to update profile",
            );
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return { updateProfile, isLoading, error };
};
