
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Dashboard } from './features/dashboard';
import {AppLayout} from './layout';
import { AuthPage } from './features/auth';
import { BookingsPage } from './features/calendar';

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/auth" />, 
  },
  {
    path: "/auth",
    element: <AuthPage/>,
  },
  {
    path: "/dashboard",
    element: <AppLayout/>, 
    children: [
      {
        path: "", 
        element: <Dashboard />,
      },
    ]
  }, {
    path: "/bookings",
    element: <AppLayout/>, 
    children: [
      {
        path: "", 
        element: <BookingsPage />,
      },
    ]
  }
]);
