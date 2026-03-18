import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

import { RequireAuth } from "./RequireAuth";
import DashboardLayout from "../pages/DashboardPage/DashboardLayout";
import { DashboardCustomSectionPage } from "../pages/DashboardPage/DashboardCustomSectionPage";
import { DashboardPersonalPage } from "../pages/DashboardPage/DashboardPersonalPage";
import { DashboardRecentPage } from "../pages/DashboardPage/DashboardRecentPage";
import { DashboardStarredPage } from "../pages/DashboardPage/DashboardStarredPage";
import InfoPage from "../pages/InfoPage/InfoPage";
import LoginPage from "../pages/LoginPage/LoginPage";
import NotFoundPage from "../pages/NotFoundPage/NotFoundPage";
import BoardPage from "../pages/BoardPage/BoardPage";
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
    element: <RequireAuth />,
    children: [
      {
        path: "dashboard",
        element: <DashboardLayout />,
        children: [
          { index: true, element: <Navigate to="personal" replace /> },
          { path: "personal", element: <DashboardPersonalPage /> },
          { path: "section/:sectionId", element: <DashboardCustomSectionPage /> },
          { path: "recent", element: <DashboardRecentPage /> },
          { path: "starred", element: <DashboardStarredPage /> },
        ],
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "board/:boardId",
        element: <BoardPage />,
      },
    ],
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
