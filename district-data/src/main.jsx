import React from "react";
import { createRoot } from "react-dom/client";

import { defineCustomElements } from "@esri/calcite-components/dist/loader";
import "@arcgis/core/assets/esri/themes/light/main.css";
import "@esri/calcite-components/dist/calcite/calcite.css";
import "./index.css";

// initialize Calcite web components
// defineCustomElements(window);

import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <App />
);
