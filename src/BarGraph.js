import React from "react"

import * as d3 from "d3"

import get from "lodash.get"

import {
  AxisBottom,
  AxisLeft,
  HoverCompContainer,
  useHoverComp
} from "./components"

import {
  getColorFunc,
  useSetSize,
  Identity,
  EmptyArray,
  EmptyObject,
  DefaultMargin
} from "./utils"

import "./avl-graph.css"

const InitialState = {
  xDomain: [],
  yDomain: [],
  xScale: null,
  yScale: null,
  adjustedWidth: 0,
  adjustedHeight: 0
}

const HoverComp = ({ data, keys, indexFormat, keyFormat, valueFormat }) => (
  <div className="flex flex-col px-2 py-1">
    <div className="font-bold text-lg leading-6 border-b-2 mb-1 pl-2">
      { indexFormat(get(data, "index", null)) }
    </div>
    { keys.slice().reverse().map(key => (
        <div key={ key } className={ `
          flex items-center px-2 border rounded transition
          ${ data.key === key ? "border-current" : "border-transparent" }
        `}>
          <div className="mr-2 rounded-sm color-square w-5 h-5"
            style={ {
              backgroundColor: data.key === key ? get(data, "color", null) : "transparent"
            } }/>
          <div className="mr-4">
            { keyFormat(key) }:
          </div>
          <div className="text-right flex-1">
            { valueFormat(data.data[key]) }
          </div>
        </div>
      ))
    }
    { keys.length <= 1 ? null :
      <div style={ { padding: "0px 1px 0px 0px" } }>
        <div className="flex pr-2">
          <div className="mr-4 pl-2">
            Total
          </div>
          <div className="flex-1 text-right">
            {  valueFormat(keys.reduce((a, c) => a + data.data[c], 0)) }
          </div>
        </div>
      </div>
    }
  </div>
)
const DefaultHoverCompData = {
  HoverComp,
  indexFormat: Identity,
  keyFormat: Identity,
  valueFormat: Identity,
  position: "side"
}

export const BarGraph = props => {

  const {
    data = EmptyArray,
    keys = EmptyArray,
    margin = EmptyObject,
    axisBottom = null,
    axisLeft = null,
    hoverComp = EmptyObject,
    indexBy = "index",
    paddingInner = 0,
    paddingOuter = 0,
    padding,
    colors
  } = props;

  const HoverCompData = React.useMemo(() => {
    return { ...DefaultHoverCompData, ...hoverComp };
  }, [hoverComp])

  const Margin = React.useMemo(() => {
    return { ...DefaultMargin, ...margin };
  }, [margin]);

  const ref = React.useRef(),
    [width, height] = useSetSize(ref),
    [state, setState] = React.useState(InitialState),

    barData = React.useRef(EmptyArray);

  React.useEffect(() => {
    if (!(width && height)) return;

    const adjustedWidth = Math.max(0, width - (Margin.left + Margin.right)),
      adjustedHeight = Math.max(0, height - (Margin.top + Margin.bottom));

    const [xDomain, yDomain] = (data).reduce((a, c) => {
      let [xd, yd] = a;
      if (!yd.length) {
        yd = [0, 0];
      }
      let [y1, y2] = yd;
      xd.push(c[indexBy]);
      y2 = Math.max(y2, keys.reduce((a, k) => a + c[k], 0));
      return [xd, [y1, y2]];
    }, [[], []]);

    const xScale = d3.scaleBand()
      .paddingInner(padding || paddingInner)
      .paddingOuter(padding || paddingOuter)
      .domain(xDomain)
      .range([0, adjustedWidth]);

    const bandwidth = xScale.bandwidth(),
      step = xScale.step(),
      outer = xScale.paddingOuter() * step;

    const yScale = d3.scaleLinear()
      .domain(yDomain)
      .range([0, adjustedHeight]);

    const colorFunc = getColorFunc(colors);

    const [updating, exiting] = barData.current.reduce((a, c) => {
      const [u, e] = a;
      u[c.id] = "updating";
      e[c.id] = c;
      c.state = "exiting";
      return [u, e];
    }, [{}, {}]);

    barData.current = data.map((d, i) => {
      let current = 0;

      delete exiting[d[indexBy]];

      const stacks = keys.map((key, ii) => {
        const value = get(d, key, 0),
          height = yScale(value),
          stack = {
            data: d,
            key,
            width: bandwidth,
            height,
            index: d[indexBy],
            y: Math.max(0, adjustedHeight - current - height),
            color: colorFunc(d, ii, key),
            value
          }
        current += height;
        return stack;
      });

      return {
        stacks,
        left: outer + i * step,
        data: d,
        state: get(updating, d[indexBy], "entering"),
        id: d[indexBy].toString()
      };
    }).concat(Object.values(exiting));

    setState({
      xDomain, yDomain, xScale, yScale,
      adjustedWidth, adjustedHeight
    });
  }, [data, keys, width, height,
      Margin, barData, colors, indexBy,
      padding, paddingInner, paddingOuter]);

  const {
    onMouseMove,
    onMouseLeave,
    hoverData
  } = useHoverComp(ref);

  const {
    xDomain, xScale, yDomain, yScale,
    ...stateRest
  } = state;

  const {
    HoverComp,
    position,
    ...hoverCompRest
  } = HoverCompData;

  return (
    <div className="w-full h-full relative" ref={ ref }>

      <svg className="w-full h-full block avl-graph">
        <g style={ { transform: `translate(${ Margin.left }px, ${ Margin.top }px)` } }
          onMouseLeave={ onMouseLeave }>
          { barData.current.map(({ id, ...stateRest }) =>
              <Bar key={ id } { ...stateRest }
                svgHeight={ state.adjustedHeight }
                onMouseMove={ onMouseMove }/>
            )
          }
        </g>
        { !barData.current.length ? null :
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
          <HoverComp data={ hoverData.data } keys={ keys }
            { ...hoverCompRest }/>
        }
      </HoverCompContainer>

    </div>
  )
}

