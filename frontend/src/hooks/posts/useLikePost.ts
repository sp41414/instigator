import { useState } from "react";
import { api } from "../../utils/axios";

export const useLikePost = () => {
    const [isLoading, setIsLoading] = useState(false);

    const toggleLike = async (
        postId: string,
        isComment: boolean = false,
        commentId?: string,
    ) => {
        setIsLoading(true);
        try {
            const url = isComment
                ? `/posts/${postId}/comments/${commentId}/like`
                : `/posts/${postId}/like`;

            const response = await api.post(url);
            return response.data.data.liked;
        } catch (err) {
            console.error("Like error:", err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { toggleLike, isLoading };
};
