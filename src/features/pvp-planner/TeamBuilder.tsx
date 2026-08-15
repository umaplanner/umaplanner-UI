import { useState, useEffect } from "react";

function cacheData(key: string, data: any): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function getCachedData<T>(key: string): T | null {
  const cached = localStorage.getItem(key);
  return cached ? JSON.parse(cached) as T : null;
}

const TeamBuilder: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<string>("");
  
  const [umas, setUmas] = useState<{ [key: string]: string }>({
    uma1: "",
    uma2: "",
    uma3: "",
  });

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(event.target.value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUmas((prev) => {
      const updated = { ...prev, [name]: value };
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
        <input
          type="text"
          name="uma1"
          value={umas["uma1"] || ""}
          onChange={handleInputChange}
        />
        Uma 2:
        <input
          type="text"
          name="uma2"
          value={umas["uma2"] || ""}
          onChange={handleInputChange}
        />
        Uma 3:
        <input
          type="text"
          name="uma3"
          value={umas["uma3"] || ""}
          onChange={handleInputChange}
        />
      </label>
      }
    </section>

  );
}

export default TeamBuilder;
