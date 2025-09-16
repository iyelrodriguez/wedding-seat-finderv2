import React, { useEffect, useState, useRef } from "react";
import "./App.css";

const STORAGE_KEY = "wedding_markers_v1";
const ADMIN_PASS = "letmein"; // change before deploy

// Normalize guest names (remove prefixes & lowercase)
const normalize = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, "")
    .trim();
};

// Normalize table identifiers (ignore spaces, lowercase)
const normalizeTable = (str) =>
  String(str || "")
    .toLowerCase()
    .replace(/\s+/g, "");

function App() {
  const [guestMap, setGuestMap] = useState({});
  const [markers, setMarkers] = useState({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEntered, setAdminEntered] = useState(false);
  const [tableToPlace, setTableToPlace] = useState("");
  const [dragging, setDragging] = useState(null); // track marker being dragged
  const planRef = useRef(null);

  // Load guest list & markers
  useEffect(() => {
    fetch("/guestlist.json")
      .then((r) => r.json())
      .then(setGuestMap);

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setMarkers(JSON.parse(saved));

    fetch("/markers.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (Object.keys(data).length) {
          setMarkers(data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      });

    if (window.location.hash.includes("admin")) setIsAdmin(true);
  }, []);

  // Save markers to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(markers));
  }, [markers]);

  // Flexible search
  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (!val) {
      setResults([]);
      return;
    }

    const normQuery = normalize(val);
    const matches = Object.entries(guestMap).filter(([name]) => {
      const normName = normalize(name);
      const parts = normName.split(/\s+/);
      return (
        normName.includes(normQuery) ||
        parts.some((p) => p.startsWith(normQuery))
      );
    });

    setResults(matches);
  };

  const handlePlaceMarker = (e) => {
    if (!adminEntered || !tableToPlace) return;
    const rect = planRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMarkers((m) => ({ ...m, [tableToPlace]: { x, y } }));
  };

  const exportMarkers = () => {
    const blob = new Blob([JSON.stringify(markers, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "markers.json";
    a.click();
  };

  const importMarkers = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setMarkers(JSON.parse(reader.result));
    reader.readAsText(file);
  };

  // Dragging logic
  const handleMouseDown = (e, table) => {
    if (!adminEntered) return;
    setDragging(table);
    e.stopPropagation();
  };

  const handleMouseMove = (e) => {
    if (!dragging || !planRef.current) return;
    const rect = planRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMarkers((m) => ({ ...m, [dragging]: { x, y } }));
  };

  const handleMouseUp = () => {
    if (dragging) setDragging(null);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  });

  return (
    <div className="app-container">
      <div className="card">
        {/* Hero Section */}
        <div className="hero">
        <div className="hero-content">
  <h1>Iyel and Roxy's Wedding</h1>
  <h2>3:00 PM September 20, 2025</h2>
  <h2>Dona Jovita Resort, Calamba</h2>

  <a
    href="https://maps.app.goo.gl/2zrg8VGxCGa6CBF8A"
    target="_blank"
    rel="noopener noreferrer"
    className="block mt-2"
  >
    📍 View on Google Maps
  </a>

  <a
    href="https://iyelandroxyweddinginvitation.my.canva.site/i-r"
    target="_blank"
    rel="noopener noreferrer"
    className="block mt-2"
  >
    💌 Visit Our Wedding Website
  </a>
</div>
        </div>

        {/* Search */}
        <div className="search-box">
          <input
            type="search"
            value={query}
            onChange={handleSearch}
            placeholder="Search your name..."
          />
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
          >
            Clear
          </button>
        </div>

        {/* Results */}
        {results.length > 1 && (
          <div className="results multiple">
            <p>Multiple matches found:</p>
            <ul>
              {results.map(([name, table]) => (
                <li key={name}>
                  <span className="name">{name}</span> → Table {table}
                </li>
              ))}
            </ul>
          </div>
        )}
        {results.length === 1 && (
          <div className="results single">
            <strong>{results[0][0]}</strong>, your table is{" "}
            <span className="highlight">Table {results[0][1]}</span>
          </div>
        )}
        {query && results.length === 0 && (
          <div className="results none">No match found.</div>
        )}

        {/* Seating plan */}
        <div
          ref={planRef}
          onClick={handlePlaceMarker}
          className="plan-container"
        >
          <img src="/seatplan.png" alt="Seating plan" />
          {Object.entries(markers).map(([table, pos]) => {
            const isSelected =
              results.length > 0 &&
              results.some(
                ([, guestTable]) =>
                  normalizeTable(guestTable) === normalizeTable(table)
              );
            return (
              <div
                key={table}
                className={`marker ${isSelected ? "highlight-marker" : ""}`}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                }}
                onMouseDown={(e) => handleMouseDown(e, table)}
              >
                {table}
              </div>
            );
          })}
        </div>

        {/* Admin Panel */}
        {isAdmin && (
          <div className="admin-panel">
            {!adminEntered ? (
              <div className="admin-login">
                <input
                  type="password"
                  placeholder="Admin password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.value === ADMIN_PASS)
                      setAdminEntered(true);
                  }}
                />
                <button
                  onClick={() => {
                    const val = document.querySelector(
                      "input[type=password]"
                    ).value;
                    if (val === ADMIN_PASS) setAdminEntered(true);
                  }}
                >
                  Enter
                </button>
              </div>
            ) : (
              <div>
                <h3>Admin Controls</h3>
                <div className="admin-inputs">
                  <input
                    value={tableToPlace}
                    onChange={(e) => setTableToPlace(e.target.value)}
                    placeholder="Table number"
                  />
                  <button onClick={() => setTableToPlace("")}>Clear</button>
                </div>
                <div className="admin-actions">
                  <button onClick={exportMarkers}>Export markers</button>
                  <input type="file" accept=".json" onChange={importMarkers} />
                </div>
                <p className="tip">💡 Drag markers to move them.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
