import { useState } from "react";
import { parseErrorMessage } from "../../utils/parseError";
import { api } from "../../utils/axios";

export const useCreateComment = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // vercel limit, backend actually has 8MB
    const LIMIT = 4.5 * 1024 * 1024;

    const createComment = async (
        postId: string,
        text: string,
        files?: File[],
    ) => {
        if (files) {
            const totalSize =
                files.reduce((acc, file) => acc + file.size, 0) +
                new Blob([text]).size;

            if (totalSize > LIMIT) {
                setError("Total size exceeds 4MB limit.");
                return;
            }
        }

        setIsLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append("text", text);
            if (files && files.length > 0) {
                files.forEach((file) => {
                    formData.append("files", file);
                });
            }

            const response = await api.post(
                `/posts/${postId}/comments`,
                formData,
                {
                    withCredentials: true,
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                },
            );
            return response.data.data.comment;
        } catch (err: any) {
            const msg = parseErrorMessage(
                err.response?.data?.message || "Failed to post comment",
            );
            setError(msg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { createComment, isLoading, error };
};
