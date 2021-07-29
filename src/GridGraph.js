import React from "react"

import { scaleBand, scaleLinear, scaleOrdinal } from "d3-scale"
import { select as d3select } from "d3-selection"
import { range as d3range } from "d3-array"
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

const InitialState = {
  xDomain: [],
  yDomain: [],
  tickValues: [],
  xScale: null,
  yScale: null,
  adjustedWidth: 0,
  adjustedHeight: 0
}

export const GridGraph = props => {

  const {
    data = EmptyArray,
    keys = EmptyArray,
    indexBy = "index",
    margin = EmptyObject,
    hoverComp = EmptyObject,
    axisBottom = null,
    axisLeft = null,
    className = "",
    paddingInner = 0,
    paddingOuter = 0,
    padding,
    colors,
    groupMode = "stacked"
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

    gridData = React.useRef(EmptyArray),
    exitingData = React.useRef(EmptyArray);

  const exitData = React.useCallback(() => {
    gridData.current = gridData.current.filter(({ id }) => {
      return !(id in exitingData.current);
    });
    setState(prev => ({ ...prev }));
  }, []);

  React.useEffect(() => {
    if (!(width && height)) return;

    const adjustedWidth = Math.max(0, width - (Margin.left + Margin.right)),
      adjustedHeight = Math.max(0, height - (Margin.top + Margin.bottom));

    const [yDomain, dataHeight] = data.reduce((a, c) => {
      let [yd, dh] = a;
      yd.push(c[indexBy]);
      const h = +get(c, "height", 1);
      return [yd, dh + h];
    }, [[], 0]);

    const xDomain = keys;

    const indexes = data.map(d => d[indexBy]);

    const xScale = scaleBand()
      .domain(xDomain)
      .range([0, adjustedWidth]);

    const bandwidth = xScale.bandwidth();

    const hScale = scaleLinear()
      .domain([0, dataHeight])
      .range([0, adjustedHeight]);

    const yRange = [0];
    const yScale = scaleOrdinal()
      .domain(["tick-1", ...yDomain, "tick-2"]);

    const tickValues = [];

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

    gridData.current = data.map((d, i) => {

      delete exiting[d[indexBy]];

      const height = hScale(get(d, "height", 1));

      yRange.push(top + height * 0.5);
      if (height >= 14) {
        tickValues.push(d[indexBy]);
      }

      const grid = xDomain.map((x, ii) => {
        const value = get(d, x, null),
          color = value === null ? "#000" : colorFunc(value, ii, d, x);
        indexData[x][d[indexBy]] = { value, color };
        return {
          data: d,
          key: x,
          width: bandwidth,
          height,
          index: d[indexBy],
          x: ii * bandwidth,
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
        state: get(updating, d[indexBy], "entering"),
        id: d[indexBy].toString()
      };
      top += height;
      return horizontal;
    });

    yRange.push(adjustedHeight);
    yScale.range(yRange);

    exitingData.current = exiting;
    const exitingAsArray = Object.values(exiting);

    if (exitingAsArray.length) {
      setTimeout(exitData, 1050);
    }

    gridData.current = gridData.current.concat(exitingAsArray);

    setState({
      xDomain, yDomain, xScale, yScale,
      adjustedWidth, adjustedHeight, tickValues
    });
  }, [data, keys, width, height,
      Margin, gridData, colors, indexBy, exitData]
  );

  const {
    xDomain, xScale, yDomain, yScale, tickValues,
    ...restOfState
  } = state;

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
    <div className="w-full h-full relative avl-graph-container" ref={ ref }>

      <svg className={ `w-full h-full block avl-graph ${ className }` }>

        { !gridData.current.length ? null :
          <g>
            { !axisBottom ? null :
              <AxisBottom { ...restOfState }
                margin={ Margin }
                scale={ xScale }
                domain={ xDomain }
                { ...axisBottom }/>
            }
            { !axisLeft ? null :
              <AxisLeft { ...restOfState }
                margin={ Margin }
                scale={ yScale }
                tickValues={ tickValues }
                domain={ yDomain }
                type="ordinal"
                { ...axisLeft }/>
            }
          </g>
        }

        <g style={ { transform: `translate(${ Margin.left }px, ${ Margin.top }px)` } }
          onMouseLeave={ onMouseLeave }>

          <rect x="0" y="0" fill="#000"
            width={ state.adjustedWidth } height={ state.adjustedHeight }/>

          { gridData.current.map(({ id, ...rest }) =>
              <Horizontal key={ id } { ...rest }
                onMouseMove={ onMouseMove }/>
            )
          }

          { !hoverData.show ? null :
            <rect stroke="currentColor" fill="none" strokeWidth="2" width
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
          <HoverComp data={ hoverData.data } keys={ keys }
            { ...hoverCompRest }/>
        }
      </HoverCompContainer>

    </div>
  )
}

const Grid = ({ x, width, height, color, state, onMouseMove, Key, index, value, data, indexData, indexes }) => {

  const ref = React.useRef();

  React.useEffect(() => {
    if (state === "entering") {
      d3select(ref.current)
        .attr("width", 0)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0)
        .attr("fill", color)
        .transition().duration(1000)
          .attr("width", width)
          .attr("x", x);
    }
    else if (state === "exiting") {
      d3select(ref.current)
        .transition().duration(1000)
          .attr("width", 0)
          .attr("height", height)
          .attr("x", 0)
          .attr("fill", color);
    }
    else {
      d3select(ref.current)
        .transition().duration(1000)
          .attr("width", width)
          .attr("height", height)
          .attr("x", x)
          .attr("fill", color);
    }
  }, [x, width, height, color, state]);

  const _onMouseMove = React.useCallback(e => {
    onMouseMove(e, { color, key: Key, index, value, data, x, width, indexData, indexes });
  }, [onMouseMove, color, Key, index, value, data, x, width, indexData, indexes]);

  return (
    <rect ref={ ref } className="avl-grid"
      onMouseMove={ _onMouseMove }/>
  )
}

const Horizontal = React.memo(({ grid, top, state, ...props }) => {

  const ref = React.useRef();

  React.useEffect(() => {
    if (state === "entering") {
      d3select(ref.current)
        .attr("transform", `translate(0 ${ top })`);
    }
    else {
      d3select(ref.current)
        .transition().duration(1000)
        .attr("transform", `translate(0 ${ top })`);
    }
  }, [state, top]);

  return (
    <g ref={ ref } className="avl-grid-horizontal">
      { grid.map(({ key, ...rest }) =>
          <Grid key={ key } Key={ key } state={ state }
            { ...props } { ...rest }/>
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
