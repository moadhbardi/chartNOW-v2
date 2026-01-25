// main.js - Main dashboard logic for CSV Dashboard Builder

// Global variables
let csvData = [];
let csvHeaders = [];
let chartInstance = null;
let currentChartType = "bar";
let selectedVariables = { xAxis: null, yAxis: [] };

// GLOBAL COLORS ARRAY
const chartColors = [
  "rgba(255, 99, 132, 0.7)", // Pink
  "rgba(54, 162, 235, 0.7)", // Blue
  "rgba(255, 206, 86, 0.7)", // Yellow
  "rgba(75, 192, 192, 0.7)", // Teal
  "rgba(153, 102, 255, 0.7)", // Purple
  "rgba(255, 159, 64, 0.7)", // Orange
  "rgba(201, 203, 207, 0.7)", // Gray
];

// Color management
let customChartColors = [];
let categoryColorMap = {};

// Map System Globals (Keep these - they're shared)
let currentMapType = "choropleth";
let currentMapInstance = null;

// ===== INITIALIZE WHEN PAGE LOADS =====
document.addEventListener("DOMContentLoaded", function () {
  console.log("📊 Dashboard initializing...");
  setupEventListeners();
});

function setupEventListeners() {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  if (!dropZone || !fileInput) {
    console.error("❌ Drop zone or file input not found!");
    return;
  }

  dropZone.addEventListener("click", function (e) {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener("change", function (e) {
    handleFileUpload(e);
  });

  dropZone.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.background = "#e9ecef";
    dropZone.style.borderColor = "#0056b3";
  });

  dropZone.addEventListener("dragleave", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.background = "#f8f9fa";
    dropZone.style.borderColor = "#007bff";
  });

  dropZone.addEventListener("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.background = "#f8f9fa";
    dropZone.style.borderColor = "#007bff";

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const fileEvent = { target: { files: files } };
      handleFileUpload(fileEvent);
    }
  });
}

// ===== FILE UPLOAD FUNCTIONS =====
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  parseFile(file);
}

function parseFile(file) {
  if (!file) return;

  const fileName = file.name.toLowerCase();
  const isExcel =
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xlsm");

  if (isExcel) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csvText = XLSX.utils.sheet_to_csv(worksheet);

        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: function (results) {
            processParsedData(results, file);
          },
          error: function (error) {
            alert("Error parsing Excel file: " + error.message);
          },
        });
      } catch (error) {
        alert(
          "Error reading Excel file. It may be corrupted or password protected."
        );
      }
    };
    reader.readAsBinaryString(file);
  } else {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: function (results) {
        processParsedData(results, file);
      },
      error: function (error) {
        alert("Error parsing CSV: " + error.message);
      },
    });
  }
}

function processParsedData(results, file) {
  csvData = results.data;
  csvHeaders = results.meta.fields;

  console.log(
    "✅ Data loaded:",
    csvData.length,
    "rows,",
    csvHeaders.length,
    "columns"
  );

  if (typeof initAISystem === "function") {
    initAISystem(csvData, csvHeaders);
  }

  document.getElementById("fileName").textContent = file.name;
  document.getElementById("rowCount").textContent = csvData.length;
  document.getElementById("colCount").textContent = csvHeaders.length;
  document.getElementById("fileInfo").style.display = "block";

  updateVariablesList();
  updateGroupByDropdown();
  showDataPreview();
  showQuickStats();

  console.log("🎉 Data processing complete!");
}

// ===== UI UPDATE FUNCTIONS =====
function updateVariablesList() {
  const variablesList = document.getElementById("variablesList");
  if (!variablesList) return;

  variablesList.innerHTML = "";
  csvHeaders.forEach((header) => {
    const div = document.createElement("div");
    div.className = "variable-item";
    div.textContent = header;
    div.draggable = true;
    div.id = `var-${header}`;
    div.setAttribute("data-header", header);
    div.addEventListener("dragstart", drag);

    const sampleValue = csvData[0]?.[header];
    let icon = "🔢";
    if (typeof sampleValue === "string") icon = "📝";
    if (sampleValue instanceof Date) icon = "📅";
    if (typeof sampleValue === "number") {
      icon = isNaN(sampleValue) ? "📝" : "🔢";
    }

    div.innerHTML = `${icon} ${header}`;
    variablesList.appendChild(div);
  });
}

function drag(event) {
  event.dataTransfer.setData(
    "text/plain",
    event.target.getAttribute("data-header")
  );
}

function allowDrop(event) {
  event.preventDefault();
}

function dropInXAxis(event) {
  event.preventDefault();
  const header = event.dataTransfer.getData("text/plain");
  selectedVariables.xAxis = header;
  document.getElementById(
    "xAxisVar"
  ).innerHTML = `<strong>${header}</strong> <button onclick="removeXAxis()" style="float:right; padding:2px 8px;">×</button>`;
}

function dropInYAxis(event) {
  event.preventDefault();
  const header = event.dataTransfer.getData("text/plain");
  if (!selectedVariables.yAxis.includes(header)) {
    selectedVariables.yAxis.push(header);
    updateYAxisDisplay();
  }
}

