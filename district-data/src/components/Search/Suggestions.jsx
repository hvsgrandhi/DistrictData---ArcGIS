import React, { useMemo, useEffect } from "react";
import { useDistrict } from "../../context/DistrictContext";
import styles from "./Suggestions.module.css";

export default function Suggestions() {
    const { districtPopulationData, query = "", setQuery, setSelectedID, selectedID, setSelectedState } = useDistrict();

    // Convert districtPopulationData into an array if it is not already
    const dataArray = useMemo(() => {
        if (Array.isArray(districtPopulationData)) return districtPopulationData;
        if (districtPopulationData && typeof districtPopulationData === "object") {
            try {
                return Object.values(districtPopulationData);
            } catch {
                return [];
            }
        }
        return [];
    }, [districtPopulationData]);

    const normalized = (query || "").trim().toLowerCase();

    // Sort districts by population (for top 5)
    const popular = useMemo(
        () =>
            [...dataArray]
                .sort((a, b) => (b?.population || 0) - (a?.population || 0))
                .slice(0, 5),
        [dataArray]
    );

    // Filter results based on the query
    const filtered = useMemo(() => {
        if (!normalized) return [];

        const results = [];
        const stateScores = new Map(); // store score for states
        const uniqueStates = new Map(); // ensure unique state entries

        for (const d of dataArray) {
            if (!d) continue;

            const name = (d.district || "").toLowerCase();
            const state = (d.state || "").toLowerCase();

            // ===== 1. DISTRICT MATCHES =====
            if (name.startsWith(normalized)) {
                results.push({ d, type: "district", score: 1 });
                continue;
            }
            if (name.includes(normalized)) {
                results.push({ d, type: "district", score: 2 });
                continue;
            }

            // ===== 2. STATE MATCHES =====
            if (state) uniqueStates.set(state, d.state); // capture unique state names

            // exact state match → highest priority state
            if (state === normalized) {
                // use score 0 (better than every district)
                stateScores.set(state, 0);
                continue;
            }

            // prefix match (still high but below district)
            if (state.startsWith(normalized)) {
                stateScores.set(state, Math.min(stateScores.get(state) ?? 3, 3));
                continue;
            }

            // substring match
            if (state.includes(normalized)) {
                stateScores.set(state, Math.min(stateScores.get(state) ?? 4, 4));
                continue;
            }
        }

        // ===== Convert unique states into result rows =====
        for (const [stateLower, stateOriginal] of uniqueStates) {
            if (!stateScores.has(stateLower)) continue; // only include relevant matches

            results.push({
                d: { district: null, state: stateOriginal, population: 0 },
                type: "state",
                score: stateScores.get(stateLower),
            });
        }

        // ===== Sort final results =====
        results.sort((a, b) => a.score - b.score);

        // Return only district/state objects (top 5)
        return results.map((r) => r.d).slice(0, 5);
    }, [dataArray, normalized]);

    // Suggestions to show (popular or filtered based on query)
    const suggestionsToShow = normalized === "" ? popular : filtered;

    // Handle selecting a district
    const handleSelectDistrict = (d) => {
        if (!d) return;
        setQuery(d.district || "");
        setSelectedID(d.censusCode || null);
        // console.log("Selected district:", d.district);
    };

    // Handle selecting a state
    const handleSelectState = (state) => {
        setQuery(state);
        setSelectedID(null); // Reset district selection when a state is selected
        setSelectedState(state);
        // console.log("Selected state:", state);
    };

    const makeKey = (d, idx) => {
        if (!d) return `empty-${idx}`;
        if (d.censusCode) return `census-${String(d.censusCode)}`;
        const safeName = String(d.district || "unknown").replace(/\s+/g, "_");
        const safeState = String(d.state || "unknown").replace(/\s+/g, "_");
        return `${safeName}|${safeState}|${idx}`;
    };

    return (
        <div className={styles.suggestionsWrapper} role="listbox" aria-label="District suggestions">
            <ul className={styles.list}>
                {suggestionsToShow.length === 0 ? (
                    <li className={styles.emptyItem}>
                        <div className={styles.empty}>No matching districts or states.</div>
                    </li>
                ) : (
                    suggestionsToShow.map((d, idx) => {
                        const isState = !d.district; // state object we created

                        return (
                            <li key={makeKey(d, idx)} className={styles.item}>
                                <button
                                    type="button"
                                    className={styles.itemButton}
                                    onClick={() => {
                                        if (isState) {
                                            handleSelectState(d.state);
                                        } else {
                                            handleSelectDistrict(d);
                                        }
                                    }}
                                >
                                    <div>
                                        {isState ? (
                                            <span className={styles.stateName}>
                                                {d.state}
                                                <span className={styles.stateBadge}>STATE</span>
                                            </span>
                                        ) : (
                                            <span className={styles.districtName}>{d.district}</span>
                                        )}
                                    </div>

                                    {!isState && (
                                        <span className={styles.districtInfo}>
                                            {d.state} • {Number(d.population || 0).toLocaleString()}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })
                )}
            </ul>

        </div>
    );
}
