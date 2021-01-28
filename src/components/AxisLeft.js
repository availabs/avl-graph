import React from "react"

import * as d3 from "d3"

export const AxisLeft = props => {
  const {
    adjustedWidth, adjustedHeight,
    domain, scale, format,
    secondary, label, margin
  } = props;

  const ref = React.useRef();

  React.useEffect(() => {
    if (ref.current) {
      renderAxisLeft(ref.current,
        adjustedWidth, adjustedHeight,
        domain, scale, format,
        secondary, label, margin
      );
    }
  }, [adjustedWidth, adjustedHeight,
      domain, scale, format,
      secondary, label, margin]
  );

  return <g ref={ ref }/>;
}

const renderAxisLeft = (ref,
                    adjustedWidth,
                    adjustedHeight,
                    domain, scale, format,
                    secondary, label,
                    margin) => {

  const { left, top } = margin;

  const Scale = d3.scaleLinear()
    .domain(domain)
    .range(scale.range().slice().reverse());

  const axisLeft = d3.axisLeft(Scale)
    .tickFormat(format);

  const transition = d3.transition().duration(1000);

  const reactGroup = d3.select(ref)
    .style("transform", `translate(${ left }px, ${ top }px)`);

  const group = reactGroup.selectAll("g.axis-group")
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
        update => update,
        exit => exit
          .call(exit =>
            exit.transition(transition)
              .style("transform", `translateY(${ adjustedHeight }px) scale(0, 0)`)
            .remove()
          )
      );

  group.selectAll("g.axis")
    .data(domain.length ? ["axis-left"] : [])
    .join("g")
      .attr("class", "axis axis-left")
        .classed("secondary", secondary)
        .transition(transition)
        .call(axisLeft);

  group.selectAll("text.axis-label")
    .data(domain.length && Boolean(label) ? [label] : [])
    .join("text")
      .attr("class", "axis-label axis-label-left")
      .style("transform",
        `translate(${ -left + 20 }px, ${ adjustedHeight * 0.5 }px) rotate(-90deg)`
      )
      .attr("text-anchor", "middle")
      .attr("fill", "#000")
      .attr("font-size", "1rem")
      .text(d => d);

  const gridLines = group.selectAll("line.grid-line"),
    numGridLines = gridLines.size(),
    numTicks = Scale.ticks().length,

    from = numGridLines && (numGridLines < numTicks) ?
      Scale(domain[1] * 1.5) : Scale(0);

  gridLines
    .data(domain.length ? Scale.ticks() : [])
    .join(
      enter => enter.append("line")
        .attr("class", "grid-line")
        .attr("x1", 0)
        .attr("x2", adjustedWidth)
        .attr("y1", from)
        .attr("y2", from)
        .attr("stroke", "#000")
        .attr("stroke-opacity", 0.25)
          .call(enter => enter
            .transition(transition)
              .attr("y1", d => Scale(d) + 0.5)
              .attr("y2", d => Scale(d) + 0.5)
          ),
      update => update
        .call(update => update
          .transition(transition)
            .attr("y1", d => Scale(d) + 0.5)
            .attr("y2", d => Scale(d) + 0.5)
        ),
      exit => exit
        .call(exit => exit
          .transition(transition)
            .attr("y1", Scale(domain[1] * 1.5))
            .attr("y2", Scale(domain[1] * 1.5))
          .remove()
        )
    );
}
