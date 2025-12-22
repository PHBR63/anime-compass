import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Suspense, lazy, ReactNode } from "react";
import { PageTransition } from "./PageTransition";
import {
  DashboardSkeleton,
  ListSkeleton,
  DiscoverSkeleton,
  ProfileSkeleton,
  ChatSkeleton,
  GenericSkeleton,
} from "@/components/ui/skeletons";

// Lazy loading das páginas
const MyList = lazy(() => import("@/pages/MyList"));
const ListDetailPage = lazy(() => import("@/pages/ListDetailPage"));
const Franchises = lazy(() => import("@/pages/Franchises"));
const Studios = lazy(() => import("@/pages/Studios"));
const Discover = lazy(() => import("@/pages/Discover"));
const Social = lazy(() => import("@/pages/Social"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const Profile = lazy(() => import("@/pages/Profile"));
const Chat = lazy(() => import("@/pages/Chat"));
const Reviews = lazy(() => import("@/pages/Reviews"));
const Admin = lazy(() => import("@/pages/Admin"));
const NotFound = lazy(() => import("@/pages/NotFound"));

import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";

/**
 * Componente que envolve rotas protegidas com AnimatePresence
 * Permite transições suaves entre páginas
 */
export function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/list" element={
          <PageTransition>
            <Suspense fallback={<ListSkeleton />}>
              <MyList />
            </Suspense>
          </PageTransition>
        } />
        <Route path="/list/:id" element={
          <PageTransition>
            <Suspense fallback={<ListSkeleton />}>
              <ListDetailPage />
            </Suspense>
          </PageTransition>
        } />
        <Route path="/list/franchises" element={
          <PageTransition>
            <Suspense fallback={<ListSkeleton />}>
              <Franchises />
            </Suspense>
          </PageTransition>
        } />
        <Route path="/list/studios" element={
          <PageTransition>
            <Suspense fallback={<ListSkeleton />}>
              <Studios />
            </Suspense>
          </PageTransition>
        } />
        <Route path="/discover" element={
          <PageTransition>
            <Suspense fallback={<DiscoverSkeleton />}>
              <Discover />
            </Suspense>
          </PageTransition>
        } />
        <Route path="/reviews" element={
          <PageTransition>
            <Suspense fallback={<GenericSkeleton />}>
              <Reviews />
            </Suspense>
          </PageTransition>
        } />
        <Route path="/social" element={
          <PageTransition>
            <Suspense fallback={<GenericSkeleton />}>
              <Social />
            </Suspense>
          </PageTransition>
        } />
        <Route path="/chat" element={
          <PageTransition>
            <Suspense fallback={<ChatSkeleton />}>
              <Chat />
            </Suspense>
          </PageTransition>
        } />
        <Route path="/achievements" element={
          <PageTransition>
            <Suspense fallback={<GenericSkeleton />}>
              <Achievements />
            </Suspense>
          </PageTransition>
        } />
        <Route path="/profile" element={
          <PageTransition>
            <Suspense fallback={<ProfileSkeleton />}>
              <Profile />
            </Suspense>
          </PageTransition>
        } />
        <Route path="/admin" element={
          <AdminProtectedRoute>
            <PageTransition>
              <Suspense fallback={<GenericSkeleton />}>
                <Admin />
              </Suspense>
            </PageTransition>
          </AdminProtectedRoute>
        } />
        <Route path="*" element={
          <PageTransition>
            <Suspense fallback={<GenericSkeleton />}>
              <NotFound />
            </Suspense>
          </PageTransition>
        } />
      </Routes>
    </AnimatePresence>
  );
}
