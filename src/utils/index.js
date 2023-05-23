import React from "react"

import deepequal from "deepequal"
import get from "lodash/get"

import { getColorRange } from "~/modules/avl-components/src"

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

export const useShouldComponentUpdate = (props, width, height) => {

  const prevProps = React.useRef({});
  const prevSize = React.useRef([width, height]);

  const ShouldComponentUpdate = React.useMemo(() => {
    const keys = get(props, "shouldComponentUpdate", []);
    return !deepequal([width, height], prevSize.current) ||
      keys.reduce((a, c) => {
        return a || !deepequal(get(prevProps, ["current", c]), get(props, c));
      }, !Boolean(keys.length));
  }, [props, width, height]);

  React.useEffect(() => {
    prevProps.current = props;
    prevSize.current = [width, height];
  }, [props, width, height]);

  return ShouldComponentUpdate;
}
