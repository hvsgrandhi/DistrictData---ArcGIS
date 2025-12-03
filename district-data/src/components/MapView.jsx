import { use, useEffect, useRef, useState } from "react";
import chroma from "chroma-js";
import esriConfig from "@arcgis/core/config";
import "@arcgis/map-components/dist/components/arcgis-legend";
import "@arcgis/core/assets/esri/themes/light/main.css";
import { useDistrict } from "../context/DistrictContext";
import styles from "./MapView.module.css";
// import "@arcgis/map-components/dist/components/arcgis-print";
// import Portal from "@arcgis/core/portal/Portal";




export default function MapViewComponent() {
    const wrapperRef = useRef(null); // outer wrapper (React-managed)
    const mapRef = useRef(null);     // dedicated map container for ArcGIS
    const viewRef = useRef(null);
    const legendRef = useRef(null);
    const layerRef = useRef(null);
    const highlightRef = useRef(null);
    // const printRef = useRef(null);
    // const [showLegend, setShowLegend] = useState(true);
    // const [showPrint, setShowPrint] = useState(false);
    const [printing, setPrinting] = useState(false);



    const { setDistrictPopulationData, selectedID, selectedState, setSelectedState, setFullData, tableSelectedRowArr, setTableSelectedRowArr, setVisibleDistricts, setClearRows, visibleDistricts } = useDistrict();


    useEffect(() => {
        esriConfig.apiKey = import.meta.env.VITE_ARCGIS_API_KEY;

        let cancelled = false;
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

                // create map + view and attach to a dedicated map DOM node (mapRef.current)
                map = new EsriMap({ basemap: "streets" });

                view = new MapView({
                    container: mapRef.current,
                    map,
                    center: [80.96288, 21.593684],
                    zoom: 4,
                });

                viewRef.current = view;

                await view.when();
                // 🔍 Watch visible districts in viewport
                view.watch("stationary", async (isStationary) => {
                    if (!isStationary) return;

                    const layer = layerRef.current;
                    const view = viewRef.current;
                    if (!layer || !view) return;

                    const layerView = await view.whenLayerView(layer);

                    const visible = await layerView.queryFeatures({
                        geometry: view.extent,
                        spatialRelationship: "intersects",
                        returnGeometry: false,
                        outFields: ["DISTRICT", "censuscode", "ST_NM"]
                    });

                    setVisibleDistricts(visible.features.map(f => f.attributes));
                });






                // attach legend component (React-managed element) to the view
                if (legendRef.current) {
                    // for the web component, assign view
                    legendRef.current.view = view;
                }

                const layer = new FeatureLayer({
                    id: "districtLayer",
                    url:
                        "https://services7.arcgis.com/K0Zm1EpRXL1ZlEV1/arcgis/rest/services/Join_Features_to_districts_view/FeatureServer",
                    outFields: ["*"],
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
                    outFields: ["*"],
                    returnGeometry: false,
                });

                setFullData(stats);
                console.log("Full data loaded:", stats);

                if (cancelled) return;

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
                // more informative logging
                console.error("ArcGIS init error:", err);
            }
        };

        init();

        return () => {
            cancelled = true;
            // proper cleanup of view
            if (viewRef.current) {
                try {
                    viewRef.current.container = null;
                    viewRef.current.destroy();
                } catch (e) {
                    console.warn("Error destroying view:", e);
                } finally {
                    viewRef.current = null;
                }
            }
            layerRef.current = null;
            highlightRef.current = null;
        };
    }, [setDistrictPopulationData]);
    // useEffect(() => {
    //     // When visible districts change, clear selection safely
    //     setTableSelectedRowArr([]);
    //     setClearRows(prev => !prev);
    // }, [visibleDistricts]);

    // fly & highlight district when selectedID changes
    useEffect(() => {
        const view = viewRef.current;
        const layer = layerRef.current;

        if (!view || !layer || !selectedID) return;

        const goToDistrict = async () => {
            try {
                const query = layer.createQuery();
                // assume censusCode is numeric or safe; if string, consider escaping
                query.where = `censuscode = '${selectedID}'`;
                query.returnGeometry = true;

                const results = await layer.queryFeatures(query);
                if (results.features.length) {
                    const feature = results.features[0];

                    await view.goTo({
                        target: feature.geometry,
                        zoom: 8,
                    });

                    const layerView = await view.whenLayerView(layer);

                    // remove existing highlight
                    if (highlightRef.current) {
                        try { highlightRef.current.remove(); } catch { }
                        highlightRef.current = null;
                    }

                    highlightRef.current = layerView.highlight(feature);

                    const centroidPoint = feature.geometry.centroid
                        ? feature.geometry.centroid
                        : feature.geometry.getCentroid();

                    view.openPopup({
                        features: [feature],
                        location: centroidPoint,
                        autoCloseEnabled: true,
                    });
                }
            } catch (err) {
                console.error("Error highlighting/flying to district:", err);
            }
        };

        goToDistrict();
    }, [selectedID]);

    useEffect(() => {
        const view = viewRef.current;
        const layer = layerRef.current;
        if (!view || !layer || !selectedState) return;

        const goToState = async () => {
            try {
                const safeState = String(selectedState).replace(/'/g, "''");
                layer.definitionExpression = `ST_NM = '${safeState}'`;

                const query = layer.createQuery();
                query.where = layer.definitionExpression;
                query.outFields = ["DISTRICT", "ST_NM", "censuscode"];
                query.returnGeometry = true;

                const stRes = await layer.queryFeatures(query);

                if (!stRes.features.length) return;

                const centerFeature = stRes.features[Math.floor(stRes.features.length / 2)];

                await view.goTo({
                    target: centerFeature.geometry,
                    zoom: 6,
                });

                // remove highlight if present
                if (highlightRef.current) {
                    try { highlightRef.current.remove(); } catch { }
                    highlightRef.current = null;
                }
            } catch (err) {
                console.error("Error in goToState:", err);
            }
        };

        goToState();
    }, [selectedState]);

    // useEffect(() => {
    //     const view = viewRef.current;
    //     const layer = layerRef.current;

    //     if (!view || !layer) return;
    //     if (!tableSelectedRowArr || tableSelectedRowArr.length === 0) {
    //         // if no rows selected → clear filter
    //         layer.definitionExpression = null;
    //         return;
    //     }

    //     const plotDistricts = async () => {
    //         try {
    //             const codes = tableSelectedRowArr;

    //             // Build SQL IN clause
    //             const where = `censuscode IN (${codes.map(c => `'${c}'`).join(",")})`;

    //             layer.definitionExpression = where;

    //             const query = layer.createQuery();
    //             query.where = where;
    //             query.returnGeometry = true;

    //             const results = await layer.queryFeatures(query);

    //             if (!results.features.length) return;

    //             // await view.goTo({
    //             //     target: results.features.map(f => f.geometry),
    //             //     zoom: 7
    //             // });

    //         } catch (err) {
    //             console.error("plotDistricts error:", err);
    //         }
    //     };

    //     plotDistricts();
    // }, [tableSelectedRowArr]);


    useEffect(() => {
        const view = viewRef.current;
        const layer = layerRef.current;
        if (!view || !layer) return;

        const buildExpression = () => {
            const safeState = selectedState
                ? String(selectedState).replace(/'/g, "''")
                : null;

            const stateExpr = safeState ? `ST_NM = '${safeState}'` : null;

            const codes = (tableSelectedRowArr || []).map(c => String(c));

            const codesExpr = codes.length
                ? `censuscode IN (${codes
                    .map(code =>
                        /^\d+$/.test(code)
                            ? code
                            : `'${code.replace(/'/g, "''")}'`
                    )
                    .join(",")})`
                : null;

            if (stateExpr && codesExpr) return `${stateExpr} AND ${codesExpr}`;
            return stateExpr || codesExpr || null;
        };

        layer.definitionExpression = buildExpression();
    }, [tableSelectedRowArr, selectedState]);


    const resetState = () => {
        const view = viewRef.current;
        const layer = layerRef.current;

        setSelectedState(null);

        if (layer) {
            layer.definitionExpression = null;
        }

        if (highlightRef.current) {
            try {
                highlightRef.current.remove();
            } catch (e) {
                console.warn("Highlight already removed");
            }
            highlightRef.current = null;
        }

        if (view && view.container) {
            view
                .goTo({
                    center: [80.96288, 21.593684],
                    zoom: 4,
                })
                .catch(() => {
                    /* ignore if destroyed */
                });
        }
    };

    const manualPrint = async () => {
        const view = viewRef.current;
        if (!view) return;
        setPrinting(true);



        const [{ default: PrintTemplate }, { default: PrintParameters }, print] =
            await Promise.all([
                import("@arcgis/core/rest/support/PrintTemplate"),
                import("@arcgis/core/rest/support/PrintParameters"),
                import("@arcgis/core/rest/print")
            ]);

        const PRINT_SERVICE_URL =
            "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task";

        const template = new PrintTemplate({
            format: "pdf",
            layout: "a4-landscape",
            layoutOptions: {
                titleText: "District Map Export",
                authorText: "Harshvardhan",
                scalebarUnit: "Kilometers",
                legendLayers: [{ layerId: "districtLayer" }]
            },
            exportOptions: {
                dpi: 300,
                width: 2400,
                height: 1600
            }
        });

        const params = new PrintParameters({
            view,
            template
        });

        try {
            const result = await print.execute(PRINT_SERVICE_URL, params);

            // auto download
            const link = document.createElement("a");
            link.href = result.url;
            link.download = "exported-map.pdf";
            link.click();

        } catch (err) {
            console.error("Print failed:", err);
        } finally {
            setPrinting(false);
        }

    };




    //EXPORT MAP AS PNG 

    // const exportPng = async () => {
    //     const view = viewRef.current;
    //     if (!view) return;

    //     try {
    //         const screenshot = await view.takeScreenshot({
    //             width: Math.max(1200, view.width || 1200),
    //             height: Math.max(800, view.height || 800),
    //             format: "png",
    //         });

    //         const link = document.createElement("a");
    //         link.href = screenshot.dataUrl || screenshot.data;
    //         link.download = "map-export.png";
    //         link.click();
    //     } catch (err) {
    //         console.error("Screenshot export failed:", err);
    //     }
    // };

    //EXPORT MAP AS PNG USING PRINT WIDGET

    // useEffect(() => {
    //     if (!viewRef.current || !printRef.current) return;

    //     const portal = new Portal({
    //         url: "https://user.maps.arcgis.com/sharing",
    //         authMode: "immediate",
    //         authorizedCrossOriginDomains: ["https://user.maps.arcgis.com"],
    //     });

    //     printRef.current.view = viewRef.current;
    //     printRef.current.portal = portal;

    // }, [viewRef.current]);

    return (
        <div
            ref={wrapperRef}
            style={{ width: "100%", height: "100vh", position: "relative" }}
        >
            <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

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
            />

            {/* EXPORT MAP USING PRINT WIDGET */}
            {/* <arcgis-print
                ref={printRef}
                style={{
                    position: "absolute",
                    bottom: "20px",
                    left: "20px",
                    zIndex: 20,
                    background: "white",
                    borderRadius: "6px",
                }}
            ></arcgis-print> */}



            {selectedState && (
                <div className={styles.reset} >
                    <button onClick={resetState}>Reset</button>
                </div>
            )}
            <div className={styles.export}>

                <button onClick={manualPrint} >
                    Print PDF
                </button>
            </div>

            {printing && (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        background: "rgba(255,255,255,0.85)",
                        padding: "20px 30px",
                        borderRadius: "8px",
                        zIndex: 2000,
                        fontSize: "18px",
                        fontWeight: "bold",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                    }}
                >
                    Generating PDF
                    <span className={styles.dot1}>.</span>
                    <span className={styles.dot2}>.</span>
                    <span className={styles.dot3}>.</span>
                </div>
            )}





            {/* EXPORT MAP AS PNG */}
            {/* <div className={styles.export} >
                <button onClick={exportPng} className={styles.exportBtn}>
                    Export Map
                </button>
            </div> */}
        </div>
    );
}
