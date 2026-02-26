
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Dashboard } from './features/dashboard';
import DashboardLayout from './features/dashboard/layout';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" />, // Standard redirect
  },
//   {
//     path: "/auth",
//     element: <AuthPage />,
//   },
  {
    path: "/dashboard",
    element: <DashboardLayout/>, // This contains your sidebar/nav
    children: [
      {
        path: "", // This matches "/dashboard" exactly
        element: <Dashboard />,
      },
    ]
  }
]);
