import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { CheckIcon, EyeIcon, EyeOffIcon, XCircleIcon } from "@untitledui/icons-react/outline";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import Breadcrumbs from "../../components/Breadcrumbs";
import { useAuthContext } from "../../context/useAuthContext";
import { validateOrganizationFacilityCode } from "../../api/organizations";
import { registerUser } from "../../auth";
import {
  signUpSchema,
  type SignUpFormValues,
  type SignUpRole,
  FACILITY_CODE_MIN_LENGTH,
} from "../../schemas/auth";

const TOGGLE_CLS =
  "absolute top-1/2 right-2 -translate-y-1/2 size-[34px] grid place-items-center rounded-lg border-0 bg-transparent text-[#2f5468] cursor-pointer hover:bg-emerald-700/[0.08] focus-visible:outline-2 focus-visible:outline-emerald-700/40 [&_svg]:size-[18px]";

const ROLE_OPTIONS: { value: SignUpRole; label: string; desc: string }[] = [
  {
    value: "member",
    label: "Facility Member",
    desc: "Staff joining an existing facility",
  },
  {
    value: "admin",
    label: "Facility Admin",
    desc: "Register as a new service provider",
  },
];

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { isAuthenticated } = useAuthContext();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    defaultValues: {
      role: "member",
      name: "",
      email: "",
      phoneNumber: "",
      birthdate: "",
      facility_code: "",
      password: "",
    },
  });

  const role = useWatch({ control, name: "role" });
  const facilityCodeValue = useWatch({ control, name: "facility_code" });

  const isMember = role === "member";
  const trimmedFacilityCode = facilityCodeValue.trim();
  const shouldValidate = isMember && trimmedFacilityCode.length >= FACILITY_CODE_MIN_LENGTH;

  const facilityQuery = useQuery({
    queryKey: ["organizations", "validate", trimmedFacilityCode],
    queryFn: () => validateOrganizationFacilityCode(trimmedFacilityCode),
    enabled: shouldValidate,
    retry: false,
  });

  const validatedFacilityId = facilityQuery.data?.facilityId;
  const isPending = shouldValidate && facilityQuery.isFetching;
  const isValid = Boolean(validatedFacilityId);
  const hasInput = trimmedFacilityCode.length > 0;

  const canSubmit = !isSubmitting && (isMember ? isValid && !isPending : true);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (formValues: SignUpFormValues) => {
    const parsed = signUpSchema.safeParse(formValues);
    if (!parsed.success) {
      parsed.error.issues.forEach(({ path, message }) => {
        const field = path[0];
        if (field && field in formValues) {
          setError(field as keyof SignUpFormValues, { type: "manual", message });
        }
      });
      return;
    }

    if (parsed.data.role === "member") {
      if (isPending) {
        setError("facility_code", { message: "Validating facility code — please wait." });
        return;
      }
      if (!validatedFacilityId) {
        setError("facility_code", { message: "Facility code not found. Enter a valid facility code." });
        return;
      }
    }

    try {
      const result = await registerUser({
        email: formValues.email.trim(),
        name: formValues.name.trim(),
        phone_number: formValues.phoneNumber.trim(),
        password: formValues.password,
        birthdate: formValues.birthdate,
        ...(parsed.data.role === "member" && {
          facility_code: formValues.facility_code.trim(),
          facility_id: validatedFacilityId,
        }),
      });
      const encodedEmail = encodeURIComponent(formValues.email.trim());
      const encodedUsername = encodeURIComponent(result.username);
      navigate(`/confirm-signup?email=${encodedEmail}&username=${encodedUsername}`, { replace: true });
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Failed to sign up",
      });
    }
  };

  return (
    <section className="grid place-items-center mt-3.5 reveal delay-1">
      <article className="w-full max-w-190 rounded-3xl border border-[rgba(10,52,60,0.13)] bg-[rgba(255,255,255,0.82)] p-[clamp(20px,4vw,34px)] shadow-[0_14px_34px_rgba(12,35,40,0.1)]">
        <p className="eyebrow">New Account Registration</p>
        <h1 className="mt-2.5 font-heading text-[#0d2230] text-[clamp(1.4rem,3.2vw,2rem)] leading-[1.1] tracking-[-0.03em]">
          Create a referral desk account
        </h1>
        <p className="mt-3.5 text-[#506071] text-[0.97rem] leading-[1.55]">
          Register your account, then confirm your email with the code sent to you.
        </p>

        <Breadcrumbs
          className="mt-3.5"
          items={[{ label: "Home", to: "/" }, { label: "Sign up" }]}
        />

        <form className="mt-4.5 grid gap-3.5" onSubmit={handleSubmit(onSubmit)}>
          {/* Account type selector */}
          <div className="grid sm:grid-cols-2 gap-3">
            {ROLE_OPTIONS.map(({ value, label, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setValue("role", value)}
                className={`text-left p-3.5 rounded-2xl border-2 transition-colors cursor-pointer ${
                  role === value
                    ? "border-[#0f5a78] bg-[rgba(15,90,120,0.06)]"
                    : "border-[rgba(10,52,60,0.15)] hover:border-[rgba(10,52,60,0.3)]"
                }`}
              >
                <p className={`text-[0.9rem] font-semibold ${role === value ? "text-[#0f5a78]" : "text-[#203649]"}`}>
                  {label}
                </p>
                <p className="mt-0.5 text-[0.82rem] text-[#506071]">{desc}</p>
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3.5">
            <label className="grid gap-2">
              <span className="text-[0.9rem] font-semibold text-[#203649]">Full Name</span>
              <Input {...register("name")} autoComplete="name" placeholder="Jane Doe" />
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
              <span className="text-[0.9rem] font-semibold text-[#203649]">Phone Number (E.164)</span>
              <Input
                type="tel"
                {...register("phoneNumber")}
                autoComplete="tel"
                placeholder="+254712345678"
              />
              {errors.phoneNumber && (
                <small className="text-[0.85rem] font-semibold text-[#b43b33]">
                  {errors.phoneNumber.message}
                </small>
              )}
            </label>

            <label className="grid gap-2">
              <span className="text-[0.9rem] font-semibold text-[#203649]">Birthdate</span>
              <Input type="date" {...register("birthdate")} />
              {errors.birthdate && (
                <small className="text-[0.85rem] font-semibold text-[#b43b33]">
                  {errors.birthdate.message}
                </small>
              )}
            </label>

            {isMember && (
              <label className="grid gap-2">
                <span className="text-[0.9rem] font-semibold text-[#203649]">Facility Code</span>
                <div className="relative">
                  <Input
                    {...register("facility_code")}
                    placeholder="FAC-001"
                    className={hasInput ? "pr-10" : ""}
                  />
                  {hasInput && isPending && (
                    <span className="absolute top-1/2 right-2.5 -translate-y-1/2 size-6 grid place-items-center pointer-events-none">
                      <span className="size-4 rounded-full border-2 border-[rgba(10,52,60,0.15)] border-t-[#0f5a78] animate-spin" />
                    </span>
                  )}
                  {hasInput && !isPending && isValid && (
                    <span
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 size-6 grid place-items-center rounded-full bg-[rgba(17,122,101,0.12)] text-[#0f7a65] pointer-events-none [&_svg]:size-4"
                      aria-label="Facility code exists"
                    >
                      <CheckIcon />
                    </span>
                  )}
                  {hasInput && !isPending && !isValid && (
                    <span
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 size-6 grid place-items-center rounded-full bg-[rgba(180,59,51,0.14)] text-[#b43b33] pointer-events-none [&_svg]:size-4"
                      aria-label="Facility code is incorrect"
                    >
                      <XCircleIcon />
                    </span>
                  )}
                </div>
                {errors.facility_code && (
                  <small className="text-[0.85rem] font-semibold text-[#b43b33]">
                    {errors.facility_code.message}
                  </small>
                )}
              </label>
            )}

            <label className={`grid gap-2 ${!isMember ? "sm:col-start-2" : ""}`}>
              <span className="text-[0.9rem] font-semibold text-[#203649]">Password</span>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
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
          </div>

          <Button size="lg" type="submit" className="w-full mt-0.5" disabled={!canSubmit}>
            {isSubmitting ? "Creating account…" : "Sign up"}
          </Button>
        </form>

        {errors.root && (
          <p className="mt-4 rounded-xl border border-[rgba(180,59,51,0.18)] bg-[rgba(180,59,51,0.06)] px-3 py-2.5 text-[0.9rem] font-semibold text-[#b43b33]">
            {errors.root.message}
          </p>
        )}

        <p className="mt-3.5 text-[#506071] text-[0.97rem] leading-[1.55]">
          Already registered?{" "}
          <Link className="text-[#0f5a78] font-semibold hover:underline" to="/signin">
            Sign in
          </Link>
        </p>
      </article>
    </section>
  );
};

export default SignUpPage;
