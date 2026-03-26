
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Dashboard } from './features/dashboard';
import { AppLayout } from './layout/index';
import { AuthPage } from './features/auth';
import { BookingsPage } from './features/booking';
import CompleteProfilePage from './features/complete-profile';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/auth" />, // Standard redirect
  },


  {
    path: "/auth",
    element: <AuthPage />,
  },


  {
    path: "/complete-profile",
    element: <CompleteProfilePage />,
  },


  {
    path: "/dashboard",
    element: <AppLayout/>, // This contains your sidebar/nav
    children: [
      {
        path: "", // This matches "/dashboard" exactly
        element: <Dashboard />,
      },
    ]
  },


  {
    path:"/bookings",
    element: <AppLayout/>, // This contains your sidebar/nav
    children: [
      {
        path: "", // This matches "/dashboard" exactly
        element: <BookingsPage />,
      },
    ]
  }
]);
