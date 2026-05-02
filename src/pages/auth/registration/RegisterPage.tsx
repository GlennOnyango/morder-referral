import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { EyeIcon, EyeOffIcon } from "@untitledui/icons-react/outline";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { registerInvitedUser } from "../../../auth";

const TOGGLE_CLS =
  "absolute top-1/2 right-2 -translate-y-1/2 size-[34px] grid place-items-center rounded-lg border-0 bg-transparent text-[#2f5468] cursor-pointer hover:bg-emerald-700/[0.08] focus-visible:outline-2 focus-visible:outline-emerald-700/40 [&_svg]:size-[18px]";

type RegisterForm = {
  name: string;
  username: string;
  password: string;
};

const RegisterPage = () => {
  const { inviteId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get("email")?.trim() ?? "";
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterForm>({
    defaultValues: { name: "", username: "", password: "" },
  });

  const onSubmit = async (values: RegisterForm) => {
    try {
      const result = await registerInvitedUser({
        username: values.username.trim(),
        name: values.name.trim(),
        email,
        password: values.password,
      });
      const params = new URLSearchParams({
        email,
        username: result.username,
        inviteId,
      });
      navigate(`/confirm-signup?${params.toString()}`, { replace: true });
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Failed to create account",
      });
    }
  };

  return (
    <section className="grid place-items-center mt-3.5 reveal delay-1">
      <article className="w-full max-w-120 rounded-3xl border border-[rgba(10,52,60,0.13)] bg-[rgba(255,255,255,0.82)] p-[clamp(20px,4vw,34px)] shadow-[0_14px_34px_rgba(12,35,40,0.1)]">
        <p className="eyebrow">Invitation</p>
        <h1 className="mt-2.5 font-heading text-[#0d2230] text-[clamp(1.4rem,3.2vw,2rem)] leading-[1.1] tracking-[-0.03em]">
          Create your account
        </h1>
        <p className="mt-3.5 text-[#506071] text-[0.97rem] leading-[1.55]">
          Complete your details to join the facility.
        </p>

        <Breadcrumbs
          className="mt-3.5"
          items={[{ label: "Invitation" }, { label: "Register" }]}
        />

        <form className="mt-4.5 grid gap-3.5" onSubmit={handleSubmit(onSubmit)}>
          <label className="grid gap-2">
            <span className="text-[0.9rem] font-semibold text-[#203649]">Full Name</span>
            <Input
              {...register("name", { required: "Name is required." })}
              autoComplete="name"
              placeholder="Jane Doe"
            />
            {errors.name && (
              <small className="text-[0.85rem] font-semibold text-[#b43b33]">
                {errors.name.message}
              </small>
            )}
          </label>

          <label className="grid gap-2">
            <span className="text-[0.9rem] font-semibold text-[#203649]">Email</span>
            <Input
              type="email"
              value={email}
              readOnly
              autoComplete="email"
              placeholder="name@facility.go.ke"
              className="opacity-70 cursor-not-allowed"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-[0.9rem] font-semibold text-[#203649]">Username</span>
            <Input
              {...register("username", {
                required: "Username is required.",
                validate: (v) => !v.includes("@") || "Username must not be an email address.",
                pattern: {
                  value: /^[a-zA-Z0-9_-]+$/,
                  message: "Username may only contain letters, numbers, underscores, or hyphens.",
                },
              })}
              autoComplete="username"
              placeholder="janedoe"
            />
            {errors.username && (
              <small className="text-[0.85rem] font-semibold text-[#b43b33]">
                {errors.username.message}
              </small>
            )}
          </label>

          <label className="grid gap-2">
            <span className="text-[0.9rem] font-semibold text-[#203649]">Password</span>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                {...register("password", { required: "Password is required." })}
                autoComplete="new-password"
                placeholder="Create a strong password"
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

          <Button size="lg" type="submit" className="w-full mt-0.5" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>

          {errors.root && (
            <p className="rounded-xl border border-[rgba(180,59,51,0.18)] bg-[rgba(180,59,51,0.06)] px-3 py-2.5 text-[0.9rem] font-semibold text-[#b43b33]">
              {errors.root.message}
            </p>
          )}

          <p className="text-[#506071] text-[0.97rem] leading-[1.55]">
            Already have an account?{" "}
            <Link
              className="text-[#0f5a78] font-semibold hover:underline"
              to={`/signin?inviteId=${inviteId}`}
            >
              Sign in
            </Link>
          </p>
        </form>
      </article>
    </section>
  );
};

export default RegisterPage;
