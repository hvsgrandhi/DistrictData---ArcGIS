// src/components/MapView.jsx
import { useEffect, useRef } from "react";
import chroma from "chroma-js";
import esriConfig from "@arcgis/core/config"; // fine to import config only

// keep the CSS import (Vite will bundle it)
import "@arcgis/core/assets/esri/themes/light/main.css";

export default function MapViewComponent() {
    const containerRef = useRef(null);
    const viewRef = useRef(null);

    useEffect(() => {
        // 1) set API key BEFORE loading Map/MapView modules
        esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;

        let view;
        let map;
        let layer; // keep reference for cleanup

        const init = async () => {
            try {
                // 2) dynamic import AFTER setting apiKey
                const [{ default: EsriMap }, { default: MapView }, { default: FeatureLayer }] = await Promise.all([
                    import("@arcgis/core/Map"),
                    import("@arcgis/core/views/MapView"),
                    import("@arcgis/core/layers/FeatureLayer"),
                ]);

                // 3) create map & view
                map = new EsriMap({
                    basemap: "streets", // styles API basemap (requires API key)
                });

                view = new MapView({
                    container: containerRef.current,
                    map,
                    center: [78.96288, 20.593684],
                    zoom: 5,
                });

                viewRef.current = view;

                await view.when();

                // 4) create FeatureLayer (doesn't need to be added to map to query)
                layer = new FeatureLayer({
                    url:
                        "https://services7.arcgis.com/K0Zm1EpRXL1ZlEV1/arcgis/rest/services/Join_Features_to_districts_view/FeatureServer",
                    outFields: ["DISTRICT", "total_population", "ST_NM"],
                    popupTemplate: {
                        title: "District Information",
                        content:
                            "<b>District:</b> {DISTRICT}<br><b>Population:</b> {total_population}<br><b>State:</b> {ST_NM}",
                    },
                });

                const stats = await layer.queryFeatures({
                    where: "1=1",
                    outFields: ["total_population"],
                    returnGeometry: false,
                });

                const data = stats.features
                    .map((f) => f.attributes.total_population)
                    .filter((v) => v != null);

                if (!data.length) {
                    console.warn("No population values found; adding layer without renderer.");
                    map.add(layer);
                    return;
                }

                const breaks = chroma.limits(data, "e", 6);
                console.log("Class Breaks:", breaks);

                const colors = chroma.scale(["#fafa6e", "#2A4858"]).mode("lch").colors(6);

                layer.renderer = {
                    type: "class-breaks",
                    field: "total_population",
                    classBreakInfos: breaks.slice(0, -1).map((b, i) => ({
                        minValue: breaks[i],
                        maxValue: breaks[i + 1],
                        symbol: {
                            type: "simple-fill",
                            color: colors[i],
                            outline: { color: "#333", width: 0.2 },
                        },
                        label: `${Math.round(breaks[i])} - ${Math.round(breaks[i + 1])}`,
                    })),
                };

                map.add(layer);
            } catch (err) {
                console.error("ArcGIS init error:", err);
            }
        };

        init();

        return () => {
            // cleanup
            if (viewRef.current) {
                viewRef.current.container = null;
                viewRef.current.destroy();
                viewRef.current = null;
            }
        };
    }, []);

    return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />;
}
