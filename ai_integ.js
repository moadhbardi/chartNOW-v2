// ============================================================================
// AI VISUALIZATION GENERATOR - COMPLETE REORGANIZED VERSION
// ============================================================================

// ============================================================================
// SECTION 1: CORE AI CHART GENERATOR CLASS
// ============================================================================

/**
 * Main AI class for chart generation
 * Handles prompt interpretation and chart configuration
 */
class AIVizGenerator {
  constructor(data, headers) {
    this.data = data;
    this.headers = headers;
    this.numericCols = this.getNumericColumns();
    this.categoricalCols = this.getCategoricalColumns();
  }

  interpretPromptLocally(prompt) {
    prompt = prompt.toLowerCase();
    console.log("AI Prompt received:", prompt);

    const result = {
      chartType: "bar",
      xAxis: null,
      yAxis: [],
      aggregation: "sum",
      title: "AI Generated Chart",
      confidence: 0,
    };

    // 1. Chart type detection
    const chartKeywords = {
      pie: ["pie", "distribution", "share", "percentage", "part of whole", "split"],
      line: ["line", "trend", "over time", "progress", "growth", "timeline"],
      bar: ["bar", "compare", "vs", "versus", "difference", "ranking"],
      scatter: ["scatter", "correlation", "relationship", "xy", "scatter plot"],
      doughnut: ["doughnut", "donut", "ring"],
      radar: ["radar", "spider", "web"],
    };

    let maxMatches = 0;
    for (const [chartType, keywords] of Object.entries(chartKeywords)) {
      const matches = keywords.filter((keyword) => prompt.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        result.chartType = chartType;
      }
    }

    // 2. Column detection
    this.headers.forEach((header) => {
      const headerLower = header.toLowerCase();
      if (prompt.includes(headerLower)) {
        const sampleValue = this.data[0]?.[header];
        const isNumeric = typeof sampleValue === "number" && !isNaN(sampleValue);

        if (isNumeric && !result.yAxis.includes(header)) {
          result.yAxis.push(header);
          result.confidence += 1;
        } else if (!result.xAxis && !isNumeric) {
          result.xAxis = header;
          result.confidence += 1;
        }
      }
    });

    // 3. Smart fallbacks
    if (result.confidence < 2) {
      if (!result.xAxis && this.categoricalCols.length > 0) {
        result.xAxis = this.categoricalCols[0];
      }

      if (result.yAxis.length === 0 && this.numericCols.length > 0) {
        result.yAxis = [this.numericCols[0]];
      }
    }

    // 4. Validation
    if (!result.xAxis || result.yAxis.length === 0) {
      showAIStatus(
        `I couldn't find the right columns. Available: ${this.headers.join(", ")}`,
        "error"
      );
      return null;
    }

    // 5. Aggregation detection
    if (prompt.includes("average") || prompt.includes("avg") || prompt.includes("mean")) {
      result.aggregation = "average";
    } else if (prompt.includes("count")) {
      result.aggregation = "count";
    } else if (prompt.includes("min") || prompt.includes("minimum")) {
      result.aggregation = "min";
    } else if (prompt.includes("max") || prompt.includes("maximum")) {
      result.aggregation = "max";
    }

    // 6. Title generation
    const chartTypeNames = {
      pie: "Pie Chart",
      bar: "Bar Chart",
      line: "Line Chart",
      scatter: "Scatter Plot",
      doughnut: "Doughnut Chart",
      radar: "Radar Chart",
    };

    result.title = `${chartTypeNames[result.chartType] || "Chart"}: ${result.yAxis.join(", ")} by ${result.xAxis}`;
    if (result.aggregation !== "sum") {
      result.title = `${chartTypeNames[result.chartType] || "Chart"}: ${result.aggregation} of ${result.yAxis.join(", ")} by ${result.xAxis}`;
    }

    return result;
  }

