import { useAuth } from "./auth.jsx";
import { useApi } from "./hooks.js";

// The logged-in employer's company profile (null until they create one).
export function useMyCompany() {
  const { user } = useAuth();
  const res = useApi(user ? `/jobs/employers/?owner=${user.id}` : null);
  return { ...res, company: res.data?.results?.[0] || null };
}