function updateYAxisDisplay() {
  const container = document.getElementById("yAxisVars");
  if (!container) return;

  container.innerHTML = "";
  selectedVariables.yAxis.forEach((header) => {
    const div = document.createElement("div");
    div.innerHTML = `<span>${header}</span><button onclick="removeYAxis('${header}')" style="float:right; padding:2px 8px;">×</button>`;
    div.style.margin = "5px 0";
    div.style.padding = "5px";
    div.style.background = "#e9ecef";
    div.style.borderRadius = "3px";
    container.appendChild(div);
  });
}

function removeXAxis() {
  selectedVariables.xAxis = null;
  const xAxisVar = document.getElementById("xAxisVar");
  if (xAxisVar) xAxisVar.innerHTML = "<p>Drag variable here for X-axis</p>";
}

function removeYAxis(header) {
  selectedVariables.yAxis = selectedVariables.yAxis.filter((h) => h !== header);
  updateYAxisDisplay();
}

function setChartType(type) {
  currentChartType = type;

  // Show/hide controls based on type
  const chartControls = document.getElementById("chartControls");
  const mapControls = document.getElementById("mapControls");
  const kpiControls = document.getElementById("kpiControls");

  // Hide all first
  if (chartControls) chartControls.style.display = "none";
  if (mapControls) mapControls.style.display = "none";
  if (kpiControls) kpiControls.style.display = "none";

  // Show only the selected type
  if (type === "map") {
    if (mapControls) mapControls.style.display = "block";
    // Call map function from map-system.js
    if (
      typeof populateMapColumnDropdowns === "function" &&
      csvHeaders.length > 0
    ) {
      populateMapColumnDropdowns();
    }
  } else if (type === "kpi") {
    if (kpiControls) kpiControls.style.display = "block";
    populateKPIColumns();
  } else {
    // All other chart types
    if (chartControls) chartControls.style.display = "block";
  }

  // Update active button state
  document.querySelectorAll(".chart-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("onclick") === `setChartType('${type}')`) {
      btn.classList.add("active");
    }
  });
}

function updateGroupByDropdown() {
  const select = document.getElementById("groupBy");
  if (!select) return;

  select.innerHTML = '<option value="">None</option>';
  csvHeaders.forEach((header) => {
    const option = document.createElement("option");
    option.value = header;
    option.textContent = header;
    select.appendChild(option);
  });
}

// ===== CHART GENERATION FUNCTIONS =====
function generateChart() {
  // ===== CRITICAL FIX: Clean up any existing map before creating chart =====
  const chartArea = document.querySelector(".chart-container");
  const existingMap = document.getElementById("mapContainer");

  if (existingMap) {
    console.log("🗑️ Removing existing map container before creating chart");
    existingMap.remove();
  }

  // Also remove any Leaflet map instance
  if (currentMapInstance) {
    console.log("🗑️ Removing Leaflet map instance");
    currentMapInstance.remove();
    currentMapInstance = null;
  }

  // Clear the entire chart area to be safe
  if (chartArea) {
    const canvas = document.getElementById("myChart");
    if (!canvas) {
      // Create canvas if it doesn't exist
      const newCanvas = document.createElement("canvas");
      newCanvas.id = "myChart";
      chartArea.innerHTML = "";
      chartArea.appendChild(newCanvas);
    }
  }
  // ===== END CLEANUP =====

  if (!selectedVariables.xAxis || selectedVariables.yAxis.length === 0) {
    alert("Please select at least one variable for X-axis and one for Y-axis");
    return;
  }

  if (csvData.length === 0) {
    alert("Please upload a CSV or Excel file first");
    return;
  }

  let chartData;
  const groupBy = document.getElementById("groupBy").value;
  const aggregation = document.getElementById("aggregation").value;

  resetColorMap();

  if (groupBy) {
    chartData = prepareAggregatedData(groupBy, aggregation);
  } else {
    chartData = prepareSimpleData();
  }

  const ctx = document.getElementById("myChart").getContext("2d");

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: currentChartType,
    data: chartData,
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: `Chart: ${
            selectedVariables.xAxis
          } vs ${selectedVariables.yAxis.join(", ")}`,
        },
        tooltip: { mode: "index", intersect: false },
      },
      scales:
        currentChartType === "bar" || currentChartType === "line"
          ? {
              x: { title: { display: true, text: selectedVariables.xAxis } },
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: selectedVariables.yAxis.join(" / "),
                },
              },
            }
          : {},
    },
  });

  onChartGenerated();
}

