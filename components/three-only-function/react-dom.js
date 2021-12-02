import { TAG_ROOT } from './constants';
import { scheduleRoot } from './scheduler';

function render(element, container) {
  const rootFiber = {
    tag: TAG_ROOT,
    stateNode: container, // root div
    props: { children: [element] },
  };
  scheduleRoot(rootFiber);
}

const ReactDom = {
  render,
};

export default ReactDom;
