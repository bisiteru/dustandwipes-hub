import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { initSentry } from "./lib/sentry";

// Initialize Sentry as early as possible so errors during the initial
// React render are captured. No-op if REACT_APP_SENTRY_DSN is unset or
// NODE_ENV !== "production" (see lib/sentry.ts for the gating logic).
initSentry();

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root not found in index.html");

const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Pass a function to start measuring performance (e.g. reportWebVitals(console.log)).
reportWebVitals();
