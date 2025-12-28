import { useState } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import { api } from "../../utils/axios";
import { useAuth } from "../auth/useAuth";

export const useUpdateProfilePicture = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { dispatch } = useAuth();

    const updateProfilePicture = async (file: File) => {
        setIsLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await api.put(`/users/me/avatar`, formData);

            if (response.data.data.url) {
                dispatch({
                    type: "UPDATE_USER",
                    payload: { profile_picture_url: response.data.data.url },
                });
            }

            return response.data.data.url;
        } catch (err: any) {
            const errorMessage = parseErrorMessage(
                err.response?.data?.message ||
                    "Failed to update profile picture",
            );
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return { updateProfilePicture, isLoading, error };
};
