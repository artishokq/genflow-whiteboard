import { createBrowserRouter, RouterProvider } from "react-router-dom";

import LoginPage from "../pages/LoginPage/LoginPage";
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
]);

function RouterBuilder() {
  return <RouterProvider router={router} />;
}

export default RouterBuilder;
