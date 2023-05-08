import React from "react"
import colorbrewer from "colorbrewer"
import isEqual from "lodash/isEqual"
import get from "lodash/get"

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


const ColorRanges = {}


for (const type in colorbrewer.schemeGroups) {
  colorbrewer.schemeGroups[type].forEach(name => {
    const group = colorbrewer[name];
    for (const length in group) {
      if (!(length in ColorRanges)) {
        ColorRanges[length] = [];
      }
      ColorRanges[length].push({
        type: `${ type[0].toUpperCase() }${ type.slice(1) }`,
        name,
        category: "Colorbrewer",
        colors: group[length]
      })
    }
  })
}

export { ColorRanges };
//console.log("ColorRanges", ColorRanges);

export const getColorRange = (size, name, reverse=false) => {
  let range = get(ColorRanges, [size], [])
    .reduce((a, c) => c.name === name ? c.colors : a, []).slice();
  if(reverse) {
    range.reverse()
  }
  return range
}



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

console.log("GET SCALE:", type)

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
    return !isEqual([width, height], prevSize.current) ||
      keys.reduce((a, c) => {
        return a || !isEqual(get(prevProps, ["current", c]), get(props, c));
      }, !Boolean(keys.length));
  }, [props, width, height]);

  React.useEffect(() => {
    prevProps.current = props;
    prevSize.current = [width, height];
  }, [props, width, height]);

  return ShouldComponentUpdate;
}

const getRect = ref => {
  const node = ref ? ref.current : ref;
  if (!node) return { width: 0, height: 0 };
  return node.getBoundingClientRect();
}

export const useSetSize = (ref, callback) => {
  const [size, setSize] = React.useState({ width: 0, height: 0, x: 0, y: 0 });

  const doSetSize = React.useCallback(() => {
    const rect = getRect(ref),
      { width, height, x, y } = rect;
    if ((width !== size.width) || (height !== size.height)) {
      if (typeof callback === "function") {
        callback({ width, height, x, y });
      }
      setSize({ width, height, x, y });
    }
  }, [ref, size, callback]);

  React.useEffect(() => {
    window.addEventListener("resize", doSetSize);
    return () => {
      window.removeEventListener("resize", doSetSize);
    }
  }, [doSetSize]);

  React.useEffect(() => {
    doSetSize();
  });

  return size;
}

export const theme = {
  textBase: "text-base",
    textSmall: "text-sm",
    textLarge: "text-lg",
    paddingBase: "py-1 px-2",
    paddingSmall: "py-0 px-1",
    paddingLarge: "py-2 px-4",

    contentBg: "bg-white",

    accent1: "bg-blue-100",
    accent2: "bg-gray-300",
    accent3: "bg-gray-400",
    accent4: "bg-gray-500",

    highlight1: "bg-blue-200",
    highlight2: "bg-blue-300",
    highlight3: "bg-blue-400",
    highlight4: "bg-blue-500"

}