  generateChartConfig(aiResult) {
    const { chartType, xAxis, yAxis, aggregation, title } = aiResult;
    const processedData = this.processData(xAxis, yAxis, aggregation);

    const chartColors = [
      "rgba(255, 99, 132, 0.7)", // Pink
      "rgba(54, 162, 235, 0.7)", // Blue
      "rgba(255, 206, 86, 0.7)", // Yellow
      "rgba(75, 192, 192, 0.7)", // Teal
      "rgba(153, 102, 255, 0.7)", // Purple
      "rgba(255, 159, 64, 0.7)", // Orange
      "rgba(201, 203, 207, 0.7)", // Gray
    ];

    const datasets = processedData.datasets.map((dataset, i) => {
      if ((chartType === "pie" || chartType === "doughnut") && processedData.datasets.length === 1) {
        const colors = getColorsForCategories(processedData.labels);
        return {
          label: dataset.label,
          data: dataset.data,
          backgroundColor: colors,
          borderColor: colors.map((color) => color.replace("0.7", "1")),
          borderWidth: 2,
        };
      }

      if (chartType === "bar" && processedData.datasets.length === 1) {
        const colors = getColorsForCategories(processedData.labels);
        return {
          label: dataset.label,
          data: dataset.data,
          backgroundColor: colors,
          borderColor: colors.map((color) => color.replace("0.7", "1")),
          borderWidth: 1,
        };
      }

      return {
        label: dataset.label,
        data: dataset.data,
        backgroundColor: chartType === "bar" ? chartColors[i % chartColors.length] : "transparent",
        borderColor: chartColors[i % chartColors.length],
        borderWidth: 2,
        fill: chartType === "line",
      };
    });

    return {
      type: chartType,
      data: {
        labels: processedData.labels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: "bold" },
          },
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
            },
          },
          tooltip: {
            mode: chartType === "pie" || chartType === "doughnut" ? "point" : "index",
            intersect: false,
          },
        },
        scales: chartType === "bar" || chartType === "line" ? {
          x: {
            title: {
              display: true,
              text: xAxis,
              font: { weight: "bold" },
            },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: yAxis.join(" / "),
              font: { weight: "bold" },
            },
          },
        } : {},
      },
    };
  }

  getNumericColumns() {
    if (!this.data || this.data.length === 0) return [];
    return this.headers.filter((header) => {
      const sample = this.data[0][header];
      return typeof sample === "number" && !isNaN(sample);
    });
  }

  getCategoricalColumns() {
    if (!this.data || this.data.length === 0) return [];
    return this.headers.filter((header) => {
      const sample = this.data[0][header];
      return typeof sample === "string" || sample instanceof Date;
    });
  }

  processData(xAxis, yAxis, aggregation = "sum") {
    if (!xAxis || yAxis.length === 0) return { labels: [], datasets: [] };

    const groups = {};
    this.data.forEach((row) => {
      const key = row[xAxis] !== undefined ? String(row[xAxis]) : "Unknown";
      if (!groups[key]) {
        groups[key] = { count: 0, sums: {}, values: {} };
      }

      yAxis.forEach((yCol) => {
        if (!groups[key].sums[yCol]) groups[key].sums[yCol] = 0;
        if (!groups[key].values[yCol]) groups[key].values[yCol] = [];

        const value = row[yCol];
        if (typeof value === "number" && !isNaN(value)) {
          groups[key].sums[yCol] += value;
          groups[key].values[yCol].push(value);
        }
      });
      groups[key].count++;
    });

    const labels = Object.keys(groups);
    const datasets = yAxis.map((yCol) => ({
      label: yCol,
      data: labels.map((label) => {
        const values = groups[label].values[yCol] || [];
        if (values.length === 0) return 0;

        switch (aggregation) {
          case "average": return values.reduce((a, b) => a + b, 0) / values.length;
          case "count": return values.length;
          case "min": return Math.min(...values);
          case "max": return Math.max(...values);
          default: return values.reduce((a, b) => a + b, 0);
        }
      }),
    }));

    return { labels, datasets };
  }
}

// ============================================================================
// SECTION 2: COLOR HELPER FUNCTIONS
// ============================================================================

function getColorsForCategories(categories) {
  const chartColors = [
    "rgba(255, 99, 132, 0.7)",
    "rgba(54, 162, 235, 0.7)",
    "rgba(255, 206, 86, 0.7)",
    "rgba(75, 192, 192, 0.7)",
    "rgba(153, 102, 255, 0.7)",
    "rgba(255, 159, 64, 0.7)",
    "rgba(201, 203, 207, 0.7)",
  ];

  const colorMap = {};
  return categories.map((category) => {
    const key = String(category);
    if (!colorMap[key]) {
      colorMap[key] = chartColors[Object.keys(colorMap).length % chartColors.length];
    }
    return colorMap[key];
  });
}

// ============================================================================
// SECTION 3: GLOBAL AI SYSTEM
// ============================================================================

let aiData = [];
let aiHeaders = [];

function initAISystem(data, headers) {
  aiData = data;
  aiHeaders = headers;
  console.log("✅ AI System initialized with", data.length, "rows and", headers.length, "columns");
}

function showAIStatus(message, type = "info") {
  const statusDiv = document.getElementById("ai-status");
  if (!statusDiv) {
    console.error("AI status div not found!");
    return;
  }

  statusDiv.innerHTML = message;
  statusDiv.style.display = "block";
  statusDiv.style.color = "white";
  statusDiv.style.padding = "10px";
  statusDiv.style.borderRadius = "5px";
  statusDiv.style.marginTop = "10px";
  statusDiv.style.fontSize = "13px";

  const colors = {
    loading: "#007bff",
    success: "#28a745",
    error: "#dc3545",
    info: "#6c757d",
  };
  statusDiv.style.backgroundColor = colors[type] || "#6c757d";

  if (type === "success" || type === "info") {
    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 5000);
  }
}

