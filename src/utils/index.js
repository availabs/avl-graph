import React from "react"

import { getColorRange } from "./color-ranges"

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

const getRect = ref => {
  const node = ref.hasOwnProperty("current") ? ref.current : ref;
  if (!node) return { width: 0, height: 0 };
  return node.getBoundingClientRect();
}

export const useSetSize = ref => {
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  const { width, height } = getRect(ref);

  React.useLayoutEffect(() => {
    setSize({ width, height });
  }, [width, height]);

  return size;
}

export const Identity = i => i;

export const EmptyArray = [];

export const EmptyObject = {};

export const DefaultMargin = {
  left: 70,
  top: 20,
  right: 20,
  bottom: 30
};
