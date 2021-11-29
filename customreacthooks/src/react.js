import { ELEMENT_TEXT } from './constants';
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
};

export default React;
