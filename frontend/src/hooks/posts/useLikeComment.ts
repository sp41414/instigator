import { useState } from "react";
import { api } from "../../utils/axios";

export const useLikeComment = () => {
    const [isLoading, setIsLoading] = useState(false);

    const toggleLikeComment = async (postId: string, commentId: string) => {
        setIsLoading(true);
        try {
            const response = await api.post(
                `/posts/${postId}/comments/${commentId}/like`,
            );
            return response.data.data.liked;
        } catch (err) {
            console.error("Like comment error:", err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { toggleLikeComment, isLoading };
};
