import { getColorRange } from "@availabs/avl-components"

const DEFAULT_COLORS = getColorRange(12, "Set3");

export const getColorFunc = colors => {
  if (typeof colors === "function") {
    return colors;
  }

  let colorRange = [...DEFAULT_COLORS];

  if (typeof colors === "string") {
    const [k1, k2, reverse = false] = colors.split("-");
    colorRange = getColorRange(k1, k2);
    reverse && colorRange.reverse();
  }
  else if (Array.isArray(colors)) {
    colorRange = [...colors];
  }

  return (d, i) => {
    return colorRange[i % colorRange.length];
  }
}

export const Identity = i => i;

export const EmptyArray = [];

export const EmptyObject = {};

export const strictNaN = v => (v === null) || isNaN(v);

export const DefaultMargin = {
  left: 70,
  top: 20,
  right: 20,
  bottom: 30
};

export const DefaultAxis = {
  min: 0
}
