import MapView from "./components/MapView";
import TextInput from "./components/Search/TextInput";
import Suggestions from "./components/Search/Suggestions";
import Retrieve from "./components/Search/Retrieve";

export default function App() {
  return <>
    <MapView />
    <TextInput />
    <Suggestions />
    <Retrieve />

  </>

}