function prepareSimpleData() {
  const xValues = [
    ...new Set(csvData.map((row) => row[selectedVariables.xAxis])),
  ].slice(0, 50);

  if (currentChartType === "pie" || currentChartType === "doughnut") {
    if (selectedVariables.yAxis.length > 1) {
      alert(
        "Pie/Doughnut charts only support one numeric variable. Using the first one."
      );
      selectedVariables.yAxis = [selectedVariables.yAxis[0]];
    }

    const colors = xValues.map((x) => getColorForCategory(x));
    const yVar = selectedVariables.yAxis[0];
    const yValues = xValues.map((x) => {
      const matchingRows = csvData.filter(
        (row) => row[selectedVariables.xAxis] === x
      );
      return matchingRows.reduce((sum, row) => sum + (row[yVar] || 0), 0);
    });

    return {
      labels: xValues.map(String),
      datasets: [
        {
          label: yVar,
          data: yValues,
          backgroundColor: colors,
          borderColor: colors.map((color) => color.replace("0.7", "1")),
          borderWidth: 1,
        },
      ],
    };
  }

  if (currentChartType === "bar" && selectedVariables.yAxis.length === 1) {
    const colors = xValues.map((x) => getColorForCategory(x));
    const yVar = selectedVariables.yAxis[0];
    const yValues = xValues.map((x) => {
      const matchingRows = csvData.filter(
        (row) => row[selectedVariables.xAxis] === x
      );
      return matchingRows.reduce((sum, row) => sum + (row[yVar] || 0), 0);
    });

    return {
      labels: xValues.map(String),
      datasets: [
        {
          label: yVar,
          data: yValues,
          backgroundColor: colors,
          borderColor: colors.map((color) => color.replace("0.7", "1")),
          borderWidth: 1,
        },
      ],
    };
  }

  const datasets = selectedVariables.yAxis.map((yVar, index) => {
    const color = chartColors[index % chartColors.length];
    const yValues = xValues.map((x) => {
      const matchingRows = csvData.filter(
        (row) => row[selectedVariables.xAxis] === x
      );
      if (matchingRows.length === 0) return 0;
      return matchingRows.reduce((sum, row) => {
        const val = row[yVar];
        return sum + (typeof val === "number" ? val : 0);
      }, 0);
    });

    return {
      label: yVar,
      data: yValues,
      backgroundColor: currentChartType === "bar" ? color : "transparent",
      borderColor: color,
      borderWidth: 2,
      fill: currentChartType === "line",
    };
  });

  return { labels: xValues.map(String), datasets: datasets };
}

function prepareAggregatedData(groupBy, aggregation) {
  const groups = {};
  csvData.forEach((row) => {
    const groupKey = row[groupBy] || "Unknown";
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(row);
  });

  const labels = Object.keys(groups);
  const groupColors = labels.map((label) => getColorForCategory(label));

  const datasets = selectedVariables.yAxis.map((yVar, index) => {
    const data = labels.map((groupKey) => {
      const groupRows = groups[groupKey];
      const values = groupRows
        .map((row) => row[yVar])
        .filter((v) => typeof v === "number");
      if (values.length === 0) return 0;

      switch (aggregation) {
        case "sum":
          return values.reduce((a, b) => a + b, 0);
        case "average":
          return values.reduce((a, b) => a + b, 0) / values.length;
        case "count":
          return values.length;
        case "min":
          return Math.min(...values);
        case "max":
          return Math.max(...values);
        default:
          return values.reduce((a, b) => a + b, 0);
      }
    });

    if (selectedVariables.yAxis.length === 1 && currentChartType === "bar") {
      return {
        label: `${yVar} (${aggregation})`,
        data: data,
        backgroundColor: groupColors,
        borderColor: groupColors.map((color) => color.replace("0.7", "1")),
        borderWidth: 1,
      };
    } else {
      return {
        label: `${yVar} (${aggregation})`,
        data: data,
        backgroundColor: chartColors[index % chartColors.length],
        borderColor: chartColors[index % chartColors.length].replace(
          "0.7",
          "1"
        ),
        borderWidth: 1,
      };
    }
  });

  return { labels: labels, datasets: datasets };
}

// ===== COLOR MANAGEMENT FUNCTIONS =====
function getColorForCategory(category) {
  const key = String(category);
  if (!categoryColorMap[key]) {
    const index = Object.keys(categoryColorMap).length % chartColors.length;
    categoryColorMap[key] = chartColors[index];
  }
  return categoryColorMap[key];
}

function resetColorMap() {
  categoryColorMap = {};
}

function applyColorPreset(presetName) {
  const presets = {
    default: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CE63", "#FFEAA7"],
    pastel: ["#FFB6C1", "#87CEEB", "#98FB98", "#DDA0DD", "#FFD700"],
    vibrant: ["#FF3860", "#FFDD57", "#23D160", "#3273DC", "#FF470F"],
  };

  customChartColors = [...presets[presetName]];
  updateChartColors();
}

function updateChartColors() {
  if (!chartInstance) return;

  chartInstance.data.datasets.forEach((dataset, index) => {
    const color =
      customChartColors[index] || chartColors[index % chartColors.length];
    dataset.backgroundColor = color;
    dataset.borderColor = color.replace("0.7", "1");
  });

  chartInstance.update();
  updateColorControlsUI();
}

function updateColorControlsUI() {
  const container = document.getElementById("datasetColors");
  if (!container || !chartInstance) return;

  const datasets = chartInstance.data.datasets;
  if (datasets.length === 0) return;

  let html = "";
  datasets.forEach((dataset, index) => {
    const color = customChartColors[index] || dataset.backgroundColor;
    html += `<div class="color-item"><span>${
      dataset.label
    }:</span><input type="color" value="${rgbToHex(
      color
    )}" onchange="updateDatasetColor(${index}, this.value)"></div>`;
  });

  container.innerHTML = html;
}

