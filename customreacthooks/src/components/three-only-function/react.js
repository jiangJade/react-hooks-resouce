import { ELEMENT_TEXT } from './constants';
import { useReducer } from './scheduler';

function createElement(type, config, ...children) {
  delete config.__source;
  delete config.__self;
  return {
    type,
    props: {
      ...config,
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
