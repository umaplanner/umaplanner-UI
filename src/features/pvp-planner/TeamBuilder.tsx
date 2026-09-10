import { useState, useEffect } from "react";
import Select from "react-select";

function cacheData(key: string, data: any): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function getCachedData<T>(key: string): T | null {
  const cached = localStorage.getItem(key);
  return cached ? JSON.parse(cached) as T : null;
}

const TeamBuilder: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [umaList, setUmaList] = useState<string[]>([]);
  
  const [umas, setUmas] = useState<{ [key: string]: string }>({
    uma1: "",
    uma2: "",
    uma3: "",
  });

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(event.target.value);
  };

  const handleInputChange = (key:string, selectedUma: {value:string; label:string} | null) => {
    if (!selectedOption) return;

    setUmas((prev) => {
      const updated = { ...prev, [key]: selectedUma.value };
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
        // cache for future use (would want some sort of "periodic refresh" of this data, but for now just cache it)
        cacheData("umaList", data);
      })
      .catch((error) => console.error("Error fetching UMA variants:", error));
  }, []);

  const options = umaList.map((uma) => ({
    value: uma.name,
    label: uma.name,
  }));

  return (
    <section>
      <select id="event-select" onChange={handleChange} value={selectedOption}>
        <option value="">Select an event</option>
        <option value="cm18">CM18</option>
        <option value="cm19">CM19</option>
        <option value="cm20">CM20</option>
      </select>
      <p>Selected event: {selectedOption}</p>

      {selectedOption && 
      <label>
        Uma 1:
        <Select
          id="uma1-select"
          name="uma1"
          options={options}
          value={options.find((option) => option.value === umas.uma1) || null}
          onChange={(selectedOption) => handleInputChange("uma1", selectedOption)}
          placeholder="Select an option"
          isSearchable
        />
        Uma 2:
        <Select
          id="uma2-select"
          name="uma2"
          options={options}
          value={options.find((option) => option.value === umas.uma1) || null}
          onChange={(selectedOption) => handleInputChange("uma2", selectedOption)}
          placeholder="Select an option"
          isSearchable
        />
        Uma 3:
        <Select
          id="uma3-select"
          name="uma3"
          options={options}
          value={options.find((option) => option.value === umas.uma1) || null}
          onChange={(selectedOption) => handleInputChange("uma3", selectedOption)}
          placeholder="Select an option"
          isSearchable
        />
      </label>
      }
    </section>

  );
}

export default TeamBuilder;
