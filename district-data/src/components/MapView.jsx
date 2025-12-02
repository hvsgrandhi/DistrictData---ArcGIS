import { useEffect, useRef } from "react";
import chroma from "chroma-js";
import esriConfig from "@arcgis/core/config";
import "@arcgis/map-components/dist/components/arcgis-legend";
import "@arcgis/core/assets/esri/themes/light/main.css";
import { useDistrict } from "../context/DistrictContext";


export default function MapViewComponent() {
    const containerRef = useRef(null);
    const viewRef = useRef(null);
    const legendRef = useRef(null);
    const layerRef = useRef(null);
    const highlightRef = useRef(null);

    const { setDistrictPopulationData, selectedID } = useDistrict();


    useEffect(() => {
        esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;

        let view;
        let map;

        const init = async () => {
            try {
                const [{ default: EsriMap }, { default: MapView }, { default: FeatureLayer }] =
                    await Promise.all([
                        import("@arcgis/core/Map"),
                        import("@arcgis/core/views/MapView"),
                        import("@arcgis/core/layers/FeatureLayer"),
                    ]);

                map = new EsriMap({ basemap: "streets" });

                view = new MapView({
                    container: containerRef.current,
                    map,
                    center: [86.96288, 21.593684],
                    zoom: 4,
                    highlightOptions: {
                        color: [0, 0, 0, 1],
                        haloOpacity: 0.9,
                        fillOpacity: 0.3
                    }

                });

                viewRef.current = view;

                await view.when();

                if (legendRef.current) {
                    legendRef.current.view = view;
                }

                const layer = new FeatureLayer({
                    url:
                        "https://services7.arcgis.com/K0Zm1EpRXL1ZlEV1/arcgis/rest/services/Join_Features_to_districts_view/FeatureServer",
                    outFields: ["DISTRICT", "total_population", "ST_NM", "censuscode"],
                    popupTemplate: {
                        title: "District Information",
                        content:
                            "<b>District:</b> {DISTRICT}<br><b>Population:</b> {total_population}<br><b>State:</b> {ST_NM}",
                    },
                });

                layerRef.current = layer;

                // Query for population data to build renderer
                const stats = await layer.queryFeatures({
                    where: "1=1",
                    outFields: ["DISTRICT", "total_population", "ST_NM", "censuscode"],
                    returnGeometry: false,
                });

                const districtData = stats.features
                    .map((f) => ({
                        district: f.attributes.DISTRICT,
                        population: f.attributes.total_population,
                        state: f.attributes.ST_NM,
                        censusCode: f.attributes.censuscode,
                    }))
                    .filter((d) => d.population != null);

                setDistrictPopulationData(districtData);

                const data = districtData.map((d) => d.population);

                if (!data.length) {
                    console.warn("No population values found; adding layer without renderer.");
                    map.add(layer);
                    return;
                }

                const breaks = chroma.limits(data, "e", 6);
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

    useEffect(() => {
        const view = viewRef.current;
        const layer = layerRef.current;

        if (!view || !layer || !selectedID) return;

        const goToDistrict = async () => {
            try {
                const query = layer.createQuery();
                query.where = `censuscode = '${selectedID}'`;
                query.returnGeometry = true;

                const results = await layer.queryFeatures(query);
                if (results.features.length) {
                    const feature = results.features[0];

                    view.goTo({
                        target: feature.geometry,
                        zoom: 8,
                    });

                    const layerView = await view.whenLayerView(layer);

                    if (highlightRef.current) highlightRef.current.remove();

                    highlightRef.current = layerView.highlight(feature);

                    const centroidPoint = feature.geometry.centroid
                        ? feature.geometry.centroid
                        : feature.geometry.getCentroid();

                    view.openPopup({
                        features: [feature],
                        location: centroidPoint,

                    });
                }
            } catch (err) {
                console.error("Error highlighting/flying to district:", err);
            }
        };


        goToDistrict();
    }, [selectedID]);

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
                    padding: "5px",
                    borderRadius: "6px",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
                }}
            ></arcgis-legend>
        </div>
    )
}
