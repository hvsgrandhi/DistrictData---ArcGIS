import { createContext, useContext, useState } from "react";

const DistrictContext = createContext();

export function DistrictProvider({ children }) {
  const [query, setQuery] = useState("");
  const [districtPopulationData, setDistrictPopulationData] = useState([]);
  const [selectedID, setSelectedID] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [fullData, setFullData] = useState(null);
  const [tableSelectedRowArr, setTableSelectedRowArr] = useState([]);
  const [visibleDistricts, setVisibleDistricts] = useState([]);
  const [clearRows, setClearRows] = useState(false);




  return (
    <DistrictContext.Provider
      value={{ query, setQuery, selectedID, setSelectedID, districtPopulationData, setDistrictPopulationData, selectedState, setSelectedState, fullData, setFullData, tableSelectedRowArr, setTableSelectedRowArr, visibleDistricts, setVisibleDistricts, clearRows, setClearRows }}
    >
      {children}
    </DistrictContext.Provider>
  );
}

export function useDistrict() {
  return useContext(DistrictContext);
}
