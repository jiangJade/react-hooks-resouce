import { ELEMENT_TEXT } from './constants';
import { useRenducer, useState } from './scheduler';
function createElement(type, config, ...children) {
  delete config.__self;
  delete config.__source; // 表示这个元素是在哪一行哪列那个文件
  return {
    type,
    props: {
      ...config, // key ref
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
  useRenducer,
  useState,
};

export default React;
