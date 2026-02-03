import { useEffect, useState } from "react";
import { api } from "./api";

export default function App() {
  const [msg, setMsg] = useState("Loading...");

  useEffect(() => {
    api.get("/health/")
      .then((res) => setMsg(res.data.message))
      .catch((err) => {
        console.error(err);
        setMsg("API not reachable");
      });
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Library Central</h1>
      <p>{msg}</p>
    </div>
  );
}
