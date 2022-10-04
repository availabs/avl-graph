import React from "react"

import { /*scaleBand,*/ scaleLinear, scaleOrdinal } from "d3-scale"
import { select as d3select } from "d3-selection"
//import { range as d3range } from "d3-array"
import { format as d3format } from "d3-format"

import get from "lodash.get"

import { useTheme, useSetSize } from "@availabs/avl-components"

import {
  AxisBottom,
  AxisLeft,
  HoverCompContainer,
  useHoverComp
} from "./components"

import {
  getColorFunc,
  Identity,
  EmptyArray,
  EmptyObject,
  DefaultMargin
} from "./utils"

import "./avl-graph.css"

const DefaultHoverComp = ({ data, indexFormat, keyFormat, valueFormat }) => {
  const theme = useTheme();
  return (
    <div className={ `
      grid grid-cols-1 gap-1 px-2 pt-1 pb-2 rounded
      ${ theme.accent1 }
    ` }>
      <div className="font-bold text-lg leading-6 border-b-2 pl-2">
        { keyFormat(get(data, "key", null)) }
      </div>
      { get(data, "indexes", []).map(i => (
          <div key={ i } className={ `
            flex items-center px-2 rounded transition
          `}>
            <div className="mr-2 rounded-sm color-square w-5 h-5"
              style={ {
                backgroundColor: get(data, ["indexData", i, "color"], null),
                opacity: data.index === i ? 1 : 0.2
              } }/>
            <div className="mr-4">
              { indexFormat(i) }:
            </div>
            <div className="text-right flex-1">
              { valueFormat(get(data, ["indexData", i, "value"], 0)) }
            </div>
          </div>
        ))
      }
    </div>
  )
}

const DefaultHoverCompData = {
  HoverComp: DefaultHoverComp,
  indexFormat: Identity,
  keyFormat: Identity,
  valueFormat: Identity,
  position: "side"
}

const DefaultPoint = {
  r: 5,
  fill: "none",
  stroke: "#08f",
  strokeWidth: 1
}

const DefaultBoundsRect = {
  fill: "none",
  stroke: "#08f",
  strokeWidth: 1
}

const InitialState = {
  // gridData: [],
  // exitingData: [],
  xDomain: [],
  yDomain: [],
  xTickValues: [],
  yTickValues: [],
  xScale: null,
  yScale: null,
  adjustedWidth: 0,
  adjustedHeight: 0
}
// const Reducer = (state, action) => {
//   const { type, ...payload } = action;
//   switch (type) {
//     case "update-state": {
//       const { gridData, ...rest } = payload;
//
//
//     }
//     default:
//       return state;
//   }
// }


// const calcOrdinalScale = (dataSize, graphSize) => {
//   const sScale = scaleLinear()
//     .domain([0, dataSize])
//     .range([0, graphSize]);

//   let pos = 0;
//   let next = 0;

//   function scaler(value) {
//     const s = sScale(value);
//     next = pos + s;
//     return pos + s * 0.5;
//   }
//   scaler.step = function() {
//     pos = next;
//   }
//   return scaler;
// }

