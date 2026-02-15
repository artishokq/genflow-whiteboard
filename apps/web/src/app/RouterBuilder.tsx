import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

import DashboardLayout from "../pages/DashboardPage/DashboardLayout";
import { DashboardPersonalPage } from "../pages/DashboardPage/DashboardPersonalPage";
import { DashboardRecentPage } from "../pages/DashboardPage/DashboardRecentPage";
import { DashboardStarredPage } from "../pages/DashboardPage/DashboardStarredPage";
import InfoPage from "../pages/InfoPage/InfoPage";
import LoginPage from "../pages/LoginPage/LoginPage";
import NotFoundPage from "../pages/NotFoundPage/NotFoundPage";
import ProfilePage from "../pages/ProfilePage/ProfilePage";
import RecoverPage from "../pages/RecoverPage/RecoverPage";
import RegisterPage from "../pages/RegisterPage/RegisterPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/recover",
    element: <RecoverPage />,
  },
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Navigate to="personal" replace /> },
      { path: "personal", element: <DashboardPersonalPage /> },
      { path: "recent", element: <DashboardRecentPage /> },
      { path: "starred", element: <DashboardStarredPage /> },
    ],
  },
  {
    path: "/profile",
    element: <ProfilePage />,
  },
  {
    path: "/info",
    element: <InfoPage />,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);

function RouterBuilder() {
  return <RouterProvider router={router} />;
}

export default RouterBuilder;
