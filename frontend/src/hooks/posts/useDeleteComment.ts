import { useState } from "react";
import axios from "axios";
import { API_URL } from "../auth/useAuth";
import { parseErrorMessage } from "../../utils/parseError";

export const useDeleteComment = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteComment = async (postId: string, commentId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.delete(
                `${API_URL}/posts/${postId}/comments/${commentId}`,
                { withCredentials: true },
            );
            return response.data;
        } catch (err: any) {
            const msg = parseErrorMessage(
                err.response?.data?.message || "Failed to delete comment",
            );
            setError(msg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { deleteComment, isLoading, error };
};