export const GridGraph = props => {

  const {
    data = EmptyArray,
    keys = EmptyArray,
    keyWidths = EmptyObject,
    indexBy = "index",
    margin = EmptyObject,
    hoverComp = EmptyObject,
    axisBottom = null,
    axisLeft = null,
    className = "",
    onClick = null,
    bgColor = "#000000",
    nullColor = "#000000",
    hoverPoints = false,
    // paddingInner = 0,
    // paddingOuter = 0,
    // padding,
    colors,
    // groupMode = "stacked",
    points = EmptyArray,
    bounds = EmptyArray,
    showAnimations = true
  } = props;

  const Margin = React.useMemo(() => {
    return { ...DefaultMargin, ...margin };
  }, [margin]);

  const HoverCompData = React.useMemo(() => {
    const hcData = { ...DefaultHoverCompData, ...hoverComp };
    if (typeof hcData.indexFormat === "string") {
      hcData.indexFormat = d3format(hcData.indexFormat);
    }
    if (typeof hcData.keyFormat === "string") {
      hcData.keyFormat = d3format(hcData.keyFormat);
    }
    if (typeof hcData.valueFormat === "string") {
      hcData.valueFormat = d3format(hcData.valueFormat);
    }
    return hcData;
  }, [hoverComp]);

  const ref = React.useRef(),
    { width, height } = useSetSize(ref),
    [state, setState] = React.useState(InitialState),

    gridData = React.useRef([]),
    pointData = React.useRef([]),
    spanLines = React.useRef([]),
    boundRects = React.useRef([]);

  const exitData = React.useCallback(exiting => {
    gridData.current = gridData.current.filter(({ id }) => {
      return !(id in exiting);
    });
    setState(prev => ({ ...prev }));
  }, []);

  const pointsMap = React.useMemo(() => {
    return points.reduce((a, c) => {
      if (!(c.index in a)) {
        a[c.index] = {};
      }
      a[c.index][c.key] = c;
      return a;
    }, {});
  }, [points]);

  const boundsMap = React.useMemo(() => {
    return bounds.reduce((a, c) => {
      const { index, ...rest } = c;
      a[index] = rest;
      return a;
    }, {});
  }, [bounds]);

  React.useEffect(() => {
    if (!(width && height)) return;

    const adjustedWidth = Math.max(0, width - (Margin.left + Margin.right)),
      adjustedHeight = Math.max(0, height - (Margin.top + Margin.bottom));

    const xDomain = keys;

    const dataWidth = keys.reduce((a, c) => {
      return a + get(keyWidths, c, 1);
    }, 0);

    const [yDomain, dataHeight] = data.reduce((a, c) => {
      let [yd, dh, dw] = a;
      yd.push(c[indexBy]);
      const h = +get(c, "height", 1);
      const w = +get(c, "width", 1);
      return [yd, dh + h, dw + w];
    }, [[], 0]);

    const indexes = data.map(d => d[indexBy]);

    const wScale = scaleLinear()
      .domain([0, dataWidth])
      .range([0, adjustedWidth]);

    const xRange = [0];
    const xScale = scaleOrdinal()
      .domain(["tick-1", ...xDomain, "tick-2"]);

    const hScale = scaleLinear()
      .domain([0, dataHeight])
      .range([0, adjustedHeight]);

    const yRange = [0];
    const yScale = scaleOrdinal()
      .domain(["tick-1", ...yDomain, "tick-2"]);

    const yTickValues = [];

    const colorFunc = getColorFunc(colors);

    const [updating, exiting] = gridData.current.reduce((a, c) => {
      const [u, e] = a;
      u[c.id] = "updating";
      e[c.id] = c;
      c.state = "exiting";
      return [u, e];
    }, [{}, {}]);

    let top = 0;

    const indexData = xDomain.reduce((a, c) => {
      a[c] = {};
      return a;
    }, {});

    pointData.current = [];
    spanLines.current = [];
    boundRects.current = [];

    const spanData = [];
    const pointPositions = {};

    const boundsData = {};

    gridData.current = data.map((d, i) => {

      let left = 0;

      const index = d[indexBy];

      pointPositions[index] = {};

      const pointsForIndex = get(pointsMap, index, {});
      const boundsForIndex = get(boundsMap, index, {});

      delete exiting[index];

      const height = hScale(get(d, "height", 1));

      yRange.push(top + height * 0.5);
      if (height >= 14) {
        yTickValues.push(index);
      }

      const grid = xDomain.map((x, ii) => {
        const value = get(d, x, null),
          width = wScale(get(keyWidths, x, 1)),
          xLeft = left,
          color = value === null ? nullColor : colorFunc(value, ii, d, x);

        if (i === 0) {
          xRange.push(xLeft + width * 0.5);
        }

        left += width;

        indexData[x][index] = { value, color };

        if (x in pointsForIndex) {
          const { index, key, spanTo, ...rest } = pointsForIndex[x];
          const point = {
            ...DefaultPoint,
            ...rest,
            cx: xLeft + width * 0.5,
            cy: top + height * 0.5,
            key: `${ index }-${ key }`
          }
          pointData.current.push(point);
          pointPositions[index][key] = point;

          if (spanTo) {
            spanData.push([index, key, spanTo])
          }
        }

        const { bounds = [], ...rest } = boundsForIndex;

        if (bounds.includes(x)) {
          if (index in boundsData) {
            boundsData[index].width = xLeft + width - boundsData[index].x;
          }
          else {
            boundsData[index] = {
              ...DefaultBoundsRect,
              ...rest,
              x: xLeft,
              y: top,
              height,
              key: index
            }
          }
        }

        return {
          data: d,
          key: x,
          width,
          height,
          index,
          x: xLeft,
          color,
          value,
          indexData: indexData[x],
          indexes
        };
      }, []);

      const horizontal = {
        grid,
        top,
        data: d,
        state: get(updating, index, "entering"),
        id: String(index)
      };
      top += height;
      return horizontal;
    });

    spanData.forEach(([index, from, to]) => {
      const p1 = get(pointPositions, [index, from]),
        p2 = get(pointPositions, [index, to]);
      spanLines.current.push({
        x1: p1.cx,
        y1: p1.cy,
        x2: p2.cx,
        y2: p2.cy,
        stroke: "#0ff",
        strokeWidth: 1,
        key: `${ p1.key }-${ p2.key }`
      })
    })

    boundRects.current = Object.values(boundsData);

    xRange.push(adjustedWidth);
    xScale.range(xRange);

    yRange.push(adjustedHeight);
    yScale.range(yRange);

    const exitingAsArray = Object.values(exiting);

    if (exitingAsArray.length) {
      setTimeout(exitData, 1050, exiting);
    }

    gridData.current = gridData.current.concat(exitingAsArray);

    setState({
      xDomain, yDomain, xScale, yScale,
      adjustedWidth, adjustedHeight, yTickValues
    });
  }, [data, keys, width, height, Margin, gridData,
      colors, indexBy, boundsMap, exitData, pointsMap,
      keyWidths, nullColor
  ]);

  const {
    xDomain, xScale, yDomain, yScale, yTickValues,
    ...restOfState
  } = state;

  const {
    onMouseOver,
    onMouseMove,
    onMouseLeave,
    hoverData
  } = useHoverComp(ref);

  const {
    HoverComp,
    position,
    ...hoverCompRest
  } = HoverCompData;

  return (
    <div className="w-full h-full avl-graph-container relative" ref={ ref }>

      <svg className={ `w-full h-full block avl-graph ${ className }` }>

        { !gridData.current.length ? null :
          <g>
            { !axisBottom ? null :
              <AxisBottom { ...restOfState }
                margin={ Margin }
                scale={ xScale }
                domain={ xDomain }
                type="ordinal"
                { ...axisBottom }/>
            }
            { !axisLeft ? null :
              <AxisLeft { ...restOfState }
                margin={ Margin }
                scale={ yScale }
                tickValues={ yTickValues }
                domain={ yDomain }
                type="ordinal"
                { ...axisLeft }/>
            }
          </g>
        }

        <g style={ { transform: `translate(${ Margin.left }px, ${ Margin.top }px)` } }
          onMouseLeave={ onMouseLeave }>

          <rect x="0" y="0" fill={ bgColor }
            width={ state.adjustedWidth } height={ state.adjustedHeight }/>

          { gridData.current.map(({ id, ...rest }) =>
              <Horizontal key={ id } { ...rest }
                onMouseMove={ onMouseMove }
                showAnimations={ showAnimations }
                onClick={ onClick }/>
            )
          }

          { !gridData.current.length ? null :
            <>
              <g style={ { pointerEvents: hoverPoints ? "auto" : "none" } }>
                { pointData.current.map(point => (
                    <Point { ...point }
                      onMouseOver={ onMouseOver }
                      showHover={ hoverPoints }
                    />
                  ))
                }
              </g>
              <g style={ { pointerEvents: "none" } }>
                { spanLines.current.map(line => <line { ...line }/>) }
                { boundRects.current.map(rect => <rect { ...rect }/>) }
              </g>
            </>
          }

          { !hoverData.show || (hoverData.target !== "graph") ? null :
            <rect stroke="currentColor" fill="none" strokeWidth="2"
              className="pointer-events-none"
              style={ {
                transform: `translate(${ hoverData.data.x }px, 0px)`,
                transition: "transform 0.15s ease-out"
              } }
              x={ -1 } y={ -1 }
              width={ hoverData.data.width + 2 }
              height={ state.adjustedHeight + 2 }/>
          }
        </g>

      </svg>

      <HoverCompContainer { ...hoverData }
        position={ position }
        svgWidth={ width }
        svgHeight={ height }
        margin={ Margin }>
        { !hoverData.data ? null :
            <HoverComp target={ hoverData.target }
              data={ hoverData.data } keys={ keys } { ...hoverCompRest }
            />
        }
      </HoverCompContainer>

    </div>
  )
}

