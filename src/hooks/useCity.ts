// src/hooks/useCity.ts
import { useEffect, useState } from "react";

export default function useCity() {
  const [city, setCity] = useState<string>("Detecting…");

  useEffect(() => {
    if (!navigator.geolocation) {
      setCity("Location not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`;
          const res = await fetch(url);
          const data = await res.json();
          const pretty =
            data?.address?.city || data?.address?.town || data?.address?.state;
          const country = data?.address?.country;
          if (pretty && country) setCity(`${pretty}, ${country}`);
          else setCity(`Lat ${latitude.toFixed(2)}, Lng ${longitude.toFixed(2)}`);
        } catch {
          setCity(`Lat ${latitude.toFixed(2)}, Lng ${longitude.toFixed(2)}`);
        }
      },
      (err) => setCity(`Error: ${err.message}`)
    );
  }, []);

  return city;
}
