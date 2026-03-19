import { useState, type SubmitEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { registerUser } from "../auth";
import { useAuthContext } from "../context/AuthContext";

type SignUpFormState = {
  email: string;
  name: string;
  phoneNumber: string;
  password: string;
  birthdate: string;
  facilityId: string;
};

const FACILITY_ID_MIN_LENGTH = 20;

const defaultFormState: SignUpFormState = {
  email: "",
  name: "",
  phoneNumber: "",
  password: "",
  birthdate: "",
  facilityId: "",
};

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

function SignUpPage() {
  const [formState, setFormState] = useState<SignUpFormState>(defaultFormState);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const { isAuthenticated } = useAuthContext();
  const navigate = useNavigate();

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const payload = {
      email: formState.email.trim(),
      name: formState.name.trim(),
      phone_number: formState.phoneNumber.trim(),
      password: formState.password,
      birthdate: formState.birthdate,
      facility_id: formState.facilityId.trim(),
    };

    if (payload.facility_id.length < FACILITY_ID_MIN_LENGTH) {
      setMessage(`Facility ID must be at least ${FACILITY_ID_MIN_LENGTH} characters.`);
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await registerUser(payload);
      const encodedEmail = encodeURIComponent(payload.email);
      const encodedUsername = encodeURIComponent(result.username);
      navigate(`/confirm-signup?email=${encodedEmail}&username=${encodedUsername}`, { replace: true });
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Failed to sign up");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <section className="auth-shell reveal delay-1">
      <article className="auth-card auth-card-wide">
        <p className="eyebrow">New Facility Registration</p>
        <h1>Create a referral desk account</h1>
        <p className="auth-intro">
          Register your account, then confirm your email with the code sent by Cognito.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-grid-two">
            <label className="field">
              <span>Full Name</span>
              <input
                className="field-input"
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                required
                autoComplete="name"
                placeholder="Jane Doe"
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                className="field-input"
                type="email"
                value={formState.email}
                onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                required
                autoComplete="email"
                placeholder="name@facility.go.ke"
              />
            </label>

            <label className="field">
              <span>Phone Number (E.164)</span>
              <input
                className="field-input"
                type="tel"
                value={formState.phoneNumber}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, phoneNumber: event.target.value }))
                }
                required
                autoComplete="tel"
                placeholder="+254712345678"
              />
            </label>

            <label className="field">
              <span>Birthdate</span>
              <input
                className="field-input"
                type="date"
                value={formState.birthdate}
                onChange={(event) => setFormState((current) => ({ ...current, birthdate: event.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Facility ID</span>
              <input
                className="field-input"
                value={formState.facilityId}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, facilityId: event.target.value }))
                }
                required
                minLength={FACILITY_ID_MIN_LENGTH}
                title={`Facility ID must be at least ${FACILITY_ID_MIN_LENGTH} characters`}
                placeholder="FAC-001"
              />
            </label>

            <label className="field">
              <span>Password</span>
              <div className="field-input-wrap">
                <input
                  className="field-input"
                  type={showPassword ? "text" : "password"}
                  value={formState.password}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                  autoComplete="new-password"
                  placeholder="Create a strong password"
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
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Sign up"}
          </button>
        </form>

        {message ? <p className="result-note error-note">{message}</p> : null}

        <p className="auth-intro">
          Already registered? <Link to="/signin">Sign in</Link>
        </p>
      </article>
    </section>
  );
}

export default SignUpPage;
