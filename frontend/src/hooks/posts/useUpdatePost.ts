import { useState } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import { api } from "../../utils/axios";

export const useUpdatePost = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updatePost = async (postId: string, text: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.put(`/posts/${postId}`, { text });
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
