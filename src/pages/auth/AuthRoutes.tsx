import { Route } from "react-router-dom";
import SignInPage from "./SignInPage";
import SignUpPage from "./SignUpPage";
import ConfirmSignUpPage from "./ConfirmSignUpPage";
import ResetPasswordPage from "./ResetPasswordPage";
import AcceptInvitePage from "./registration/AcceptInvitePage";
import RegisterPage from "./registration/RegisterPage";

export function AuthRoutes() {
  return (
    <>
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/confirm-signup" element={<ConfirmSignUpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/invite/:inviteId" element={<AcceptInvitePage />} />
      <Route path="/invites/:inviteId/accept" element={<AcceptInvitePage />} />
      <Route path="/invite/:inviteId/register" element={<RegisterPage />} />
    </>
  );
}
