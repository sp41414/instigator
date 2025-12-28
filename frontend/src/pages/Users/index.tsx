import { useEffect, useRef } from "react";
import { Link } from "react-router";
import NavBar from "../../components/NavBar";
import { useGetUsers, type UserWithStatus } from "../../hooks/users/useGetUsers";
import { useSendFollow } from "../../hooks/follows/useSendFollow";
import { useBlockUser } from "../../hooks/follows/useBlockUser";
import { useDeleteFollow } from "../../hooks/follows/useDeleteFollow";
import { useUpdateFollowStatus } from "../../hooks/follows/useUpdateFollowStatus";
import DefaultProfilePicture from "../../components/DefaultProfilePicture";
import { Loader2, UserPlus, UserMinus, Check, X, Ban } from "lucide-react";
import { useAuth } from "../../hooks/auth/useAuth";

export default function UsersPage() {
    const { users, getUsers, loadMore, error, isLoading, hasMore } =
        useGetUsers();
    const { sendFollow, isLoading: isSendingFollow } = useSendFollow();
    const { blockUser, isLoading: isBlocking } = useBlockUser();
    const { deleteFollow, isLoading: isDeleting } = useDeleteFollow();
    const { updateFollowStatus, isLoading: isUpdating } =
        useUpdateFollowStatus();
    const { state } = useAuth();
    const observerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        getUsers();
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

    const handleFollowAction = async (user: UserWithStatus) => {
        const followStatus = user.followStatus;

        if (!followStatus) {
            // No relation - Send follow request
            try {
                await sendFollow(user.id);
                await getUsers();
            } catch (err) {
                console.error(err);
            }
        } else if (followStatus.status === "BLOCKED") {
            // User is blocked - Unblock
            if (followStatus.senderId === state.user?.id) {
                try {
                    await deleteFollow(followStatus.id);
                    await getUsers();
                } catch (err) {
                    console.error(err);
                }
            }
        } else if (followStatus.status === "PENDING") {
            if (followStatus.senderId === state.user?.id) {
                try {
                    await deleteFollow(followStatus.id);
                    await getUsers();
                } catch (err) {
                    console.error(err);
                }
            }
        }
    };

    const handleBlock = async (user: UserWithStatus) => {
        try {
            await blockUser(user.id);
            await getUsers();
        } catch (err) {
            console.error(err);
        }
    };

    const getFollowButton = (user: UserWithStatus) => {
        const followStatus = user.followStatus;
        const currentUserId = state.user?.id;

        if (!followStatus) {
            return (
                <button
                    onClick={() => handleFollowAction(user)}
                    disabled={isSendingFollow}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
                >
                    {isSendingFollow ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <UserPlus className="w-4 h-4" />
                    )}
                    Send
                </button>
            );
        }

        if (followStatus.status === "BLOCKED") {
            if (followStatus.senderId === currentUserId) {
                return (
                    <button
                        onClick={() => handleFollowAction(user)}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-full font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <UserMinus className="w-4 h-4" />
                        )}
                        Unblock
                    </button>
                );
            } else {
                return (
                    <div className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full font-medium cursor-not-allowed">
                        Blocked
                    </div>
                );
            }
        }

        if (followStatus.status === "PENDING") {
            if (followStatus.senderId === currentUserId) {
                return (
                    <button
                        onClick={() => handleFollowAction(user)}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-full font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <UserMinus className="w-4 h-4" />
                        )}
                        Unfollow
                    </button>
                );
            } else {
                return (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={async () => {
                                try {
                                    await updateFollowStatus(
                                        followStatus.id,
                                        "ACCEPTED",
                                    );
                                    await getUsers();
                                } catch (err) {
                                    console.error(err);
                                }
                            }}
                            disabled={isUpdating}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
                        >
                            {isUpdating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            Accept
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    await updateFollowStatus(
                                        followStatus.id,
                                        "REFUSED",
                                    );
                                    await getUsers();
                                } catch (err) {
                                    console.error(err);
                                }
                            }}
                            disabled={isUpdating}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
                        >
                            {isUpdating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <X className="w-4 h-4" />
                            )}
                            Refuse
                        </button>
                        <button
                            onClick={() => handleBlock(user)}
                            disabled={isBlocking}
                            className="px-3 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-full font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
                        >
                            {isBlocking ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Ban className="w-4 h-4" />
                            )}
                            Block
                        </button>
                    </div>
                );
            }
        }

        if (followStatus.status === "ACCEPTED") {
            return (
                <div className="px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full font-medium cursor-not-allowed">
                    Following
                </div>
            );
        }

        return (
            <button
                onClick={() => handleFollowAction(user)}
                disabled={isSendingFollow}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
            >
                {isSendingFollow ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <UserPlus className="w-4 h-4" />
                )}
                Send
            </button>
        );
    };

    return (
        <div className="flex min-h-screen w-full justify-center">
            <NavBar />
            <div className="flex-1 max-w-2xl border-x border-zinc-200 dark:border-zinc-800 min-h-screen pb-16 md:pb-0">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 p-4">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                        Users
                    </h1>
                </div>

                <div className="p-4">
                    {error && (
                        <div className="p-4 text-center text-red-600 dark:text-red-400 mb-4">
                            {error}
                        </div>
                    )}

                    {users.length === 0 && !isLoading && (
                        <div className="p-8 text-center">
                            <p className="text-zinc-600 dark:text-zinc-400">
                                No users found
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                            >
                                <Link
                                    to={`/profile/${user.id}`}
                                    className="shrink-0"
                                >
                                    {user.profile_picture_url ? (
                                        <img
                                            src={user.profile_picture_url}
                                            alt={user.username}
                                            className="w-12 h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                                        />
                                    ) : (
                                        <DefaultProfilePicture
                                            username={user.username}
                                            className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-600 text-white font-bold text-sm uppercase"
                                        />
                                    )}
                                </Link>

                                <div className="flex-1 min-w-0">
                                    <Link
                                        to={`/profile/${user.id}`}
                                        className="block"
                                    >
                                        <h3 className="font-bold text-zinc-900 dark:text-white hover:underline truncate">
                                            {user.username}
                                        </h3>
                                        {user.aboutMe && (
                                            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                                                {user.aboutMe}
                                            </p>
                                        )}
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                            {user._count.posts} posts
                                        </p>
                                    </Link>
                                </div>

                                <div className="shrink-0">
                                    {getFollowButton(user)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {isLoading && (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    )}

                    {hasMore && !isLoading && (
                        <div ref={observerRef} className="h-10"></div>
                    )}

                    {!hasMore && users.length > 0 && (
                        <div className="p-8 text-center">
                            <p className="text-zinc-600 dark:text-zinc-400">
                                You've reached the end
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
