// AI Visualization Generator
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

    // 1. Better chart type detection
    const chartKeywords = {
      pie: [
        "pie",
        "distribution",
        "share",
        "percentage",
        "part of whole",
        "split",
      ],
      line: ["line", "trend", "over time", "progress", "growth", "timeline"],
      bar: ["bar", "compare", "vs", "versus", "difference", "ranking"],
      scatter: ["scatter", "correlation", "relationship", "xy", "scatter plot"],
      doughnut: ["doughnut", "donut", "ring"],
      radar: ["radar", "spider", "web"],
    };

    let maxMatches = 0;
    for (const [chartType, keywords] of Object.entries(chartKeywords)) {
      const matches = keywords.filter((keyword) =>
        prompt.includes(keyword)
      ).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        result.chartType = chartType;
      }
    }

    // 2. Better column detection
    this.headers.forEach((header) => {
      const headerLower = header.toLowerCase();
      if (prompt.includes(headerLower)) {
        const sampleValue = this.data[0]?.[header];
        const isNumeric =
          typeof sampleValue === "number" && !isNaN(sampleValue);

        if (isNumeric && !result.yAxis.includes(header)) {
          result.yAxis.push(header);
          result.confidence += 1;
        } else if (!result.xAxis && !isNumeric) {
          result.xAxis = header;
          result.confidence += 1;
        }
      }
    });

    // 3. Smart fallbacks ONLY if needed
    if (result.confidence < 2) {
      if (!result.xAxis && this.categoricalCols.length > 0) {
        result.xAxis = this.categoricalCols[0];
      }

      if (result.yAxis.length === 0 && this.numericCols.length > 0) {
        result.yAxis = [this.numericCols[0]];
      }
    }

    // 4. Validation - prevent random charts
    if (!result.xAxis || result.yAxis.length === 0) {
      showAIStatus(
        `I couldn't find the right columns. Available: ${this.headers.join(
          ", "
        )}`,
        "error"
      );
      return null;
    }

    // 5. Aggregation detection (keep your existing)
    if (
      prompt.includes("average") ||
      prompt.includes("avg") ||
      prompt.includes("mean")
    ) {
      result.aggregation = "average";
    } else if (prompt.includes("count")) {
      result.aggregation = "count";
    } else if (prompt.includes("min") || prompt.includes("minimum")) {
      result.aggregation = "min";
    } else if (prompt.includes("max") || prompt.includes("maximum")) {
      result.aggregation = "max";
    }

    // 6. Title
    const chartTypeNames = {
      pie: "Pie Chart",
      bar: "Bar Chart",
      line: "Line Chart",
      scatter: "Scatter Plot",
      doughnut: "Doughnut Chart",
      radar: "Radar Chart",
    };

    result.title = `${
      chartTypeNames[result.chartType] || "Chart"
    }: ${result.yAxis.join(", ")} by ${result.xAxis}`;
    if (result.aggregation !== "sum") {
      result.title = `${chartTypeNames[result.chartType] || "Chart"}: ${
        result.aggregation
      } of ${result.yAxis.join(", ")} by ${result.xAxis}`;
    }

    return result;
  }

  // Generate Chart.js configuration from AI result
  generateChartConfig(aiResult) {
    const { chartType, xAxis, yAxis, aggregation, title } = aiResult;

    // Process the data based on AI instructions
    const processedData = this.processData(xAxis, yAxis, aggregation);

    // Use the same colors as the main app
    const chartColors = [
      "rgba(255, 99, 132, 0.7)", // Pink
      "rgba(54, 162, 235, 0.7)", // Blue
      "rgba(255, 206, 86, 0.7)", // Yellow
      "rgba(75, 192, 192, 0.7)", // Teal
      "rgba(153, 102, 255, 0.7)", // Purple
      "rgba(255, 159, 64, 0.7)", // Orange
      "rgba(201, 203, 207, 0.7)", // Gray
    ];

    // COLOR LOGIC: Match what main.js does
    const datasets = processedData.datasets.map((dataset, i) => {
      // For pie/doughnut charts with single dataset: color by category
      if (
        (chartType === "pie" || chartType === "doughnut") &&
        processedData.datasets.length === 1
      ) {
        const colors = getColorsForCategories(processedData.labels);
        return {
          label: dataset.label,
          data: dataset.data,
          backgroundColor: colors,
          borderColor: colors.map((color) => color.replace("0.7", "1")),
          borderWidth: 2,
        };
      }

      // For bar charts with single dataset: color by category
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

      // Default: each dataset gets its own color (for line charts, multi-bar, etc.)
      return {
        label: dataset.label,
        data: dataset.data,
        backgroundColor:
          chartType === "bar"
            ? chartColors[i % chartColors.length]
            : "transparent",
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
            mode:
              chartType === "pie" || chartType === "doughnut"
                ? "point"
                : "index",
            intersect: false,
          },
        },
        scales:
          chartType === "bar" || chartType === "line"
            ? {
                x: {
                  title: {
                    display: true,
                    text: xAxis,
                    font: { weight: "bold" },
                  },
                  grid: {
                    display: false,
                  },
                },
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: yAxis.join(" / "),
                    font: { weight: "bold" },
                  },
                },
              }
            : {},
      },
    };
  }

  // Helper methods
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
    if (!xAxis || yAxis.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Group data by xAxis
    const groups = {};
    this.data.forEach((row) => {
      const key = row[xAxis] !== undefined ? String(row[xAxis]) : "Unknown";
      if (!groups[key]) {
        groups[key] = {
          count: 0,
          sums: {},
          values: {},
        };
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

    // Apply aggregation and create datasets
    const labels = Object.keys(groups);
    const datasets = yAxis.map((yCol) => ({
      label: yCol,
      data: labels.map((label) => {
        const values = groups[label].values[yCol] || [];
        if (values.length === 0) return 0;

        switch (aggregation) {
          case "average":
            return values.reduce((a, b) => a + b, 0) / values.length;
          case "count":
            return values.length;
          case "min":
            return Math.min(...values);
          case "max":
            return Math.max(...values);
          default: // sum
            return values.reduce((a, b) => a + b, 0);
        }
      }),
    }));

    return { labels, datasets };
  }
}

// ===== COLOR HELPER FUNCTIONS =====
// These match the logic in main.js
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
  return categories.map((category, index) => {
    const key = String(category);
    if (!colorMap[key]) {
      colorMap[key] =
        chartColors[Object.keys(colorMap).length % chartColors.length];
    }
    return colorMap[key];
  });
}

// ===== GLOBAL AI FUNCTIONS =====

// Global variables for AI
let aiData = [];
let aiHeaders = [];

// Initialize AI system with uploaded data
function initAISystem(data, headers) {
  aiData = data;
  aiHeaders = headers;
  console.log(
    "✅ AI System initialized with",
    data.length,
    "rows and",
    headers.length,
    "columns"
  );
}

// Main AI function called from HTML button
function generateFromAI() {
  const promptInput = document.getElementById("ai-prompt");
  if (!promptInput) {
    console.error("AI prompt input not found!");
    return;
  }

  const prompt = promptInput.value.trim();
  if (!prompt) {
    showAIStatus("Please enter what chart you want to create!", "error");
    return;
  }

  if (aiData.length === 0) {
    showAIStatus("Please upload data first!", "error");
    return;
  }

  showAIStatus("🤔 AI is analyzing your request...", "loading");

  // Use setTimeout to avoid blocking UI
  setTimeout(() => {
    try {
      // Create AI instance and generate chart
      const aiViz = new AIVizGenerator(aiData, aiHeaders);
      const aiResult = aiViz.interpretPromptLocally(prompt);

      console.log("AI Result:", aiResult);

      if (!aiResult) {
        return; // Error already shown
      }

      // OPTION A: Use AI's own chart generation (with fixed colors)
      const chartConfig = aiViz.generateChartConfig(aiResult);
      updateChartWithAIConfig(chartConfig);

      // OPTION B: Alternative - Use manual chart system (commented out)
      /*
      // Set the variables like manual chart would
      selectedVariables.xAxis = aiResult.xAxis;
      selectedVariables.yAxis = aiResult.yAxis;
      currentChartType = aiResult.chartType;
      
      // Update UI displays
      document.getElementById("xAxisVar").innerHTML = 
        `<strong>${aiResult.xAxis}</strong>`;
      
      // Update Y-axis display
      updateYAxisDisplay();
      
      // Set active chart type button
      setChartType(aiResult.chartType);
      
      // Generate the chart using manual system
      generateChart();
      */

      showAIStatus("✅ Chart created successfully!", "success");
    } catch (error) {
      console.error("AI Error:", error);
      showAIStatus("Error: " + error.message, "error");
    }
  }, 100);
}

// Update chart with AI configuration
function updateChartWithAIConfig(config) {
  const canvas = document.getElementById("myChart");
  if (!canvas) {
    console.error("Chart canvas not found!");
    return;
  }

  const ctx = canvas.getContext("2d");

  // Get the global chartInstance from the HTML file
  if (typeof chartInstance !== "undefined" && chartInstance) {
    chartInstance.destroy();
  }

  // Create new chart with AI config
  chartInstance = new Chart(ctx, config);
}

// Show AI status messages
function showAIStatus(message, type = "info") {
  const statusDiv = document.getElementById("ai-status");
  if (!statusDiv) {
    console.error("AI status div not found!");
    return;
  }

  statusDiv.innerHTML = message;
  statusDiv.style.display = "block";

  // Set color based on type
  const colors = {
    loading: "#007bff",
    success: "#28a745",
    error: "#dc3545",
    info: "#6c757d",
  };

  statusDiv.style.color = "white";
  statusDiv.style.backgroundColor = colors[type] || "#6c757d";
  statusDiv.style.padding = "10px";
  statusDiv.style.borderRadius = "5px";
  statusDiv.style.marginTop = "10px";
  statusDiv.style.fontSize = "13px";

  // Clear status after 5 seconds for success/info messages
  if (type === "success" || type === "info") {
    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 5000);
  }
}

// Make functions globally available
window.AIVizGenerator = AIVizGenerator;
window.initAISystem = initAISystem;
window.generateFromAI = generateFromAI;
window.updateChartWithAIConfig = updateChartWithAIConfig;
window.showAIStatus = showAIStatus;
