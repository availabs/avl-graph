import React from "react"

import { scaleBand, scaleLinear } from "d3-scale"
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

const HoverComp = ({ data, keys, indexFormat, keyFormat, valueFormat }) => {
  const theme = useTheme();
  return (
    <div className={ `
        flex flex-col px-2 py-1 rounded
        ${ theme.accent1 }
      ` }>
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
                backgroundColor: get(data, ["barValues", key, "color"], null),
                opacity: data.key === key ? 1 : 0.2
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
        <div style={ { paddingRight: "1px" } }>
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
}
const DefaultHoverCompData = {
  HoverComp,
  indexFormat: Identity,
  keyFormat: Identity,
  valueFormat: Identity,
  position: "side"
}

const InitialState = {
  xDomain: [],
  yDomain: [],
  xScale: null,
  yScale: null,
  adjustedWidth: 0,
  adjustedHeight: 0
}

export const BarGraph = props => {

  const {
    data = EmptyArray,
    keys = EmptyArray,
    margin = EmptyObject,
    hoverComp = EmptyObject,
    axisBottom = null,
    axisLeft = null,
    indexBy = "index",
    className = "",
    theme = EmptyObject,
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

    barData = React.useRef(EmptyArray),
    exitingData = React.useRef(EmptyArray);

  const exitData = React.useCallback(() => {
    barData.current = barData.current.filter(({ id }) => {
      return !(id in exitingData.current);
    });
    setState(prev => ({ ...prev }));
  }, []);

  React.useEffect(() => {
    if (!(width && height)) return;

    const adjustedWidth = Math.max(0, width - (Margin.left + Margin.right)),
      adjustedHeight = Math.max(0, height - (Margin.top + Margin.bottom));

    const xDomain = data.map(d => d[indexBy]);

    let yDomain = [];
    if (xDomain.length) {
      if (groupMode === "stacked") {
        yDomain = data.reduce((a, c) => {
          const y = keys.reduce((a, k) => a + c[k], 0);
          if (y) {
            return [0, Math.max(y, get(a, 1, 0))];
          }
          return a;
        }, []);
      }
      else if (groupMode === "grouped") {
        yDomain = data.reduce((a, c) => {
          const y = keys.reduce((a, k) => Math.max(a, c[k]), 0);
          if (y) {
            return [0, Math.max(y, get(a, 1, 0))];
          }
          return a;
        }, []);
      }
    }

    // const [xDomain, yDomain] = data.reduce((a, c) => {
    //   let [xd, yd] = a;
    //   xd.push(c[indexBy]);
    //   const y = keys.reduce((a, k) => a + c[k], 0);
    //   if (yd.length) {
    //     const [y1, y2] = yd;
    //     return [xd, [y1, Math.max(y, y2)]];
    //   }
    //   if (y) {
    //     return [xd, [0, y]];
    //   }
    //   return [xd, yd];
    // }, [[], []]);

    const xScale = scaleBand()
      .paddingInner(padding || paddingInner)
      .paddingOuter(padding || paddingOuter)
      .domain(xDomain)
      .range([0, adjustedWidth]);

    const bandwidth = xScale.bandwidth(),
      step = xScale.step(),
      outer = xScale.paddingOuter() * step;

    const yScale = scaleLinear()
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

      delete exiting[d[indexBy]];

      const barValues = {};

      if (groupMode === "stacked") {
        let current = 0;

        const stacks = keys.map((key, ii) => {
          const value = get(d, key, 0),
            height = yScale(value) || 0,
            color = colorFunc(d, ii, key);

          barValues[key] = { value, color };

          const stack = {
              data: d,
              key,
              width: bandwidth,
              height,
              index: d[indexBy],
              y: Math.max(0, adjustedHeight - current - height),
              x: 0,
              color,
              value,
              barValues
            };
          current += height;
          return stack;
        });

        return {
          stacks,
          barValues,
          left: outer + i * step,
          data: d,
          state: get(updating, d[indexBy], "entering"),
          id: d[indexBy].toString()
        };
      }
      else if (groupMode === "grouped") {
        const stacks = keys.slice().reverse()
          .map((key, ii) => {
            const value = get(d, key, 0),
              height = yScale(value) || 0,
              color = colorFunc(d, ii, key);

            barValues[key] = { value, color };

            const stack = {
                data: d,
                key,
                width: bandwidth / keys.length,
                height,
                index: d[indexBy],
                y: Math.max(0, adjustedHeight - height),
                x: (bandwidth / keys.length) * ii,
                color,
                value,
                barValues
              };
            return stack;
          });

        return {
          stacks,
          barValues,
          left: outer + i * step,
          data: d,
          state: get(updating, d[indexBy], "entering"),
          id: d[indexBy].toString()
        };
      }
      return { stacks: [] }
    });

    exitingData.current = exiting;
    const exitingAsArray = Object.values(exiting);

    if (exitingAsArray.length) {
      setTimeout(exitData, 1050);
    }

    barData.current = barData.current.concat(exitingAsArray);

    setState({
      xDomain, yDomain, xScale, yScale,
      adjustedWidth, adjustedHeight
    });
  }, [data, keys, width, height, groupMode,
      Margin, barData, colors, indexBy, exitData,
      padding, paddingInner, paddingOuter]
  );

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
    <div className="w-full h-full relative avl-graph-container" ref={ ref }>

      <svg className={ `w-full h-full block avl-graph ${ className }` }>
        <g style={ { transform: `translate(${ Margin.left }px, ${ Margin.top }px)` } }
          onMouseLeave={ onMouseLeave }>
          { barData.current.map(({ id, ...rest }) =>
              <Bar key={ id } { ...rest }
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
          <HoverComp data={ hoverData.data } keys={ keys } theme={ theme }
            { ...hoverCompRest }/>
        }
      </HoverCompContainer>

    </div>
  )
}

