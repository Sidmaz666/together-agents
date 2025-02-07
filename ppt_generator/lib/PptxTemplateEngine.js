const PptxGenJS = require("pptxgenjs");
const layouts = require("../utils/layouts.json");
const defaultColorScheme = require("../utils/colorscheme.json").default
//const path = require("path");

/**
 * PptxTemplateEngine
 *
 * This class generates presentations using layout definitions solely for positions
 * and default text styling. It does NOT use slide masters so that no default placeholder
 * text boxes are created. Instead, a blank slide is created and all objects are added 
 * using the layout's positional and style defaults (which can be overridden by passing 
 * appropriate keys when adding slides).
 */
class PptxTemplateEngine {
  constructor(colorScheme=defaultColorScheme) {
    this.colorScheme = colorScheme;
    this.pres = new PptxGenJS();
    // Set overall presentation layout (16x9)
    this.pres.layout = "LAYOUT_16x9";
    // Store layout definitions from the JSON file for reference.
    this.layouts = layouts.layouts;
  }

  // Convenience getters for shape and chart types.
  get ShapeType() {
    return this.pres.ShapeType;
  }
  get ChartType() {
    return this.pres.ChartType;
  }

  /**
   * addSlide(layoutName, content)
   *
   * Creates a blank slide and then, for each element defined in the layout (by layoutName),
   * adds the corresponding content at the position defined by the layout. The layout's 
   * placeholder (including its "options" object) is used for default styling. If you pass 
   * any style keys (fontSize, bold, italic, align, valign, color) in the content, they will 
   * override the defaults.
   *
   * The content for a layout element can be a single object or an array. If multiple items 
   * are provided and an item does not specify a y value, they are vertically offset.
   *
   * Supported types: "text" (or if item.text exists), "table", "chart", "image", "shape".
   */
  addSlide(layoutName, content) {
    // Create a new blank slide.
    const slide = this.pres.addSlide();
    // Set the slide background.
    slide.background = { color: this.colorScheme.background };

    // Find the layout definition by its name.
    const layout = this.layouts.find((l) => l.layoutName === layoutName);
    if (!layout) {
      console.warn(`Layout "${layoutName}" not found.`);
      return slide;
    }

    // Process each layout element (placeholder) from the layout.
    layout.elements.forEach((element) => {
      const ph = element.placeholder;
      // Retrieve the content for this placeholder (by its "name").
      const phContent = content[ph.name];
      if (phContent) {
        // Normalize content to an array to support multiple items.
        const items = Array.isArray(phContent) ? phContent : [phContent];
        items.forEach((item, index) => {
          // Compute coordinates: use item overrides if provided; otherwise, use layout defaults.
          const x = item.x !== undefined ? item.x : ph.x;
          const offsetY =
            item.y === undefined && items.length > 1 ? index * (ph.h + 0.2) : 0;
          const y = item.y !== undefined ? item.y : ph.y + offsetY;
          const w = item.w !== undefined ? item.w : ph.w;
          const h = item.h !== undefined ? item.h : ph.h;
          const pos = { x, y, w, h };

          // For text content, merge style defaults from ph.options.
          // If the layout defines options (e.g. fontSize, bold, italic, align, valign, color)
          // then use them unless overridden by the item.
          const defaultTextStyle = ph.options || {};

          // Dispatch based on type.
          if (item.type) {
            switch (item.type) {
              case "chart":
                this.addChart(slide, pos, item);
                break;
              case "table":
                this.addTable(slide, pos, item);
                break;
              case "image":
                this.addImage(slide, pos, item);
                break;
              case "shape":
                this.addShape(slide, pos, item);
                break;
              case "text":
              default:
                // Merge layout defaults with item overrides.
                this.addText(slide, pos, Object.assign({}, defaultTextStyle, item));
            }
          } else if (item.text) {
            // Default to text if no type is specified.
            this.addText(slide, pos, Object.assign({}, defaultTextStyle, item));
          } else {
            console.warn(
              `Unrecognized content in layout element "${ph.name}": ${JSON.stringify(item)}`
            );
          }
        });
      }
    });
    return slide;
  }

  /**
   * addText(slide, pos, content)
   *
   * Adds a text box to the slide at the specified position.
   * It merges the style defaults from the layout (passed via content) with any overrides.
   */
  addText(slide, pos, content) {
    slide.addText(content.text, {
      x: pos.x,
      y: pos.y,
      w: pos.w,
      h: pos.h,
      // Use content.color if provided; otherwise, fallback to theme color.
      color: content.color || this.colorScheme.text,
      fontSize: content.fontSize !== undefined ? content.fontSize : 18,
      bold: content.bold !== undefined ? content.bold : false,
      italic: content.italic !== undefined ? content.italic : false,
      align: content.align || "left",
      valign: content.valign || "top",
      z: 1,
    });
  }