const Stack = props => {

  const {
    state,
    width,
    svgHeight,
    height,
    y,
    color,
    onMouseMove,
    Key, index, value, data
  } = props;

  const ref = React.useRef();

  React.useEffect(() => {
    if (state === "entering") {
      d3.select(ref.current)
        .attr("width", width)
        .attr("height", 0)
        .attr("y", svgHeight)
        .transition().duration(1000)
        .attr("height", height)
        .attr("y", y)
        .attr("fill", color);
    }
    else if (state === "exiting") {
      d3.select(ref.current)
        .transition().duration(1000)
        .attr("height", 0)
        .attr("y", svgHeight);
    }
    else {
      d3.select(ref.current)
        .transition().duration(1000)
        .attr("height", height)
        .attr("y", y)
        .attr("width", width)
        .attr("fill", color);
    }
  }, [ref, state, width, svgHeight, height, y, color]);

  const _onMouseMove = React.useCallback(e => {
    onMouseMove(e, { color, key: Key, index, value, data });
  }, [onMouseMove, color, Key, index, value, data]);

  return (
    <rect className="avl-stack" ref={ ref }
      onMouseMove={ _onMouseMove }/>
  )
}

const Bar = ({ stacks, left, state, ...props }) => {

  const ref = React.useRef();

  React.useEffect(() => {
    if (state === "entering") {
      d3.select(ref.current)
        .attr("transform", `translate(${ left } 0)`);
    }
    else {
      d3.select(ref.current)
        .transition().duration(1000)
        .attr("transform", `translate(${ left } 0)`);
    }
  }, [ref, state, left]);

  return (
    <g className="avl-bar" ref={ ref }>
      { stacks.map(({ key, ...rest }, i) =>
          <Stack key={ key } Key={ key } state={ state }
            { ...props } { ...rest }/>
        )
      }
    </g>
  )
}

export const generateTestBarData = (bars = 50, stacks = 5) => {
  const data = [], keys = [];

  const magnitude = (Math.random() * 500 + 250) / stacks,
    shift = magnitude * .25;

  d3.range(stacks).forEach(s => {
    keys.push(`stack-${ s }`);
  });

  d3.range(bars).forEach(b => {
    const bar = {
      index: `bar-${ b }`
    }
    keys.forEach(k => {
      bar[k] = magnitude + (Math.random() * shift) - shift * 2;
    })
    data.push(bar);
  });

  return { data, keys };
}
