import { useCallback, useEffect, useRef, useState } from "react";
import NavBar from "../../components/NavBar";
import { useGetFeed } from "../../hooks/posts/useGetFeed";
import { Loader2, Paperclip, RefreshCw, X } from "lucide-react";
import { useCheckAuth } from "../../hooks/auth/useCheckAuth";
import DefaultProfilePicture from "../../components/DefaultProfilePicture";
import Post from "../../components/Post";
import { useCreatePost } from "../../hooks/posts/useCreatePost";

export default function HomePage() {
    const { feed, getFeed, loadMore, error, isLoading, hasMore } = useGetFeed();
    const { createPost, isLoading: isPosting } = useCreatePost();
    const { state } = useCheckAuth();
    const observerRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [text, setText] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);

    useEffect(() => {
        getFeed();
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading) {
                    loadMore();
                }
            },
            { threshold: 0.5 },
        );

        if (observerRef.current) {
            observer.observe(observerRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, isLoading, loadMore]);

    useEffect(() => {
        return () => {
            previews.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [previews]);

    const handleRefresh = useCallback(() => {
        getFeed();
    }, [getFeed]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() && files.length === 0) return;

        try {
            await createPost(text, files);
            setText("");
            setFiles([]);
            setPreviews([]);
            handleRefresh();
        } catch (err) {
            console.error("Failed to post:", err);
        }
    };

    return (
        <div className="flex min-h-screen w-full justify-center">
            <NavBar />
            <div className="flex-1 max-w-2xl border-x border-zinc-200 dark:border-zinc-800 min-h-screen pb-16 md:pb-0">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 p-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                            Home
                        </h1>
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 disabled:opacity-50 cursor-pointer"
                        >
                            <RefreshCw
                                className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
                            />
                        </button>
                    </div>
                </div>

                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <form
                        onSubmit={handleSubmit}
                        className="flex items-start gap-3 border-b border-zinc-200 dark:border-zinc-800 py-3"
                    >
                        {state.user?.profile_picture_url ? (
                            <img
                                src={state?.user?.profile_picture_url}
                                alt="profile"
                                className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                            />
                        ) : (
                            <DefaultProfilePicture
                                username={state?.user?.username}
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === "Enter" &&
                                    !e.shiftKey &&
                                    handleSubmit(e)
                                }
                                placeholder="What's happening?"
                                className="w-full bg-transparent text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 resize-none focus:outline-none text-lg"
                                rows={3}
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

                            <div className="flex items-center justify-between mt-3">
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
                                            isPosting || files.length >= 4
                                        }
                                        className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-blue-500 dark:text-blue-400 disabled:opacity-50 cursor-pointer"
                                    >
                                        <Paperclip className="w-5 h-5" />
                                    </button>
                                </div>
                                <button
                                    disabled={
                                        (!text.trim() && files.length === 0) ||
                                        isPosting
                                    }
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2 transition-colors"
                                >
                                    {isPosting && (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    )}
                                    Post
                                </button>
                            </div>
                        </div>
                    </form>

                    <div className="mt-4">
                        {error && (
                            <div className="p-4 text-center text-red-600 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        {feed?.posts.length === 0 && !isLoading && (
                            <div className="p-8 text-center">
                                <p className="text-zinc-600 dark:text-zinc-400">
                                    No posts yet. Be the first to post!
                                </p>
                            </div>
                        )}

                        {feed?.posts.map((post) => (
                            <Post key={post.id} post={post} />
                        ))}

                        {isLoading && (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                            </div>
                        )}

                        {hasMore && !isLoading && (
                            <div ref={observerRef} className="h-10"></div>
                        )}

                        {!hasMore && feed?.posts && feed.posts.length > 0 && (
                            <div className="p-8 text-center">
                                <p className="text-zinc-600 dark:text-zinc-400">
                                    You've reached the end of the feed
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
