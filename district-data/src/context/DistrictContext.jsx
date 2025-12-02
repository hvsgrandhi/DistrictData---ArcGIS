import { createContext, useContext, useState } from "react";

const DistrictContext = createContext();

export function DistrictProvider({ children }) {
  const [query, setQuery] = useState("");
  const [districtPopulationData, setDistrictPopulationData] = useState([]);
  const [selectedID, setSelectedID] = useState(null);
  const [selectedState, setSelectedState] = useState(null);



  return (
    <DistrictContext.Provider
      value={{ query, setQuery, selectedID, setSelectedID, districtPopulationData, setDistrictPopulationData, selectedState, setSelectedState }}
    >
      {children}
    </DistrictContext.Provider>
  );
}

export function useDistrict() {
  return useContext(DistrictContext);
}
