import { Link, useLocation } from "react-router";
import { Home, Search, Users, User, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function NavBar() {
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isActive = (path: string): boolean => location.pathname === path;
    let active;

    const handleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

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
        <aside className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:right-auto flex md:flex-col border-t md:border-t-0 md:border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 z-10 transition-all duration-300">
            <Link
                to="/"
                className={`hidden md:flex justify-center items-center gap-3 p-6 border-b border-zinc-200 dark:border-zinc-800 ${isCollapsed ? "md:hidden" : ""}`}
            >
                <img src="/logo.png" alt="logo" className="w-32" />
                <span className="hidden md:block text-4xl font-display font-bold text-zinc-900 dark:text-white">
                    Instigator
                </span>
            </Link>
            <button
                onClick={handleCollapse}
                className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all duration-200 cursor-pointer"
            >
                <ChevronRight
                    className={`w-4 h-4 transition-all duration-200 ${isCollapsed ? "rotate-180" : "rotate-0"}`}
                />
            </button>

            <nav className="flex flex-1 md:flex-col justify-around md:justify-start gap-4 md:gap-2 md:p-4">
                {navItems.map((item) => {
                    active = isActive(item.path);
                    return (
                        <Link
                            to={item.path}
                            key={item.path}
                            className={`flex items-center justify-center md:justify-start p-4 gap-4 md:px-6 md:py-3 rounded-xl transition-all duration-200 ${
                                active
                                    ? "bg-blue-600 text-white"
                                    : "text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            }`}
                        >
                            {item.icon}
                            <span
                                className={`hidden md:block font-medium text-lg ${isCollapsed ? "md:hidden" : ""}`}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
