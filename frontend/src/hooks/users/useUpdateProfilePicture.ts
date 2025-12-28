import { useState } from "react";
import axios from "axios";
import { API_URL } from "../auth/useAuth";
import { parseErrorMessage } from "../../utils/parseError";
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

            const response = await axios.put(
                `${API_URL}/users/me/avatar`,
                formData,
                {
                    withCredentials: true,
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                },
            );

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
