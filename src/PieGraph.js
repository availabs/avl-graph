import React from "react"

import { scaleLinear } from "d3-scale"
import { select as d3select } from "d3-selection"
import { format as d3format } from "d3-format"
import { sum as d3sum, extent as d3extent } from "d3-array"
import * as d3shape from "d3-shape"

import get from "lodash.get"

import { useTheme, useSetSize } from "@availabs/avl-components"

import {
  HoverCompContainer,
  useHoverComp
} from "./components"

import {
  getColorFunc,
  Identity,
  EmptyArray,
  EmptyObject
} from "./utils"

const DefaultHoverComp = ({ data, keys, indexFormat, keyFormat, valueFormat, ...rest }) => {
  const theme = useTheme();
  return (
    <div className={ `
      flex flex-col px-2 pt-1 rounded
      ${ keys.length <= 1 ? "pb-2" : "pb-1" }
      ${ theme.accent1 }
    ` }>
      <div className="font-bold text-lg leading-6 border-b-2 mb-1 pl-2">
        { indexFormat(get(data, "index", null)) }
      </div>
      { keys.map(key => (
          <div key={ key } className={ `
            flex items-center px-2 border-2 rounded transition
            ${ data.key === key ? "border-current" : "border-transparent" }
          `}>
            <div className="mr-2 rounded-sm color-square w-5 h-5"
              style={ {
                backgroundColor: get(data, ["colorMap", data.index, key], null),
                opacity: data.key === key ? 1 : 0.2
              } }/>
            <div className="mr-4">
              { keyFormat(key) }:
            </div>
            <div className="text-right flex-1">
              { valueFormat(get(data, ["data", key], 0)) }
            </div>
          </div>
        ))
      }
      { keys.length <= 1 ? null :
        <div className="flex pr-2">
          <div className="w-5 mr-2"/>
          <div className="mr-4 pl-2">
            Total:
          </div>
          <div className="flex-1 text-right">
            {  valueFormat(keys.reduce((a, c) => a + get(data, ["data", c], 0), 0)) }
          </div>
        </div>
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

const InitialState = {
  radiusDomain: [],
  radiusScale: null,
  adjustedWidth: 0,
  adjustedHeight: 0,
  pieData: [],
  exiting: []
}
const Reducer = (state, action) => {
  const { type, ...payload } = action;
  switch (type) {
    case "update-state": {
      const { pieData } = state;
      const prevIds = pieData.reduce((a, c) => {
        a[c.index] = c;
        return a;
      }, {});
      payload.pieData.forEach(pie => {
        if (pie.index in prevIds) {
          pie.state = "updating";
          delete prevIds[pie.index];
        }
      })
      return {
        ...state,
        ...payload,
        pieData: [
          ...payload.pieData,
          ...Object.values(prevIds).map(p => ({ ...p, state: "exiting" }))
        ],
        exiting: Object.keys(prevIds)
      }
    }
    case "exit-data":
      return {
        ...state,
        pieData: state.pieData.filter(pie => {
          return !payload.exiting.includes(pie.index);
        }),
        exiting: state.exiting.filter(e => {
          return !payload.exiting.includes(e);
        })
      }
    default:
      return state;
  }
}

const DefaultMargin = {
  left: 10,
  top: 10,
  right: 10,
  bottom: 10
}

const maxSquare = (x, y, n) => {
  let sx, sy;

  const px = Math.ceil(Math.sqrt(n * x / y));
  if (Math.floor(px * y / x) * px < n) {
    sx = y / Math.ceil(px * y / x);
  }
  else {
    sx = x / px;
  }
  const py = Math.ceil(Math.sqrt(n * y / x));
  if (Math.floor(py * x / y) * py < n) {
    sy = x / Math.ceil(py * x / y);
  }
  else {
    sy = y / py;
  }
  return Math.max(sx, sy);
}

export const PieGraph = props => {

  const {
    data = EmptyArray,
    keys = EmptyArray,
    margin = EmptyObject,
    hoverComp = EmptyObject,
    indexBy = "index",
    className ="",
    startAngle = 0,
    endAngle = 2 * Math.PI,
    padAngle = 0,
    colors
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
    [state, dispatch] = React.useReducer(Reducer, InitialState);

  const exitData = React.useCallback(exiting => {
    dispatch({
      type: "exit-data",
      exiting
    });
  }, []);

  React.useEffect(() => {
    if (!(width && height)) return;

    const adjustedWidth = Math.max(0, width - (Margin.left + Margin.right)),
      adjustedHeight = Math.max(0, height - (Margin.top + Margin.bottom));

    const pieMaker = d3shape.pie()
      .value(d => d.value)
      .startAngle(startAngle)
      .endAngle(endAngle)
      .padAngle(padAngle)
      .sort(null);

    const colorFunc = getColorFunc(colors);

    const colorMap = {};

    const pieData = data.map(d => {

      colorMap[d[indexBy]] = {};

      const pieParts = keys.map((key, ii) => {
        const value = get(d, key, 0);
        const color = colorFunc(value, ii, d, key);
        colorMap[d[indexBy]][key] = color;
        return {
          data: d,
          colorMap,
          color,
          value,
          key,
          index: d[indexBy]
        }
      }).filter(p => Boolean(p.value));

      return {
        index: d[indexBy],
        pie: pieMaker(pieParts),
        total: d3sum(pieParts, d => d.value),
        state: "entering",
        label: d[indexBy]
      };
    });

    const labelPadding = 15;

    let ms = maxSquare(adjustedWidth, adjustedHeight, pieData.length);

    const numCols = Math.floor(adjustedWidth / ms);

    const domain = d3extent(pieData, d => d.total);

    if (domain[0] === domain[1]) {
      domain[0] = 0;
    }

    const numRows = Math.ceil(pieData.length / numCols),
      numPiesInLastRow = pieData.length % numCols ? pieData.length % numCols : numCols,
      h = adjustedHeight / numRows;

    ms = Math.min(ms, h - labelPadding);

    const diff = h - ms;

    const radiusScale = scaleLinear()
      .domain(domain)
      .range([0.3 * ms, 0.475 * ms]);

    pieData.forEach((p, i) => {
      const col = i % numCols,
        row = Math.floor(i / numCols),
        rowLength = (row + 1) < numRows ? numCols : numPiesInLastRow,
        w = adjustedWidth / rowLength;

      p.radius = radiusScale(p.total);
      p.dx = w * col + w * 0.5;
      p.dy = h * row + (h - diff) * 0.5;
      p.ms = ms;
    })

    dispatch({
      type: "update-state",
      radiusScale,
      adjustedWidth,
      adjustedHeight,
      pieData
    });

  }, [
    data, keys, width, height, colors,
    Margin, indexBy, startAngle, endAngle, padAngle
  ]);

  React.useEffect(() => {
    if (state.exiting.length) {
      setTimeout(exitData, 1050, state.exiting);
    }
  }, [exitData, state.exiting]);

  const {
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
    <div ref={ ref } className="w-full h-full relative avl-graph-container">

      <svg className={ `w-full h-full block avl-graph ${ className }` }>
        <g onMouseLeave={ onMouseLeave }
          style={ {
            transform: `translate(${ Margin.left }px, ${ Margin.top }px)`
          } }>

          { state.pieData
              .map((pie, i) => (
                <Pie key={ pie.index } { ...pie }
                  onMouseMove={ onMouseMove }/>
              ))
          }

        </g>
      </svg>

      <HoverCompContainer { ...hoverData }
        position={ position }
        svgWidth={ width }
        svgHeight={ height }
        margin={ Margin }>
        { !hoverData.data ? null :
          <HoverComp data={ hoverData.data } keys={ keys }
            { ...hoverCompRest }/>
        }
      </HoverCompContainer>
    </div>
  )
}

const Slice = React.memo(({ state, data, radius, index, onMouseMove, ...props }) => {

  const zeroArc = React.useMemo(() => {
    return d3shape.arc()
      .outerRadius(1)
      .innerRadius(0)
      .cornerRadius(0);
  }, []);

  const arc = React.useMemo(() => {
    return d3shape.arc()
      .outerRadius(radius)
      .innerRadius(0)
      .cornerRadius(0);
  }, [radius]);

  const ref = React.useRef();

  React.useEffect(() => {
    if (state === "entering") {
      d3select(ref.current)
        .attr("d", zeroArc(props))
        .transition().duration(1000)
          .attr("d", arc(props))
          .attr("fill", data.color);
    }
    else if (state === "exiting") {
      d3select(ref.current)
        .transition().duration(1000)
          .attr("d", zeroArc(props));
    }
    else {
      d3select(ref.current)
        .transition().duration(1000)
          .attr("d", arc(props))
          .attr("fill", data.color);
    }
  }, [ref, zeroArc, arc, data, props]);

  const _onMouseMove = React.useCallback(e => {
    onMouseMove(e, { ...data });
  }, [onMouseMove, data]);

  return (
    <path ref={ ref } className="avl-slice" stroke="none"
      onMouseMove={ _onMouseMove }/>
  )
})

const Pie = React.memo(({ pie, dx, dy, ms, state, label, ...props }) => {

  const ref = React.useRef();

  React.useEffect(() => {
    if (state === "entering") {
      d3select(ref.current)
        .style("transform", `translate(${ dx }px, ${ dy }px)`);
    }
    else {
      d3select(ref.current)
        .transition().duration(1000)
          .style("transform", `translate(${ dx }px, ${ dy }px)`);
    }
  }, [ref, dx, dy]);

  return (
    <g ref={ ref }>
      { pie.map((p, i) => (
          <Slice ref={ ref } key={ p.data.key }
            { ...props } { ...p }
            state={ state }/>
        ))
      }
      <g style={ { transform: `translate(${ 0 }px, ${ ms * 0.5 + 15 }px)` } }>
        <text textAnchor="middle">{ label }</text>
      </g>
    </g>
  )
})
