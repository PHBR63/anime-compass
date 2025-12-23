import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Suspense, lazy } from "react";
import { SakuraPageTransition } from "./SakuraTransition";
import {
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
const Moderation = lazy(() => import("@/pages/Moderation"));
const NotFound = lazy(() => import("@/pages/NotFound"));

import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { ModeratorProtectedRoute } from "@/components/moderation/ModeratorProtectedRoute";

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
          <SakuraPageTransition>
            <Suspense fallback={<ListSkeleton />}>
              <MyList />
            </Suspense>
          </SakuraPageTransition>
        } />
        <Route path="/list/:id" element={
          <SakuraPageTransition>
            <Suspense fallback={<ListSkeleton />}>
              <ListDetailPage />
            </Suspense>
          </SakuraPageTransition>
        } />
        <Route path="/list/franchises" element={
          <SakuraPageTransition>
            <Suspense fallback={<ListSkeleton />}>
              <Franchises />
            </Suspense>
          </SakuraPageTransition>
        } />
        <Route path="/list/studios" element={
          <SakuraPageTransition>
            <Suspense fallback={<ListSkeleton />}>
              <Studios />
            </Suspense>
          </SakuraPageTransition>
        } />
        <Route path="/discover" element={
          <SakuraPageTransition>
            <Suspense fallback={<DiscoverSkeleton />}>
              <Discover />
            </Suspense>
          </SakuraPageTransition>
        } />
        <Route path="/reviews" element={
          <SakuraPageTransition>
            <Suspense fallback={<GenericSkeleton />}>
              <Reviews />
            </Suspense>
          </SakuraPageTransition>
        } />
        <Route path="/social" element={
          <SakuraPageTransition>
            <Suspense fallback={<GenericSkeleton />}>
              <Social />
            </Suspense>
          </SakuraPageTransition>
        } />
        <Route path="/chat" element={
          <SakuraPageTransition>
            <Suspense fallback={<ChatSkeleton />}>
              <Chat />
            </Suspense>
          </SakuraPageTransition>
        } />
        <Route path="/achievements" element={
          <SakuraPageTransition>
            <Suspense fallback={<GenericSkeleton />}>
              <Achievements />
            </Suspense>
          </SakuraPageTransition>
        } />
        <Route path="/profile" element={
          <SakuraPageTransition>
            <Suspense fallback={<ProfileSkeleton />}>
              <Profile />
            </Suspense>
          </SakuraPageTransition>
        } />
        <Route path="/admin" element={
          <AdminProtectedRoute>
            <SakuraPageTransition>
              <Suspense fallback={<GenericSkeleton />}>
                <Admin />
              </Suspense>
            </SakuraPageTransition>
          </AdminProtectedRoute>
        } />
        <Route path="/moderation" element={
          <ModeratorProtectedRoute>
            <SakuraPageTransition>
              <Suspense fallback={<GenericSkeleton />}>
                <Moderation />
              </Suspense>
            </SakuraPageTransition>
          </ModeratorProtectedRoute>
        } />
        <Route path="*" element={
          <SakuraPageTransition>
            <Suspense fallback={<GenericSkeleton />}>
              <NotFound />
            </Suspense>
          </SakuraPageTransition>
        } />
      </Routes>
    </AnimatePresence>
  );
}
