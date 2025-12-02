import React, { useEffect, useRef, useState } from "react";
import { useDistrict } from "../../context/DistrictContext";
import styles from "./TextInput.module.css";

export default function TextInput() {
    const { query, setQuery } = useDistrict();
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

    return (
        <div className={styles.wrapper}>
            <div className={styles.row}>
                <input
                    type="search"
                    aria-label="Search for a district"
                    value={localValue}
                    placeholder="Search for a district or a state..."
                    onChange={(e) => setLocalValue(e.target.value)}
                    className={styles.inputBox}
                />

                {localValue.length > 0 && (
                    <button
                        type="button"
                        aria-label="click"

                        className={styles.clearBtn}
                        onClick={handleClear}
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
}
