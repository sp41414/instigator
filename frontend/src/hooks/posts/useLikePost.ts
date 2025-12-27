import { useState } from "react";
import axios from "axios";
import { API_URL } from "../auth/useAuth";

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
                ? `${API_URL}/posts/${postId}/comments/${commentId}/like`
                : `${API_URL}/posts/${postId}/like`;

            const response = await axios.post(
                url,
                {},
                { withCredentials: true },
            );
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
