// map-system.js - All map-related functionality

// Map functions that need access to main.js globals
// Note: csvData and csvHeaders are accessed from main.js

// ===== MAP HELPER FUNCTIONS =====
function normalizeCountryName(countryName) {
  if (!countryName) return "";

  const mappings = {
    usa: "United States",
    "united states of america": "United States",
    us: "United States",
    uk: "United Kingdom",
    "united kingdom of great britain and northern ireland": "United Kingdom",
    uae: "United Arab Emirates",
    "united arab emirates": "United Arab Emirates",
    russia: "Russian Federation",
    "russian federation": "Russia",
    "south korea": "Korea, Republic of",
    "north korea": "Korea, Democratic People's Republic of",
    dprk: "Korea, Democratic People's Republic of",
    congo: "Congo, Democratic Republic of the",
    "dr congo": "Congo, Democratic Republic of the",
    "democratic republic of congo": "Congo, Democratic Republic of the",
    "ivory coast": "Côte d'Ivoire",
    "cote d'ivoire": "Côte d'Ivoire",
  };

  const lower = countryName.toLowerCase().trim();
  return mappings[lower] || countryName;
}

// ===== ENHANCED GET COORDINATES WITH CACHE =====
function getApproximateCoordinates(locationName) {
  const coordinates = {
    "united states": [39.8283, -98.5795],
    usa: [39.8283, -98.5795],
    canada: [56.1304, -106.3468],
    mexico: [23.6345, -102.5528],
    brazil: [-14.235, -51.9253],
    china: [35.8617, 104.1954],
    india: [20.5937, 78.9629],
    russia: [61.524, 105.3188],
    germany: [51.1657, 10.4515],
    france: [46.2276, 2.2137],
    "united kingdom": [55.3781, -3.436],
    uk: [55.3781, -3.436],
    japan: [36.2048, 138.2529],
    australia: [-25.2744, 133.7751],
    spain: [40.4637, -3.7492],
    italy: [41.8719, 12.5674],
    "south africa": [-30.5595, 22.9375],
    // Add common US states
    california: [36.7783, -119.4179],
    texas: [31.9686, -99.9018],
    florida: [27.6648, -81.5158],
    "new york": [40.7128, -74.006],
    pennsylvania: [41.2033, -77.1945],
    illinois: [40.6331, -89.3985],
    ohio: [40.4173, -82.9071],
    georgia: [32.1656, -82.9001],
    "north carolina": [35.7596, -79.0193],
    michigan: [44.3148, -85.6024],
    // State abbreviations
    ca: [36.7783, -119.4179],
    tx: [31.9686, -99.9018],
    fl: [27.6648, -81.5158],
    ny: [40.7128, -74.006],
    pa: [41.2033, -77.1945],
    il: [40.6331, -89.3985],
    oh: [40.4173, -82.9071],
    ga: [32.1656, -82.9001],
    nc: [35.7596, -79.0193],
    mi: [44.3148, -85.6024],
  };

  const normalized = locationName.toLowerCase().trim();

  // Check hardcoded first
  if (coordinates[normalized]) {
    return coordinates[normalized];
  }

  // Check localStorage cache
  try {
    const cache = JSON.parse(localStorage.getItem("geocodeCache") || "{}");
    if (cache[normalized]) {
      console.log("📦 Retrieved from cache:", locationName);
      return cache[normalized];
    }
  } catch (e) {
    // Ignore cache errors
  }

  return null;
}

