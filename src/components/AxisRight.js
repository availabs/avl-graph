import React from "react"

import { select as d3select } from "d3-selection"
import { transition as d3transition } from "d3-transition"
import { axisRight as d3AxisRight } from "d3-axis"
// import { scaleLinear } from "d3-scale"

export const AxisRight = props => {
  const {
    adjustedWidth, adjustedHeight, showGridLines = true,
    domain, scale, format, type = "linear",
    secondary, label, margin, ticks = 10
  } = props;

  const ref = React.useRef();

  React.useEffect(() => {
    if (ref.current) {
      renderAxisRight(ref.current,
        adjustedWidth, adjustedHeight,
        domain, scale, type, format,
        secondary, label, margin, ticks, showGridLines
      );
    }
  }, [adjustedWidth, adjustedHeight, showGridLines,
      domain, scale, type, format,
      secondary, label, margin, ticks]
  );

  return <g ref={ ref }/>;
}

const renderAxisRight = (ref,
                    adjustedWidth,
                    adjustedHeight,
                    domain, scale, type, format,
                    secondary, label,
                    margin, ticks, showGridLines) => {

  const { left, right, top } = margin;

  // const Scale = scaleLinear()
  //   .domain(domain)
  //   .range(scale.range().slice().reverse());
  //
  // const axisRight = d3AxisRight(Scale)
  //   .tickFormat(format)
  //   .ticks(ticks);

  const axisRight = d3AxisRight(scale)
    .tickFormat(format)
    .ticks(ticks);

  const transition = d3transition().duration(1000);

  const animatedGroup = d3select(ref)
    .selectAll("g.animated-group")
    .data(["animated-group"])
    .join(
      enter => enter.append("g")
        .attr("class", "animated-group")
        .call(enter =>
          enter.style("transform", `translate(${ adjustedWidth + left }px, ${ top }px)`)
        ),
      update => update
        .call(
          update => update.transition(transition)
            .style("transform", `translate(${ adjustedWidth + left }px, ${ top }px)`)
        ),
      exit => exit
        .call(exit =>
          exit.transition(transition)
            .style("transform", `translate(${ adjustedWidth + left }px, ${ top }px)`)
          .remove()
        )
    );

  const group = animatedGroup.selectAll("g.axis-group")
    .data(domain.length ? ["axis-group"] : [])
      .join(
        enter => enter.append("g")
          .attr("class", "axis-group")
          .call(enter =>
            enter
              .style("transform", `translateY(${ adjustedHeight }px) scale(0, 0)`)
              .transition(transition)
                .style("transform", "translateY(0px) scale(1, 1)")
          ),
        update => update
          .call(update =>
            update.transition(transition)
              .style("transform", "translateY(0px) scale(1, 1)")
          ),
        exit => exit
          .call(exit =>
            exit.transition(transition)
              .style("transform", `translateY(${ adjustedHeight }px) scale(0, 0)`)
            .remove()
          )
      );

  group.selectAll("g.axis")
    .data(domain.length ? ["axis-right"] : [])
    .join("g")
      .attr("class", "axis axis-right")
        .transition(transition)
        .call(axisRight);

  group.selectAll("g.axis.axis-right .domain")
    .attr("stroke-dasharray", secondary ? "8 4" : null);

  group.selectAll("text.axis-label")
    .data(domain.length && Boolean(label) ? [label] : [])
    .join("text")
      .attr("class", "axis-label axis-label-right")
      .style("transform",
        `translate(${ right - 20 }px, ${ adjustedHeight * 0.5 }px) rotate(90deg)`
      )
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", "1rem")
      .text(d => d);

  if (type !== "linear" || !showGridLines) return;

  const gridLines = group.selectAll("line.grid-line"),
    numGridLines = gridLines.size(),
    numTicks = scale.ticks().length,

    gridEnter = numGridLines && (numGridLines < numTicks) ?
      scale(domain[1] * 1.5) : scale(0),

    gridExit = scale(domain[1] * 1.5);

  gridLines
    .data(domain.length ? scale.ticks() : [])
    .join(
      enter => enter.append("line")
        .attr("class", "grid-line")
        .attr("stroke-dasharray", secondary ? "8 4" : null)
        .attr("x1", 0)
        .attr("x2", -adjustedWidth)
        .attr("y1", gridEnter)
        .attr("y2", gridEnter)
        .attr("stroke", "currentColor")
        // .attr("stroke-opacity", 0.5)
          .call(enter => enter
            .transition(transition)
              .attr("y1", d => scale(d) + 0.5)
              .attr("y2", d => scale(d) + 0.5)
          ),
      update => update
        .call(update => update
          .attr("stroke", "currentColor")
          // .attr("stroke-opacity", 0.5)
          .transition(transition)
            .attr("x2", -adjustedWidth)
            .attr("y1", d => scale(d) + 0.5)
            .attr("y2", d => scale(d) + 0.5)
        ),
      exit => exit
        .call(exit => exit
          .transition(transition)
            .attr("y1", gridExit)
            .attr("y2", gridExit)
          .remove()
        )
    );
}
