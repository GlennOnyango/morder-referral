import { useEffect, useState, type SubmitEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M1.5 12c2.2-4 6-6.5 10.5-6.5S20.3 8 22.5 12c-2.2 4-6 6.5-10.5 6.5S3.7 16 1.5 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2 3.2 22 20.8M9.9 6c.7-.2 1.4-.3 2.1-.3 4.5 0 8.3 2.5 10.5 6.3-.8 1.4-1.8 2.6-3 3.6M6.7 8.1A13 13 0 0 0 1.5 12c2.2 3.8 6 6.3 10.5 6.3 1.9 0 3.6-.4 5.1-1.2M10.1 10.3a3.3 3.3 0 0 0 4.4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const { isAuthenticated, signIn } = useAuthContext();
  const navigate = useNavigate();

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const result = await signIn(email, password);

      if (result.isSignedIn) {
        setMessage("Signed in successfully");
        navigate("/dashboard", { replace: true });
      } else {
        const signInStep = result.nextStep?.signInStep;
        setMessage(signInStep ? `Next step: ${signInStep}` : "Sign-in requires an additional step.");
      }
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Failed to sign in");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="auth-shell reveal delay-1">
      <article className="auth-card">
        <p className="eyebrow">Facility Access</p>
        <h1>Sign in to the referral desk</h1>
        <p className="auth-intro">
          Enter your referral desk email and password to start a secure session.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="name@facility.go.ke"
            />
          </label>

          <label className="field">
            <span>Password</span>
            <div className="field-input-wrap">
              <input
                className="field-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </label>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {message ? <p className="result-note error-note">{message}</p> : null}

      </article>
    </section>
  );
}

export default SignInPage;
