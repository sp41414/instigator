import { createBrowserRouter } from "react-router";
import RootLayout from "./pages";
import HomePage from "./pages";

const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        // errorElement: <ErrorPage />,
        // TODO: create the rest of the pages then give it an element
        // children: [
        //     {
        //         index: true,
        //         element: <HomePage />,
        //     },
        //     {
        //         path: "posts",
        //     },
        //     {
        //         path: "profile",
        //     },
        //     {
        //         path: "users",
        //     },
        //     {
        //         path: "follows",
        //     },
        //     {
        //         path: "profile/:id?",
        //     },
        //     {
        //         path: "posts/:id",
        //     },
        //     {
        //         path: "comments/:id",
        //     },
        //     {
        //         path: "*",
        //         // not found
        //     },
        // ],
    },
    {
        path: "/login",
    },
    {
        path: "/signup",
    },
]);

export default router;
