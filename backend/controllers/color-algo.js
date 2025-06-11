const ChromaJS = require('chroma-js');
var _ = require('lodash');

module.exports = function submitHex(seedColor) {
    const submittedHex = seedColor;

    if (submittedHex) {
      const newHCL = ChromaJS(submittedHex).hcl();
      const newHue = isNaN(newHCL[0]) ? 0 : Math.round(newHCL[0]); // NaN detection due to grayscale hue problems
      const newChroma = Math.round(newHCL[1]);
      const newLight = Math.round(newHCL[2]);
      const hclMap = calculateHclMap({
        startHue: newHue,
        endHue: newHue,
        loopHue: false
      })
      const relativeChromacity = calculateRelativeChromacity(hclMap, newChroma, newLight);
      const finalColorPalette = calculatePalette({ hclMap, relativeChromacity });
      return finalColorPalette;
    } else {
    //    throw Error message in UI regarding invalid Hex Color
    return "Something went wrong in generating colors";
    }
    
}

function calculateHclMap(props) {
    const { startHue, endHue, loopHue } = props;
    const scaleLight = 101;
    const scaleChroma = 140;
    let hclMap = [];
    // first matrix is lightness
    _.times(scaleLight, (lightIndex) => {
      let hue, hueDiff;
      let rowColors = [];

      if (loopHue) {
        hueDiff =
          startHue > endHue ? 360 - startHue + endHue : 360 - endHue + startHue;
        hue = endHue + (hueDiff / 100) * lightIndex;

        if (hue > 360) hue = hue - 360;
      } else {
        hueDiff = endHue - startHue;
        hue = endHue - (hueDiff / 100) * lightIndex;
      }
      // second matrix is chromacity
      _.times(scaleChroma, (chromaIndex) => {
        const color = ChromaJS([hue, chromaIndex, lightIndex], 'hcl');
        const colorHex = color.hex();
        const contrastRatio = parseFloat(
          ChromaJS.contrast('#fff', colorHex).toFixed(2)
        );

        // only add non-clipped colors
        if (!color.clipped()) {
          rowColors.push({
            hue,
            light: lightIndex,
            chroma: chromaIndex,
            hex: colorHex,
            contrastRatio,
            contrastAALarge: contrastRatio >= 3,
            contrastAA: contrastRatio >= 4.5
          })
        }
      })
      hclMap.push(rowColors);
    })

    return hclMap
}

function calculatePalette(props) {
    const { relativeChromacity, hclMap } = props
    const paletteLights = [96, 91, 81, 71, 66, 61, 49, 39, 29, 19, 14, 8]
    const paletteLabels = [
      '95',
      '90',
      '80',
      '70',
      '65',
      '60',
      '50',
      '40',
      '30',
      '20',
      '15',
      '10'
    ]
    let palette = []

    paletteLights.forEach((light, i) => {
      const colorRow = hclMap[light]
      let colorChroma = Math.max(
        Math.floor(colorRow.length * (relativeChromacity / 100) - 1),
        0
      )

      // chroma max locks for certain colors
      if (light === paletteLights[0]) {
        colorChroma = Math.min(colorChroma, 10)
      }

      if (light === paletteLights[1]) {
        colorChroma = Math.min(colorChroma, 25)
      }

      if (light === paletteLights[2]) {
        colorChroma = Math.min(colorChroma, 50)
      }

      let colorDetail = colorRow[colorChroma]
      colorDetail.label = paletteLabels[i]

      palette.push(colorDetail)
    })

    return palette;
}

function calculateRelativeChromacity(hclMap, newChroma, newLight) {
    const colorRow = hclMap[newLight]

      // get max chroma for palette
      let maxChroma = 0
      hclMap.forEach((lightRow) => {
        const rowChromacity = lightRow.length
        if (rowChromacity > maxChroma) maxChroma = rowChromacity
      })

      // to get the chromacity percent, we average out the chroma of the color
      // as it relates to the row, in addition to how it relates to the whole palette
      const rowChromaPct = newChroma / colorRow.length
      const paletteChromaPct = newChroma / maxChroma
      const relativeChromacity =
        colorRow.length === 0
          ? 0
          : Math.min(
              Math.round(((rowChromaPct + paletteChromaPct) / 2) * 100),
              100
            );
    return relativeChromacity;
}