function updateChartWithAIConfig(config) {
  const canvas = document.getElementById("myChart");
  if (!canvas) {
    console.error("Chart canvas not found!");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (typeof chartInstance !== "undefined" && chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, config);
}

// ============================================================================
// SECTION 4: VISUALIZATION TYPE DETECTION
// ============================================================================

function detectVisualizationType(prompt) {
  const promptLower = prompt.toLowerCase();
  
  // First check for chart keywords
  const chartKeywords = ['chart', 'pie', 'bar', 'line', 'scatter', 'doughnut', 'radar'];
  const isChartRequest = chartKeywords.some(keyword => promptLower.includes(keyword));
  
  // Then check for map keywords (only if not a chart request)
  const mapKeywords = ['map', 'location', 'country', 'city', 'state', 'geo', 'geographic', 'world'];
  const isMapRequest = !isChartRequest && mapKeywords.some(keyword => {
    // Use word boundaries to avoid "pie chart" triggering map
    return new RegExp('\\b' + keyword + '\\b').test(promptLower);
  });
  
  // Finally check for KPI keywords
  const kpiKeywords = ['kpi', 'card', 'metric', 'total', 'count', 'summary', 'overview'];
  const isKPIRequest = !isChartRequest && kpiKeywords.some(keyword => {
    return new RegExp('\\b' + keyword + '\\b').test(promptLower);
  });
  
  if (isMapRequest) return 'map';
  if (isKPIRequest) return 'kpi';
  if (isChartRequest) return 'chart';
  return 'chart'; // Default to chart
}

// ============================================================================
// SECTION 5: MAP GENERATION HANDLER
// ============================================================================

function handleAIMapRequest(prompt) {
  showAIStatus("🗺️ Creating map from your request...", "loading");
  
  setTimeout(() => {
    try {
      const allHeaders = aiHeaders || [];
      const allData = aiData || [];
      let locationCol = null;
      let valueCol = null;
      
      // Find location column
      const locationKeywords = ['country', 'state', 'city', 'region', 'location', 'place', 'address'];
      for (const header of allHeaders) {
        const headerLower = header.toLowerCase();
        if (locationKeywords.some(keyword => headerLower.includes(keyword))) {
          locationCol = header;
          break;
        }
      }
      
      if (!locationCol) {
        for (const header of allHeaders) {
          if (allData[0] && typeof allData[0][header] === 'string') {
            locationCol = header;
            break;
          }
        }
      }
      
      // Find numeric column
      for (const header of allHeaders) {
        if (allData[0] && typeof allData[0][header] === 'number' && !isNaN(allData[0][header])) {
          valueCol = header;
          break;
        }
      }
      
      if (!locationCol || !valueCol) {
        showAIStatus("❌ Need location and numeric data for a map", "error");
        return;
      }
      
      // Set map type
      const promptLower = prompt.toLowerCase();
      let mapType = 'choropleth';
      if (promptLower.includes('bubble')) mapType = 'bubble';
      if (promptLower.includes('point')) mapType = 'point';
      
      // Set UI controls
      document.getElementById("mapLocationColumn").value = locationCol;
      document.getElementById("mapValueColumn").value = valueCol;
      
      // Switch to map tab
      if (typeof setChartType === 'function') {
        setChartType('map');
        
        setTimeout(() => {
          if (typeof setMapType === 'function') {
            setMapType(mapType);
          }
          
          // Generate map after UI is ready
          setTimeout(() => {
            if (typeof generateMap === 'function') {
              generateMap();
              showAIStatus(`🗺️ ${mapType} map created: ${valueCol} by ${locationCol}`, "success");
            }
          }, 800);
        }, 300);
      }
      
    } catch (error) {
      console.error("Map error:", error);
      showAIStatus("Couldn't create map: " + error.message, "error");
    }
  }, 100);
}

// ============================================================================
// SECTION 6: KPI GENERATION HANDLER
// ============================================================================

function handleAIKPIRequest(prompt) {
  showAIStatus("🎯 Creating KPI card from your request...", "loading");
  
  setTimeout(() => {
    try {
      const allHeaders = aiHeaders || [];
      const allData = aiData || [];
      const promptLower = prompt.toLowerCase();
      
      // SMART COLUMN DETECTION
      let kpiCol = null;
      
      // 1. Try to extract column name from prompt
      const columnMatch = promptLower.match(/of\s+([\w\s]+)/);
      if (columnMatch) {
        const requestedColumn = columnMatch[1].trim();
        for (const header of allHeaders) {
          if (header.toLowerCase().includes(requestedColumn) || 
              requestedColumn.includes(header.toLowerCase())) {
            kpiCol = header;
            break;
          }
        }
      }
      
      // 2. Look for column mentioned in prompt
      if (!kpiCol) {
        for (const header of allHeaders) {
          if (promptLower.includes(header.toLowerCase())) {
            kpiCol = header;
            break;
          }
        }
      }
      
      // 3. Fallback to numeric column
      if (!kpiCol) {
        for (const header of allHeaders) {
          if (allData[0] && typeof allData[0][header] === 'number' && !isNaN(allData[0][header])) {
            kpiCol = header;
            break;
          }
        }
      }
      
      // 4. Ultimate fallback
      if (!kpiCol && allHeaders.length > 0) {
        kpiCol = allHeaders[0];
      }
      
      if (!kpiCol) {
        showAIStatus("❌ No data found for KPI", "error");
        return;
      }
      
      // CALCULATION DETECTION
      let calculation = 'sum';
      if (promptLower.includes('average') || promptLower.includes('avg')) calculation = 'average';
      if (promptLower.includes('count')) calculation = 'count';
      if (promptLower.includes('max')) calculation = 'max';
      if (promptLower.includes('min')) calculation = 'min';
      if (promptLower.includes('latest')) calculation = 'latest';
      if (promptLower.includes('unique')) calculation = 'unique';
      
      // TITLE GENERATION
      let title = `${calculation} of ${kpiCol}`;
      if (promptLower.includes('sales')) title = `Sales ${calculation}`;
      if (promptLower.includes('revenue')) title = `Revenue ${calculation}`;
      if (promptLower.includes('profit')) title = `Profit ${calculation}`;
      if (promptLower.includes('customer')) title = `Customer ${calculation}`;
      
      // SET UI
      document.getElementById("kpiValueColumn").value = kpiCol;
      document.getElementById("kpiCalculation").value = calculation;
      document.getElementById("kpiTitle").value = title;
      
      // Switch to KPI and generate
      if (typeof setChartType === 'function') {
        setChartType('kpi');
        
        setTimeout(() => {
          if (typeof generateKPICard === 'function') {
            generateKPICard();
            showAIStatus(`🎯 KPI created: ${title}`, "success");
          }
        }, 500);
      }
      
    } catch (error) {
      console.error("KPI error:", error);
      showAIStatus("Couldn't create KPI: " + error.message, "error");
    }
  }, 100);
}

// ============================================================================
// SECTION 7: MAIN AI FUNCTION (ENHANCED)
// ============================================================================

function generateFromAI() {
  const promptInput = document.getElementById("ai-prompt");
  if (!promptInput) {
    console.error("AI prompt input not found!");
    return;
  }

  const prompt = promptInput.value.trim();
  if (!prompt) {
    showAIStatus("Please enter what visualization you want to create!", "error");
    return;
  }

  if (aiData.length === 0) {
    showAIStatus("Please upload data first!", "error");
    return;
  }

  const promptLower = prompt.toLowerCase();
  const vizType = detectVisualizationType(promptLower);
  
  console.log(`AI detected visualization type: ${vizType} for prompt: "${prompt}"`);
  
  if (vizType === 'map') {
    handleAIMapRequest(promptLower);
  } else if (vizType === 'kpi') {
    handleAIKPIRequest(promptLower);
  } else {
    // Use the original chart AI
    showAIStatus("🤔 AI is analyzing your request...", "loading");
    
    setTimeout(() => {
      try {
        const aiViz = new AIVizGenerator(aiData, aiHeaders);
        const aiResult = aiViz.interpretPromptLocally(promptLower);
        
        if (!aiResult) return;
        
        const chartConfig = aiViz.generateChartConfig(aiResult);
        updateChartWithAIConfig(chartConfig);
        showAIStatus("✅ Chart created successfully!", "success");
      } catch (error) {
        console.error("AI Error:", error);
        showAIStatus("Error: " + error.message, "error");
      }
    }, 100);
  }
}

// ============================================================================
// SECTION 8: GLOBAL EXPORTS
// ============================================================================

window.AIVizGenerator = AIVizGenerator;
window.initAISystem = initAISystem;
window.generateFromAI = generateFromAI;
window.updateChartWithAIConfig = updateChartWithAIConfig;
window.showAIStatus = showAIStatus;
window.detectVisualizationType = detectVisualizationType;
window.handleAIMapRequest = handleAIMapRequest;
window.handleAIKPIRequest = handleAIKPIRequest;