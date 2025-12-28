import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import NavBar from "../../components/NavBar";
import Post from "../../components/Post";
import Comment from "../../components/Comment";
import DefaultProfilePicture from "../../components/DefaultProfilePicture";
import { useGetPost } from "../../hooks/posts/useGetPost";
import { useCreateComment } from "../../hooks/posts/useCreateComment";
import { useAuth } from "../../hooks/auth/useAuth";
import { Loader2, ArrowLeft, Paperclip, X } from "lucide-react";

export default function PostPage() {
    const { id } = useParams<{ id: string }>();
    const {
        post,
        comments,
        getPost,
        loadMoreComments,
        isLoading,
        isLoadingMore,
        error,
        hasMore,
    } = useGetPost();
    const {
        createComment,
        isLoading: isCommenting,
        error: commentError,
    } = useCreateComment();
    const { state } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [commentText, setCommentText] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    useEffect(() => {
        if (id) {
            getPost(id);
        }
    }, [id, getPost]);

    useEffect(() => {
        return () => {
            previews.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [previews]);

    const handleRefresh = useCallback(() => {
        if (id) {
            getPost(id);
        }
    }, [id, getPost]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            const combinedFiles = [...files, ...newFiles].slice(0, 4);

            setFiles(combinedFiles);

            const newPreviews = combinedFiles.map((file) =>
                URL.createObjectURL(file),
            );
            setPreviews(newPreviews);
        }
    };

    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        const newPreviews = previews.filter((_, i) => i !== index);
        setFiles(newFiles);
        setPreviews(newPreviews);
    };

    const handleSubmitComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!commentText.trim() && files.length === 0) || !id) return;

        try {
            await createComment(id, commentText, files);
            setCommentText("");
            setFiles([]);
            setPreviews([]);
            handleRefresh();
        } catch (err) {
            console.error("Failed to post comment:", err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen w-full justify-center">
                <NavBar />
                <div className="flex-1 max-w-2xl border-x border-zinc-200 dark:border-zinc-800 min-h-screen flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="flex min-h-screen w-full justify-center">
                <NavBar />
                <div className="flex-1 max-w-2xl border-x border-zinc-200 dark:border-zinc-800 min-h-screen p-8 text-center">
                    <p className="text-red-600 dark:text-red-400 mb-4">
                        {error || "Post not found"}
                    </p>
                    <Link
                        to="/"
                        className="text-blue-600 hover:underline inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full justify-center">
            <NavBar />
            <div className="flex-1 max-w-2xl border-x border-zinc-200 dark:border-zinc-800 min-h-screen pb-16 md:pb-0">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/"
                            className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                            Post
                        </h1>
                    </div>
                </div>

                <div className="border-b border-zinc-200 dark:border-zinc-800">
                    <Post post={post} />
                </div>

                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <form onSubmit={handleSubmitComment}>
                        <div className="flex gap-3">
                            <div className="shrink-0">
                                {state.user?.profile_picture_url ? (
                                    <img
                                        src={state.user.profile_picture_url}
                                        alt="profile"
                                        className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                                    />
                                ) : (
                                    <DefaultProfilePicture
                                        username={state.user?.username}
                                    />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                {commentError && (
                                    <div className="text-center text-red-600 dark:text-red-400">
                                        {commentError}
                                    </div>
                                )}
                                <textarea
                                    value={commentText}
                                    onChange={(e) =>
                                        setCommentText(e.target.value)
                                    }
                                    onKeyDown={(e) =>
                                        e.key === "Enter" &&
                                        !e.shiftKey &&
                                        handleSubmitComment(e)
                                    }
                                    placeholder="Post your reply"
                                    className="w-full bg-transparent text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 resize-none focus:outline-none text-lg min-h-12"
                                    rows={2}
                                />

                                {previews.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                                        {previews.map((url, index) => (
                                            <div
                                                key={index}
                                                className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 group"
                                            >
                                                <img
                                                    src={url}
                                                    alt="preview"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeFile(index)
                                                    }
                                                    className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <p
                                    className={`text-end mb-4 ${commentText.length >= 400 ? "text-red-600 dark:text-red-400" : "text-zinc-600 dark:text-zinc-400"}`}
                                >
                                    {`${commentText.length}/400`}
                                </p>

                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            multiple
                                            ref={fileInputRef}
                                            className="hidden"
                                            onChange={handleFileSelect}
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            disabled={
                                                isCommenting ||
                                                files.length >= 4
                                            }
                                            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-blue-500 dark:text-blue-400 disabled:opacity-50 cursor-pointer"
                                        >
                                            <Paperclip className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <button
                                        disabled={
                                            (!commentText.trim() &&
                                                files.length === 0) ||
                                            isCommenting
                                        }
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 transition-colors"
                                    >
                                        {isCommenting && (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        )}
                                        Reply
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div>
                    {comments.map((comment) => (
                        <Comment
                            key={comment.id}
                            comment={comment}
                            postId={post.id}
                        />
                    ))}

                    {hasMore && (
                        <div className="p-4 flex justify-center">
                            <button
                                onClick={() => id && loadMoreComments(id)}
                                disabled={isLoadingMore}
                                className="text-blue-600 hover:underline disabled:opacity-50 cursor-pointer flex items-center gap-2"
                            >
                                {isLoadingMore && (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                )}
                                Show more replies
                            </button>
                        </div>
                    )}

                    {!hasMore && comments.length > 0 && (
                        <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                            End of replies
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
