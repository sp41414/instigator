import { createBrowserRouter } from "react-router";
import RootLayout from "./pages";
import LoginPage from "./pages/Auth/LoginPage";
import SignupPage from "./pages/Auth/SignupPage";
import SetupUsernamePage from "./pages/Auth/SetupUsernamePage";
import HomePage from "./pages/Home";
import PostPage from "./pages/Posts";
import UsersPage from "./pages/Users";
import ProfilePage from "./pages/Profile";
import SettingsPage from "./pages/Settings";
import FollowsPage from "./pages/Follows";

const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        children: [
            {
                index: true,
                element: <HomePage />,
            },
            {
                path: "users",
                element: <UsersPage />,
            },
            {
                path: "follows",
                element: <FollowsPage />,
            },
            {
                path: "profile",
                element: <ProfilePage />,
            },
            {
                path: "profile/:id",
                element: <ProfilePage />,
            },
            {
                path: "posts/:id",
                element: <PostPage />,
            },
            {
                path: "settings",
                element: <SettingsPage />,
            },
            {
                path: "*",
            },
        ],
    },
    {
        path: "/login",
        element: <LoginPage />,
    },
    {
        path: "/signup",
        element: <SignupPage />,
    },
    {
        path: "/setup-username",
        element: <SetupUsernamePage />,
    },
]);

export default router;
