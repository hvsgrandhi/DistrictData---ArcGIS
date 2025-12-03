import React, { useEffect, useRef, useState } from "react";
import { useDistrict } from "../../context/DistrictContext";
import styles from "./TextInput.module.css";

export default function TextInput() {
    const { query, setQuery, selectedState, setSelectedState } = useDistrict();
    const [localValue, setLocalValue] = useState(query || "");
    const timerRef = useRef(null);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            setQuery(localValue.trim());
        }, 400);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [localValue, setQuery]);

    useEffect(() => {
        if ((query || "") !== localValue) {
            setLocalValue(query || "");
        }
    }, [query]);

    const handleClear = () => {
        setLocalValue("");
        if (timerRef.current) clearTimeout(timerRef.current);
        setQuery("");
    };

    const placeholderText = selectedState
        ? `Search in ${selectedState}...`
        : "Search for a district or a state...";

    return (
        <div className={styles.wrapper}>
            <div className={styles.row}>
                <input
                    aria-label="Search for a district"
                    value={localValue}
                    placeholder={placeholderText}
                    onChange={(e) => setLocalValue(e.target.value)}
                    className={styles.inputBox}
                />

                {localValue.length > 0 && (
                    <button
                        type="button"
                        aria-label="clear search"
                        className={styles.clearBtn}
                        onClick={handleClear}
                    >
                        ✕
                    </button>
                )}

                {/* {selectedState && (
                    <button
                        type="button"
                        aria-label={`clear selected state ${selectedState}`}
                        className={styles.clearStateBtn}
                        onClick={handleClearState}
                        title={`Clear selected state (${selectedState})`}
                    >
                        {selectedState} ✕
                    </button>
                )} */}
            </div>
        </div>
    );
}
