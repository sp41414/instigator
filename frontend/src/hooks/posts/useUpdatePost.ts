import { useState } from "react";
import axios from "axios";
import { API_URL } from "../auth/useAuth";
import { parseErrorMessage } from "../../utils/parseError";

export const useUpdatePost = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updatePost = async (postId: string, text: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.put(
                `${API_URL}/posts/${postId}`,
                { text },
                { withCredentials: true },
            );
            return response.data.data.post;
        } catch (err: any) {
            setError(parseErrorMessage(err.response?.data.message));
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { updatePost, isLoading, error };
};
