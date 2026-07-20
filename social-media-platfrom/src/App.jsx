import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import AuthLayout from './components/layout/AuthLayout'
import ProtectedRoute from './routes/ProtectedRoute'

import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import Videos from './pages/Videos'
import Explore from './pages/Explore'
import Notifications from './pages/Notifications'
import Messages from './pages/Messages'
import Profile from './pages/Profile'
import EditProfile from './pages/EditProfile'
import Settings from './pages/Settings'
import ParentControls from './pages/ParentControls'
import Reports from './pages/Reports'
import SafeCenter from './pages/SafeCenter'
import About from './pages/About'
import FollowList from './pages/FollowList'
import UserProfileView from './pages/UserProfileView'
import AdminModeration from './pages/AdminModeration'
import NotFound from './pages/NotFound'
import Forbidden from './pages/Forbidden'
import ServerError from './pages/ServerError'
import Maintenance from './pages/Maintenance'
import SavedCollections from './pages/SavedCollections'
import Appeals from './pages/Appeals'
import ModerationHistory from './pages/ModerationHistory'

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:id" element={<Messages />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/parent-controls" element={<ParentControls />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/safe-center" element={<SafeCenter />} />
        <Route path="/about" element={<About />} />
        <Route path="/profile/followers" element={<FollowList type="followers" />} />
        <Route path="/profile/following" element={<FollowList type="following" />} />
        <Route path="/users/:userId" element={<UserProfileView />} />
        <Route path="/users/:userId/followers" element={<FollowList type="followers" />} />
        <Route path="/users/:userId/following" element={<FollowList type="following" />} />
        <Route path="/collections" element={<SavedCollections />} />
        <Route path="/appeals" element={<Appeals />} />
        <Route path="/moderation-history" element={<ModerationHistory />} />
      </Route>

      <Route path="/admin" element={<AdminModeration />} />

      <Route path="/403" element={<Forbidden />} />
      <Route path="/500" element={<ServerError />} />
      <Route path="/maintenance" element={<Maintenance />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
