import { AuthProvider } from "react-oidc-context";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const cognitoAuthConfig = {
  authority: import.meta.env.VITE_AUTHORITY,
  client_id: import.meta.env.VITE_COGNITO_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_REDIRECT_URI,
  response_type: import.meta.env.VITE_RESPONSE_TYPE,
  scope: import.meta.env.VITE_SCOPE,
};


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...cognitoAuthConfig}>

      <App />
    </AuthProvider>

  </StrictMode>,
)


