import { Outlet } from "react-router";

export default function RootLayout() {
    return (
        <div className="flex flex-col sm:flex-row min-h-screen bg-zinc-100 dark:bg-zinc-950">
            <div className="flex flex-col flex-1">
                <Outlet />
            </div>
        </div>
    );
}
