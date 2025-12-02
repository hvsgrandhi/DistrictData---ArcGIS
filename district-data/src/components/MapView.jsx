import { useEffect, useRef } from "react";
import chroma from "chroma-js";
import esriConfig from "@arcgis/core/config"; // fine to import config only
import "@arcgis/map-components/dist/components/arcgis-legend";

// keep the CSS import (Vite will bundle it)
import "@arcgis/core/assets/esri/themes/light/main.css";

export default function MapViewComponent() {
    const containerRef = useRef(null);
    const viewRef = useRef(null);
    const legendRef = useRef(null);  // Ref for the legend component

    useEffect(() => {
        esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;

        let view;
        let map;
        let layer;
        const init = async () => {
            try {
                const [{ default: EsriMap }, { default: MapView }, { default: FeatureLayer }] = await Promise.all([
                    import("@arcgis/core/Map"),
                    import("@arcgis/core/views/MapView"),
                    import("@arcgis/core/layers/FeatureLayer"),
                ]);

                map = new EsriMap({
                    basemap: "streets",
                });

                view = new MapView({
                    container: containerRef.current,
                    map,
                    center: [78.96288, 20.593684],
                    zoom: 5,
                });

                viewRef.current = view;

                await view.when();

                if (legendRef.current) {
                    legendRef.current.view = view;
                }

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
            if (viewRef.current) {
                viewRef.current.container = null;
                viewRef.current.destroy();
                viewRef.current = null;
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{ width: "100%", height: "100vh", position: "relative" }}
        >
            <arcgis-legend
                ref={legendRef}
                style={{
                    position: "absolute",
                    bottom: "20px",
                    right: "20px",
                    zIndex: 10,
                    background: "white",
                    padding: "8px",
                    borderRadius: "6px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.3)"
                }}
            ></arcgis-legend>
        </div>
    );

}
