import { useEffect, useState, useCallback } from "react";
import NavBar from "../../components/NavBar";
import { useGetFollows, type Follow } from "../../hooks/follows/useGetFollows";
import { useUpdateFollowStatus } from "../../hooks/follows/useUpdateFollowStatus";
import { useDeleteFollow } from "../../hooks/follows/useDeleteFollow";
import { useSendFollow } from "../../hooks/follows/useSendFollow";
import { useBlockUser } from "../../hooks/follows/useBlockUser";
import DefaultProfilePicture from "../../components/DefaultProfilePicture";
import {
    Loader2,
    Check,
    X,
    Ban,
    UserPlus,
    UserMinus,
    Search,
} from "lucide-react";
import {
    useGetUsers,
    type UserWithStatus,
} from "../../hooks/users/useGetUsers";
import { Link } from "react-router";

type Tab = "incoming" | "pending" | "blocked" | "all" | "add";

export default function FollowsPage() {
    const { follows, getFollows, error, isLoading } = useGetFollows();
    const { updateFollowStatus, isLoading: isUpdating } =
        useUpdateFollowStatus();
    const { deleteFollow, isLoading: isDeleting } = useDeleteFollow();
    const { sendFollow, isLoading: isSendingFollow } = useSendFollow();
    const { blockUser, isLoading: isBlocking } = useBlockUser();
    const { users, getUsers } = useGetUsers();
    const [activeTab, setActiveTab] = useState<Tab>("incoming");
    const [searchUsername, setSearchUsername] = useState("");
    const [searchResults, setSearchResults] = useState<UserWithStatus[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        getFollows();
    }, [getFollows]);

    const handleSearch = useCallback(async () => {
        if (!searchUsername.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        try {
            setIsSearching(true);
            setSearchResults([]);
            await getUsers(undefined, 20, searchUsername);
        } catch (err) {
            console.error(err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [searchUsername, getUsers]);

    useEffect(() => {
        if (searchUsername.trim() && users.length > 0) {
            const filtered = users.filter((user) =>
                user.username
                    .toLowerCase()
                    .includes(searchUsername.toLowerCase()),
            );
            setSearchResults(filtered);
        } else if (!searchUsername.trim()) {
            setSearchResults([]);
        }
    }, [users, searchUsername]);

    const handleAccept = async (followId: string) => {
        try {
            await updateFollowStatus(followId, "ACCEPTED");
            await getFollows();
        } catch (err) {
            console.error(err);
        }
    };

    const handleRefuse = async (followId: string) => {
        try {
            await updateFollowStatus(followId, "REFUSED");
            await getFollows();
        } catch (err) {
            console.error(err);
        }
    };

    const handleBlock = async (userId: number) => {
        try {
            await blockUser(userId);
            await getFollows();
        } catch (err) {
            console.error(err);
        }
    };

    const handleUnblock = async (followId: string) => {
        try {
            await deleteFollow(followId);
            await getFollows();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSendFollow = async (userId: number) => {
        try {
            await sendFollow(userId);
            await getFollows();
            setSearchUsername("");
            setSearchResults([]);
        } catch (err) {
            console.error(err);
        }
    };

    const renderUserCard = (
        user: {
            id: number;
            username: string;
            profile_picture_url: string | null;
            aboutMe: string | null;
        },
        follow?: Follow,
        showActions: boolean = true,
    ) => {
        return (
            <div
                key={user.id}
                className="flex items-center gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
            >
                <Link to={`/profile/${user.id}`} className="shrink-0">
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
                    <Link to={`/profile/${user.id}`}>
                        <h3 className="font-bold text-zinc-900 dark:text-white hover:underline truncate">
                            {user.username}
                        </h3>
                        {user.aboutMe && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                                {user.aboutMe}
                            </p>
                        )}
                    </Link>
                </div>

                {showActions && follow && (
                    <div className="shrink-0 flex gap-2">
                        {activeTab === "incoming" && (
                            <>
                                <button
                                    onClick={() => handleAccept(follow.id)}
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
                                    onClick={() => handleRefuse(follow.id)}
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
                                    onClick={() => handleBlock(user.id)}
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
                            </>
                        )}
                        {activeTab === "blocked" && (
                            <button
                                onClick={() => handleUnblock(follow.id)}
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
                        )}
                    </div>
                )}

                {showActions && !follow && activeTab === "add" && (
                    <button
                        onClick={() => handleSendFollow(user.id)}
                        disabled={isSendingFollow}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
                    >
                        {isSendingFollow ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <UserPlus className="w-4 h-4" />
                        )}
                        Send Request
                    </button>
                )}
            </div>
        );
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="p-4 text-center text-red-600 dark:text-red-400">
                    {error}
                </div>
            );
        }

        if (activeTab === "add") {
            return (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchUsername}
                            onChange={(e) => setSearchUsername(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleSearch();
                                }
                            }}
                            placeholder="Search by username..."
                            className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer flex items-center gap-2 transition-colors"
                        >
                            {isSearching ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Search className="w-5 h-5" />
                            )}
                            Search
                        </button>
                    </div>

                    {isSearching && (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        </div>
                    )}

                    {!isSearching &&
                        searchResults.length === 0 &&
                        searchUsername.trim() && (
                            <div className="p-8 text-center">
                                <p className="text-zinc-600 dark:text-zinc-400">
                                    No users found
                                </p>
                            </div>
                        )}

                    {!isSearching &&
                        searchResults.length === 0 &&
                        !searchUsername.trim() && (
                            <div className="p-8 text-center">
                                <p className="text-zinc-600 dark:text-zinc-400">
                                    Enter a username to search
                                </p>
                            </div>
                        )}

                    {!isSearching &&
                        searchResults.map((user) => {
                            const follow =
                                follows?.incoming.find(
                                    (f) =>
                                        f.sender?.id === user.id ||
                                        f.recipient?.id === user.id,
                                ) ||
                                follows?.pending.find(
                                    (f) =>
                                        f.sender?.id === user.id ||
                                        f.recipient?.id === user.id,
                                ) ||
                                follows?.blocked.find(
                                    (f) =>
                                        f.sender?.id === user.id ||
                                        f.recipient?.id === user.id,
                                ) ||
                                follows?.accepted.find(
                                    (f) =>
                                        f.user?.id === user.id ||
                                        f.sender?.id === user.id ||
                                        f.recipient?.id === user.id,
                                );

                            if (follow) {
                                return (
                                    <div key={user.id}>
                                        {renderUserCard(user, follow, false)}
                                    </div>
                                );
                            }

                            return (
                                <div key={user.id}>
                                    {renderUserCard(user, undefined, true)}
                                </div>
                            );
                        })}
                </div>
            );
        }

        if (activeTab === "incoming") {
            const incoming = follows?.incoming || [];
            if (incoming.length === 0) {
                return (
                    <div className="p-8 text-center">
                        <p className="text-zinc-600 dark:text-zinc-400">
                            No incoming requests
                        </p>
                    </div>
                );
            }
            return (
                <div className="space-y-4">
                    {incoming.map((follow) => {
                        const user = follow.sender;
                        if (!user) return null;
                        return (
                            <div key={follow.id}>
                                {renderUserCard(user, follow, true)}
                            </div>
                        );
                    })}
                </div>
            );
        }

        if (activeTab === "pending") {
            const pending = follows?.pending || [];
            if (pending.length === 0) {
                return (
                    <div className="p-8 text-center">
                        <p className="text-zinc-600 dark:text-zinc-400">
                            No pending requests
                        </p>
                    </div>
                );
            }
            return (
                <div className="space-y-4">
                    {pending.map((follow) => {
                        const user = follow.recipient;
                        if (!user) return null;
                        return (
                            <div key={follow.id}>
                                {renderUserCard(user, follow, false)}
                            </div>
                        );
                    })}
                </div>
            );
        }

        if (activeTab === "blocked") {
            const blocked = follows?.blocked || [];
            if (blocked.length === 0) {
                return (
                    <div className="p-8 text-center">
                        <p className="text-zinc-600 dark:text-zinc-400">
                            No blocked users
                        </p>
                    </div>
                );
            }
            return (
                <div className="space-y-4">
                    {blocked.map((follow) => {
                        const user = follow.recipient;
                        if (!user) return null;
                        return (
                            <div key={follow.id}>
                                {renderUserCard(user, follow, true)}
                            </div>
                        );
                    })}
                </div>
            );
        }

        if (activeTab === "all") {
            const accepted = follows?.accepted || [];
            if (accepted.length === 0) {
                return (
                    <div className="p-8 text-center">
                        <p className="text-zinc-600 dark:text-zinc-400">
                            No friends yet
                        </p>
                    </div>
                );
            }
            return (
                <div className="space-y-4">
                    {accepted.map((follow) => {
                        const user = follow.user;
                        if (!user) return null;
                        return (
                            <div key={follow.id}>
                                {renderUserCard(user, follow, false)}
                            </div>
                        );
                    })}
                </div>
            );
        }

        return null;
    };

    return (
        <div className="flex min-h-screen w-full justify-center">
            <NavBar />
            <div className="flex-1 max-w-2xl border-x border-zinc-200 dark:border-zinc-800 min-h-screen pb-16 md:pb-0">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 p-4">
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                        Follows
                    </h1>
                    <div className="flex gap-2 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab("incoming")}
                            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                                activeTab === "incoming"
                                    ? "bg-blue-600 text-white"
                                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                            }`}
                        >
                            Incoming ({follows?.incoming.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab("pending")}
                            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                                activeTab === "pending"
                                    ? "bg-blue-600 text-white"
                                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                            }`}
                        >
                            Pending ({follows?.pending.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab("blocked")}
                            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                                activeTab === "blocked"
                                    ? "bg-blue-600 text-white"
                                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                            }`}
                        >
                            Blocked ({follows?.blocked.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab("add")}
                            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                                activeTab === "add"
                                    ? "bg-blue-600 text-white"
                                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                            }`}
                        >
                            Follow
                        </button>
                        <button
                            onClick={() => setActiveTab("all")}
                            className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors cursor-pointer ${
                                activeTab === "all"
                                    ? "bg-blue-600 text-white"
                                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                            }`}
                        >
                            All ({follows?.accepted.length || 0})
                        </button>
                    </div>
                </div>

                <div className="p-4">{renderContent()}</div>
            </div>
        </div>
    );
}