  /**
   * addTable(slide, pos, content)
   *
   * Adds a table to the slide at the specified position.
   * If the provided column widths (colW) exceed the designated width (pos.w),
   * they are scaled down proportionally to fit.
   */
  addTable(slide, pos, content) {
    // Get the provided column widths.
    let colWidths = content.colW || [];
    if (colWidths.length > 0) {
      const totalColWidth = colWidths.reduce((sum, cw) => sum + cw, 0);
      if (totalColWidth > pos.w) {
        const scale = pos.w / totalColWidth;
        colWidths = colWidths.map((cw) => cw * scale);
      }
    }
    slide.addTable(content.rows, {
      x: pos.x,
      y: pos.y,
      w: pos.w,
      h: pos.h,
      colW: colWidths,
      rowH: content.rowH || [],
      border: content.border || { type: "solid", pt: 1, color: this.colorScheme.text },
      fill: content.fill || { color: this.colorScheme.background },
      fontSize: content.fontSize !== undefined ? content.fontSize : 18,
      bold: content.bold || false,
      align: content.align || "center",
      z: 2,
    });
  }

  /**
   * addChart(slide, pos, content)
   *
   * Adds a chart to the slide at the specified position.
   * Converts any "categories" property in series to "labels" as required by PPTXGenJS.
   */
  addChart(slide, pos, content) {
    let chartData = content.data;
    if (Array.isArray(chartData)) {
      chartData = chartData.map((series) => {
        if (series.categories && !series.labels) {
          series.labels = series.categories;
          delete series.categories;
        }
        return series;
      });
    }
    slide.addChart(content.chartType || this.ChartType.bar, chartData, {
      x: pos.x,
      y: pos.y,
      w: pos.w,
      h: pos.h,
      chartColors: content.colors || [this.colorScheme.accent],
      title: content.title || "",
      titleColor: this.colorScheme.text,
      titleFontSize: content.titleFontSize !== undefined ? content.titleFontSize : 18,
      valAxisTitle: content.valAxisTitle || "",
      catAxisTitle: content.catAxisTitle || "",
      z: 2,
    });
  }

  /**
   * addImage(slide, pos, content)
   *
   * Adds an image to the slide at the specified position.
   */
  addImage(slide, pos, content) {
    slide.addImage({
      path: content.path,
      x: pos.x,
      y: pos.y,
      w: pos.w,
      h: pos.h,
      sizing: content.sizing || { type: "contain" },
      hyperlink: content.hyperlink || null,
      z: 2,
    });
  }

  /**
   * addShape(slide, pos, content)
   *
   * Adds a shape to the slide at the specified position.
   */
  addShape(slide, pos, content) {
    slide.addShape(content.shapeType, {
      x: pos.x,
      y: pos.y,
      w: pos.w,
      h: pos.h,
      fill: content.fill || { color: this.colorScheme.accent },
      line: content.line || { color: this.colorScheme.text, width: 1 },
      align: content.align || "center",
      valign: content.valign || "middle",
      z: 2,
    });
  }

  /**
   * generatePresentation(filename)
   *
   * Writes the presentation to the given filename.
   */
  generatePresentation(filename) {
    return this.pres.writeFile({ fileName: filename });
  }
}

module.exports = PptxTemplateEngine;


// --------------------- USAGE & SHOWCASE ---------------------

// Define a color scheme for the presentation.
// const colorScheme = {
//   background: "#FFFFFF",
//   text: "#2F5496",
//   accent: "#4472C4",
// };

// Create an instance of the engine.
// const templateEngine = new PptxTemplateEngine(colorScheme);

 // 1. "Title Slide" – simple title and subtitle.
// templateEngine.addSlide("Title Slide", {
//   title: { text: "Title Slide Example" },
//   subtitle: { text: "Subtitle Text", fontSize: 28, italic: true, align: "center", valign: "middle" },
// });


// 2. "Title Content" – one placeholder ("content") receiving mixed content.
// templateEngine.addSlide("Title Content", {
//   title: { text: "Title Content Example" },
//   content: [
//     { type: "text", text: "This is a text block in content.", fontSize: 20 }
//   ],
// });

// 3. "Title and 2 Content" – uses two separate content placeholders.
// templateEngine.addSlide("Title and 2 Content", {
//   title: { text: "Title and 2 Content Example" },
//   contentLeft: {
//     type: "table",
//     rows: [
//       ["Metric", "Value"],
//       ["A", "100"],
//       ["B", "200"],
//     ],
//     colW: [2, 2],
//   },
//   contentRight: {
//     type: "chart",
//     data: [
//       {
//         name: "Series",
//         categories: ["X", "Y", "Z"],
//         values: [5, 15, 25],
//       },
//     ],
//     chartType: templateEngine.ChartType.bar,
//   },
// });

// 4. "Title Subtitle Content" – demonstrates a shape as the content.
// templateEngine.addSlide("Title Subtitle Content", {
//   title: { text: "Title Subtitle Content Example" },
//   subtitle: { text: "Subtitle goes here" },
//   content: {
//     type: "shape",
//     shapeType: templateEngine.ShapeType.roundRect,
//     fill: { color: "#FF0000" },
//     line: { color: "#000000", width: 2 },
//   },
// });

