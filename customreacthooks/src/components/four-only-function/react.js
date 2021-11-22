import { ELEMENT_TEXT } from './constants';
import { useReducer } from './scheduler';

function createElement(type, config, ...children) {
  // 1写成children了
  delete config.__self; // 2忘记写了
  delete config.__source;
  return {
    type,
    props: {
      ...config, // key ref 属性
      children: children.map((child) => {
        return typeof child === 'object'
          ? child
          : {
              type: ELEMENT_TEXT,
              props: {
                text: child,
                children: [],
              },
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
