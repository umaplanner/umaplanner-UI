import { useState, useEffect } from "react";
import Select from "react-select";

//move this to a separate file and import it when there are more data types to share between components
interface UmaEntry {
  id: number;
  charaId: number;
  variantNumber: number;
  name: string;
  outfitTitle: string;
  baseCharacterName: string;
  baseCharacterExistsInCharaData: boolean;
}

function cacheData(key: string, data: any): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function getCachedData<T>(key: string): T | null {
  const cached = localStorage.getItem(key);
  return cached ? JSON.parse(cached) as T : null;
}

const TeamBuilder: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [umaList, setUmaList] = useState<UmaEntry[]>([]);
  
  const [umas, setUmas] = useState<{ [key: string]: string }>({
    uma1: "",
    uma2: "",
    uma3: "",
  });

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(event.target.value);
  };

  const handleInputChange = (key:string, selectedUma: UmaEntry | null) => {
    if (!selectedOption) return;

    setUmas((prev) => {
      const updated = { ...prev, [key]: selectedUma?.name ?? ""};
      cacheData(selectedOption, updated);
      return updated;
    });
  };

  useEffect(() => {
    if (selectedOption) {
      const cachedData = getCachedData<{ [key: string]: string }>(selectedOption);
      if (cachedData) {
        setUmas({
          uma1: cachedData.uma1 || "",
          uma2: cachedData.uma2 || "",
          uma3: cachedData.uma3 || "",
        });
      } else {
        const initialData = { uma1: "", uma2: "", uma3: "" };
        setUmas(initialData);
        cacheData(selectedOption, initialData);
      }
    }
  }, [selectedOption]);

  useEffect(() => {
    fetch("http://localhost:5063/umas/variants")
      .then((response) => response.json())
      .then((data) => { 
        setUmaList(data);
        console.log(data);
        // cache for future use (would want some sort of "periodic refresh" of this data, but for now just cache it)
        cacheData("umaList", data);
      })
      .catch((error) => console.error("Error fetching UMA variants:", error));
  }, []);

  return (
    <section>
      <select id="event-select" onChange={handleChange} value={selectedOption}>
        <option value="">Select an event</option>
        <option value="cm18">CM18</option>
        <option value="cm19">CM19</option>
        <option value="cm20">CM20</option>
      </select>
      <p>Selected event: {selectedOption}</p>

      {selectedOption && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label htmlFor="uma1-select">
            Uma 1:
            <Select<UmaEntry>
              id="uma1-select"
              name="uma1"
              options={umaList}
              getOptionLabel={(uma) => uma.name}
              getOptionValue={(uma) => String(uma.id)}
              value={umaList.find((uma) => uma.name === umas.uma1) ?? null}
              onChange={(selected) => handleInputChange("uma1", selected)}
              placeholder="Select an option"
              isSearchable
            />
          </label>

          <label htmlFor="uma2-select">
            Uma 2:
            <Select<UmaEntry>
              id="uma2-select"
              name="uma2"
              options={umaList}
              getOptionLabel={(uma) => uma.name}
              getOptionValue={(uma) => String(uma.id)}
              value={umaList.find((uma) => uma.name === umas.uma2) ?? null}
              onChange={(selected) => handleInputChange("uma2", selected)}
              placeholder="Select an option"
              isSearchable
            />
          </label>

          <label htmlFor="uma3-select">
            Uma 3:
            <Select<UmaEntry>
              id="uma3-select"
              name="uma3"
              options={umaList}
              getOptionLabel={(uma) => uma.name}
              getOptionValue={(uma) => String(uma.id)}
              value={umaList.find((uma) => uma.name === umas.uma3) ?? null}
              onChange={(selected) => handleInputChange("uma3", selected)}
              placeholder="Select an option"
              isSearchable
            />
          </label>
        </div>
      )}
    </section>

  );
}

export default TeamBuilder;
