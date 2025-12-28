import { useState } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import { api } from "../../utils/axios";

export const useDeleteComment = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteComment = async (postId: string, commentId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.delete(
                `/posts/${postId}/comments/${commentId}`,
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
