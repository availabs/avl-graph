import React from "react"

import deepequal from "deepequal"
import get from "lodash.get"

import { getColorRange } from "@availabs/avl-components"
import {
  scaleBand,
  scalePoint,
  scaleOrdinal,
  scaleLinear,
  scalePow,
  scaleLog,
  scaleSymlog,
  scaleQuantize,
  scaleQuantile
} from "d3-scale"

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

export const strictNaN = v => (v === null) || isNaN(v);

export const DefaultXScale = {
  type: "band",
  domain: []
}
export const DefaultYScale = {
  type: "linear",
  domain: []
}

const ScaleMap = {
  "band": scaleBand,
  "point": scalePoint,
  "ordinal": scaleOrdinal,
  "linear": scaleLinear,
  "power": scalePow,
  "log": scaleLog,
  "symlog": scaleSymlog,
  "quantize": scaleQuantize,
  "quantile": scaleQuantile
}

export const getScale = options => {
  let {
    type,
    domain,
    range,
    data,
    padding,
    paddingInner,
    paddingOuter,
    getter,
    exponent = 1,
    base = 10
  } = options;

  if (!domain.length) {
    domain = getter(data);
  }

  const scale = ScaleMap[type]()
    .domain(domain)
    .range(range);

  if (type === "band") {
    scale.paddingInner(padding || paddingInner)
      .paddingOuter(padding || paddingOuter);
  }
  if (type === "point") {
    scale.paddingOuter(padding || paddingOuter);
  }
  if (type === "power") {
    scale.exponent(exponent);
  }
  if (type === "log") {
    scale.base(base);
  }
  return scale
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
