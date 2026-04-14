import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { EyeIcon, EyeOffIcon } from "@untitledui/icons-react/outline";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import Breadcrumbs from "../../components/Breadcrumbs";
import { confirmPasswordReset, requestPasswordReset } from "../../auth";
import { type ResetFormValues } from "../../schemas/auth";

type ResetStage = "request" | "confirm";

const TOGGLE_CLS =
  "absolute top-1/2 right-2 -translate-y-1/2 size-[34px] grid place-items-center rounded-lg border-0 bg-transparent text-[#2f5468] cursor-pointer hover:bg-emerald-700/[0.08] focus-visible:outline-2 focus-visible:outline-emerald-700/40 [&_svg]:size-[18px]";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [stage, setStage] = useState<ResetStage>("request");
  const [showPassword, setShowPassword] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState("");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    defaultValues: {
      username: searchParams.get("username")?.trim() ?? "",
      code: "",
      newPassword: "",
    },
  });

  const onRequest = async (formValues: ResetFormValues) => {
    if (!formValues.username.trim()) {
      setError("username", { message: "Email or username is required." });
      return;
    }
    try {
      const result = await requestPasswordReset(formValues.username.trim());
      if (result.nextStep.resetPasswordStep === "DONE") {
        navigate("/signin", { replace: true });
        return;
      }
      const destination = result.nextStep.codeDeliveryDetails?.destination;
      setDeliveryInfo(destination ? `A reset code was sent to ${destination}.` : "A reset code was sent.");
      setStage("confirm");
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Failed to request password reset",
      });
    }
  };

  const onConfirm = async (formValues: ResetFormValues) => {
    if (!formValues.code.trim()) {
      setError("code", { message: "Reset code is required." });
      return;
    }
    if (!formValues.newPassword) {
      setError("newPassword", { message: "New password is required." });
      return;
    }
    try {
      await confirmPasswordReset(formValues.username.trim(), formValues.code.trim(), formValues.newPassword);
      navigate("/signin", { replace: true });
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Failed to reset password",
      });
    }
  };

  return (
    <section className="grid place-items-center mt-3.5 reveal delay-1">
      <article className="w-full max-w-120 rounded-3xl border border-[rgba(10,52,60,0.13)] bg-[rgba(255,255,255,0.82)] p-[clamp(20px,4vw,34px)] shadow-[0_14px_34px_rgba(12,35,40,0.1)]">
        <p className="eyebrow">Account Recovery</p>
        <h1 className="mt-2.5 font-heading text-[#0d2230] text-[clamp(1.4rem,3.2vw,2rem)] leading-[1.1] tracking-[-0.03em]">
          Reset your password
        </h1>
        <p className="mt-3.5 text-[#506071] text-[0.97rem] leading-[1.55]">
          {stage === "request"
            ? "Enter your sign-in email or username to get a reset code."
            : "Enter the reset code and choose a new password."}
        </p>

        <Breadcrumbs
          className="mt-3.5"
          items={[
            { label: "Home", to: "/" },
            { label: "Sign in", to: "/signin" },
            { label: "Reset password" },
          ]}
        />

        <form
          className="mt-4.5 grid gap-3.5"
          onSubmit={handleSubmit(stage === "request" ? onRequest : onConfirm)}
        >
          <label className="grid gap-2">
            <span className="text-[0.9rem] font-semibold text-[#203649]">Email or Username</span>
            <Input
              {...register("username")}
              autoComplete="username"
              placeholder="name@facility.go.ke"
              readOnly={stage === "confirm"}
            />
            {errors.username && (
              <small className="text-[0.85rem] font-semibold text-[#b43b33]">
                {errors.username.message}
              </small>
            )}
          </label>

          {stage === "confirm" && (
            <>
              <label className="grid gap-2">
                <span className="text-[0.9rem] font-semibold text-[#203649]">Reset Code</span>
                <Input
                  {...register("code")}
                  autoComplete="one-time-code"
                  placeholder="123456"
                />
                {errors.code && (
                  <small className="text-[0.85rem] font-semibold text-[#b43b33]">
                    {errors.code.message}
                  </small>
                )}
              </label>

              <label className="grid gap-2">
                <span className="text-[0.9rem] font-semibold text-[#203649]">New Password</span>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    {...register("newPassword")}
                    autoComplete="new-password"
                    placeholder="Enter your new password"
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
                {errors.newPassword && (
                  <small className="text-[0.85rem] font-semibold text-[#b43b33]">
                    {errors.newPassword.message}
                  </small>
                )}
              </label>
            </>
          )}

          <Button size="lg" type="submit" className="w-full mt-0.5" disabled={isSubmitting}>
            {isSubmitting
              ? stage === "request" ? "Sending code…" : "Resetting…"
              : stage === "request" ? "Send reset code" : "Reset password"}
          </Button>
        </form>

        {deliveryInfo && (
          <p className="mt-4 rounded-xl border border-[rgba(17,122,101,0.24)] bg-[rgba(17,122,101,0.09)] px-3 py-2.5 text-[0.9rem] font-semibold text-[#0f5f52]">
            {deliveryInfo}
          </p>
        )}

        {errors.root && (
          <p className="mt-4 rounded-xl border border-[rgba(180,59,51,0.18)] bg-[rgba(180,59,51,0.06)] px-3 py-2.5 text-[0.9rem] font-semibold text-[#b43b33]">
            {errors.root.message}
          </p>
        )}

        <p className="mt-3.5 text-[#506071] text-[0.97rem] leading-[1.55]">
          Back to{" "}
          <Link className="text-[#0f5a78] font-semibold hover:underline" to="/signin">
            sign in
          </Link>
          .
        </p>
      </article>
    </section>
  );
};

export default ResetPasswordPage;
