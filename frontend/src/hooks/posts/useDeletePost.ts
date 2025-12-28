import { useState } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import { api } from "../../utils/axios";

export const useDeletePost = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deletePost = async (postId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await api.delete(`/posts/${postId}`);
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