const Point = ({ showHover, onMouseOver, data, cx, cy, ...rest }) => {

  const _onMouseOver = React.useCallback(e => {
    onMouseOver(e, data, { pos: [cx, cy], target: "point" });
  }, [onMouseOver, cx, cy, data]);

  return (
    <circle { ...rest } cx={ cx } cy={ cy }
      onMouseOver={ showHover ? _onMouseOver : null }
    />
  )
}

const Grid = ({ x, width, height, color,
                state, onMouseMove, onClick,
                Key, index, value, showAnimations,
                data, indexData, indexes }) => {

  const ref = React.useRef();

  React.useEffect(() => {
    if (state === "entering") {
      const entering = d3select(ref.current)
        .attr("width", 0)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0)
        .attr("fill", color);

      if (showAnimations) {
        entering.transition().duration(1000)
          .attr("width", width)
          .attr("x", x);
      }
      else {
        entering
          .attr("width", width)
          .attr("x", x);
      }
    }
    else if (state === "exiting") {
      const exiting = d3select(ref.current);

      if (showAnimations) {
        exiting.transition().duration(1000)
          .attr("width", 0)
          .attr("height", height)
          .attr("x", 0)
          .attr("fill", color);
      }
      else {
        exiting
          .attr("width", 0)
          .attr("height", height)
          .attr("x", 0)
          .attr("fill", color);
      }
    }
    else {
      const updating = d3select(ref.current);

      if (showAnimations) {
        updating.transition().duration(1000)
          .attr("width", width)
          .attr("height", height)
          .attr("x", x)
          .attr("fill", color);
      }
      else {
        updating
          .attr("width", width)
          .attr("height", height)
          .attr("x", x)
          .attr("fill", color);
      }
    }
  }, [x, width, height, color, state, showAnimations]);

  const _onMouseMove = React.useCallback(e => {
    onMouseMove(e, { color, key: Key, index, value, data, x, width, indexData, indexes });
  }, [onMouseMove, color, Key, index, value, data, x, width, indexData, indexes]);

  const _onClick = React.useMemo(() => {
    if (!onClick) return null;
    return e => {
      onClick(e, { key: Key, index, value });
    }
  }, [onClick, Key, index, value]);

  return (
    <rect ref={ ref } className="avl-grid"
      onMouseMove={ _onMouseMove }
      onClick={ _onClick }/>
  )
}

