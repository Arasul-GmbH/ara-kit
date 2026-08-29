import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./stil.css";
import { App } from "./app";

const wurzel = document.getElementById("app");
if (!wurzel) throw new Error("In der index.html fehlt <div id=\"app\">.");

createRoot(wurzel).render(
  <StrictMode>
    <App />
  </StrictMode>
);
