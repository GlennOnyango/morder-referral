import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    Cognito:{
      userPoolId:import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId:import.meta.env.VITE_COGNITO_CLIENT_ID,
      loginWith:{
        email:true
      },
      signUpVerificationMethod:"code"
    }
  }
});


const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
