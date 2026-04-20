

## Fix: Login redirects to /login instead of /dashboard

### Root cause
`Login.tsx` calls `navigate("/dashboard")` immediately after `signInWithPassword` resolves. But `AuthContext` defers setting the user via `setTimeout(..., 0)` inside `onAuthStateChange`. So when `ProtectedRoute` mounts, `user` is still `null` and `isLoading` may already be `false`, causing an immediate bounce back to `/login`.

### The fix

**Update `src/pages/Login.tsx`:**
- Remove the manual `navigate("/dashboard")` call from `handleSubmit`.
- Add a `useEffect` that watches `user` from `useAuth()` and navigates to `/dashboard` only once the auth context has actually populated the user.
- Keep the success toast tied to the successful `signInWithPassword` call.

```tsx
const { login, user } = useAuth();

useEffect(() => {
  if (user) navigate("/dashboard", { replace: true });
}, [user, navigate]);

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    await login(email, password);
    toast.success("Logged in successfully");
    // navigation happens via useEffect once user is set
  } catch {
    toast.error("Invalid credentials");
    setLoading(false);
  }
};
```

This guarantees `ProtectedRoute` sees a valid `user` when the dashboard route mounts, so it won't bounce back to `/login`.

### Files changed
- `src/pages/Login.tsx`

