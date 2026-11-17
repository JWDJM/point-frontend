import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { GuestOnly, RequireAuth } from './RequireAuth';
import { HomePage } from '@/pages/HomePage';
import { BenefitsPage } from '@/pages/BenefitsPage';
import { EventPage } from '@/pages/EventPage';
import { PayPage } from '@/pages/PayPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { AdminPage } from '@/pages/AdminPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <GuestOnly>
        <LoginPage />
      </GuestOnly>
    ),
  },
  {
    path: '/signup',
    element: (
      <GuestOnly>
        <SignupPage />
      </GuestOnly>
    ),
  },
  {
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/benefits', element: <BenefitsPage /> },
      { path: '/events/:eventId', element: <EventPage /> },
      { path: '/pay', element: <PayPage /> },
      { path: '/history', element: <HistoryPage /> },
      { path: '/admin', element: <AdminPage /> },
      { path: '/system', element: <Navigate to="/admin" replace /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
