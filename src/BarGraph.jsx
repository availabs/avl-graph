import React from "react"

import { scaleBand, scaleLinear } from "d3-scale"
import { select as d3select } from "d3-selection"
import { range as d3range } from "d3-array"
import { format as d3format } from "d3-format"

import isEqual from "lodash/isEqual"
import get from "lodash/get"

import { theme, useSetSize } from "./utils"

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
  DefaultMargin,
  DefaultXScale,
  DefaultYScale,
  strictNaN,
  useShouldComponentUpdate,
  getScale
} from "./utils"

import "./avl-graph.css"

const DefaultHoverComp = ({ data, keys, indexFormat, keyFormat, valueFormat, showTotals = true }) => {
  return (
    <div className={ `
      flex flex-col px-2 pt-1 rounded
      ${ keys.length <= 1 ? "pb-2" : "pb-1" }
      ${ theme.accent1 }
    ` }>
      <div className="font-bold text-lg leading-6 border-b-2 mb-1 pl-2">
        { indexFormat(get(data, "index", null)) }
      </div>
      { keys.slice().reverse()
        .filter(key => get(data, ["data", key], false))
        .map(key => (
          <div key={ key } className={ `
            flex items-center px-2 border-2 rounded transition
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
  position: "side",
  showTotals: true
}

const InitialState = {
  xDomain: [],
  yDomain: [],
  XScale: scaleBand(),
  YScale: scaleLinear(),
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
    xScale = EmptyObject,
    axisLeft = null,
    axisRight = null,
    yScale = EmptyObject,
    indexBy = "index",
    className = "",
    paddingInner = 0,
    paddingOuter = 0,
    padding,
    colors,
    groupMode = "stacked",
    orientation = "vertical",
    showAnimations = true,
    addons = []
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

  const ShouldComponentUpdate = useShouldComponentUpdate(props, width, height);

  const hori = orientation === "horizontal";

  React.useEffect(() => {
    if ((width && height) || ShouldComponentUpdate) {

      const adjustedWidth = Math.max(0, width - (Margin.left + Margin.right)),
        adjustedHeight = Math.max(0, height - (Margin.top + Margin.bottom));

      const xdGetter = data => data.map(d => get(d, indexBy, null));
      const XScale = getScale({ ...DefaultXScale, ...xScale, type: "band",
                                getter: xdGetter, data,
                                range: hori ? [adjustedHeight, 0] : [0, adjustedWidth],
                                padding, paddingInner, paddingOuter
                              });
      const xDomain = XScale.domain();

      const bandwidth = XScale.bandwidth(),
        step = XScale.step(),
        outer = XScale.paddingOuter() * step;

      const ydGetter = data => {
        if (xDomain.length) {
          if (groupMode === "stacked") {
            return data.reduce((a, c) => {
              const y = keys.reduce((a, k) => a + get(c, k, 0), 0);
              if (!strictNaN(y)) {
                return [0, Math.max(y, get(a, 1, 0))];
              }
              return a;
            }, []);
          }
          else if (groupMode === "grouped") {
            return data.reduce((a, c) => {
              const y = keys.reduce((a, k) => Math.max(a, get(c, k, 0)), 0);
              if (!strictNaN(y)) {
                return [0, Math.max(y, get(a, 1, 0))];
              }
              return a;
            }, []);
          }
        }
        else {
          return [0, 0];
        }
      }

      const YScale = getScale({ ...DefaultYScale, ...yScale,
                                getter: ydGetter, data,
                                range: hori ? [0, adjustedWidth] : [adjustedHeight, 0]
                              });
      const yDomain = YScale.domain();

      const zeroYdomain = (yDomain[0] === 0) && (yDomain[1] === 0);
      if (zeroYdomain) {
        YScale.range([adjustedHeight, adjustedHeight]);
      }

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
          let current = hori ? 0 : adjustedHeight;

          const stacks = keys.map((key, ii) => {
            const value = get(d, key, 0),
              width = hori ? YScale(value) : bandwidth,
              height = hori ? bandwidth : Math.max(0, adjustedHeight - YScale(value)),
              color = colorFunc(value, ii, d, key);

            if (!hori) {
              current -= height;
            }

            barValues[key] = { value, color };

            const stack = {
              data: d,
              key,
              width,
              height,
              index: d[indexBy],
              y: hori ? 0 : current,
              x: hori ? current : 0,
              color,
              value,
              barValues
            }

            if (hori) {
              current += width;
            }
            return stack;
          });

          return {
            stacks,
            barValues,
            left: hori ? 0 : XScale(d[indexBy]),
            top: hori ? XScale(d[indexBy]) : 0,
            data: d,
            state: get(updating, d[indexBy], "entering"),
            id: d?.[indexBy]?.toString() || '0'
          };
        }
        else if (groupMode === "grouped") {
          const stacks = keys.map((key, ii) => {
              const value = get(d, key, 0),
                y = hori ? (bandwidth / keys.length) * ii : Math.min(adjustedHeight, YScale(value)),
                color = colorFunc(d, ii, key);

              barValues[key] = { value, color };

              const stack = {
                  data: d,
                  key,
                  width: hori ? YScale(value) : bandwidth / keys.length,
                  height: hori ? bandwidth / keys.length : adjustedHeight - y,
                  index: d[indexBy],
                  y,
                  x: hori ? 0 : (bandwidth / keys.length) * ii,
                  color,
                  value,
                  barValues
                };
              return stack;
            });

          return {
            stacks,
            barValues,
            left: hori ? 0 : outer + i * step,
            top: hori ? adjustedHeight - (outer + (i + 1) * step) : 0,
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
        xDomain, yDomain, XScale, YScale,
        adjustedWidth, adjustedHeight
      });
    }
  }, [data, keys, width, height, groupMode,
      Margin, colors, indexBy, exitData,
      padding, paddingInner, paddingOuter,
      ShouldComponentUpdate, orientation
    ]
  );

  const {
    onMouseMove,
    onMouseLeave,
    hoverData
  } = useHoverComp(ref);

  const {
    xDomain, XScale, yDomain, YScale,
    ...restOfState
  } = state;

  const {
    HoverComp,
    position,
    ...hoverCompRest
  } = HoverCompData;

  return (
    <div className="w-full h-full avl-graph-container relative" ref={ ref }>

      <svg className={ `w-full h-full block avl-graph ${ className }` }>
        { !barData.current.length ? null :
          orientation === "horizontal" ?
            <g>
              { !axisBottom ? null :
                <AxisBottom type="linear"
                  { ...restOfState }
                  margin={ Margin }
                  scale={ YScale }
                  domain={ yDomain }
                  showAnimations={ showAnimations }
                  { ...axisBottom }/>
              }
              { !axisLeft ? null :
                <AxisLeft type="band"
                  { ...restOfState }
                  margin={ Margin }
                  scale={ XScale }
                  domain={ xDomain }
                  showAnimations={ showAnimations }
                  { ...axisLeft }/>
              }
              { !axisRight ? null :
                <AxisRight type="band"
                  { ...restOfState }
                  margin={ Margin }
                  scale={ XScale }
                  domain={ xDomain }
                  showAnimations={ showAnimations }
                  { ...axisRight }/>
              }
            </g> :
            <g>
              { !axisBottom ? null :
                <AxisBottom type="band"
                  { ...restOfState }
                  margin={ Margin }
                  scale={ XScale }
                  domain={ xDomain }
                  showAnimations={ showAnimations }
                  { ...axisBottom }/>
              }
              { !axisLeft ? null :
                <AxisLeft type="linear"
                  { ...restOfState }
                  margin={ Margin }
                  scale={ YScale }
                  domain={ yDomain }
                  showAnimations={ showAnimations }
                  { ...axisLeft }/>
              }
              { !axisRight ? null :
                <AxisRight type="linear"
                  { ...restOfState }
                  margin={ Margin }
                  scale={ YScale }
                  domain={ yDomain }
                  showAnimations={ showAnimations }
                  { ...axisRight }/>
              }
            </g>
        }
        <g style={ { transform: `translate(${ Margin.left }px, ${ Margin.top }px)` } }
          onMouseLeave={ onMouseLeave }
        >
          { barData.current.map(({ id, ...rest }) =>
              <Bar key={ id } { ...rest }
                svgHeight={ state.adjustedHeight }
                onMouseMove={ onMouseMove }
                showAnimations={ showAnimations }/>
            )
          }
          { !barData.current.length ? null :
            addons.map((AddOn, i) => (
              <AddOn key={ i } { ...state }
                xScale={ XScale }
                yScale={ YScale }
                showAnimations={ showAnimations }/>
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
    Key, index, value, data, barValues,
    showAnimations
  } = props;

  const ref = React.useRef();

  React.useEffect(() => {
    if (state === "entering") {
      const selection = d3select(ref.current)
        .attr("width", width)
        .attr("height", 0)
        .attr("x", x)
        .attr("y", svgHeight);
      if (showAnimations) {
        selection.transition().duration(1000)
          .attr("height", height)
          .attr("y", y)
          .attr("fill", color);
      }
      else {
        selection
          .attr("height", height)
          .attr("y", y)
          .attr("fill", color);
      }
    }
    else if (state === "exiting") {
      const selection = d3select(ref.current)
      if (showAnimations) {
        selection.transition().duration(1000)
          .attr("height", 0)
          .attr("y", svgHeight);
      }
      else {
        selection
          .attr("height", 0)
          .attr("y", svgHeight);
      }
    }
    else {
      const selection = d3select(ref.current)
      if (showAnimations) {
        selection.transition().duration(1000)
          .attr("height", height)
          .attr("x", x)
          .attr("y", y)
          .attr("width", width)
          .attr("fill", color);
      }
      else {
        selection
          .attr("height", height)
          .attr("x", x)
          .attr("y", y)
          .attr("width", width)
          .attr("fill", color);
      }
    }
  }, [ref, state, width, svgHeight, height, x, y, color, showAnimations]);

  const _onMouseMove = React.useCallback(e => {
    onMouseMove(e, { color, key: Key, index, value, data, barValues });
  }, [onMouseMove, color, Key, index, value, data, barValues]);

  return (
    <rect className="avl-stack" ref={ ref }
      onMouseMove={ _onMouseMove }/>
  )
})

const Bar = React.memo(({ stacks, left = 0, top = 0, state, showAnimations, ...props }) => {

  const ref = React.useRef();

  React.useEffect(() => {
    if (state === "entering") {
      d3select(ref.current)
        .attr("transform", `translate(${ left } ${ top })`);
    }
    else {
      const selection = d3select(ref.current);
      if (showAnimations) {
        selection.transition().duration(1000)
          .attr("transform", `translate(${ left } ${ top })`);
      }
      else {
        selection.attr("transform", `translate(${ left } ${ top })`);
      }
    }
  }, [ref, state, left, top, showAnimations]);

  return (
    <g className="avl-bar" ref={ ref }>
      { stacks.map(({ key, ...rest }, i) =>
          <Stack key={ key } Key={ key } state={ state }
            { ...props } { ...rest } showAnimations={ showAnimations }/>
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
