import React, { useMemo } from "react";
import { useDistrict } from "../../context/DistrictContext";
import styles from "./Suggestions.module.css";

export default function Suggestions() {
    const { districtPopulationData, query = "", setQuery, setCensusCode, censusCode } = useDistrict();

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
    // console.log("Data Array in Suggestions:", dataArray, districtPopulationData);

    const normalized = (query || "").trim().toLowerCase();

    const popular = useMemo(
        () =>
            [...dataArray]
                .sort((a, b) => (b?.population || 0) - (a?.population || 0))
                .slice(0, 5),
        [dataArray]
    );

    const filtered = useMemo(() => {
        if (!normalized) return [];

        const results = [];

        for (const d of dataArray) {
            if (!d) continue;

            const name = String(d.district || "").toLowerCase();
            const state = String(d.state || "").toLowerCase();

            if (name.startsWith(normalized)) {
                results.push({ d, score: 1 });
                continue;
            }

            if (name.includes(normalized)) {
                results.push({ d, score: 2 });
                continue;
            }

            if (state.startsWith(normalized)) {
                results.push({ d, score: 3 });
                continue;
            }

            if (state.includes(normalized)) {
                results.push({ d, score: 4 });
                continue;
            }
        }

        const sorted = results.sort((a, b) => a.score - b.score);

        return sorted.map((r) => r.d).slice(0, 5);
    }, [dataArray, normalized]);


    const suggestionsToShow = normalized === "" ? popular : filtered;

    const handleSelect = (d) => {
        if (!d) return;
        setQuery(d.district || "");
        setCensusCode(d.censusCode || null);
        console.log(censusCode)
        console.log("Selected district:", d.district);
        // If you need to also set selectedDistrict in context, do that here.
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
                        <div className={styles.empty}>No matching districts.</div>
                    </li>
                ) : (
                    suggestionsToShow.map((d, idx) => (
                        <li key={makeKey(d, idx)} className={styles.item}>
                            <button
                                type="button"
                                className={styles.itemButton}
                                onClick={() => handleSelect(d)}
                            >
                                <span className={styles.districtName}>{d?.district ?? "—"}</span>
                                <span className={styles.districtInfo}>
                                    {d?.state ?? "—"} • {Number(d?.population || 0).toLocaleString()}
                                </span>
                            </button>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}
