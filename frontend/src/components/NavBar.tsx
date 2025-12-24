import { Link, useLocation, useNavigate } from "react-router";
import {
    Home,
    Search,
    Users,
    User,
    ChevronRight,
    Loader2,
    Ellipsis,
    Settings,
    LogOut,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useGetUser } from "../hooks/users/useGetUser";
import { useLogout } from "../hooks/auth/useLogout";
import DefaultProfilePicture from "./DefaultProfilePicture";

export default function NavBar() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { user, getUser, loading } = useGetUser();
    const { logout } = useLogout();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const desktopDropdownRef = useRef<HTMLDivElement>(null);

    const isActive = (path: string): boolean => location.pathname === path;
    let active;

    const handleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const mobileDropdown = dropdownRef.current;
            const desktopDropdown = desktopDropdownRef.current;

            if (
                mobileDropdown &&
                !mobileDropdown.contains(event.target as Node) &&
                (!desktopDropdown ||
                    !desktopDropdown.contains(event.target as Node))
            ) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        getUser();
    }, []);

    const navItems = [
        {
            path: "/",
            icon: <Home className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />,
            label: "Home",
        },
        {
            path: "/users",
            icon: <Search className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />,
            label: "Users",
        },
        {
            path: "/follows",
            icon: <Users className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />,
            label: "Follows",
        },
        {
            path: "/profile",
            icon: <User className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />,
            label: "Profile",
        },
    ];

    return (
        <>
            <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 z-10">
                <nav className="flex justify-around items-center p-2">
                    {navItems.map((item) => {
                        active = isActive(item.path);
                        return (
                            <Link
                                to={item.path}
                                key={item.path}
                                className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200 ${
                                    active
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-zinc-500 dark:text-zinc-400"
                                }`}
                            >
                                {item.icon}
                            </Link>
                        );
                    })}

                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            className="flex flex-col items-center p-2 rounded-lg transition-all duration-200 text-zinc-500 dark:text-zinc-400"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : user?.user.profile_picture_url ? (
                                <img
                                    src={user.user.profile_picture_url}
                                    alt="profile"
                                    className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 text-white font-bold text-sm uppercase">
                                    <DefaultProfilePicture
                                        username={user?.user?.username?.[0]}
                                    />
                                </div>
                            )}
                        </button>

                        {dropdownOpen && (
                            <div className="absolute bottom-14 right-0 max-w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-2 z-20 transition-all duration-200 animate-fadeIn">
                                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                                    <p className="font-semibold text-zinc-900 dark:text-white truncate">
                                        {user?.user?.username}
                                    </p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                                        {user?.user.aboutMe ||
                                            `@${user?.user?.username}`}
                                    </p>
                                </div>
                                <Link
                                    to="/settings"
                                    onClick={() => setDropdownOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-200"
                                >
                                    <Settings className="w-5 h-5" />
                                    <span>Settings</span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </nav>
            </div>

            <aside className="hidden md:flex flex-col h-screen sticky top-0 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 z-10">
                <Link
                    to="/"
                    className={`flex items-center gap-3 p-6 border-b border-zinc-200 dark:border-zinc-800 ${isCollapsed ? "hidden" : ""}`}
                >
                    <img src="/logo.png" alt="logo" className="w-32" />
                    {!isCollapsed && (
                        <span className="text-4xl font-display font-bold text-zinc-900 dark:text-white">
                            Instigator
                        </span>
                    )}
                </Link>

                <button
                    onClick={handleCollapse}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all duration-200 cursor-pointer"
                >
                    <ChevronRight
                        className={`w-4 h-4 transition-all duration-200 ${isCollapsed ? "rotate-180" : "rotate-0"}`}
                    />
                </button>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        active = isActive(item.path);
                        return (
                            <Link
                                to={item.path}
                                key={item.path}
                                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                                    active
                                        ? "bg-blue-600 text-white"
                                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                }`}
                            >
                                {item.icon}
                                {!isCollapsed && (
                                    <span className="font-medium text-lg">
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div
                    className="mt-auto p-4 border-t border-zinc-200 dark:border-zinc-800 relative"
                    ref={desktopDropdownRef}
                >
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors duration-200 w-full cursor-pointer"
                    >
                        <div className="relative shrink-0">
                            {loading ? (
                                <Loader2 className="w-10 text-zinc-400 animate-spin" />
                            ) : user?.user.profile_picture_url ? (
                                <img
                                    src={user.user.profile_picture_url}
                                    alt="profile"
                                    className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                                />
                            ) : (
                                <DefaultProfilePicture
                                    username={user?.user?.username}
                                />
                            )}
                        </div>

                        {!isCollapsed && (
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-zinc-900 dark:text-white truncate">
                                    {user?.user?.username}
                                </p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                                    {user?.user.aboutMe ||
                                        `@${user?.user?.username}`}
                                </p>
                            </div>
                        )}

                        {!isCollapsed && (
                            <Ellipsis className="w-6 h-6 text-zinc-900 dark:text-white shrink-0" />
                        )}
                    </button>

                    {dropdownOpen && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-2 z-10 transition-all duration-200 animate-fadeIn">
                            <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
                                <p className="font-semibold text-zinc-900 dark:text-white truncate">
                                    {user?.user?.username}
                                </p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate">
                                    {user?.user.aboutMe ||
                                        `@${user?.user?.username}`}
                                </p>
                            </div>
                            <Link
                                to="/settings"
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-200"
                            >
                                <Settings className="w-5 h-5" />
                                <span>Settings</span>
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 text-left cursor-pointer"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
