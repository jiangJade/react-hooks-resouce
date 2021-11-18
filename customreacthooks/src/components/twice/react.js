import { ELEMENT_TEXT } from './constants';
import { scheduleRoot, useReducer, useState } from './scheduler';
import { Update, UpdateQueue } from './updateQueue';
/**
 *创建元素（虚拟DOM)的方法
 *@param { } type 元素的类型 div span p
 *@param {*} config 配置对象属性 key ref
 *@param {...any} children 放所有的儿子，这里会做成一个数组 可能为一个对象 这里简化一下
 */
function createElement(type, config, ...children) {
  console.log(children, 'children');
  delete config.__self;
  delete config.__source; // 表示这个元素是在哪一行哪列那个文件
  return {
    type,
    props: {
      ...config,
      // 做了一个兼容处理，如果是react元素的话返回自己，如果是文本类型，如果是一个字符串的话，返回元素对象
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

class Component {
  constructor(props) {
    this.props = props;
    // 源码时放在fiber里面的
    this.internalFiber = new UpdateQueue();
  }
  setState(payload) {
    // 可能是一个对象 也可能是一个函数
    // 先创建update对象
    let update = new Update(payload);
    // updateQueue 其实是放在此类组件对应的fiber节点的 internalFiber
    this.internalFiber.updateQueue.enqueueUpdate(update);
    // this.updateQueue.enqueueUpdate(update);
    scheduleRoot(); // 从根节点开始调度
  }
}

Component.prototype.isReactComponent = {}; // 类组件 源码也是这样写的

const React = {
  createElement,
  Component,
  useReducer,
  useState,
};

export default React;
