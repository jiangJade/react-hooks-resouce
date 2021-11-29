import { setProps } from './utils';
import {
  TAG_ROOT,
  TAG_HOST,
  PLACEMENT,
  ELEMENT_TEXT,
  TAG_TEXT,
} from './constants';

let nextUnitOfWork = null; // 下一个工作单元
let workInProgressRoot = null; // 正在工作的根节点
/**从根节点开始调度
 * 两个阶段 render阶段 以及commit阶段
 * render阶段也是diff阶段，会将虚拟DOM转换成Fiber节点 以及收集副作用，那些节点是新增的 那些是修改 以及删除
 *render阶段可以暂停
 commit阶段要一气呵成
 *
 * @export
 * @param {*} params
 */
export function scheduleRoot(rootFiber) {
  //rootFiber 根节点 {tag: TAG_ROOT, stateNode: container, props: {children: [element]}}
  nextUnitOfWork = rootFiber;
  workInProgressRoot = rootFiber;
}

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1; // 没有时间让出时间片 或者执行权
  }
  if (!nextUnitOfWork && workInProgressRoot) {
    console.log('render阶段结束');
    commitRoot();
  }
  // 每帧都请一次
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
  // 新增
  let returnFiber = currentFiber.return;
  let domReturn = returnFiber.stateNode;
  if (currentFiber.effectTag === PLACEMENT) {
    domReturn.appendChild(currentFiber.stateNode);
  }
  currentFiber.effectTag = null;
}

function performUnitOfWork(currentFiber) {
  beginWork(currentFiber);
  if (currentFiber.child) {
    return currentFiber.child; // 有儿子就返回儿子
  }
  while (currentFiber) {
    completeUnitOfWork(currentFiber); // 没有儿子让自己完成
    if (currentFiber.sibling) {
      return currentFiber.sibling; // 有兄弟就返回兄弟
    }
    currentFiber = currentFiber.return; // 没有儿子 也没有兄都 就找叔叔
  }
}

// 完成
function completeUnitOfWork(currentFiber) {
  // 先找父节点
  let returnFiber = currentFiber.return;
  if (returnFiber) {
    /*----这一段是把自己儿子的effect 链挂到父亲身上--- */
    // 先判断父亲的first有没有值 （A1）
    if (!returnFiber.firstEffect) {
      returnFiber.firstEffect = currentFiber.firstEffect;
    }
    if (currentFiber.lastEffect) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
      }
      returnFiber.lastEffect = currentFiber.lastEffect;
    }

    const effectTag = currentFiber.effectTag;
    if (effectTag) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber;
      } else {
        returnFiber.firstEffect = currentFiber;
      }
      returnFiber.lastEffect = currentFiber;
    }
  }
}

/*
 *开始收下线的钱
 *completeUnitOfWork把下线的钱收完了
 *创建真实的DOM元素
 */
function beginWork(currentFiber) {
  if (currentFiber.tag === TAG_ROOT) {
    updateHostRoot(currentFiber);
  } else if (currentFiber.tag === TAG_HOST) {
    updateHost(currentFiber);
  } else if (currentFiber.tag === TAG_TEXT) {
    updateHostText(currentFiber);
  }
}

function updateHost(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}

function updateHostText(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
}

function createDOM(currentFiber) {
  if (currentFiber.tag === TAG_HOST) {
    let stateNode = document.createElement(currentFiber.type);
    updateDOM(stateNode, {}, currentFiber.props);
    return stateNode;
  } else if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text);
  }
}

function updateDOM(stateNode, oldProps, newProps) {
  if (stateNode && stateNode.setAttribute) {
    setProps(stateNode, oldProps, newProps);
  }
}

// 根节点
function updateHostRoot(currentFiber) {
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}

// newChildren 是一个组 [element]
function reconcileChildren(currentFiber, newChildren) {
  let newChildIndex = 0;
  let tag;
  let prevSibling;
  while (newChildIndex < newChildren.length) {
    const newChild = newChildren[newChildIndex];
    if (typeof currentFiber.type === 'string') {
      debugger;
      tag = TAG_HOST; // div
    } else if (currentFiber.type === ELEMENT_TEXT) {
      tag = TAG_TEXT;
    }
    let newFiber = {
      tag, // 节点标识
      type: newChild.type, // 类型 div text
      props: newChild.props, // props
      stateNode: null, // 真实DOM
      return: currentFiber, // 父节点
      effectTag: PLACEMENT, // 副作用 新增
      nextEffect: null,
    };

    if (newChildIndex === 0) {
      // TAG_ROOT 他的儿子是A1 div
      currentFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber; // 上一个节点

    newChildIndex++;
  }
}

// 告诉浏览器 有空闲的时间帮忙执行任务 如果超过500毫秒还没执行 必须得给我执行
requestIdleCallback(workLoop, { timeout: 500 });
