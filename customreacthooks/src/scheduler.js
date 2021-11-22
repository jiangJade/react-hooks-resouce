import {
  TAG_ROOT,
  TAG_HOST,
  ELEMENT_TEXT,
  TAG_TEXT,
  PLACEMENT,
} from './constants';
import { setProps } from './utils';
let nextUnitOfWork = null; // 下一个工作单元
let workInProgressRoot = null; // 根fiber

export function scheduleRoot(rootFiber) {
  nextUnitOfWork = rootFiber;
  workInProgressRoot = rootFiber;
}

function performUnitOfWork(currentFiber) {
  //直到遍历完所有的dom
  beginWork(currentFiber);
  if (currentFiber.child) {
    return currentFiber.child;
  }
  while (currentFiber) {
    completeUnitOfWork(currentFiber);
    if (currentFiber.sibling) {
      return currentFiber.sibling;
    }
    currentFiber = currentFiber.return;
  }
}

// 完成收集工作
function completeUnitOfWork(currentFiber) {
  // 先完成的是A1文本
  // 先找父亲
  let returnFiber = currentFiber.return;
  if (returnFiber) {
    if (!returnFiber.firstEffect) {
      returnFiber.firstEffect = currentFiber.firstEffect;
    }
    if (currentFiber.lastEffect) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
      }
      // 这里多写了一个else
      returnFiber.lastEffect = currentFiber.lastEffect;
    }

    const effectTag = currentFiber.effectTag;
    if (effectTag) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber;
      } else {
        // 这里写成了 returnFiber.lastEffect = currentFiber;
        returnFiber.firstEffect = currentFiber;
      }
      returnFiber.lastEffect = currentFiber;
    }
  }
}

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1; // 让出时间片
  }
  if (!nextUnitOfWork && workInProgressRoot) {
    console.log('render阶段结束');
    commitRoot();
  }
  requestIdleCallback(workLoop, { timeout: 500 });
}

function commitRoot() {
  let currentFiber = workInProgressRoot.firstEffect;
  while (currentFiber) {
    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect;
  }
  workInProgressRoot = null;
}

function commitWork(currentFiber) {
  if (!currentFiber) {
    return;
  }
  const domReturn = currentFiber.return;

  //写错了 写成了returnFiber.effectTag
  if (currentFiber.effectTag === PLACEMENT) {
    domReturn.stateNode.appendChild(currentFiber.stateNode);
  }
  currentFiber.effectTag = null;
}

// 开始工作  这里会将虚拟DOM转换成fiber节点
function beginWork(currentFiber) {
  if (currentFiber.tag === TAG_ROOT) {
    updateHostRoot(currentFiber);
  } else if (currentFiber.tag === TAG_HOST) {
    updateHost(currentFiber);
  } else if (currentFiber.tag === TAG_TEXT) {
    updateHostText(currentFiber);
  }
}

function updateHostText(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
}

// A1
function updateHost(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
  const newChildren = currentFiber.props.children;

  reconcileChildren(currentFiber, newChildren);
}

function createDOM(currentFiber) {
  if (currentFiber.tag === TAG_HOST) {
    // 忘记怎么写了
    const stateNode = document.createElement(currentFiber.type);
    updateDOM(stateNode, {}, currentFiber.props);
    return stateNode;
  } else if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text);
  }
}

function updateDOM(stateNode, oldProps, newProps) {
  // setAttribute 写成了attribute
  if (stateNode?.setAttribute) {
    setProps(stateNode, oldProps, newProps);
  }
}

// 根节点
function updateHostRoot(currentFiber) {
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}

// 生成fiber节点 以及复用旧的fiber节点
// newChildren 是一个数组
function reconcileChildren(currentFiber, newChildren) {
  let newChildIndex = 0;
  let prevSibling;
  while (newChildIndex < newChildren.length) {
    const newChild = newChildren[newChildIndex];

    let tag;
    if (newChild && typeof newChild.type === 'string') {
      // div p
      tag = TAG_HOST;
    } else if (newChild && newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT;
    }

    let newFiber = {
      tag,
      type: newChild.type,
      props: newChild.props,
      stateNode: null, // 还没有创建真实DOM
      return: currentFiber, // 父节点
      effectTag: PLACEMENT,
      nextEffect: null,
    };
    if (newFiber) {
      if (newChildIndex === 0) {
        // 第一个儿子 A1
        currentFiber.child = newFiber;
      } else {
        // sibling 写成了sibing
        prevSibling.sibling = newFiber;
      }
      prevSibling = newFiber;
    }
    newChildIndex++;
  }
}

//
requestIdleCallback(workLoop, { timeout: 500 });
