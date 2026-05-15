import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { trackReferralClick } from "@/lib/affiliate";

export const ReferralTracker = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("ref");
    if (!code) return;
    trackReferralClick(code);
    params.delete("ref");
    const qs = params.toString();
    navigate(
      { pathname: location.pathname, search: qs ? `?${qs}` : "", hash: location.hash },
      { replace: true }
    );
  }, [location.pathname, location.search, location.hash, navigate]);

  return null;
};
