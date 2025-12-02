import React from "react";
import { createRoot } from "react-dom/client";

import "@arcgis/core/assets/esri/themes/light/main.css";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary.jsx";


import App from "./App.jsx";
import { DistrictProvider } from "./context/DistrictContext.jsx";

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <DistrictProvider>
      <App />
    </DistrictProvider>
  </ErrorBoundary>

)
