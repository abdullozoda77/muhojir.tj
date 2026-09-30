import { lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Layout from "./components/Layout.jsx";
import { useAuth } from "./auth.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import NotFound from "./pages/NotFound.jsx";

// Every other page is downloaded only when it is opened, so the first visit on a slow phone is lighter.
const Applications = lazy(() => import("./pages/Applications.jsx"));
const Calculator = lazy(() => import("./pages/Calculator.jsx"));
const Company = lazy(() => import("./pages/Company.jsx"));
const Documents = lazy(() => import("./pages/Documents.jsx"));
const EmployerPage = lazy(() => import("./pages/EmployerPage.jsx"));
const Guides = lazy(() => import("./pages/Guides.jsx"));
const Help = lazy(() => import("./pages/Help.jsx"));
const Inbox = lazy(() => import("./pages/Inbox.jsx"));
const JobDetail = lazy(() => import("./pages/JobDetail.jsx"));
const Jobs = lazy(() => import("./pages/Jobs.jsx"));
const MyJobs = lazy(() => import("./pages/MyJobs.jsx"));
const NewsDetail = lazy(() => import("./pages/NewsDetail.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const Payments = lazy(() => import("./pages/Payments.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Resume = lazy(() => import("./pages/Resume.jsx"));
const Resumes = lazy(() => import("./pages/Resumes.jsx"));

// Pages that need a login; role limits them to migrants or employers.
function Private({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="employers/:id" element={<EmployerPage />} />
        <Route path="calculator" element={<Calculator />} />
        <Route path="guides" element={<Guides />} />
        <Route path="news/:id" element={<NewsDetail />} />
        <Route path="help" element={<Help />} />

        <Route path="documents" element={<Private role="migrant"><Documents /></Private>} />
        <Route path="resume" element={<Private role="migrant"><Resume /></Private>} />
        <Route path="applications" element={<Private role="migrant"><Applications /></Private>} />
        <Route path="payments" element={<Private role="migrant"><Payments /></Private>} />

        <Route path="company" element={<Private role="employer"><Company /></Private>} />
        <Route path="my-jobs" element={<Private role="employer"><MyJobs /></Private>} />
        <Route path="inbox" element={<Private role="employer"><Inbox /></Private>} />
        <Route path="resumes" element={<Private role="employer"><Resumes /></Private>} />

        <Route path="notifications" element={<Private><Notifications /></Private>} />
        <Route path="profile" element={<Private><Profile /></Private>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
