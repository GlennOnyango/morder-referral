import { Route } from "react-router-dom";
import HomePage from "./HomePage";
import HowItWorksPage from "./HowItWorksPage";
import AboutPage from "./AboutPage";

export function PublicRoutes() {
  return (
    <>
      <Route path="/" element={<HomePage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/about" element={<AboutPage />} />
    </>
  );
}