function updateDatasetColor(index, newColor) {
  customChartColors[index] = newColor;
  updateChartColors();
}

function rgbToHex(rgb) {
  if (rgb.startsWith("#")) return rgb;
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  return "#FF6B6B";
}

function onChartGenerated() {
  setTimeout(updateColorControlsUI, 100);
}

// ===== RESET CHART =====
function resetChart() {
  selectedVariables = { xAxis: null, yAxis: [] };
  document.getElementById("xAxisVar").innerHTML =
    "<p>Drag variable here for X-axis</p>";
  document.getElementById("yAxisVars").innerHTML =
    "<p>Drag numeric variables here for Y-axis</p>";
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  resetColorMap();
}

// ===== DATA PREVIEW FUNCTIONS =====
function showDataPreview() {
  const table = document.getElementById("dataTable");
  if (!table) return;

  if (csvData.length === 0) {
    table.innerHTML = "<p>No data loaded</p>";
    return;
  }

  let html = `<table><thead><tr>`;
  csvHeaders.slice(0, 10).forEach((header) => {
    html += `<th>${header}</th>`;
  });
  html += `</tr></thead><tbody>`;

  csvData.slice(0, 10).forEach((row) => {
    html += `<tr>`;
    csvHeaders.slice(0, 10).forEach((header) => {
      html += `<td>${row[header] !== undefined ? row[header] : ""}</td>`;
    });
    html += `</tr>`;
  });

  if (csvData.length > 10) {
    html += `<tr><td colspan="${Math.min(
      10,
      csvHeaders.length
    )}" style="text-align:center; font-style:italic;">... and ${
      csvData.length - 10
    } more rows</td></tr>`;
  }

  html += `</tbody></table>`;
  table.innerHTML = html;
}

function showQuickStats() {
  const statsDiv = document.getElementById("quickStats");
  if (!statsDiv) return;

  let html = "";
  csvHeaders.slice(0, 5).forEach((header) => {
    const values = csvData
      .map((row) => row[header])
      .filter((v) => v !== undefined && v !== null);
    if (values.length === 0) return;

    const sample = values[0];
    const type = typeof sample;

    html += `<div style="margin: 5px 0; padding: 8px; background: #f8f9fa; border-radius: 4px;"><strong>${header}</strong><br><small>Type: ${type}</small>`;

    if (typeof sample === "number") {
      const numericValues = values.filter((v) => typeof v === "number");
      if (numericValues.length > 0) {
        const avg =
          numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        html += `<br><small>Avg: ${avg.toFixed(2)} | Count: ${
          values.length
        }</small>`;
      }
    } else if (type === "string") {
      const uniqueValues = [...new Set(values.map(String))].length;
      html += `<br><small>Unique: ${uniqueValues}</small>`;
    }

    html += `</div>`;
  });

  statsDiv.innerHTML = html;
}