// ===== GEOCODING FUNCTION =====
async function geocodeLocation(locationName) {
  try {
    // First check our hardcoded coordinates (fast)
    const approxCoords = getApproximateCoordinates(locationName);
    if (approxCoords) {
      console.log("✅ Found in local cache:", locationName);
      return approxCoords;
    }

    // If not found locally, use OpenStreetMap API
    console.log("🔍 Geocoding via API:", locationName);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        locationName
      )}&format=json&limit=1`
    );

    if (!response.ok) throw new Error("Geocoding API failed");

    const data = await response.json();

    if (data && data[0]) {
      const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      console.log("📍 Geocoded:", locationName, "->", coords);

      // Cache it for future use
      cacheGeocodeResult(locationName, coords);
      return coords;
    }

    console.log("❌ No geocode results for:", locationName);
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// ===== CACHING FUNCTION =====
function cacheGeocodeResult(locationName, coords) {
  // Store in localStorage for future use
  try {
    const cache = JSON.parse(localStorage.getItem("geocodeCache") || "{}");
    cache[locationName.toLowerCase()] = coords;
    localStorage.setItem("geocodeCache", JSON.stringify(cache));
  } catch (e) {
    console.warn("Could not cache geocode result:", e);
  }
}

// ===== ENHANCED COLUMN DETECTION =====
function looksLikeLocationColumn(header) {
  if (!csvData || csvData.length === 0) return false;

  const sampleValues = csvData.slice(0, 5).map((row) => row[header]);

  // Check if values look like location names
  for (const value of sampleValues) {
    if (!value) continue;
    const str = String(value).toLowerCase();

    // Common US state names
    const usStates = [
      "alabama",
      "alaska",
      "arizona",
      "arkansas",
      "california",
      "colorado",
      "connecticut",
      "delaware",
      "florida",
      "georgia",
      "hawaii",
      "idaho",
      "illinois",
      "indiana",
      "iowa",
      "kansas",
      "kentucky",
      "louisiana",
      "maine",
      "maryland",
      "massachusetts",
      "michigan",
      "minnesota",
      "mississippi",
      "missouri",
      "montana",
      "nebraska",
      "nevada",
      "new hampshire",
      "new jersey",
      "new mexico",
      "new york",
      "north carolina",
      "north dakota",
      "ohio",
      "oklahoma",
      "oregon",
      "pennsylvania",
      "rhode island",
      "south carolina",
      "south dakota",
      "tennessee",
      "texas",
      "utah",
      "vermont",
      "virginia",
      "washington",
      "west virginia",
      "wisconsin",
      "wyoming",
    ];

    // Common country names
    const countries = [
      "united states",
      "canada",
      "mexico",
      "brazil",
      "china",
      "india",
      "russia",
      "germany",
      "france",
      "united kingdom",
      "japan",
      "australia",
      "spain",
      "italy",
      "south africa",
    ];

    if (usStates.includes(str) || countries.includes(str)) {
      return true;
    }

    // Check for common city patterns
    if (
      str.includes("city") ||
      str.includes("town") ||
      str.endsWith("ville") ||
      str.endsWith("burg") ||
      str.endsWith("ton") ||
      str.endsWith("dale")
    ) {
      return true;
    }
  }

  return false;
}

// ===== MAP UI FUNCTIONS =====
function populateMapColumnDropdowns() {
  const locationSelect = document.getElementById("mapLocationColumn");
  const valueSelect = document.getElementById("mapValueColumn");

  if (!locationSelect || !valueSelect || !csvHeaders) return;

  locationSelect.innerHTML =
    '<option value="">Select location column...</option>';
  valueSelect.innerHTML = '<option value="">Select numeric column...</option>';

  csvHeaders.forEach((header) => {
    const headerLower = header.toLowerCase();

    // ENHANCED LOCATION DETECTION
    const isGeo =
      // Common location keywords
      headerLower.includes("country") ||
      headerLower.includes("state") ||
      headerLower.includes("city") ||
      headerLower.includes("region") ||
      headerLower.includes("province") ||
      headerLower.includes("county") ||
      headerLower.includes("district") ||
      headerLower.includes("territory") ||
      headerLower.includes("location") ||
      headerLower.includes("place") ||
      headerLower.includes("area") ||
      headerLower.includes("zone") ||
      // Common abbreviations
      headerLower === "st" ||
      headerLower === "prov" ||
      headerLower === "loc" ||
      // Coordinate columns
      header === "lat" ||
      header === "lon" ||
      header === "latitude" ||
      header === "longitude" ||
      headerLower.includes("coord") ||
      headerLower.includes("lng") ||
      // US States specific
      headerLower === "state" ||
      headerLower === "state_name" ||
      headerLower === "state name" ||
      headerLower === "state_code" ||
      headerLower === "state code" ||
      headerLower === "state_abbr" ||
      headerLower === "state abbr" ||
      // Check column content
      looksLikeLocationColumn(header);

    if (isGeo) {
      const option = document.createElement("option");
      option.value = header;
      option.textContent = `${header} 🌍`;
      locationSelect.appendChild(option);
    }

    const sample = csvData[0]?.[header];
    if (typeof sample === "number" && !isNaN(sample)) {
      const option = document.createElement("option");
      option.value = header;
      option.textContent = header;
      valueSelect.appendChild(option);
    }
  });
}

function setMapType(type) {
  currentMapType = type;
  document.querySelectorAll(".map-type-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.type === type) btn.classList.add("active");
  });
}

// ===== MAIN MAP GENERATION FUNCTION =====
async function generateMap() {
  const locationCol = document.getElementById("mapLocationColumn").value;
  const valueCol = document.getElementById("mapValueColumn").value;

  if (!locationCol || !valueCol) {
    showNotification("Please select both location and value columns.", "error");
    return;
  }

  // Clear existing map/chart
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  if (currentMapInstance) {
    currentMapInstance.remove();
    currentMapInstance = null;
  }

  // Create map container if it doesn't exist
  let mapContainer = document.getElementById("mapContainer");
  if (!mapContainer) {
    mapContainer = document.createElement("div");
    mapContainer.id = "mapContainer";
    mapContainer.style.height = "500px";
    mapContainer.style.borderRadius = "12px";
    mapContainer.style.marginTop = "20px";

    const chartArea = document.querySelector(".chart-container");
    chartArea.innerHTML = "";
    chartArea.appendChild(mapContainer);
  }

  // Clear container
  mapContainer.innerHTML = "";

  // Create map instance
  const map = L.map(mapContainer).setView([20, 0], 2);

  // Get selected color scheme
  const colorScheme = document.getElementById("mapColorScheme").value;

  // Get base map style
  const basemapBtn = document.querySelector(".basemap-btn.active");
  const basemapStyle = basemapBtn ? basemapBtn.dataset.style : "light";

  // Apply different tile layers based on style
  if (basemapStyle === "dark") {
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "© OpenStreetMap contributors © CARTO",
        maxZoom: 8,
      }
    ).addTo(map);
  } else if (basemapStyle === "satellite") {
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "© Esri",
        maxZoom: 8,
      }
    ).addTo(map);
  } else {
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 8,
    }).addTo(map);
  }

  // Generate the map based on type
  try {
    switch (currentMapType) {
      case "choropleth":
        await createChoroplethMap(map, locationCol, valueCol, colorScheme);
        break;
      case "bubble":
        await createBubbleMap(map, locationCol, valueCol, colorScheme);
        break;
      case "point":
        await createPointMap(map, locationCol, valueCol, colorScheme);
        break;
    }
  } catch (error) {
    console.error("Error generating map:", error);
    showNotification("Error generating map. Please try again.", "error");
  }

  // Store map instance
  currentMapInstance = map;

  // Add map controls
  L.control.scale().addTo(map);

  // Show success message
  showNotification(`🗺️ ${currentMapType} map generated!`, "success");
}

// ===== CHOROPLETH MAP =====
async function createChoroplethMap(map, locationCol, valueCol, colorScheme) {
  try {
    // Use this better GeoJSON URL with common country names
    const geoJsonUrl =
      "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";

    showNotification("Loading country boundaries...", "info");

    const response = await fetch(geoJsonUrl);
    const countriesGeoJson = await response.json();

    // Validate GeoJSON structure
    if (
      !countriesGeoJson ||
      !countriesGeoJson.features ||
      countriesGeoJson.features.length === 0
    ) {
      throw new Error("Invalid GeoJSON data received - no features found");
    }

    // Prepare your data as a lookup object with BETTER MATCHING
    const dataLookup = {};
    csvData.forEach((row) => {
      const countryName = row[locationCol];
      const value = parseFloat(row[valueCol]) || 0;
      if (countryName && !isNaN(value)) {
        // Get ALL possible name variations for this country
        const possibleNames = getAllCountryNameVariations(countryName);

        // Try all variations
        for (const name of possibleNames) {
          dataLookup[name.toLowerCase()] = value;
        }
      }
    });

    console.log("=== DEBUG START ===");
    console.log("Location column:", locationCol);
    console.log("Value column:", valueCol);
    console.log("CSV sample (first 3 rows):", csvData.slice(0, 3));
    console.log("Data lookup keys:", Object.keys(dataLookup));
    console.log("Data lookup has 'usa':", "usa" in dataLookup);
    console.log(
      "Data lookup has 'united states':",
      "united states" in dataLookup
    );
    console.log("Full dataLookup:", dataLookup);
    console.log("=== DEBUG END ===");
    // ============================

    // DEBUG: Show what data we have
    console.log("Data lookup has", Object.keys(dataLookup).length, "countries");
    console.log("First 5:", Object.keys(dataLookup).slice(0, 5));

    // Get value range for color scaling
    const values = Object.values(dataLookup).filter((v) => !isNaN(v));
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);

    console.log("Value range:", minValue, "to", maxValue);

    // Color function
    function getColor(value) {
      if (value === undefined || value === null) return "#cccccc";

      const normalized = (value - minValue) / (maxValue - minValue || 1);

      switch (colorScheme) {
        case "Blues":
          return `hsl(210, 70%, ${70 - normalized * 40}%)`;
        case "Reds":
          return `hsl(0, 70%, ${70 - normalized * 40}%)`;
        case "Greens":
          return `hsl(120, 70%, ${70 - normalized * 40}%)`;
        case "Viridis":
          return `hsl(${270 - normalized * 150}, 70%, 50%)`;
        default:
          return `hsl(${240 - normalized * 240}, 70%, 50%)`;
      }
    }

    // Style function for GeoJSON
    function style(feature) {
      const countryName = feature.properties.name;
      const normalized = normalizeCountryName(countryName);
      const value = dataLookup[normalized?.toLowerCase()];

      return {
        fillColor: getColor(value),
        weight: 1,
        opacity: 1,
        color: "#333",
        fillOpacity: 0.7,
        dashArray: value === undefined ? "3" : "0",
      };
    }

    // Add GeoJSON layer to map
    const geoJsonLayer = L.geoJson(countriesGeoJson, {
      style: style,
      onEachFeature: function (feature, layer) {
        const countryName = feature.properties.name;

        const possibleNames = getAllCountryNameVariations(countryName);
        let value = undefined;

        // Try all possible name variations
        for (const name of possibleNames) {
          if (dataLookup[name.toLowerCase()] !== undefined) {
            value = dataLookup[name.toLowerCase()];
            console.log(
              "✅ Matched:",
              countryName,
              "->",
              name,
              "Value:",
              value
            );
            break;
          }
        }

        if (value === undefined) {
          const normalized = normalizeCountryName(countryName);
          value = dataLookup[normalized?.toLowerCase()];
          if (value !== undefined) {
            console.log("✅ Fallback match:", countryName, "->", normalized);
          }
        }

        const popupContent =
          value !== undefined
            ? `<strong>${countryName}</strong><br>${valueCol}: <b>${value.toLocaleString()}</b>`
            : `<strong>${countryName}</strong><br>No data available`;

        layer.bindPopup(popupContent);

        // Add hover effects
        layer.on("mouseover", function (e) {
          layer.setStyle({
            weight: 2,
            color: "#666",
          });
        });

        layer.on("mouseout", function (e) {
          geoJsonLayer.resetStyle(layer);
        });
      },
    }).addTo(map);

    // Add legend
    addChoroplethLegend(map, minValue, maxValue, colorScheme, valueCol);

    // Zoom to show all countries
    map.fitBounds(geoJsonLayer.getBounds());
  } catch (error) {
    console.error("Error creating choropleth:", error);
    showNotification(
      "Failed to load country boundaries. Using fallback markers.",
      "error"
    );
    // Fallback to marker-based version
    createFallbackChoropleth(map, locationCol, valueCol, colorScheme);
  }
}

function createFallbackChoropleth(map, locationCol, valueCol, colorScheme) {
  // Create color scale
  const values = csvData
    .map((row) => parseFloat(row[valueCol]) || 0)
    .filter((v) => !isNaN(v));
  const maxValue = Math.max(...values, 1);

  function getColor(value) {
    const normalized = value / maxValue;

    switch (colorScheme) {
      case "Blues":
        return `hsl(210, 70%, ${50 + normalized * 30}%)`;
      case "Reds":
        return `hsl(0, 70%, ${50 + normalized * 30}%)`;
      case "Greens":
        return `hsl(120, 70%, ${40 + normalized * 40}%)`;
      case "Viridis":
        return `hsl(${270 - normalized * 150}, 70%, 50%)`;
      default:
        return `hsl(${normalized * 240}, 70%, 50%)`;
    }
  }

  // Add markers for data points
  csvData.forEach((row) => {
    const location = row[locationCol];
    const value = parseFloat(row[valueCol]) || 0;

    if (location && !isNaN(value)) {
      const coords = getApproximateCoordinates(location);

      if (coords) {
        L.circleMarker(coords, {
          radius: 10 + (value / maxValue) * 20,
          fillColor: getColor(value),
          color: "#333",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.7,
        })
          .bindPopup(
            `<strong>${location}</strong><br>${valueCol}: <b>${value.toLocaleString()}</b>`
          )
          .addTo(map);
      }
    }
  });

  // Add legend
  addMapLegend(map, maxValue, colorScheme, valueCol);
}

function addMapLegend(map, maxValue, colorScheme, valueCol) {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "info legend");

    // Generate color scale for legend
    div.innerHTML = `<strong>${valueCol}</strong><br>`;

    const grades = [
      0,
      maxValue * 0.25,
      maxValue * 0.5,
      maxValue * 0.75,
      maxValue,
    ];

    for (let i = 0; i < grades.length; i++) {
      const color = getColorForValue(grades[i], maxValue, colorScheme);
      div.innerHTML +=
        '<i style="background:' +
        color +
        '; width:20px; height:20px; display:inline-block; margin-right:5px; border-radius:50%;"></i> ' +
        grades[i].toLocaleString() +
        (grades[i + 1] ? "–" + grades[i + 1].toLocaleString() + "<br>" : "+");
    }

    return div;
  };

  legend.addTo(map);

  function getColorForValue(value, max, scheme) {
    const normalized = value / max;

    switch (scheme) {
      case "Blues":
        return `hsl(210, 70%, ${50 + normalized * 30}%)`;
      case "Reds":
        return `hsl(0, 70%, ${50 + normalized * 30}%)`;
      case "Greens":
        return `hsl(120, 70%, ${40 + normalized * 40}%)`;
      case "Viridis":
        return `hsl(${270 - normalized * 150}, 70%, 50%)`;
      default:
        return `hsl(${normalized * 240}, 70%, 50%)`;
    }
  }
}

function addChoroplethLegend(map, minValue, maxValue, colorScheme, valueCol) {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "info legend");
    div.style.backgroundColor = "white";
    div.style.padding = "10px";
    div.style.borderRadius = "5px";
    div.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
    div.style.fontSize = "12px";
    div.style.maxWidth = "200px";

    div.innerHTML = `<strong>${valueCol}</strong><br><br>`;

    // Create 5 classes
    const grades = 5;
    for (let i = 0; i < grades; i++) {
      const value = minValue + (i * (maxValue - minValue)) / grades;
      const nextValue = minValue + ((i + 1) * (maxValue - minValue)) / grades;
      const color = getColorForLegend(value, minValue, maxValue, colorScheme);

      div.innerHTML +=
        '<div style="margin-bottom: 5px; display: flex; align-items: center;">' +
        '<span style="background:' +
        color +
        '; width:20px; height:20px; display:inline-block; margin-right:8px; border:1px solid #333;"></span>' +
        "<span>" +
        (i === 0 ? "" : "> ") +
        value.toLocaleString(undefined, { maximumFractionDigits: 0 }) +
        (i < grades - 1
          ? " - " +
            nextValue.toLocaleString(undefined, { maximumFractionDigits: 0 })
          : "+") +
        "</span></div>";
    }

    // Add "No Data" color
    div.innerHTML +=
      '<div style="margin-top: 10px; display: flex; align-items: center;">' +
      '<span style="background:#cccccc; width:20px; height:20px; display:inline-block; margin-right:8px; border:1px solid #333;"></span>' +
      "<span>No Data</span></div>";

    return div;
  };

  legend.addTo(map);

  function getColorForLegend(value, min, max, scheme) {
    const normalized = (value - min) / (max - min || 1);

    switch (scheme) {
      case "Blues":
        return `hsl(210, 70%, ${70 - normalized * 40}%)`;
      case "Reds":
        return `hsl(0, 70%, ${70 - normalized * 40}%)`;
      case "Greens":
        return `hsl(120, 70%, ${70 - normalized * 40}%)`;
      case "Viridis":
        return `hsl(${270 - normalized * 150}, 70%, 50%)`;
      default:
        return `hsl(${240 - normalized * 240}, 70%, 50%)`;
    }
  }
}

// ===== BUBBLE MAP =====
async function createBubbleMap(map, locationCol, valueCol, colorScheme) {
  console.log("=== BUBBLE MAP DEBUG START ===");
  console.log("Location column:", locationCol);
  console.log("Value column:", valueCol);
  console.log("First 3 rows:", csvData.slice(0, 3));

  const values = csvData
    .map((row) => parseFloat(row[valueCol]) || 0)
    .filter((v) => !isNaN(v));
  const maxValue = Math.max(...values, 1);

  console.log("Max value:", maxValue);
  console.log("Total rows to process:", csvData.length);

  // Process data with geocoding
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const row of csvData) {
    const location = row[locationCol];
    const value = parseFloat(row[valueCol]) || 0;

    console.log(`--- Row ${processed + 1}: "${location}" = ${value}`);

    if (location && !isNaN(value)) {
      processed++;
      console.log("Calling geocodeLocation for:", location);

      // Use geocoding API for coordinates
      const coords = await geocodeLocation(location);

      console.log("Geocode result:", coords);

      if (coords) {
        succeeded++;
        const radius = Math.sqrt(value / maxValue) * 30;
        console.log("✅ Adding bubble at:", coords, "Radius:", radius);

        L.circle(coords, {
          radius: radius * 1000,
          fillColor: "#3388ff",
          color: "#3388ff",
          weight: 1,
          opacity: 0.5,
          fillOpacity: 0.4,
        })
          .bindPopup(
            `<strong>${location}</strong><br>${valueCol}: <b>${value.toLocaleString()}</b>`
          )
          .addTo(map);
      } else {
        failed++;
        console.log("❌ Could not geocode:", location);
      }
    } else {
      console.log("⚠️ Skipping - no location or invalid value");
    }
  }

  console.log(
    `=== SUMMARY: Processed ${processed}, Succeeded ${succeeded}, Failed ${failed} ===`
  );
  console.log("=== BUBBLE MAP DEBUG END ===");
}
// ===== POINT MAP =====
async function createPointMap(map, locationCol, valueCol, colorScheme) {
  for (const row of csvData) {
    const location = row[locationCol];
    const value = parseFloat(row[valueCol]) || 0;

    if (location && !isNaN(value)) {
      // Use geocoding API for coordinates
      const coords = await geocodeLocation(location);

      if (coords) {
        const color = value > 0 ? "#ff4444" : "#4444ff";
        const size = Math.min(20, Math.max(5, Math.log(value + 1) * 3));

        L.circleMarker(coords, {
          radius: size,
          fillColor: color,
          color: "#333",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.7,
        })
          .bindPopup(
            `<strong>${location}</strong><br>${valueCol}: <b>${value.toLocaleString()}</b>`
          )
          .addTo(map);
      } else {
        console.log("⚠️ Could not geocode:", location);
      }
    }
  }
}

function resetMap() {
  const mapContainer = document.getElementById("mapContainer");
  if (mapContainer) mapContainer.remove();
}

// ===== COUNTRY NAME MATCHING FUNCTIONS =====
function getAllCountryNameVariations(countryName) {
  if (!countryName) return [];

  const name = String(countryName).trim();
  const lower = name.toLowerCase();
  const variations = [name, lower];

  // Common mappings
  const commonMappings = {
    usa: ["United States", "United States of America", "USA", "US"],
    "united states": ["United States", "United States of America", "USA", "US"],
    uk: ["United Kingdom", "UK", "Great Britain", "Britain"],
    "united kingdom": ["United Kingdom", "UK", "Great Britain", "Britain"],
    russia: ["Russian Federation", "Russia"],
    china: ["China", "People's Republic of China", "PR China"],
    brazil: ["Brazil", "Brasil"],
    india: ["India", "Republic of India"],
    germany: ["Germany", "Deutschland", "Federal Republic of Germany"],
    france: ["France", "French Republic"],
    japan: ["Japan"],
    canada: ["Canada"],
    australia: ["Australia"],
    "south korea": ["South Korea", "Republic of Korea", "Korea, Republic of"],
    "north korea": [
      "North Korea",
      "Democratic People's Republic of Korea",
      "Korea, Democratic People's Republic of",
    ],
    iran: ["Iran", "Islamic Republic of Iran"],
    turkey: ["Turkey", "Türkiye"],
    egypt: ["Egypt", "Arab Republic of Egypt"],
    "south africa": ["South Africa", "Republic of South Africa"],
    mexico: ["Mexico", "United Mexican States"],
    indonesia: ["Indonesia", "Republic of Indonesia"],
    italy: ["Italy", "Italian Republic"],
    spain: ["Spain", "Kingdom of Spain"],
  };

  // Check if we have pre-defined variations
  for (const [key, variants] of Object.entries(commonMappings)) {
    if (
      lower.includes(key) ||
      variants.some((v) => v.toLowerCase() === lower)
    ) {
      variations.push(...variants);
    }
  }

  // Also try removing common suffixes
  const withoutSuffix = name
    .replace(
      /\s*(republic|kingdom|federation|state|states|province|region|area|territory)s?\s*$/i,
      ""
    )
    .trim();
  if (withoutSuffix && withoutSuffix !== name) {
    variations.push(withoutSuffix);
  }

  return [...new Set(variations)];
}

// IMPROVED normalizeCountryName function
function normalizeCountryName(countryName) {
  if (!countryName) return "";

  const name = String(countryName).trim();
  const lower = name.toLowerCase();

  // Direct mappings
  const directMappings = {
    // USA
    usa: "United States",
    "united states of america": "United States",
    us: "United States",
    "u.s.": "United States",
    "u.s.a.": "United States",
    america: "United States",

    // UK
    uk: "United Kingdom",
    "united kingdom of great britain and northern ireland": "United Kingdom",
    "great britain": "United Kingdom",
    britain: "United Kingdom",
    england: "United Kingdom",
    scotland: "United Kingdom",
    wales: "United Kingdom",

    // Common ISO codes
    usa: "United States",
    gbr: "United Kingdom",
    deu: "Germany",
    fra: "France",
    ita: "Italy",
    esp: "Spain",
    chn: "China",
    ind: "India",
    bra: "Brazil",
    rus: "Russia",
    can: "Canada",
    aus: "Australia",
    mex: "Mexico",
    idn: "Indonesia",

    // Problematic names
    "congo, dem. rep.": "Congo, Democratic Republic of the",
    "democratic republic of congo": "Congo, Democratic Republic of the",
    "dr congo": "Congo, Democratic Republic of the",
    "congo, democratic republic of": "Congo, Democratic Republic of the",
    "congo (kinshasa)": "Congo, Democratic Republic of the",

    "congo, rep.": "Congo",
    "republic of congo": "Congo",
    "congo (brazzaville)": "Congo",

    "cote d'ivoire": "Côte d'Ivoire",
    "ivory coast": "Côte d'Ivoire",

    eswatini: "Swaziland",
    swaziland: "Swaziland",

    "north macedonia": "Macedonia",
    macedonia: "Macedonia",

    "myanmar (burma)": "Myanmar",
    burma: "Myanmar",
    myanmar: "Myanmar",

    tanzania: "United Republic of Tanzania",
    "united republic of tanzania": "Tanzania",

    bolivia: "Bolivia",
    "bolivia (plurinational state of)": "Bolivia",

    venezuela: "Venezuela",
    "venezuela (bolivarian republic of)": "Venezuela",

    iran: "Iran",
    "iran (islamic republic of)": "Iran",

    "lao pdr": "Laos",
    laos: "Laos",

    syria: "Syrian Arab Republic",
    "syrian arab republic": "Syria",

    "viet nam": "Vietnam",
    vietnam: "Vietnam",

    yemen: "Yemen",
    "yemen republic": "Yemen",
  };

  // Try direct mapping first
  if (directMappings[lower]) {
    return directMappings[lower];
  }

  // Try partial matching
  for (const [key, value] of Object.entries(directMappings)) {
    if (lower.includes(key)) {
      return value;
    }
  }

  // Return with proper capitalization as last resort
  return name.charAt(0).toUpperCase() + name.slice(1);
}
// Make functions globally available
window.getApproximateCoordinates = getApproximateCoordinates;
window.geocodeLocation = geocodeLocation;

// ===== BASEMAP STYLE SWITCHER =====
function setBasemapStyle(style) {
  console.log("🗺️ Switching to", style, "basemap");

  // Update active button
  document.querySelectorAll(".basemap-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-style") === style) {
      btn.classList.add("active");
    }
  });

  // Store selection globally
  window.currentBasemapStyle = style;

  // If a map is currently displayed, update it
  if (currentMapInstance) {
    // Get current map settings
    const locationCol = document.getElementById("mapLocationColumn").value;
    const valueCol = document.getElementById("mapValueColumn").value;

    if (locationCol && valueCol) {
      // Show loading
      showNotification(`Switching to ${style} map style...`, "info");

      // Regenerate map after a short delay
      setTimeout(() => {
        generateMap();
      }, 300);
    }
  }
}

// Initialize default
window.currentBasemapStyle = "light";