const Stack = React.memo(props => {

  const {
    state,
    width,
    svgHeight,
    height,
    y,
    x,
    color,
    onMouseMove,
    Key, index, value, data, barValues
  } = props;

  const ref = React.useRef();

  React.useEffect(() => {

    if (state === "entering") {
      d3select(ref.current)
        .attr("width", width)
        .attr("height", 0)
        .attr("x", x)
        .attr("y", svgHeight)
        .transition().duration(1000)
        .attr("height", height)
        .attr("x", x)
        .attr("y", y)
        .attr("fill", color);
    }
    else if (state === "exiting") {
      d3select(ref.current)
        .transition().duration(1000)
        .attr("height", 0)
        .attr("y", svgHeight);
    }
    else {
      d3select(ref.current)
        .transition().duration(1000)
        .attr("height", height)
        .attr("x", x)
        .attr("y", y)
        .attr("width", width)
        .attr("fill", color);
    }
  }, [ref, state, width, svgHeight, height, x, y, color]);

  const _onMouseMove = React.useCallback(e => {
    onMouseMove(e, { color, key: Key, index, value, data, barValues });
  }, [onMouseMove, color, Key, index, value, data, barValues]);

  return (
    <rect className="avl-stack" ref={ ref }
      onMouseMove={ _onMouseMove }/>
  )
})

const Bar = React.memo(({ stacks, left, state, ...props }) => {

  const ref = React.useRef();

  React.useEffect(() => {
    if (state === "entering") {
      d3select(ref.current)
        .attr("transform", `translate(${ left } 0)`);
    }
    else {
      d3select(ref.current)
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
})

export const generateTestBarData = (bars = 50, stacks = 5) => {
  const data = [], keys = [];

  d3range(stacks).forEach(s => {
    keys.push(`stack-${ s }`);
  });

  d3range(bars).forEach(b => {
    const bar = {
      index: `bar-${ b }`
    }
    keys.forEach(k => {
      const rand = Math.random() * 250 + 50;
      bar[k] = rand + (Math.random() * rand);
    })
    data.push(bar);
  });

  return { data, keys };
}
