import { useDistrict } from "../../context/DistrictContext"

export default function Retrieve() {
    const { selectedID } = useDistrict();
    console.log("Selected ID in Retrieve:", selectedID);
    return <></>
}