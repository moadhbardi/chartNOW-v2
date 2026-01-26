console.log("✅ dashboard_js.js loaded");
console.log("🗺️ Leaflet available?", typeof L !== "undefined");

// dashboard.js - Supports multiple charts
document.addEventListener("DOMContentLoaded", function () {
  console.log("📊 Dashboard loading...");

  // Load ALL saved charts (array)
  const savedCharts = localStorage.getItem("dashboardCharts");
  const grid = document.getElementById("dashboardGrid");

  if (!savedCharts || savedCharts === "[]") {
    grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <h3>No charts saved yet</h3>
          <p>Go back to editor, create charts, and click "Save to Dashboard".</p>
          <a href="index.html" class="action-btn" style="text-decoration: none; background: #667eea; color: white; padding: 10px 20px; border-radius: 8px;">
            ← Back to Editor
          </a>
        </div>
      `;
    return;
  }

  try {
    const charts = JSON.parse(savedCharts);
    console.log(`Loaded ${charts.length} visualizations:`, charts);

    // Clear grid
    grid.innerHTML = "";

    // Render each visualization
    charts.forEach((chartConfig, index) => {
      const chartCard = createChartCard(chartConfig, index);
      grid.appendChild(chartCard);
    });

    // Render all visualizations
    setTimeout(() => {
      charts.forEach((config, index) => {
        if (config.visualizationType === "map") {
          // Maps need more time - Leaflet must be fully loaded
          setTimeout(
            () => renderDashboardMap(config, index),
            300 + index * 100
          );
        } else if (config.visualizationType === "chart") {
          renderDashboardChart(config, index);
        } else if (config.visualizationType === "kpi") {
          // KPI cards are already rendered in the card HTML
          console.log(`✅ KPI card ${index} rendered in HTML`);
        }
      });
    }, 100);

    // Initialize drag & drop AFTER charts are rendered
    setTimeout(() => {
      initializeDragAndDrop();
      console.log("✅ Drag & drop initialized");
    }, 500);
  } catch (error) {
    console.error("Error loading charts:", error);
    grid.innerHTML = `<p style="color: #dc2626; padding: 20px;">Error: ${error.message}</p>`;
  }
});

function createChartCard(config, index) {
  const card = document.createElement("div");
  card.className = "chart-card";
  card.id = `visualization-${index}`;

  const isMap = config.visualizationType === "map";
  const isKPI = config.visualizationType === "kpi";

  if (isMap) {
    // ===== MAP CARD =====
    const hasImage = config.mapImage && config.isImage;

    card.innerHTML = `
      <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
      <div class="chart-header">
        <h3 class="chart-title">${config.title || `Map ${index + 1}`}</h3>
        <div class="chart-actions">
          <button class="chart-action-btn" onclick="removeChart(${index})" title="Remove">
            ×
          </button>
        </div>
      </div>
      <div style="height: 300px; position: relative; background: #f8f9fa; border-radius: 8px; overflow: hidden;" 
           id="mapContainer-${index}">
        ${
          hasImage
            ? `<img src="${config.mapImage}" style="width: 100%; height: 100%; object-fit: contain;" 
                alt="${config.title}" title="Static map image - click to view interactive version in editor">`
            : `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">
             <div>
               <p>⚠️ Map preview not available</p>
               <small>Go to editor to recreate this map</small>
             </div>
           </div>`
        }
      </div>
      <div class="chart-footer">
        <div style="display: flex; justify-content: space-between; color: #666; font-size: 0.9rem;">
          <span>🗺️ ${config.mapType} map (Static Image)</span>
          <span>${new Date(config.createdAt).toLocaleDateString()}</span>
        </div>
        <div style="margin-top: 5px; color: #888; font-size: 0.85rem;">
          ${config.valueColumn} by ${config.locationColumn}
          ${
            hasImage
              ? '<span style="color: #10b981; margin-left: 10px;">✅ Image saved</span>'
              : ""
          }
        </div>
      </div>
    `;
  } else if (isKPI) {
    // ===== KPI CARD =====
    const kpiValue = config.value || 0;
    const kpiTitle = config.title || `KPI ${index + 1}`;
    const valueColumn = config.valueColumn || "Data";
    const calculation = config.calculation || "count";
    const dataType = config.dataType || "text";
    const formattedValue =
      config.formattedValue ||
      formatKPIValueForDashboard(kpiValue, calculation);

    card.innerHTML = `
      <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
      <div class="chart-header">
        <h3 class="chart-title">${kpiTitle}</h3>
        <div class="chart-actions">
          <button class="chart-action-btn" onclick="removeChart(${index})" title="Remove">
            ×
          </button>
        </div>
      </div>
      <div style="height: 250px; position: relative; display: flex; align-items: center; justify-content: center;">
        <div class="kpi-card" style="width: 80%; border-top: 5px solid ${
          dataType === "numeric" ? "#667eea" : "#10b981"
        };">
          <div class="kpi-value" style="font-size: 2.5rem; color: ${
            dataType === "numeric" ? "#667eea" : "#10b981"
          };">
            ${formattedValue}
          </div>
          <div class="kpi-subtitle" style="margin-top: 10px;">
            ${calculation} of ${valueColumn}
          </div>
          <div style="margin-top: 15px; color: #666; font-size: 0.9rem;">
            ${config.rowCount || 0} records • ${
      dataType === "numeric" ? "🔢 Numeric" : "📝 Text"
    } data
          </div>
        </div>
      </div>
      <div class="chart-footer">
        <div style="display: flex; justify-content: space-between; color: #666; font-size: 0.9rem;">
          <span>🎯 KPI Card</span>
          <span>${new Date(config.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    `;
  } else {
    // ===== CHART CARD =====
    card.innerHTML = `
      <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
      <div class="chart-header">
        <h3 class="chart-title">${config.title || `Chart ${index + 1}`}</h3>
        <div class="chart-actions">
          <button class="chart-action-btn" onclick="removeChart(${index})" title="Remove">
            ×
          </button>
        </div>
      </div>
      <div style="height: 250px; position: relative;">
        <canvas id="dashboardChart-${index}"></canvas>
      </div>
      <div class="chart-footer">
        <div style="display: flex; justify-content: space-between; color: #666; font-size: 0.9rem;">
          <span>📊 ${config.type} chart</span>
          <span>${new Date(config.createdAt).toLocaleDateString()}</span>
        </div>
        <div style="margin-top: 5px; color: #888; font-size: 0.85rem;">
          ${config.xAxis} vs ${config.yAxis?.join(", ") || "values"}
        </div>
      </div>
    `;
  }

  return card;
}

function renderDashboardChart(config, index) {
  const canvas = document.getElementById(`dashboardChart-${index}`);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Generate sample data based on chart type
  const { labels, data, colors } = generateSampleData(config.type);

  new Chart(ctx, {
    type: config.type,
    data: {
      labels: labels,
      datasets: [
        {
          label: config.yAxis?.[0] || "Values",
          data: data,
          backgroundColor: config.colors || colors,
          borderColor: (config.colors || colors).map((c) =>
            c.replace("0.7", "1")
          ),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: config.title || `Chart ${index + 1}`,
          font: { size: 14 },
        },
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

function generateSampleData(chartType) {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const data = [65, 59, 80, 81, 56, 55];
  const colors = [
    "rgba(255, 99, 132, 0.7)",
    "rgba(54, 162, 235, 0.7)",
    "rgba(255, 206, 86, 0.7)",
    "rgba(75, 192, 192, 0.7)",
    "rgba(153, 102, 255, 0.7)",
    "rgba(255, 159, 64, 0.7)",
  ];

  return { labels, data, colors };
}

// Remove chart from dashboard
function removeChart(index) {
  if (confirm("Remove this visualization from dashboard?")) {
    // Load current charts
    const charts = JSON.parse(localStorage.getItem("dashboardCharts") || "[]");

    // Remove the selected chart
    charts.splice(index, 1);

    // Save back to localStorage
    localStorage.setItem("dashboardCharts", JSON.stringify(charts));

    // Reload the dashboard to reflect changes
    location.reload();
  }
}

// Export all charts
function exportDashboard() {
  const charts = JSON.parse(localStorage.getItem("dashboardCharts") || "[]");

  if (charts.length === 0) {
    alert("No visualizations to export!");
    return;
  }

  // Create a JSON file with all charts
  const dataStr = JSON.stringify(charts, null, 2);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  const link = document.createElement("a");
  link.href = dataUri;
  link.download = `dashboard-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();

  alert(`Exported ${charts.length} visualizations to JSON file`);
}

// Clear all charts
function clearDashboard() {
  const charts = JSON.parse(localStorage.getItem("dashboardCharts") || "[]");

  if (charts.length === 0) return;

  if (confirm(`Clear all ${charts.length} visualizations from dashboard?`)) {
    localStorage.setItem("dashboardCharts", JSON.stringify([]));
    location.reload();
  }
}

// PNG Export
async function exportAsPNG() {
  const dashboard = document.getElementById("dashboardGrid");

  if (!dashboard) {
    alert("Dashboard not found!");
    return;
  }

  const canvas = await html2canvas(dashboard, {
    scale: 2, // High resolution
    backgroundColor: "#ffffff",
  });

  const link = document.createElement("a");
  link.download = `dashboard-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png", 1.0);
  link.click();
}

// PDF Export
async function exportAsPDF() {
  const dashboard = document.getElementById("dashboardGrid");

  if (!dashboard) {
    alert("Dashboard not found!");
    return;
  }

  if (typeof jspdf === "undefined") {
    alert("Please wait for PDF library to load and try again.");
    return;
  }

  const { jsPDF } = window.jspdf;

  const canvas = await html2canvas(dashboard, {
    scale: 2,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png", 1.0);
  const pdf = new jsPDF("landscape", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
  pdf.save(`dashboard-${Date.now()}.pdf`);
}

// JSON Export (already have)
function exportAsJSON() {
  exportDashboard();
}

// ===== DRAG & DROP FUNCTIONALITY =====
let isDragging = false;
let currentDragCard = null;
let dragOffset = { x: 0, y: 0 };
let dragPlaceholder = null;

function initializeDragAndDrop() {
  const dragHandles = document.querySelectorAll(".drag-handle");
  console.log(`Found ${dragHandles.length} drag handles`);

  dragHandles.forEach((handle) => {
    // Mouse events
    handle.addEventListener("mousedown", startDrag);
    // Touch events for mobile
    handle.addEventListener("touchstart", startDragTouch, { passive: false });
  });

  // Add global listeners
  document.addEventListener("mousemove", handleDragMove);
  document.addEventListener("mouseup", stopDrag);
  document.addEventListener("touchmove", handleDragMoveTouch, {
    passive: false,
  });
  document.addEventListener("touchend", stopDrag);
}

function startDrag(e) {
  e.preventDefault();
  currentDragCard = this.closest(".chart-card");
  if (!currentDragCard) return;

  const rect = currentDragCard.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;

  setupDragging();

  // Create placeholder where card was
  createPlaceholder(rect);

  // Move card to mouse position
  updateCardPosition(e.clientX, e.clientY);
}

function startDragTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  currentDragCard = this.closest(".chart-card");
  if (!currentDragCard) return;

  const rect = currentDragCard.getBoundingClientRect();
  dragOffset.x = touch.clientX - rect.left;
  dragOffset.y = touch.clientY - rect.top;

  setupDragging();
  createPlaceholder(rect);
  updateCardPosition(touch.clientX, touch.clientY);
}

function setupDragging() {
  isDragging = true;
  currentDragCard.classList.add("dragging");
  currentDragCard.style.position = "fixed";
  currentDragCard.style.zIndex = "9999";
  currentDragCard.style.width = currentDragCard.offsetWidth + "px";
  currentDragCard.style.height = currentDragCard.offsetHeight + "px";
  currentDragCard.style.boxShadow = "0 10px 40px rgba(0,0,0,0.2)";
  currentDragCard.style.cursor = "grabbing";
}

function createPlaceholder(rect) {
  dragPlaceholder = document.createElement("div");
  dragPlaceholder.className = "drag-placeholder";
  dragPlaceholder.style.width = rect.width + "px";
  dragPlaceholder.style.height = rect.height + "px";
  dragPlaceholder.style.margin = "0";
  dragPlaceholder.style.backgroundColor = "#f1f5f9";
  dragPlaceholder.style.border = "2px dashed #cbd5e1";
  dragPlaceholder.style.borderRadius = "14px";
  dragPlaceholder.style.opacity = "0.7";

  // Insert where card was
  currentDragCard.parentNode.insertBefore(dragPlaceholder, currentDragCard);
}

function handleDragMove(e) {
  if (!isDragging) return;
  updateCardPosition(e.clientX, e.clientY);
  updateDropPosition(e.clientX, e.clientY);
}

function handleDragMoveTouch(e) {
  if (!isDragging) return;
  e.preventDefault();
  const touch = e.touches[0];
  updateCardPosition(touch.clientX, touch.clientY);
  updateDropPosition(touch.clientX, touch.clientY);
}

function updateCardPosition(x, y) {
  if (!currentDragCard) return;
  currentDragCard.style.left = x - dragOffset.x + "px";
  currentDragCard.style.top = y - dragOffset.y + "px";
}

function updateDropPosition(x, y) {
  if (!dragPlaceholder) return;

  const cards = document.querySelectorAll(".chart-card:not(.dragging)");
  let closestCard = null;
  let closestDistance = Infinity;

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const distance = Math.abs(y - centerY);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestCard = card;
    }
  });

  if (closestCard && closestCard !== dragPlaceholder.previousElementSibling) {
    const grid = document.getElementById("dashboardGrid");

    // Decide whether to insert before or after
    const closestRect = closestCard.getBoundingClientRect();
    if (y < closestRect.top + closestRect.height / 2) {
      grid.insertBefore(dragPlaceholder, closestCard);
    } else {
      grid.insertBefore(dragPlaceholder, closestCard.nextSibling);
    }
  }
}

function stopDrag() {
  if (!isDragging || !currentDragCard) return;

  // Move card to placeholder position
  if (dragPlaceholder && dragPlaceholder.parentNode) {
    dragPlaceholder.parentNode.insertBefore(currentDragCard, dragPlaceholder);
    dragPlaceholder.remove();
  }

  // Clean up
  currentDragCard.classList.remove("dragging");
  currentDragCard.style.position = "";
  currentDragCard.style.zIndex = "";
  currentDragCard.style.width = "";
  currentDragCard.style.height = "";
  currentDragCard.style.left = "";
  currentDragCard.style.top = "";
  currentDragCard.style.boxShadow = "";
  currentDragCard.style.cursor = "";

  // Reset
  isDragging = false;
  currentDragCard = null;
  dragPlaceholder = null;

  // Save new order
  saveDashboardOrder();
}

function saveDashboardOrder() {
  const grid = document.getElementById("dashboardGrid");
  const cards = Array.from(grid.querySelectorAll(".chart-card"));

  // Get current charts from localStorage
  const charts = JSON.parse(localStorage.getItem("dashboardCharts") || "[]");

  if (charts.length === cards.length) {
    // Create new array in current order
    const reorderedCharts = cards
      .map((card) => {
        const oldIndex = parseInt(card.id.split("-")[1]);
        return charts[oldIndex];
      })
      .filter((chart) => chart);

    // Save with updated indices
    const updatedCharts = reorderedCharts.map((chart, newIndex) => ({
      ...chart,
      id: `chart-${newIndex}`,
    }));

    localStorage.setItem("dashboardCharts", JSON.stringify(updatedCharts));

    // Update chart IDs in DOM
    cards.forEach((card, index) => {
      card.id = `chart-${index}`;
      const canvas = card.querySelector("canvas");
      if (canvas) canvas.id = `dashboardChart-${index}`;
    });
  }
}

function smartExport() {
  // Auto-generate title based on content
  const charts = JSON.parse(localStorage.getItem("dashboardCharts") || "[]");

  let title = "📊 Dashboard";

  if (charts.length > 0) {
    const firstChart = charts[0];

    // Create smart title
    if (charts.length === 1) {
      title = `${firstChart.type} Chart: ${firstChart.xAxis} vs ${firstChart.yAxis[0]}`;
    } else {
      const chartTypes = [...new Set(charts.map((c) => c.type))];
      title = `${charts.length} Charts: ${chartTypes.join(", ")}`;
    }

    // Add date
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    title += ` (${today})`;
  }

  // Optional: Let user confirm/edit
  const finalTitle = prompt("Export title:", title) || title;

  if (finalTitle) {
    // Export with this title
    console.log(`Exporting: ${finalTitle}`);
    // Your export code here

    alert(`✅ Exported: "${finalTitle}"`);
  }
}
//new fix map function
async function renderDashboardMap(config, index) {
  const container = document.getElementById(`mapContainer-${index}`);
  if (!container || !config.mapData) {
    console.error(`❌ Map container or data not found for index ${index}`);
    return;
  }

  // Clear loading message
  container.innerHTML = "";

  // Create map container
  const mapId = `dashboard-map-${index}`;
  const mapDiv = document.createElement("div");
  mapDiv.id = mapId;
  mapDiv.style.width = "100%";
  mapDiv.style.height = "100%";
  mapDiv.style.borderRadius = "8px";
  container.appendChild(mapDiv);

  try {
    // Initialize map
    const map = L.map(mapId).setView([20, 0], 2);

    // Add tile layer based on saved basemap
    let tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    let attribution = "© OpenStreetMap contributors";

    if (config.basemapStyle === "dark") {
      tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      attribution = "© OpenStreetMap contributors © CARTO";
    } else if (config.basemapStyle === "satellite") {
      tileUrl =
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
      attribution = "© Esri";
    }

    L.tileLayer(tileUrl, {
      attribution: attribution,
      maxZoom: 8,
    }).addTo(map);

    // Process map data
    const values = config.mapData
      .map((item) => parseFloat(item.value) || 0)
      .filter((v) => !isNaN(v));

    const maxValue = config.styling?.maxValue || Math.max(...values, 1);
    const minValue = config.styling?.minValue || Math.min(...values, 0);
    const colorScheme = config.colorScheme || "Blues";
    const mapType = config.mapType || "point";

    console.log(
      `🔄 Rendering ${mapType} map with ${config.mapData.length} points`
    );
    console.log(`🎨 Using color scheme: ${colorScheme}`);
    console.log(`📊 Value range: ${minValue} to ${maxValue}`);

    // Color function based on saved scheme
    const getColorForValue = (value) => {
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
    };

    // Add markers/circles based on map type WITH ORIGINAL STYLING
    config.mapData.forEach((item) => {
      if (item.coordinates && item.coordinates.length === 2) {
        const value = parseFloat(item.value) || 0;
        const color = getColorForValue(value);

        if (mapType === "choropleth") {
          // For choropleth: colored circles sized by value
          const normalized = (value - minValue) / (maxValue - minValue || 1);
          const radius = 10 + normalized * 15; // Size based on value

          L.circleMarker(item.coordinates, {
            radius: radius,
            fillColor: color,
            color: "#333",
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.7,
          })
            .bindPopup(
              `<strong>${item.location}</strong><br>${
                config.valueColumn
              }: <b>${value.toLocaleString()}</b><br>
              <small>Color intensity: ${Math.round(normalized * 100)}%</small>`
            )
            .addTo(map);
        } else if (mapType === "bubble") {
          // For bubble maps - proportional sizing
          const normalized = value / maxValue;
          const radius = Math.sqrt(normalized) * 20; // Proportional to value

          L.circle(item.coordinates, {
            radius: radius * 1000, // Convert to meters
            fillColor: "#3388ff",
            color: "#3388ff",
            weight: 1,
            opacity: 0.5,
            fillOpacity: 0.4,
          })
            .bindPopup(
              `<strong>${item.location}</strong><br>${
                config.valueColumn
              }: <b>${value.toLocaleString()}</b>`
            )
            .addTo(map);
        } else if (mapType === "point") {
          // For point maps - colored points
          const size = Math.min(15, Math.max(5, Math.log(value + 1) * 3));

          L.circleMarker(item.coordinates, {
            radius: size,
            fillColor: color,
            color: "#333",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7,
          })
            .bindPopup(
              `<strong>${item.location}</strong><br>${
                config.valueColumn
              }: <b>${value.toLocaleString()}</b>`
            )
            .addTo(map);
        } else {
          // Default: simple colored marker
          L.circleMarker(item.coordinates, {
            radius: 8,
            fillColor: color,
            color: "#333",
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.7,
          })
            .bindPopup(
              `<strong>${item.location}</strong><br>${
                config.valueColumn
              }: <b>${value.toLocaleString()}</b>`
            )
            .addTo(map);
        }
      } else {
        console.warn(`⚠️ No coordinates for: ${item.location}`);
      }
    });

    // Auto-fit bounds if we have markers
    const markers = [];
    map.eachLayer((layer) => {
      if (
        layer instanceof L.Marker ||
        layer instanceof L.Circle ||
        layer instanceof L.CircleMarker
      ) {
        markers.push(layer);
      }
    });

    if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    } else {
      // Default view if no markers
      map.setView([20, 0], 2);
    }

    // Add scale control
    L.control.scale().addTo(map);

    // Add legend for choropleth maps
    if (mapType === "choropleth") {
      addDashboardMapLegend(
        map,
        minValue,
        maxValue,
        colorScheme,
        config.valueColumn
      );
    }

    console.log(`✅ Map ${index} rendered successfully!`);
  } catch (error) {
    console.error(`Error rendering map ${index}:`, error);
    container.innerHTML = `
      <div style="color: #dc2626; padding: 20px; text-align: center;">
        <p>⚠️ Could not load map</p>
        <small>${error.message}</small>
        <br>
        <button onclick="retryMapRender(${index})" style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px;">
          Retry
        </button>
      </div>
    `;
  }
}

// Add this helper function for map legends (ADD AT THE END OF THE FILE)
function addDashboardMapLegend(
  map,
  minValue,
  maxValue,
  colorScheme,
  valueColumn
) {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "info legend");
    div.style.backgroundColor = "white";
    div.style.padding = "10px";
    div.style.borderRadius = "5px";
    div.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
    div.style.fontSize = "12px";
    div.style.maxWidth = "200px";

    div.innerHTML = `<strong>${valueColumn}</strong><br><br>`;

    // Create 5 classes
    const grades = 5;
    for (let i = 0; i < grades; i++) {
      const value = minValue + (i * (maxValue - minValue)) / grades;
      const nextValue = minValue + ((i + 1) * (maxValue - minValue)) / grades;
      const color = getDashboardLegendColor(
        value,
        minValue,
        maxValue,
        colorScheme
      );

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

    return div;
  };

  legend.addTo(map);

  function getDashboardLegendColor(value, min, max, scheme) {
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

// Optional: Retry function for failed map loads (ADD AT THE END OF THE FILE)
function retryMapRender(index) {
  console.log(`🔄 Retrying map render for index ${index}`);
  const charts = JSON.parse(localStorage.getItem("dashboardCharts") || "[]");
  if (charts[index]) {
    renderDashboardMap(charts[index], index);
  }
}

// ===== KPI HELPER FUNCTIONS =====
function formatKPIValueForDashboard(value, calculation) {
  if (calculation === "count" || calculation === "unique") {
    return value.toLocaleString();
  }

  // For numeric values
  const numValue = Number(value);
  if (isNaN(numValue)) return String(value);

  if (Math.abs(numValue) >= 1000000) {
    return `${(numValue / 1000000).toFixed(2)}M`;
  } else if (Math.abs(numValue) >= 1000) {
    return `${(numValue / 1000).toFixed(2)}K`;
  } else {
    return `${numValue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}
/// ===== DASHBOARD-ONLY THEME MANAGEMENT =====

// Toggle theme for dashboard zone only
function toggleDashboardTheme() {
  const dashboardZone = document.getElementById("dashboardZone");
  const themeToggle = document.getElementById("dashboardThemeToggle");
  const isDark = dashboardZone.classList.toggle("dark-theme");

  // Update button text
  themeToggle.innerHTML = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  themeToggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";

  // Save preference (only for dashboard)
  localStorage.setItem("dashboardTheme", isDark ? "dark" : "light");

  console.log(`Dashboard theme: ${isDark ? "dark" : "light"}`);
}

// Apply saved theme on page load
function applyDashboardTheme() {
  const savedTheme = localStorage.getItem("dashboardTheme") || "light";
  const dashboardZone = document.getElementById("dashboardZone");
  const themeToggle = document.getElementById("dashboardThemeToggle");

  if (savedTheme === "dark") {
    dashboardZone.classList.add("dark-theme");
    themeToggle.innerHTML = "☀️ Light Mode";
  } else {
    themeToggle.innerHTML = "🌙 Dark Mode";
  }
}

// Initialize dashboard theme on load
document.addEventListener("DOMContentLoaded", function () {
  applyDashboardTheme();

  // Optional: Auto-detect system preference
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  if (prefersDark.matches && !localStorage.getItem("dashboardTheme")) {
    // Auto-apply dark mode if user hasn't set preference
    document.getElementById("dashboardZone").classList.add("dark-theme");
    document.getElementById("dashboardThemeToggle").innerHTML = "☀️ Light Mode";
  }
});
