import React from "react"

import { scalePoint, scaleLinear } from "d3-scale"
import { select as d3select } from "d3-selection"
import { line as d3line, curveCatmullRom } from "d3-shape"
import { range as d3range } from "d3-array"
import { format as d3format } from "d3-format"

import get from "lodash.get"

import { useTheme, useSetSize } from "@availabs/avl-components"

import {
  AxisBottom,
  AxisLeft,
  AxisRight,
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

const HoverComp = ({ data, idFormat, xFormat, yFormat, lineTotals }) => {
  const theme = useTheme();
  return (
    <div className={ `
        flex flex-col px-2 py-1 rounded
        ${ theme.accent1 }
      ` }>
      <div className="border-b-2 mb-1 pl-2 flex">
        <div className="font-bold text-lg leading-6 flex-1">
          { xFormat(get(data, "x", null), data) }
        </div>
        <div>
          (Line Total)
        </div>
      </div>
      <div className="table px-2 border-collapse">
        { data.data.sort((a, b) => lineTotals[b.id] - lineTotals[a.id])
            .map(({ id, y, color, isMax, ...rest }) => (
              <div key={ id } className={ `
                table-row
              ` }>
                <div className="table-cell align-middle">
                  <div className={ `
                    flex items-center rounded-l border-t-2 border-l-2 border-b-2
                    ${ isMax ? "border-current" : "border-transparent" }
                    transition pl-2
                  ` }>
                    <div className={ `
                      mr-2 rounded-sm color-square w-5 h-5 transition border-2
                    ` }
                      style={ {
                        borderColor: color,
                        borderStyle: "solid",
                        background: `${ color }${ isMax ? "ff" : "33" }`
                      } }/>
                    <div className="mr-4">
                      { idFormat(id, rest) }:
                    </div>
                  </div>
                </div>
                <div className="table-cell align-middle">
                  <div className={ `
                    text-right pr-4 transition border-t-2 border-b-2
                    ${ isMax ? "border-current" : "border-transparent" }
                  ` }>
                    { yFormat(y, rest) }
                  </div>
                </div>
                <div className="table-cell align-middle">
                  <div className={ `
                    text-right rounded-tr transition rounded-r border-t-2 border-b-2 border-r-2
                    ${ isMax ? "border-current" : "border-transparent" } pr-2
                  ` }>
                    ({ yFormat(lineTotals[id], rest) })
                  </div>
                </div>
              </div>
            ))
        }
        { !data.secondary.length ? null :
          <>
            <div className="table-row">
              <div className="table-cell border-b-2 pt-1"/>
              <div className="table-cell border-b-2 pt-1"/>
              <div className="table-cell border-b-2 pt-1"/>
            </div>
            <div className="table-row">
              <div className="table-cell border-t-2 pb-1"/>
              <div className="table-cell border-t-2 pb-1"/>
              <div className="table-cell border-t-2 pb-1"/>
            </div>
          </>
        }
        { data.secondary.sort((a, b) => lineTotals[b.id] - lineTotals[a.id])
            .map(({ id, y, color, isMax, ...rest }) => (
              <div key={ id } className={ `
                table-row
              ` }>
                <div className="table-cell align-middle">
                  <div className={ `
                    flex items-center rounded-l border-t-2 border-l-2 border-b-2
                    ${ isMax ? "border-current" : "border-transparent" }
                    transition pl-2 border-dashed
                  ` }>
                    <div className={ `
                      mr-2 rounded-sm color-square w-5 h-5 transition border-2
                    ` }
                      style={ {
                        borderColor: color,
                        borderStyle: "dashed",
                        background: `
                          repeating-linear-gradient(
                            -45deg,
                            ${ color }${ isMax ? "ff" : "33" } 2px,
                            ${ color }${ isMax ? "ff" : "33" } 4px,
                            transparent 4px,
                            transparent 6px
                          )
                        `
                      } }/>
                    <div className="mr-4">
                      { idFormat(id, rest) }:
                    </div>
                  </div>
                </div>
                <div className="table-cell align-middle">
                  <div className={ `
                    text-right pr-4 transition border-t-2 border-b-2 border-dashed
                    ${ isMax ? "border-current" : "border-transparent" }
                  ` }>
                    { yFormat(y, rest) }
                  </div>
                </div>
                <div className="table-cell align-middle">
                  <div className={ `
                    text-right rounded-tr transition rounded-r border-t-2 border-b-2 border-r-2
                    ${ isMax ? "border-current" : "border-transparent" } pr-2 border-dashed
                  ` }>
                    ({ yFormat(lineTotals[id], rest) })
                  </div>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  )
}
const DefaultHoverCompData = {
  HoverComp,
  idFormat: Identity,
  xFormat: Identity,
  yFormat: Identity,
  position: "side"
}

const InitialState = {
  xDomain: [],
  yDomain: [],
  secDomain: [],
  xScale: null,
  yScale: null,
  secScale: null,
  adjustedWidth: 0,
  adjustedHeight: 0,
  sliceData: {},
  lineTotals: {},
  barData: []
}

export const LineGraph = props => {

  const {
    data = EmptyArray,
    secondary = EmptyArray,
    margin = EmptyObject,
    axisBottom = null,
    axisLeft = null,
    axisRight = null,
    hoverComp = EmptyObject,
    indexBy = "id",
    className = "",
    theme = EmptyObject,
    padding = 0.5,
    colors
  } = props;

  const HoverCompData = React.useMemo(() => {
    const hcData = { ...DefaultHoverCompData, ...hoverComp };
    if (typeof hcData.idFormat === "string") {
      hcData.idFormat = d3format(hcData.idFormat);
    }
    if (typeof hcData.xFormat === "string") {
      hcData.xFormat = d3format(hcData.xFormat);
    }
    if (typeof hcData.yFormat === "string") {
      hcData.yFormat = d3format(hcData.yFormat);
    }
    return hcData;
  }, [hoverComp]);

  const Margin = React.useMemo(() => {
    return { ...DefaultMargin, ...margin };
  }, [margin]);

  const ref = React.useRef(),
    { width, height } = useSetSize(ref),
    [state, setState] = React.useState(InitialState),

    lineData = React.useRef(EmptyArray),
    exitingData = React.useRef(EmptyArray),

    secondaryData = React.useRef(EmptyArray),
    exitingSecondary = React.useRef(EmptyArray);

  const exitData = React.useCallback((secondary = false) => {
    let data = secondary ? secondaryData : lineData,
      exiting = secondary ? exitingSecondary : exitingData;
    data.current = data.current.filter(({ id }) => {
      return !(id in exiting.current);
    });
    setState(prev => ({ ...prev }));
  }, []);

  React.useEffect(() => {
    if (!(width && height)) return;

    const adjustedWidth = Math.max(0, width - (Margin.left + Margin.right)),
      adjustedHeight = Math.max(0, height - (Margin.top + Margin.bottom));

    const xDomain = data.length ? data[0].data.map(d => d.x) : [];

    let yDomain = [];
    if (xDomain.length) {
      yDomain = data.reduce((a, c) => {
        const y = c.data.reduce((a, c) => Math.max(a, +c.y), 0);
        if (y) {
          return [0, Math.max(y, get(a, 1, 0))];
        }
        return a;
      }, []);
    }

    let secDomain = [];
    if (xDomain.length) {
      secDomain = secondary.reduce((a, c) => {
        const y = c.data.reduce((a, c) => Math.max(a, +c.y), 0);
        if (y) {
          return [0, Math.max(y, get(a, 1, 0))];
        }
        return a;
      }, []);
    }

    const xScale = scalePoint()
      .padding(padding)
      .domain(xDomain)
      .range([0, adjustedWidth]);

    const yScale = scaleLinear()
      .domain(yDomain)
      .range([0, adjustedHeight]);

    const secScale = scaleLinear()
      .domain(secDomain)
      .range([0, adjustedHeight]);

		const lineGenerator = d3line()
      .curve(curveCatmullRom)
			.x(d => xScale(d.x))
			.y(d => adjustedHeight - yScale(d.y));

    const secGenerator = d3line()
      .curve(curveCatmullRom)
			.x(d => xScale(d.x))
			.y(d => adjustedHeight - secScale(d.y));

		const yEnter = yScale(0),
      baseLineGenerator = d3line()
        .curve(curveCatmullRom)
  			.x(d => xScale(d))
  			.y(d => adjustedHeight - yEnter),
      baseLine = baseLineGenerator(xDomain);

    const colorFunc = getColorFunc(colors);

    const lineTotals = {};

// GENERATE LINE DATA
    const [updating, exiting] = lineData.current.reduce((a, c) => {
      const [u, e] = a;
      u[c[indexBy]] = "updating";
      e[c[indexBy]] = c;
      c.state = "exiting";
      return [u, e];
    }, [{}, {}]);

    const sliceData = xDomain.reduce((a, c) => {
      a[c] = [];
      return a;
    }, {});

    lineData.current = data.map((d, i) => {

      const { data, ...rest } = d;
      delete exiting[d[indexBy]];

      const color = colorFunc(d, i);

      lineTotals[d[indexBy]] = 0;

      data.forEach(({ x, y }) => {
        lineTotals[d[indexBy]] += y;
        sliceData[x].push({
          ...rest,
          color,
          y
        });
      })

      return {
        line: lineGenerator(data),
        baseLine,
        color,
        state: get(updating, d[indexBy], "entering"),
        id: d[indexBy].toString()
      };
    });

    exitingData.current = exiting;
    const exitingAsArray = Object.values(exiting);

    if (exitingAsArray.length) {
      setTimeout(exitData, 1050);
    }

    lineData.current = lineData.current.concat(exitingAsArray);

    for (const k in sliceData) {
      const col = sliceData[k],
        { i } = col.reduce((a, c, i) => {
          c.isMax = false;
          return c.y > a.y ? { y: c.y, i } : a;
        }, { y: 0, i: -1 });
      if (i > -1) {
        col[i].isMax = true;
      }
    }


// GENERATE SECONDARY DATA
    let [secUpdating, secExiting] = secondaryData.current.reduce((a, c) => {
      const [u, e] = a;
      u[c[indexBy]] = "updating";
      e[c[indexBy]] = c;
      c.state = "exiting";
      return [u, e];
    }, [{}, {}]);

    const secSliceData = xDomain.reduce((a, c) => {
      a[c] = [];
      return a;
    }, {});

    secondaryData.current = secondary.map((d, i) => {

      const { data, ...rest } = d;
      delete secExiting[d[indexBy]];

      const color = colorFunc(d, i + lineData.current.length);

      lineTotals[d[indexBy]] = 0;

      data.forEach(({ x, y }) => {
        lineTotals[d[indexBy]] += y;
        secSliceData[x].push({
          ...rest,
          color,
          y
        });
      })

      return {
        line: secGenerator(data),
        baseLine,
        color,
        state: get(secUpdating, d[indexBy], "entering"),
        id: d[indexBy].toString()
      };
    });

    exitingSecondary.current = secExiting;
    const secExitingAsArray = Object.values(secExiting);

    if (secExitingAsArray.length) {
      setTimeout(exitData, 1050, true);
    }

    secondaryData.current = secondaryData.current.concat(secExitingAsArray);

    for (const k in secSliceData) {
      const col = secSliceData[k],
        { i } = col.reduce((a, c, i) => {
          c.isMax = false;
          return c.y > a.y ? { y: c.y, i } : a;
        }, { y: 0, i: -1 });
      if (i > -1) {
        col[i].isMax = true;
      }
    }

    const step = xScale.step(),
      offset = xScale.padding() * step - step * 0.5;

    const barData = xDomain.map((x, i) => ({
      left: offset + i * step,
      data: sliceData[x],
      secondary: secSliceData[x],
      height: adjustedHeight,
      width: step,
      id: x
    }));

    setState({
      xDomain, yDomain, xScale, yScale, barData, indexBy, secScale, secDomain,
      adjustedWidth, adjustedHeight, sliceData, secSliceData, lineTotals
    });
  }, [data, width, height, Margin, lineData, colors, padding, exitData, indexBy, secondary]);

  const {
    onMouseMove,
    onMouseLeave,
    hoverData
  } = useHoverComp(ref);

  const {
    xDomain, xScale, yDomain, yScale, secDomain, secScale, lineTotals, barData,
    ...stateRest
  } = state;

  const {
    HoverComp,
    position,
    ...hoverCompRest
  } = HoverCompData;

  return (
    <div className="w-full h-full relative avl-graph-container" ref={ ref }>

      <svg className={ `w-full h-full block avl-graph ${ className }` }>
        <g style={ { transform: `translate(${ Margin.left }px, ${ Margin.top }px)` } }
          onMouseLeave={ onMouseLeave }>
          { lineData.current.map(({ id, ...rest }) => (
              <Line key={ id } { ...rest }
                onMouseMove={ onMouseMove }/>
            ))
          }
          { secondaryData.current.map(({ id, ...rest }) => (
              <Line key={ id } { ...rest } secondary={ true }
                onMouseMove={ onMouseMove }/>
            ))
          }
          { barData.map(({ id, ...rest }) => (
              <InteractiveBar key={ id } id={ id } { ...rest }
                onMouseMove={ onMouseMove }/>
            ))
          }
          { !hoverData.show ? null :
            <line stroke="currentColor" strokeWidth="2"
              style={ {
                transform: `translate(${ xScale(hoverData.data.x) }px)`,
                transition: "transform 0.15s ease-out"
              } }
              x1={ 0.5 } y1={ 0 }
              x2={ 0.5 } y2={ stateRest.adjustedHeight }/>
          }
        </g>
        { !lineData.current.length ? null :
          <g>
            { !axisBottom ? null :
              <AxisBottom { ...stateRest }
                margin={ Margin }
                scale={ xScale }
                domain={ xDomain }
                { ...axisBottom }/>
            }
            { !axisLeft ? null :
              <AxisLeft { ...stateRest }
                margin={ Margin }
                scale={ yScale }
                domain={ yDomain }
                { ...axisLeft }/>
            }
          </g>
        }
        { !secondaryData.current.length ? null :
          <g>
            { !axisRight ? null :
              <AxisRight { ...stateRest }
                secondary={ true }
                margin={ Margin }
                scale={ secScale }
                domain={ secDomain }
                { ...axisRight }/>
            }
          </g>
        }
      </svg>

      <HoverCompContainer { ...hoverData }
        position={ position }
        svgWidth={ width }
        svgHeight={ height }
        margin={ Margin }>
        { !hoverData.data ? null :
          <HoverComp data={ hoverData.data } theme={ theme } lineTotals={ lineTotals }
            { ...hoverCompRest }/>
        }
      </HoverCompContainer>

    </div>
  )
}
export default LineGraph;

const Line = React.memo(({ line, baseLine, state, color, secondary = false }) => {

  const ref = React.useRef();

  React.useEffect(() => {
    if (state === "entering") {
      d3select(ref.current)
        // .attr("opacity", 0)
        .attr("d", baseLine)
        .attr("stroke", color)
        .attr("stroke-dasharray", secondary ? "8 4" : null)
        .transition().duration(1000)
        // .attr("opacity", 1)
        .attr("d", line);
    }
    else if (state === "exiting") {
      d3select(ref.current)
        .transition().duration(1000)
        .attr("d", baseLine)
        // .attr("opacity", 0);
    }
    else {
      d3select(ref.current)
        .transition().duration(1000)
        // .attr("opacity", 1)
        .attr("stroke", color)
        .attr("d", line);
    }
  }, [ref, state, line, baseLine, color, secondary]);

  return (
    <g>
      <path ref={ ref } fill="none" strokeWidth="4"/>
    </g>
  )
})

const InteractiveBar = React.memo(({ id, left, data, secondary, height, width, onMouseMove }) => {

  const _onMouseMove = React.useCallback(e => {
    onMouseMove(e, { x: id, data, secondary });
  }, [onMouseMove, id, data, secondary]);

  return (
    <rect fill="#00000000"
      x={ left } y={ 0 } width={ width } height={ height }
      onMouseMove={ _onMouseMove }/>
  )
})

export const generateTestLineData = (points = 50, lines = 5, secondary = false) => {
  const base = 5000;

  return d3range(lines).map(i => ({
    id: `line-${ i + (secondary ? lines : 0) }`,
    data: d3range(points).map(p => ({
      x: `p-${ p }`,
      y: Math.floor(Math.random() * (secondary ? base * 2.5 : base)) + 1
    }))
  }))
}