// 5. "Centered Text" – a placeholder that receives an array (text and image).
// templateEngine.addSlide("Centered Text", {
//   centeredText: [
//     { type: "text", text: "Centered Text Slide", fontSize: 28 },
//     {
//       type: "image",
//       path: path.resolve(__dirname, "image_1.png"),
//       sizing: { type: "cover" },
//     },
//   ],
// });

// 6. "Title, Two Content and Content" – uses three placeholders.
// templateEngine.addSlide("Title, Two Content and Content", {
//   title: { text: "Title, Two Content and Content" },
//   contentTopLeft: {
//     type: "chart",
//     data: [
//       {
//         name: "Chart1",
//         categories: ["Jan", "Feb", "Mar"],
//         values: [15, 25, 35],
//       },
//     ],
//     chartType: templateEngine.ChartType.pie,
//   },
//   contentTopRight: {
//     type: "table",
//     rows: [
//       ["Product", "Sales"],
//       ["Prod1", "100"],
//       ["Prod2", "200"],
//     ],
//     colW: [2, 2],
//   },
//   contentBottom: { type: "text", text: "Footer text content", fontSize: 16 },
// });

// 7. "Title Content and Two Content" – demonstrates a table, text, and a shape.
// templateEngine.addSlide("Title Content and Two Content", {
//   title: { text: "Title Content and Two Content" },
//   contentMain: {
//     type: "table",
//     rows: [
//       ["Year", "Revenue"],
//       ["2020", "$1M"],
//       ["2021", "$1.2M"],
//     ],
//     colW: [2, 2],
//   },
//   contentRightTop: { type: "text", text: "Right Top Text" },
//   contentRightBottom: {
//     type: "shape",
//     shapeType: templateEngine.ShapeType.ellipse,
//     fill: { color: "#00FF00" },
//   },
// });

// 8. "Title Two Content Over Content" – uses three placeholders with different visuals.
// templateEngine.addSlide("Title Two Content Over Content", {
//   title: { text: "Title Two Content Over Content" },
//   contentTopLeft: {
//     type: "chart",
//     data: [
//       {
//         name: "S1",
//         categories: ["Q1", "Q2", "Q3"],
//         values: [50, 60, 70],
//       },
//     ],
//     chartType: templateEngine.ChartType.bar,
//   },
//   contentTopRight: {
//     type: "image",
//     path: path.resolve(__dirname,  "image_1.png"),
//     sizing: { type: "contain" },
//   },
//   contentBottom: {
//     type: "table",
//     rows: [
//       ["Parameter", "Value"],
//       ["P1", "10"],
//       ["P2", "20"],
//     ],
//     colW: [2, 2],
//   },
// });

// 9. "Title Content Over Content" – demonstrates text and chart stacked vertically.
// templateEngine.addSlide("Title Content Over Content", {
//   title: { text: "Title Content Over Content" },
//   contentTop: { type: "text", text: "Top content text" },
//   contentBottom: {
//     type: "chart",
//     data: [
//       {
//         name: "Data",
//         categories: ["A", "B", "C"],
//         values: [5, 15, 25],
//       },
//     ],
//     chartType: templateEngine.ChartType.line,
//   },
// });

// 10. "Title 4 Content" – uses four separate placeholders.
// templateEngine.addSlide("Title 4 Content", {
//   title: { text: "Title 4 Content" },
//   content1: { type: "text", text: "Content Block 1" },
//   content2: {
//     type: "table",
//     rows: [
//       ["Col1", "Col2"],
//       ["Val1", "Val2"],
//     ],
//     colW: [2, 2],
//   },
//   content3: {
//     type: "chart",
//     data: [
//       {
//         name: "Series1",
//         categories: ["X", "Y"],
//         values: [100, 200],
//       },
//     ],
//     chartType: templateEngine.ChartType.bar,
//   },
//   content4: {
//     type: "image",
//     path: path.resolve(__dirname,  "image_1.png"),
//     sizing: { type: "contain" },
//   },
// });

// 11. "Title 6 Content" – uses six content placeholders with a mix of visuals.
// templateEngine.addSlide("Title 6 Content", {
//   title: { text: "Title 6 Content" },
//   content1: { type: "text", text: "Block 1" },
//   content2: {
//     type: "chart",
//     data: [
//       {
//         name: "Data2",
//         categories: ["A", "B"],
//         values: [30, 40],
//       },
//     ],
//     chartType: templateEngine.ChartType.pie,
//   },
//   content3: {
//     type: "table",
//     rows: [
//       ["H1", "H2"],
//       ["D1", "D2"],
//     ],
//     colW: [2, 2],
//   },
//   content4: {
//     type: "image",
//     path: path.resolve(__dirname,  "image_1.png"),
//     sizing: { type: "cover" },
//   },
//   content5: {
//     type: "shape",
//     shapeType: templateEngine.ShapeType.rect,
//     fill: { color: "#0000FF" },
//   },
//   content6: { type: "text", text: "Final Block", fontSize: 14 },
// });

// Generate the presentation file.
// templateEngine
//   .generatePresentation("FullPresentation.pptx")
//   .then(() => console.log("Presentation created successfully!"))
//   .catch((err) => console.error("Error:", err));
