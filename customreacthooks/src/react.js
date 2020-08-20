
/*
    创建元素（虚拟dom)的方法
    @params {} type 元素的类型 div p span
    @params {*} config 配置对象 塑性 key ref
    @params {} children 放着所有的儿子，这里会做成一个数组
*/

import { ELEMENT_TEXT } from './constants';

function createElement(type, config, ...children) {

    delete config._self;
    delete config._source; // 表示这个元素是在哪行哪列哪个文件生成的

    return {
        type,
        props: {
            ...config,
            children: children.map(child => {
                // 如果这个child是一个react.createElement 返回的react元素 就直接返回 否则返回一个文本节点
                return typeof child === 'object' ? child : {
                    type: ELEMENT_TEXT,
                    props: { text: child, children: []}
                }
            })
        }
    }

}

const React = {
    createElement
}

export default React;