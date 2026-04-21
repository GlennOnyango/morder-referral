import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { EyeIcon, EyeOffIcon } from "@untitledui/icons-react/outline";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useAuthContext } from "../../context/AuthContext";
import { resendSignUpCode } from "../../auth";
import { getUser } from "../../api/authAdmin";
import { signInSchema, type SignInFormValues } from "../../schemas/auth";
import { TypesUserStatusType } from "../../types/auth.generated";

const TOGGLE_CLS =
  "absolute top-1/2 right-2 -translate-y-1/2 size-[34px] grid place-items-center rounded-lg border-0 bg-transparent text-[#2f5468] cursor-pointer hover:bg-emerald-700/[0.08] focus-visible:outline-2 focus-visible:outline-emerald-700/40 [&_svg]:size-[18px]";

const SignInPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { isAuthenticated, signIn } = useAuthContext();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({ defaultValues: { email: "", password: "" } });

  const email = useWatch({ control, name: "email" });

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (formValues: SignInFormValues) => {
    const parsed = signInSchema.safeParse(formValues);
    if (!parsed.success) {
      parsed.error.issues.forEach(({ path, message }) => {
        const field = path[0];
        if (field === "email" || field === "password") {
          setError(field, { type: "manual", message });
        }
      });
      return;
    }

    try {
      const result = await signIn(parsed.data.email, parsed.data.password);
      if (result.isSignedIn) {
        navigate("/dashboard", { replace: true });
      } else {
        const step = result.nextStep?.signInStep;
        setError("root", {
          message: step ? `Next step: ${step}` : "Sign-in requires an additional step.",
        });
      }
    } catch (err) {
      try {
        const user = await getUser(parsed.data.email);

        if (user?.UserStatus === TypesUserStatusType.UserStatusTypeUnconfirmed) {
          if (user.Username) {
            await resendSignUpCode(user.Username);
          }
          const params = new URLSearchParams({
            email: parsed.data.email,
            username: user.Username ?? parsed.data.email,
          });
          navigate(`/confirm-signup?${params.toString()}`, { replace: true });
          return;
        }
      } catch {
        // getUser failed — fall through to show the original error
      }
      setError("root", {
        message: err instanceof Error ? err.message : "Failed to sign in",
      });
    }
  };

  return (
    <section className="grid place-items-center mt-3.5 reveal delay-1">
      <article className="w-full max-w-120 rounded-3xl border border-[rgba(10,52,60,0.13)] bg-[rgba(255,255,255,0.82)] p-[clamp(20px,4vw,34px)] shadow-[0_14px_34px_rgba(12,35,40,0.1)]">
        <p className="eyebrow">Facility Access</p>
        <h1 className="mt-2.5 font-heading text-[#0d2230] text-[clamp(1.4rem,3.2vw,2rem)] leading-[1.1] tracking-[-0.03em]">
          Sign in to the referral desk
        </h1>
        <p className="mt-3.5 text-[#506071] text-[0.97rem] leading-[1.55]">
          Enter your referral desk email and password to start a secure session.
        </p>

        <Breadcrumbs
          className="mt-3.5"
          items={[{ label: "Home", to: "/" }, { label: "Sign in" }]}
        />

        <form className="mt-4.5 grid gap-3.5" onSubmit={handleSubmit(onSubmit)}>
          <label className="grid gap-2">
            <span className="text-[0.9rem] font-semibold text-[#203649]">Email</span>
            <Input
              type="email"
              {...register("email")}
              autoComplete="email"
              placeholder="name@facility.go.ke"
            />
            {errors.email && (
              <small className="text-[0.85rem] font-semibold text-[#b43b33]">
                {errors.email.message}
              </small>
            )}
          </label>

          <label className="grid gap-2">
            <span className="text-[0.9rem] font-semibold text-[#203649]">Password</span>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="pr-12"
              />
              <button
                type="button"
                className={TOGGLE_CLS}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && (
              <small className="text-[0.85rem] font-semibold text-[#b43b33]">
                {errors.password.message}
              </small>
            )}
          </label>

          <div className="flex justify-end">
            <Link
              className="text-[#0f5a78] text-[0.9rem] font-semibold no-underline hover:underline"
              to={`/reset-password?username=${encodeURIComponent(email.trim())}`}
            >
              Forgot password?
            </Link>
          </div>

          <Button size="lg" type="submit" className="w-full mt-0.5" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {errors.root && (
          <p className="mt-4 rounded-xl border border-[rgba(180,59,51,0.18)] bg-[rgba(180,59,51,0.06)] px-3 py-2.5 text-[0.9rem] font-semibold text-[#b43b33]">
            {errors.root.message}
          </p>
        )}
      </article>
    </section>
  );
};

export default SignInPage;
