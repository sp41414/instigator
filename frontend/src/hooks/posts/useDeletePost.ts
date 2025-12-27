import { useState } from "react";
import axios from "axios";
import { API_URL } from "../auth/useAuth";
import { parseErrorMessage } from "../../utils/parseError";

export const useDeletePost = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deletePost = async (postId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await axios.delete(`${API_URL}/posts/${postId}`, {
                withCredentials: true,
            });
            return true;
        } catch (err: any) {
            setError(parseErrorMessage(err.response?.data.message));
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { deletePost, isLoading, error };
};
