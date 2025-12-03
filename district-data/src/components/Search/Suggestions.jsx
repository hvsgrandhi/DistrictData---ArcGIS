import React, { useMemo } from "react";
import { useDistrict } from "../../context/DistrictContext";
import styles from "./Suggestions.module.css";

export default function Suggestions() {
    const {
        districtPopulationData,
        query = "",
        setQuery,
        setSelectedID,
        selectedID,
        setSelectedState,
        selectedState,
    } = useDistrict();

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

    const dataForSuggestions = useMemo(() => {
        if (!selectedState) return dataArray;
        const selectedLower = String(selectedState).toLowerCase();
        return dataArray.filter((d) => (d?.state || "").toLowerCase() === selectedLower);
    }, [dataArray, selectedState]);

    const popular = useMemo(
        () =>
            [...dataForSuggestions]
                .sort((a, b) => (b?.population || 0) - (a?.population || 0))
                .slice(0, 5),
        [dataForSuggestions]
    );

    const filtered = useMemo(() => {
        if (!normalized) return [];

        const results = [];
        if (selectedState) {
            for (const d of dataForSuggestions) {
                if (!d) continue;
                const name = (d.district || "").toLowerCase();

                if (name.startsWith(normalized)) {
                    results.push({ d, type: "district", score: 1 });
                    continue;
                }
                if (name.includes(normalized)) {
                    results.push({ d, type: "district", score: 2 });
                    continue;
                }
            }
        } else {
            const stateScores = new Map(); // store score for states
            const uniqueStates = new Map(); // ensure unique state entries

            for (const d of dataArray) {
                if (!d) continue;

                const name = (d.district || "").toLowerCase();
                const state = (d.state || "").toLowerCase();

                if (name.startsWith(normalized)) {
                    results.push({ d, type: "district", score: 1 });
                    continue;
                }
                if (name.includes(normalized)) {
                    results.push({ d, type: "district", score: 2 });
                    continue;
                }

                if (state) uniqueStates.set(state, d.state);

                if (state === normalized) {
                    stateScores.set(state, 0);
                    continue;
                }
                if (state.startsWith(normalized)) {
                    stateScores.set(state, Math.min(stateScores.get(state) ?? 3, 3));
                    continue;
                }
                if (state.includes(normalized)) {
                    stateScores.set(state, Math.min(stateScores.get(state) ?? 4, 4));
                    continue;
                }
            }

            for (const [stateLower, stateOriginal] of uniqueStates) {
                if (!stateScores.has(stateLower)) continue; // only include relevant matches

                results.push({
                    d: { district: null, state: stateOriginal, population: 0 },
                    type: "state",
                    score: stateScores.get(stateLower),
                });
            }
        }

        results.sort((a, b) => a.score - b.score);

        return results.map((r) => r.d).slice(0, 5);
    }, [dataArray, dataForSuggestions, normalized, selectedState]);

    const suggestionsToShow = normalized === "" ? popular : filtered;

    // Handle selecting a district
    const handleSelectDistrict = (d) => {
        if (!d) return;
        setQuery(d.district || "");
        setSelectedID(d.censusCode || null);
    };

    // Handle selecting a state
    const handleSelectState = (state) => {
        setQuery(state);
        setSelectedID(null);
        setSelectedState(state);
        setQuery(null)
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
                        const isState = !d.district; // state object we created (district null)

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
