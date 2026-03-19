import { useMemo, useState, type SubmitEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, requestPasswordReset } from "../auth";

type ResetStage = "request" | "confirm";

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

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialUsername = useMemo(() => searchParams.get("username")?.trim() ?? "", [searchParams]);

  const [username, setUsername] = useState(initialUsername);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [stage, setStage] = useState<ResetStage>("request");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleRequest = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(username.trim());
      const resetStep = result.nextStep.resetPasswordStep;
      if (resetStep === "DONE") {
        navigate("/signin", { replace: true });
        return;
      }

      setStage("confirm");
      const destination = result.nextStep.codeDeliveryDetails?.destination;
      setMessage(destination ? `A reset code was sent to ${destination}.` : "A reset code was sent.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Failed to request password reset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      await confirmPasswordReset(username.trim(), code.trim(), newPassword);
      navigate("/signin", { replace: true });
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-shell reveal delay-1">
      <article className="auth-card">
        <p className="eyebrow">Account Recovery</p>
        <h1>Reset your password</h1>
        <p className="auth-intro">
          {stage === "request"
            ? "Enter your sign-in email/username to get a reset code."
            : "Enter the reset code and choose a new password."}
        </p>

        <form className="auth-form" onSubmit={stage === "request" ? handleRequest : handleConfirm}>
          <label className="field">
            <span>Email or Username</span>
            <input
              className="field-input"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              autoComplete="username"
              placeholder="name@facility.go.ke"
              readOnly={stage === "confirm"}
            />
          </label>

          {stage === "confirm" ? (
            <>
              <label className="field">
                <span>Reset Code</span>
                <input
                  className="field-input"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                  autoComplete="one-time-code"
                  placeholder="123456"
                />
              </label>

              <label className="field">
                <span>New Password</span>
                <div className="field-input-wrap">
                  <input
                    className="field-input"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Enter your new password"
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
            </>
          ) : null}

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isSubmitting}>
            {isSubmitting
              ? stage === "request"
                ? "Sending code..."
                : "Resetting..."
              : stage === "request"
                ? "Send reset code"
                : "Reset password"}
          </button>
        </form>

        {message ? <p className="result-note error-note">{message}</p> : null}

        <p className="auth-intro">
          Back to <Link to="/signin">sign in</Link>.
        </p>
      </article>
    </section>
  );
}

export default ResetPasswordPage;
