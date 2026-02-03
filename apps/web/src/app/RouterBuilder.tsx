import { createBrowserRouter, RouterProvider } from "react-router-dom";

import LoginPage from "../pages/LoginPage/LoginPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
]);

function RouterBuilder() {
  return <RouterProvider router={router} />;
}

export default RouterBuilder;