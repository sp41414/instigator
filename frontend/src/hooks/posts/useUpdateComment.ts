import { useState } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import { api } from "../../utils/axios";

export const useUpdateComment = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateComment = async (
        postId: string,
        commentId: string,
        text: string,
    ) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.put(
                `/posts/${postId}/comments/${commentId}`,
                { text },
            );
            return response.data.data.comment;
        } catch (err: any) {
            const msg = parseErrorMessage(
                err.response?.data?.message || "Failed to update comment",
            );
            setError(msg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { updateComment, isLoading, error };
};
