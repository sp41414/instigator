import { useCallback, useEffect, useRef } from "react";
import NavBar from "../../components/NavBar";
import { useGetFeed } from "../../hooks/posts/useGetFeed";
import { Loader2, RefreshCw } from "lucide-react";
import { useCheckAuth } from "../../hooks/auth/useCheckAuth";
import DefaultProfilePicture from "../../components/DefaultProfilePicture";
import Post from "../../components/Post";

export default function HomePage() {
    const { feed, getFeed, loadMore, error, isLoading, hasMore } = useGetFeed();
    const { state } = useCheckAuth();
    const observerRef = useRef<HTMLDivElement | null>(null);

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

    const handleRefresh = useCallback(() => {
        getFeed();
    }, [getFeed]);

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

                {/* TODO: Create post form */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-start gap-3">
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
                        <div className="flex-1">
                            <textarea
                                placeholder="What's happening?"
                                className="w-full bg-transparent text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 resize-none focus:outline-none text-lg"
                                rows={3}
                                disabled
                            />
                            <div className="flex items-center justify-between mt-3">
                                <div className="flex items-center gap-2">
                                    {/* File upload buttons will go here */}
                                </div>
                                <button
                                    disabled
                                    className="px-4 py-2 bg-blue-600 text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Post
                                </button>
                            </div>
                        </div>
                    </div>

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
                            <Post
                                key={post.id}
                                post={post}
                                currentUserId={state.user?.id}
                            />
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
