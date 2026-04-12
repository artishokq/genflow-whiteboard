import axios from "axios";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { getMeRequest, refreshSessionRequest } from "../shared/api/authApi";
import { useAuthStore } from "../shared/store/authStore";

export function RequireAuth() {
  const location = useLocation();
  const token = useAuthStore((s) => s.accessToken);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [checking, setChecking] = useState(true);
  const [deny, setDeny] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    setChecking(true);
    setDeny(false);

    const syncSession = async () => {
      try {
        if (token) {
          const { user } = await getMeRequest();
          if (ac.signal.aborted) {
            return;
          }
          setUser(user);
          return;
        }

        const data = await refreshSessionRequest({ signal: ac.signal });
        if (ac.signal.aborted) {
          return;
        }
        setAccessToken(data.accessToken);
        setUser(data.user);
      } catch (err: unknown) {
        if (ac.signal.aborted || axios.isCancel(err)) {
          return;
        }

        try {
          const data = await refreshSessionRequest({ signal: ac.signal });
          if (ac.signal.aborted) {
            return;
          }
          setAccessToken(data.accessToken);
          setUser(data.user);
          return;
        } catch (refreshErr: unknown) {
          if (ac.signal.aborted || axios.isCancel(refreshErr)) {
            return;
          }
          clearAuth();
          setDeny(true);
        }
      } finally {
        if (!ac.signal.aborted) {
          setChecking(false);
        }
      }
    };

    void syncSession();

    return () => ac.abort();
  }, [token, clearAuth, setAccessToken, setUser]);

  if (checking) {
    return null;
  }

  if (!deny) {
    return <Outlet />;
  }

  return (
    <Navigate
      to="/login"
      replace
      state={{ from: `${location.pathname}${location.search}` }}
    />
  );
}
