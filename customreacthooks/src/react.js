import { ELEMENT_TEXT } from './constants';
import { useReducer } from './scheduler';

function createElement(type, config, ...children) {
  delete config.__self;
  delete config.__source;
  return {
    type, // 'div' ''
    props: {
      ...config, // ref key
      children: children.map((child) => {
        return typeof child === 'object'
          ? child
          : {
              type: ELEMENT_TEXT,
              props: { text: child, children: [] },
            };
      }),
    },
  };
}
const React = {
  createElement,
  useReducer,
};

export default React;
