import React from "react"

import throttle from "lodash.throttle"

import { useSetSize } from "../utils"

const getTranslate = ({ pos, svgWidth, svgHeight, margin, position }) => {
  const gap = 20;

  switch (position) {
    case "above": {
      const [x, y] = pos,
        maxX = svgWidth - margin.right;
      return `translate(
        max(
          min(calc(${ x }px - 50%), calc(${ maxX - gap }px - 100%)),
          calc(${ margin.left + gap }px)
        ),
        calc(-100% - ${ gap - y }px)
      )`;
    }
    default: {
      const [x, y] = pos,
        maxX = svgHeight - margin.bottom,
        yTrans = `max(
          ${ margin.top + gap }px,
          min(${ y - gap }px, ${ maxX - gap }px - 100%)
        )`;
      if (x < margin.left + (svgWidth - margin.left - margin.right) * 0.5) {
        return `translate(
          ${ x + gap }px,
          ${ yTrans }
        )`
      }
      return `translate(
        calc(-100% + ${ x - gap }px),
        ${ yTrans }
      )`
    }
  }

}

export const HoverCompContainer = ({ show, children, ...rest }) => (
  <div className={ `
      absolute top-0 left-0 z-50 pointer-events-none
      rounded whitespace-nowrap hover-comp
    ` }
    style={ {
      display: show ? "inline-block" : "none",
      transform: getTranslate(rest),
      boxShadow: "2px 2px 8px 0px rgba(0, 0, 0, 0.75)",
      transition: "transform 0.15s ease-out"
    } }>
    { children }
  </div>
)

const UPDATE_DATA = "update-data",
  SET_SHOW = "set-show";

const Reducer = (state, action) => {
  const { type, ...payload } = action;
  switch (type) {
    case UPDATE_DATA:
    case SET_SHOW:
      return {
        ...state,
        ...payload
      };
    default:
      return state;
  }
}
const InitialState = {
  show: false,
  pos: [0, 0],
  data: null
}

export const useHoverComp = ref => {
  const [hoverData, dispatch] = React.useReducer(Reducer, InitialState),
    updateHoverData = React.useCallback(throttle(dispatch, 25), [dispatch]);

  const onMouseMove = React.useCallback((e, data) => {
    const rect = ref.current.getBoundingClientRect();
    updateHoverData({
      type: UPDATE_DATA,
      show: true,
      pos: [e.clientX - rect.x, e.clientY - rect.y],
      data
    });
  }, [ref, updateHoverData]);

  const onMouseLeave = React.useCallback(e => {
    updateHoverData({ type: SET_SHOW, show: false });
  }, [updateHoverData]);

  return {
    hoverData,
    onMouseMove,
    onMouseLeave
  }
}