// ===== EXPORT FUNCTIONS =====
async function exportAsPNG() {
  // Check if it's a chart OR a map OR a KPI card
  const isChart = chartInstance !== null;
  const isMap = currentMapInstance !== null;
  const isKPI = document.querySelector(".kpi-card-container") !== null;

  if (!isChart && !isMap && !isKPI) {
    showNotification(
      "📊 Please generate a chart, map, or KPI card first!",
      "error"
    );
    return;
  }

  const link = document.createElement("a");
  const sizeSelect = document.getElementById("exportSize");
  const size = sizeSelect ? parseFloat(sizeSelect.value) : 2.0;

  let canvas;
  let visualizationType;

  if (isChart) {
    // ===== EXPORT CHART =====
    visualizationType = "chart";
    const chartCanvas = document.getElementById("myChart");

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = chartCanvas.width * size;
    exportCanvas.height = chartCanvas.height * size;

    const exportCtx = exportCanvas.getContext("2d");
    exportCtx.fillStyle = "#FFFFFF";
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.scale(size, size);
    exportCtx.drawImage(chartCanvas, 0, 0);

    canvas = exportCanvas;
  } else if (isMap) {
    // ===== EXPORT MAP =====
    visualizationType = "map";
    const mapContainer = document.getElementById("mapContainer");

    if (!mapContainer) {
      showNotification("🗺️ Map container not found!", "error");
      return;
    }

    showNotification("📸 Capturing map screenshot...", "info");

    try {
      const mapCanvas = await html2canvas(mapContainer, {
        scale: size,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      canvas = mapCanvas;
    } catch (error) {
      showNotification(`❌ Failed to capture map: ${error.message}`, "error");
      return;
    }
  } else {
    // ===== EXPORT KPI CARD =====
    visualizationType = "kpi";
    const kpiContainer =
      document.querySelector(".kpi-card-container") ||
      document.querySelector(".chart-container");

    if (!kpiContainer) {
      showNotification("🎯 KPI card container not found!", "error");
      return;
    }

    showNotification("📸 Capturing KPI card screenshot...", "info");

    try {
      const kpiCanvas = await html2canvas(kpiContainer, {
        scale: size,
        backgroundColor: "#ffffff",
        logging: false,
      });
      canvas = kpiCanvas;
    } catch (error) {
      console.error("KPI card capture error:", error);
      showNotification(
        `❌ Failed to capture KPI card: ${error.message}`,
        "error"
      );
      return;
    }
  }

  const fileName = `${visualizationType}-${new Date()
    .toISOString()
    .slice(0, 10)}.png`;
  link.download = fileName;
  link.href = canvas.toDataURL("image/png", 1.0);
  link.click();

  showNotification(
    `✅ ${
      visualizationType === "chart"
        ? "Chart"
        : visualizationType === "map"
        ? "Map"
        : "KPI Card"
    } exported!`,
    "success"
  );
}

async function exportAsPDF() {
  // Check if it's a chart OR a map OR a KPI card
  const isChart = chartInstance !== null;
  const isMap = currentMapInstance !== null;
  const isKPI = document.querySelector(".kpi-card-container") !== null;

  if (!isChart && !isMap && !isKPI) {
    showNotification(
      "📊 Please generate a chart, map, or KPI card first!",
      "error"
    );
    return;
  }

  if (typeof jspdf === "undefined") {
    showNotification("📄 Loading PDF library...", "info");
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => setTimeout(exportAsPDF, 500);
    document.head.appendChild(script);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("landscape", "mm", "a4");
  const includeTitle = document.getElementById("includeTitle")?.checked || true;
  const includeLegend =
    document.getElementById("includeLegend")?.checked || true;

  let title = "";
  let imgData;

  if (isChart) {
    title = chartInstance.options.plugins.title?.text || "Chart Visualization";
    const canvas = document.getElementById("myChart");
    imgData = canvas.toDataURL("image/png", 1.0);
  } else if (isMap) {
    title = `${currentMapType} Map: ${
      document.getElementById("mapValueColumn")?.value || "Data"
    } by ${document.getElementById("mapLocationColumn")?.value || "Location"}`;
    const mapContainer = document.getElementById("mapContainer");

    if (!mapContainer) {
      showNotification("🗺️ Map container not found!", "error");
      return;
    }

    showNotification("📸 Capturing map for PDF...", "info");

    try {
      const mapCanvas = await html2canvas(mapContainer, {
        scale: 1.5,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      imgData = mapCanvas.toDataURL("image/png", 1.0);
    } catch (error) {
      showNotification(`❌ Failed to capture map: ${error.message}`, "error");
      return;
    }
  } else {
    // KPI Card PDF export
    title = document.getElementById("kpiTitle")?.value || "KPI Card";
    const kpiContainer =
      document.querySelector(".kpi-card-container") ||
      document.querySelector(".chart-container");

    if (!kpiContainer) {
      showNotification("🎯 KPI card container not found!", "error");
      return;
    }

    showNotification("📸 Capturing KPI card for PDF...", "info");

    try {
      const kpiCanvas = await html2canvas(kpiContainer, {
        scale: 1.5,
        backgroundColor: "#ffffff",
        logging: false,
      });
      imgData = kpiCanvas.toDataURL("image/png", 1.0);
    } catch (error) {
      showNotification(
        `❌ Failed to capture KPI card: ${error.message}`,
        "error"
      );
      return;
    }
  }

  // Add title if requested
  if (includeTitle && title) {
    doc.setFontSize(18);
    doc.text(title, 20, 20);
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = isChart ? 200 : isMap ? 150 : 100;

  let yPos = includeTitle ? 30 : margin;
  doc.addImage(imgData, "PNG", margin, yPos, imgWidth, imgHeight);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.text(
    `Exported on ${new Date().toLocaleDateString()} • DataViz Dashboard`,
    margin,
    footerY
  );

  const fileName = `${
    isChart ? "chart" : isMap ? "map" : "kpi"
  }-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);

  const typeName = isChart ? "Chart" : isMap ? "Map" : "KPI Card";
  showNotification(`📄 ${typeName} report saved as "${fileName}"`, "success");
}

function exportAsSVG() {
  // Check if it's a chart OR a map OR a KPI card
  const isChart = chartInstance !== null;
  const isMap = currentMapInstance !== null;
  const isKPI = document.querySelector(".kpi-card-container") !== null;

  if (!isChart && !isMap && !isKPI) {
    showNotification(
      "📊 Please generate a chart, map, or KPI card first!",
      "error"
    );
    return;
  }

  showNotification(
    "✨ SVG export coming soon! Downloading high-quality PNG instead.",
    "info"
  );
  exportAsPNG();
}

function exportAsCSV() {
  if (csvData.length === 0) {
    showNotification("📁 Please upload data first!", "error");
    return;
  }

  const escapeCSV = (cell) => {
    if (cell === null || cell === undefined) return '""';
    const string = String(cell);
    if (string.includes(",") || string.includes('"') || string.includes("\n")) {
      return '"' + string.replace(/"/g, '""') + '"';
    }
    return string;
  };

  const headers = csvHeaders.map(escapeCSV).join(",");
  const rows = csvData.map((row) =>
    csvHeaders.map((header) => escapeCSV(row[header])).join(",")
  );
  const csvContent = [headers, ...rows].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = `dashboard-data-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
  showNotification(
    `📊 Data exported (${csvData.length} rows, ${csvHeaders.length} columns)`,
    "success"
  );
}

// ===== NOTIFICATION FUNCTION (Shared - keep in main.js) =====
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${
      type === "success" ? "#4CAF50" : type === "error" ? "#f44336" : "#2196F3"
    };
    color: white;
    border-radius: 4px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ===== KPI CARD FUNCTIONS =====

function populateKPIColumns() {
  const kpiValueSelect = document.getElementById("kpiValueColumn");
  if (!kpiValueSelect || !csvHeaders) return;

  kpiValueSelect.innerHTML = '<option value="">Select column...</option>';

  csvHeaders.forEach((header) => {
    const option = document.createElement("option");
    option.value = header;

    // Check if it's numeric for display purposes
    const sample = csvData[0]?.[header];
    const isNumeric = typeof sample === "number" && !isNaN(sample);

    // Show icon based on data type
    if (isNumeric) {
      option.textContent = `${header} 🔢`;
      option.setAttribute("data-type", "numeric");
    } else {
      option.textContent = `${header} 📝`;
      option.setAttribute("data-type", "text");
    }

    kpiValueSelect.appendChild(option);
  });
}

function generateKPICard() {
  const valueColumn = document.getElementById("kpiValueColumn").value;
  const calculation = document.getElementById("kpiCalculation").value;
  const customTitle = document.getElementById("kpiTitle").value;

  if (!valueColumn) {
    alert("Please select a column for the KPI card!");
    return;
  }

  // Clear any existing visualization
  clearExistingVisualizations();

  // Check column type
  const sampleValue = csvData[0]?.[valueColumn];
  const isNumericColumn =
    typeof sampleValue === "number" && !isNaN(sampleValue);

  // Filter values based on type
  let allValues;
  if (isNumericColumn) {
    allValues = csvData
      .map((row) => row[valueColumn])
      .filter((v) => typeof v === "number" && !isNaN(v));
  } else {
    allValues = csvData
      .map((row) => row[valueColumn])
      .filter((v) => v !== undefined && v !== null && String(v).trim() !== "");
  }

  if (allValues.length === 0) {
    alert(`No valid data found in "${valueColumn}"!`);
    return;
  }

  let calculatedValue;
  let formattedValue;

  // For COUNT calculations (works with ANY data type)
  if (calculation === "count") {
    calculatedValue = allValues.length;
    formattedValue = calculatedValue.toLocaleString();
  }
  // For numeric calculations
  else if (isNumericColumn) {
    switch (calculation) {
      case "sum":
        calculatedValue = allValues.reduce((a, b) => a + b, 0);
        break;
      case "average":
        calculatedValue =
          allValues.reduce((a, b) => a + b, 0) / allValues.length;
        break;
      case "max":
        calculatedValue = Math.max(...allValues);
        break;
      case "min":
        calculatedValue = Math.min(...allValues);
        break;
      case "latest":
        calculatedValue = csvData[csvData.length - 1]?.[valueColumn] || 0;
        break;
      default:
        calculatedValue = allValues.reduce((a, b) => a + b, 0);
    }

    // Format numeric value
    formattedValue = formatKPIValue(calculatedValue, calculation);
  }
  // For text calculations (only count and unique work)
  else {
    if (calculation === "latest") {
      calculatedValue = csvData[csvData.length - 1]?.[valueColumn] || "N/A";
      formattedValue = String(calculatedValue);
    } else if (calculation === "unique") {
      const uniqueValues = [...new Set(allValues.map(String))];
      calculatedValue = uniqueValues.length;
      formattedValue = `${calculatedValue.toLocaleString()} unique values`;
    } else {
      // Default for text: show count
      calculatedValue = allValues.length;
      formattedValue = `${calculatedValue.toLocaleString()} items`;
    }
  }

  // Create the KPI card
  createKPICard(
    valueColumn,
    calculatedValue,
    calculation,
    customTitle,
    formattedValue,
    isNumericColumn
  );
}

function clearExistingVisualizations() {
  // Clear chart
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  // Clear map
  if (currentMapInstance) {
    currentMapInstance.remove();
    currentMapInstance = null;
  }

  // Clear map container
  const mapContainer = document.getElementById("mapContainer");
  if (mapContainer) mapContainer.remove();

  // Clear chart area
  const chartArea = document.querySelector(".chart-container");
  if (chartArea) {
    chartArea.innerHTML = '<canvas id="myChart"></canvas>';
  }
}

function createKPICard(
  column,
  value,
  calculation,
  customTitle,
  formattedValue,
  isNumeric
) {
  const chartArea = document.querySelector(".chart-container");
  if (!chartArea) return;

  // Clear and prepare chart area
  chartArea.innerHTML = '<div class="kpi-card-container"></div>';
  const container = chartArea.querySelector(".kpi-card-container");

  // Determine title
  const calculationNames = {
    sum: "Total",
    average: "Average",
    count: "Count",
    max: "Maximum",
    min: "Minimum",
    latest: "Latest",
    unique: "Unique",
  };

  const calculationDisplay = calculationNames[calculation] || calculation;
  const title = customTitle || `${calculationDisplay} of ${column}`;
  const subtitle = `${calculationDisplay} of ${column}`;

  // Create KPI card HTML
  container.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-title">${title}</div>
      <div class="kpi-value" style="color: ${
        isNumeric ? "#667eea" : "#10b981"
      }">
        ${formattedValue}
      </div>
      <div class="kpi-subtitle">${subtitle}</div>
      <div style="margin-top: 20px; color: #666; font-size: 0.9rem;">
        Based on ${csvData.length} records • ${new Date().toLocaleDateString()}
      </div>
      <div style="margin-top: 5px; color: #888; font-size: 0.85rem;">
        ${isNumeric ? "🔢 Numeric" : "📝 Text"} data
      </div>
    </div>
  `;

  // Show success message
  showNotification(`✅ KPI card generated: ${title}`, "success");
}

function formatKPIValue(value, calculation) {
  if (calculation === "count" || calculation === "unique") {
    return value.toLocaleString();
  }

  // Format numeric values
  const numValue = Number(value);
  if (isNaN(numValue)) return String(value);

  const absValue = Math.abs(numValue);

  if (absValue >= 1000000) {
    return `$${(numValue / 1000000).toFixed(2)}M`;
  } else if (absValue >= 1000) {
    return `$${(numValue / 1000).toFixed(2)}K`;
  } else if (Number.isInteger(numValue)) {
    return `$${numValue.toLocaleString()}`;
  } else {
    return `$${numValue.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

function resetKPICard() {
  document.getElementById("kpiValueColumn").value = "";
  document.getElementById("kpiTitle").value = "";
  document.getElementById("kpiCalculation").value = "sum";

  // Restore default chart area
  const chartArea = document.querySelector(".chart-container");
  if (chartArea) {
    chartArea.innerHTML = '<canvas id="myChart"></canvas>';
  }
}

// ===== DASHBOARD FUNCTIONS (main.js) =====

function addToDashboard() {
  // Check if it's a chart OR a map OR a KPI card
  const isMap = currentChartType === "map" && currentMapInstance !== null;
  const isChart = chartInstance !== null && !isMap;
  const isKPI = document.querySelector(".kpi-card-container") !== null;

  if (!isChart && !isMap && !isKPI) {
    alert("Please create a chart, map, or KPI card first!");
    return;
  }

  let newVisualization;

  if (isChart) {
    // ===== SAVE CHART =====
    newVisualization = {
      id: Date.now() + Math.random(),
      visualizationType: "chart",
      type: currentChartType,
      xAxis: selectedVariables.xAxis,
      yAxis: selectedVariables.yAxis,
      title:
        chartInstance.options.plugins.title?.text ||
        `Chart: ${selectedVariables.xAxis} vs ${selectedVariables.yAxis.join(
          ", "
        )}`,
      dataFile: document.getElementById("fileName")?.textContent || "data.csv",
      createdAt: new Date().toISOString(),
      colors: customChartColors.length > 0 ? customChartColors : chartColors,
    };
  } else if (isMap) {
    // ===== SAVE MAP WITH STYLING =====
    const locationCol = document.getElementById("mapLocationColumn").value;
    const valueCol = document.getElementById("mapValueColumn").value;
    const colorScheme = document.getElementById("mapColorScheme").value;
    const basemapStyle = window.currentBasemapStyle || "light";

    // Get current map type
    const mapType = currentMapType;

    // Process map data WITH STYLING
    const mapData = csvData
      .map((row) => ({
        location: row[locationCol],
        value: parseFloat(row[valueCol]) || 0,
        coordinates: getApproximateCoordinates(row[locationCol]),
      }))
      .filter((item) => item.location && item.value !== undefined);

    // Calculate min/max values for choropleth coloring
    const values = mapData.map((item) => item.value).filter((v) => !isNaN(v));
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);

    newVisualization = {
      id: Date.now() + Math.random(),
      visualizationType: "map",
      mapType: mapType,
      locationColumn: locationCol,
      valueColumn: valueCol,
      colorScheme: colorScheme,
      basemapStyle: basemapStyle,
      title: `${mapType} Map: ${valueCol} by ${locationCol}`,
      dataFile: document.getElementById("fileName")?.textContent || "data.csv",
      createdAt: new Date().toISOString(),
      mapData: mapData.slice(0, 100),
      // ADD STYLING INFORMATION:
      styling: {
        minValue: minValue,
        maxValue: maxValue,
        colorFunction: colorScheme, // Save which color scheme was used
        radiusFunction: mapType === "bubble" ? "proportional" : "fixed",
      },
      csvDataSample: csvData.slice(0, 10),
      csvHeaders: csvHeaders,
    };
  } else {
    // ===== SAVE KPI CARD =====
    const valueColumn = document.getElementById("kpiValueColumn").value;
    const calculation = document.getElementById("kpiCalculation").value;
    const cardTitle =
      document.getElementById("kpiTitle").value || `KPI: ${valueColumn}`;

    // Check column type
    const sampleValue = csvData[0]?.[valueColumn];
    const isNumericColumn =
      typeof sampleValue === "number" && !isNaN(sampleValue);

    // Filter values based on type
    let allValues;
    if (isNumericColumn) {
      allValues = csvData
        .map((row) => row[valueColumn])
        .filter((v) => typeof v === "number" && !isNaN(v));
    } else {
      allValues = csvData
        .map((row) => row[valueColumn])
        .filter(
          (v) => v !== undefined && v !== null && String(v).trim() !== ""
        );
    }

    let calculatedValue = 0;
    let formattedValue = "";

    // Calculate based on type and calculation
    if (calculation === "count") {
      calculatedValue = allValues.length;
      formattedValue = calculatedValue.toLocaleString();
    } else if (isNumericColumn) {
      switch (calculation) {
        case "sum":
          calculatedValue = allValues.reduce((a, b) => a + b, 0);
          break;
        case "average":
          calculatedValue =
            allValues.reduce((a, b) => a + b, 0) / allValues.length;
          break;
        case "max":
          calculatedValue = Math.max(...allValues);
          break;
        case "min":
          calculatedValue = Math.min(...allValues);
          break;
        case "latest":
          calculatedValue = csvData[csvData.length - 1]?.[valueColumn] || 0;
          break;
        default:
          calculatedValue = allValues.reduce((a, b) => a + b, 0);
      }
      formattedValue = formatKPIValue(calculatedValue, calculation);
    } else {
      if (calculation === "latest") {
        calculatedValue = csvData[csvData.length - 1]?.[valueColumn] || "N/A";
        formattedValue = String(calculatedValue);
      } else if (calculation === "unique") {
        const uniqueValues = [...new Set(allValues.map(String))];
        calculatedValue = uniqueValues.length;
        formattedValue = `${calculatedValue.toLocaleString()} unique values`;
      } else {
        calculatedValue = allValues.length;
        formattedValue = `${calculatedValue.toLocaleString()} items`;
      }
    }

    newVisualization = {
      id: Date.now() + Math.random(),
      visualizationType: "kpi",
      type: "kpi",
      valueColumn: valueColumn,
      calculation: calculation,
      value: calculatedValue,
      formattedValue: formattedValue,
      title: cardTitle,
      dataFile: document.getElementById("fileName")?.textContent || "data.csv",
      createdAt: new Date().toISOString(),
      rowCount: csvData.length,
      dataType: isNumericColumn ? "numeric" : "text",
    };
  }

  // Load existing visualizations array
  let allVisualizations = JSON.parse(
    localStorage.getItem("dashboardCharts") || "[]"
  );

  // Add new visualization
  allVisualizations.push(newVisualization);

  // Save updated array
  localStorage.setItem("dashboardCharts", JSON.stringify(allVisualizations));

  // Show success
  const typeName = isChart ? "Chart" : isMap ? "Map" : "KPI Card";
  showNotification(
    `✅ ${typeName} added to dashboard! (${allVisualizations.length} total)`,
    "success"
  );

  // Update button count
  updateDashboardButton();
}

// Update dashboard button count
function updateDashboardButton() {
  const allCharts = JSON.parse(localStorage.getItem("dashboardCharts") || "[]");
  const count = allCharts.length;

  // Update count display
  const countSpan = document.getElementById("dashboard-count");
  if (countSpan) {
    countSpan.textContent = count;
  }

  // Optional: Style button based on count
  const btn = document.querySelector(".dashboard-btn");
  if (btn) {
    if (count === 0) {
      btn.style.opacity = "0.7";
    } else {
      btn.style.opacity = "1";
    }
  }
}

// Initialize dashboard button on page load
document.addEventListener("DOMContentLoaded", function () {
  updateDashboardButton();
});
 
//drop zone hidder part 
function hideDropZone() {
  const dropZone = document.getElementById("dropZone");
  if (dropZone) {
    dropZone.style.display = "none";
    
    // Also hide the "click to browse" text that's part of dropZone
    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
      fileInput.style.display = "none";
    }
  }
}

function processParsedData(results, file) {
  csvData = results.data;
  csvHeaders = results.meta.fields;

  console.log("✅ Data loaded:", csvData.length, "rows,", csvHeaders.length, "columns");

  if (typeof initAISystem === "function") {
    initAISystem(csvData, csvHeaders);
  }

  document.getElementById("fileName").textContent = file.name;
  document.getElementById("rowCount").textContent = csvData.length;
  document.getElementById("colCount").textContent = csvHeaders.length;
  document.getElementById("fileInfo").style.display = "block";

  // ADD THIS LINE - Hide the drop zone
  hideDropZone();

  updateVariablesList();
  updateGroupByDropdown();
  showDataPreview();
  showQuickStats();

  console.log("🎉 Data processing complete!");
}