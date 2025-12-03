import React, { useMemo, useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import { useDistrict } from "../../context/DistrictContext";
import { FiChevronUp, FiChevronDown } from "react-icons/fi";

export default function Table() {
    const {
        fullData,
        visibleDistricts,
        selectedState,
        tableSelectedRowArr,
        setTableSelectedRowArr,
        clearRows,
        setClearRows
    } = useDistrict();

    const [isOpen, setIsOpen] = useState(false);

    // ❗ Clear selection whenever visible districts change
    useEffect(() => {
        setTableSelectedRowArr([]);
        setClearRows(prev => !prev);
    }, [visibleDistricts]);

    const fullDistrictData = useMemo(() => {
        if (!fullData?.features) return [];

        const visibleCodes = (visibleDistricts || []).map(v => String(v.censuscode ?? ""));

        let rows = fullData.features.map(f => ({
            district: f.attributes.DISTRICT,
            totalPopulation: f.attributes.total_population,
            state: f.attributes.ST_NM,
            censusCode: String(f.attributes.censuscode ?? ""),
            female: f.attributes.females,
            male: f.attributes.males,
            households: f.attributes.number_of_households,
            populationPerSqKm: f.attributes.population_per_sq__km_,
            type: f.attributes.type,
        }));
        const columns = [
            { name: "District", selector: row => row.district, sortable: true },
            { name: "State", selector: row => row.state, sortable: true },
            { name: "Population", selector: row => row.totalPopulation, sortable: true },
            { name: "CensusCode", selector: row => row.censusCode, sortable: true },
            { name: "Male", selector: row => row.male },
            { name: "Female", selector: row => row.female },
            { name: "Households", selector: row => row.households },
            { name: "Pop/SqKm", selector: row => row.populationPerSqKm },
            { name: "Type", selector: row => row.type },
        ];

        if (selectedState) {
            return rows.filter(r => r.state === selectedState);
        }

        return rows.filter(
            row => visibleCodes.length === 0 || visibleCodes.includes(row.censusCode)
        );
    }, [fullData, visibleDistricts, selectedState]);
    const columns = [
        { name: "District", selector: row => row.district, sortable: true },
        { name: "State", selector: row => row.state, sortable: true },
        { name: "Population", selector: row => row.totalPopulation, sortable: true },
        { name: "CensusCode", selector: row => row.censusCode, sortable: true },
        { name: "Male", selector: row => row.male },
        { name: "Female", selector: row => row.female },
        { name: "Households", selector: row => row.households },
        { name: "Pop/SqKm", selector: row => row.populationPerSqKm },
        { name: "Type", selector: row => row.type },
    ];

    const handleChange = (state) => {
        if (state.selectedRows.length > 0) {
            setTableSelectedRowArr(
                state.selectedRows.map(r => r.censusCode)
            );
        } else {
            setTableSelectedRowArr([]);
        }
    };

    return (
        <>
            {/* Expand/Collapse button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: "absolute",
                    left: "50%",
                    bottom: isOpen ? "250px" : "30px",
                    transform: "translateX(-50%)",
                    background: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "50px",
                    padding: "6px 14px",
                    cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                    zIndex: 999,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontWeight: "600",
                }}
            >
                {isOpen ? "Hide Table" : "Show Table"}
                {isOpen ? <FiChevronDown /> : <FiChevronUp />}
            </button>

            {/* Table panel */}
            <div
                style={{
                    position: "absolute",
                    bottom: isOpen ? "0px" : "-330px",
                    left: "0",
                    width: "100%",
                    height: "230px",
                    background: "white",
                    borderTopLeftRadius: "14px",
                    borderTopRightRadius: "14px",
                    boxShadow: "0 -2px 10px rgba(0,0,0,0.25)",
                    zIndex: 998,
                    transition: "bottom 0.35s ease",
                    padding: "15px 20px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <h2 style={{
                    margin: "0 0 10px 0",
                    fontSize: "20px",
                    fontWeight: "700",
                }}>
                    District Data
                </h2>

                <div style={{ flex: 1, overflowY: "auto" }}>
                    <DataTable
                        columns={columns}
                        data={fullDistrictData}
                        highlightOnHover
                        striped
                        dense
                        selectableRows
                        clearSelectedRows={clearRows} // ⭐ table clears correctly
                        onSelectedRowsChange={handleChange}
                        progressPending={!fullData}
                    />
                </div>
            </div>
        </>
    );
}
