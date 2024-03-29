import { TAG_ROOT } from './constants';
import { scheduleRoot } from './scheduler';

function render(element, container) {
  let rootFiber = {
    tag: TAG_ROOT,
    stateNode: container,
    props: { children: [element] },
  };
  scheduleRoot(rootFiber);
}

const ReactDom = {
  render,
};

export default ReactDom;
