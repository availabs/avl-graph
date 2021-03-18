import React from "react"

import * as d3 from "d3"

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
                      backgroundColor: `${ color }${ isMax ? "ff" : "33" }`,
                      borderColor: color
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
  xScale: null,
  yScale: null,
  adjustedWidth: 0,
  adjustedHeight: 0,
  sliceData: {},
  lineTotals: {},
  barData: []
}

export const LineGraph = props => {

  const {
    data = EmptyArray,
    // keys = EmptyArray,
    margin = EmptyObject,
    axisBottom = null,
    axisLeft = null,
    hoverComp = EmptyObject,
    // indexBy = "x",
    className = "",
    theme = EmptyObject,
    padding = 0.5,
    colors
  } = props;

  const HoverCompData = React.useMemo(() => {
    return { ...DefaultHoverCompData, ...hoverComp };
  }, [hoverComp])

  const Margin = React.useMemo(() => {
    return { ...DefaultMargin, ...margin };
  }, [margin]);

  const ref = React.useRef(),
    { width, height } = useSetSize(ref),
    [state, setState] = React.useState(InitialState),

    lineData = React.useRef(EmptyArray);

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

    const xScale = d3.scalePoint()
      .padding(padding)
      .domain(xDomain)
      .range([0, adjustedWidth]);

    const yScale = d3.scaleLinear()
      .domain(yDomain)
      .range([0, adjustedHeight]);

		const lineGenerator = d3.line()
      .curve(d3.curveCatmullRom)
			.x(d => xScale(d.x))
			.y(d => adjustedHeight - yScale(d.y));

		const yEnter = yScale(yDomain[0]),
      baseLineGenerator = d3.line()
        .curve(d3.curveCatmullRom)
  			.x(d => xScale(d))
  			.y(d => adjustedHeight - yEnter);

    const colorFunc = getColorFunc(colors);

    const [updating, exiting] = lineData.current.reduce((a, c) => {
      const [u, e] = a;
      u[c.id] = "updating";
      e[c.id] = c;
      c.state = "exiting";
      return [u, e];
    }, [{}, {}]);

    const sliceData = xDomain.reduce((a, c) => {
      a[c] = [];
      return a;
    }, {});

    const lineTotals = {};

    lineData.current = data.map((d, i) => {

      const { data, ...rest } = d;
      delete exiting[d.id];

      const color = colorFunc(d, i);

      lineTotals[d.id] = 0;

      data.forEach(({ x, y }) => {
        lineTotals[d.id] += y;
        sliceData[x].push({
          ...rest,
          color,
          y
        });
      })

      return {
        line: lineGenerator(data),
        baseLine: baseLineGenerator(xDomain),
        color,
        state: get(updating, d.id, "entering"),
        id: d.id.toString()
      };
    }).concat(Object.values(exiting));

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

    const step = xScale.step(),
      offset = xScale.padding() * step - step * 0.5;

    const barData = xDomain.map((x, i) => ({
      left: offset + i * step,
      data: sliceData[x],
      height: adjustedHeight,
      width: step,
      id: x
    }));

    setState({
      xDomain, yDomain, xScale, yScale, barData,
      adjustedWidth, adjustedHeight, sliceData, lineTotals
    });
  }, [data, width, height, Margin, lineData, colors, padding]);

  const {
    onMouseMove,
    onMouseLeave,
    hoverData
  } = useHoverComp(ref);

  const {
    xDomain, xScale, yDomain, yScale, lineTotals, barData,
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
                scale={ state.xScale }
                domain={ state.xDomain }
                { ...axisBottom }/>
            }
            { !axisLeft ? null :
              <AxisLeft { ...stateRest }
                margin={ Margin }
                scale={ state.yScale }
                domain={ state.yDomain }
                { ...axisLeft }/>
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

const Line = React.memo(({ line, baseLine, state, color }) => {

  const ref = React.useRef();

  React.useEffect(() => {
    if (state === "entering") {
      d3.select(ref.current)
        .attr("d", baseLine)
        .attr("stroke", color)
        .transition().duration(1000)
        .attr("d", line);
    }
    else if (state === "exiting") {
      d3.select(ref.current)
        .transition().duration(1000)
        .attr("d", baseLine);
    }
    else {
      d3.select(ref.current)
        .transition().duration(1000)
        .attr("stroke", color)
        .attr("d", line);
    }
  }, [ref, state, line, baseLine, color]);

  return (
    <g>
      <path ref={ ref } fill="none" strokeWidth="4"/>
    </g>
  )
})

const InteractiveBar = React.memo(({ id, left, data, height, width, onMouseMove }) => {

  const _onMouseMove = React.useCallback(e => {
    onMouseMove(e, { x: id, data });
  }, [onMouseMove, id, data]);

  return (
    <rect fill="#00000000"
      x={ left } y={ 0 } width={ width } height={ height }
      onMouseMove={ _onMouseMove }/>
  )
})
