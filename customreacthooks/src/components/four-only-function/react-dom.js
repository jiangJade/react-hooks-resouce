import { scheduleRoot } from './scheduler';
import { TAG_ROOT } from './constants';

function render(element, container) {
  let rootFiber = {
    tag: TAG_ROOT, // 这里写错了 写成了type 应该是tag
    stateNode: container,
    props: { children: [element] },
  };
  scheduleRoot(rootFiber);
}

const ReactDom = {
  render,
};

export default ReactDom;
