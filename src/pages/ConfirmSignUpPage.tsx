import { useMemo, useState, type SubmitEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmUser, resendSignUpCode } from "../auth";
import Breadcrumbs from "../components/Breadcrumbs";

function ConfirmSignUpPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialEmail = useMemo(() => searchParams.get("email")?.trim() ?? "", [searchParams]);
  const initialUsername = useMemo(() => searchParams.get("username")?.trim() ?? "", [searchParams]);

  const [email] = useState(initialEmail);
  const [username] = useState(initialUsername);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState("");
  const isUsernameMissing = username.length === 0;

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (isUsernameMissing) {
      setMessage("Missing username for confirmation. Please restart sign up.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await confirmUser(username, code.trim());
      if (result.isSignUpComplete) {
        navigate("/signin", { replace: true });
        return;
      }

      const signUpStep = result.nextStep?.signUpStep;
      setMessage(signUpStep ? `Next step: ${signUpStep}` : "Could not complete verification.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Failed to confirm account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setMessage("");

    if (isUsernameMissing) {
      setMessage("Missing username for resend. Please restart sign up.");
      return;
    }

    setIsResending(true);
    try {
      const result = await resendSignUpCode(username);
      const destination = result.destination;
      setMessage(destination ? `A new code was sent to ${destination}.` : "A new code was sent.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Failed to resend code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section className="auth-shell reveal delay-1">
      <article className="auth-card">
        <p className="eyebrow">Account Verification</p>
        <h1>Confirm your email</h1>
        <p className="auth-intro">
          Enter the code sent to your email to activate your account.
        </p>

        <Breadcrumbs
          className="auth-breadcrumbs"
          items={[
            { label: "Home", to: "/" },
            { label: "Sign up", to: "/signup" },
            { label: "Confirm" },
          ]}
        />

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              className="field-input"
              type="email"
              value={email}
              readOnly
              placeholder="name@facility.go.ke"
            />
          </label>

          <label className="field">
            <span>Confirmation Code</span>
            <input
              className="field-input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
              autoComplete="one-time-code"
              placeholder="123456"
            />
          </label>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Confirming..." : "Confirm account"}
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            disabled={isSubmitting || isResending || isUsernameMissing}
            onClick={() => {
              void handleResend();
            }}
          >
            {isResending ? "Resending..." : "Resend code"}
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

export default ConfirmSignUpPage;