const Horizontal = React.memo(({ grid, top, state, showAnimations, ...props }) => {

  const ref = React.useRef();

  React.useEffect(() => {
    if (state === "entering") {
      d3select(ref.current)
        .attr("transform", `translate(0 ${ top })`);
    }
    else {
      if (showAnimations) {
        d3select(ref.current)
          .transition().duration(1000)
          .attr("transform", `translate(0 ${ top })`);
      }
      else {
        d3select(ref.current)
          .attr("transform", `translate(0 ${ top })`);
      }
    }
  }, [state, top,showAnimations]);

  return (
    <g ref={ ref } className="avl-grid-horizontal">
      { grid.map(({ key, ...rest }) =>
          <Grid key={ key } Key={ key } state={ state }
            { ...props } { ...rest }
            showAnimations={ showAnimations }/>
        )
      }
    </g>
  )
})

export const generateTestGridData = (horizontals = 5, grids = 200) => {
  const data = [], keys = [];
  for (let h = 0; h < horizontals; ++h) {
    const hori = {
      index: `index-${ h }`,
      height: Math.floor(Math.random() * 10) + 10
    }
    for (let x = 0; x < grids; ++x) {
      (h === 0) && keys.push(x);
      hori[x] = Math.floor(Math.random() * 10) + 10;
    }
    data.push(hori);
  }
  return { data, keys };
}
