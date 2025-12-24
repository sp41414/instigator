import { createBrowserRouter } from "react-router";
import RootLayout from "./pages";
import LoginPage from "./pages/Auth/LoginPage";
import SignupPage from "./pages/Auth/SignupPage";
import SetupUsernamePage from "./pages/Auth/SetupUsernamePage";
import HomePage from "./pages/Home";

const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        // errorElement: <ErrorPage />,
        children: [
            {
                index: true,
                element: <HomePage />,
            },
            {
                path: "posts",
            },
            {
                path: "profile",
            },
            {
                path: "users",
            },
            {
                path: "follows",
            },
            {
                path: "profile/:id?",
            },
            {
                path: "posts/:id",
            },
            {
                path: "comments/:id",
            },
            {
                path: "settings",
            },
            {
                path: "*",
                // not found
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
