import { createBrowserRouter } from "react-router";
import RootLayout from "./pages";
import HomePage from "./pages";
import LoginPage from "./pages/Auth/LoginPage";

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
    },
    {
        path: "/setup-username",
    },
]);

export default router;
