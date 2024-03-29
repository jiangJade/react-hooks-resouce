/*
    render 是一个把元素渲染到一个容器内部
*/
import { TAG_ROOT } from './constants';
import { scheduleRoot } from './scheduler';

function render(element, container) {
  // container = root DOM节点
  let rootFiber = {
    tag: TAG_ROOT, // 每个fiber会有一个tag标识  此元素的类型
    stateNode: container, // 一般情况下如果这个元素是一个原生节点的话，stateNode指向真实DOM元素
    // props.children 是一个数组，里面放的是React元素 虚拟DOM 后面会根据每个React元素创建 对应Fiber
    props: { children: [element] }, // 这个fiber的属性对象children 属性，里面放的是要渲染的元素
  };
  scheduleRoot(rootFiber);
}
const ReactDom = {
  render,
};

export default ReactDom;
/*
* reconciler

*/
