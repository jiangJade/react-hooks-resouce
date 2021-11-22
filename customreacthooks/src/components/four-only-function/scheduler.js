import {
  TAG_ROOT,
  ELEMENT_TEXT,
  TAG_HOST,
  TAG_TEXT,
  PLACEMENT,
  DELETION,
  UPDATE,
  TAG_FUNCTION_COMPONENT,
} from './constants';
import { Update, UpdateQueue } from './updateQueue';
import { setProps } from './utils';

/**
 * 从根节点开始渲染和调度
 * 两个阶段
 * diff阶段 对比新旧的虚拟dom 进行增量 更新或者创建 render阶段
 * 这个阶段比较花时间 我们可以对任务进行拆分 拆分的维度虚拟DOM 此阶段可以暂停
 * render阶段成果是effect list知道那些节点更新那些节点删除了，那些节点增加了
 * render阶段有两个任务1 根据虚拟DOM生成fiber树 2 收集effectlist
 * commit 阶段 进行DOM更新创建阶段 此阶段不能暂停 要一气呵成
 */

let nextUnitOfWork = null; // 下一个工作单元
let workInProgressRoot = null; // 渲染成功的树
let currentRoot = null; // 当前渲染成功的树
let deletions = []; // 记录需要删除的节点  没有放在effect list里面
let hookIndex = 0;
let workInProgressFiber = null;

export function scheduleRoot(rootFiber) {
  if (currentRoot && currentRoot.alternate) {
    // 已经更新过一次
    workInProgressRoot = currentRoot.alternate;
    workInProgressRoot.alternate = currentRoot;
    if (rootFiber) {
      workInProgressRoot.props = rootFiber.props;
    }
  } else if (currentRoot) {
    // 当前渲染成功的树
    rootFiber.alternate = currentRoot;
    if (rootFiber) {
      workInProgressRoot = rootFiber;
    } else {
      workInProgressRoot = {
        ...currentRoot,
        alternate: currentRoot,
      };
    }
  } else {
    workInProgressRoot = rootFiber;
  }
  workInProgressRoot.firstEffect =
    workInProgressRoot.lastEffect =
    workInProgressRoot.nextEffect =
      null;
  nextUnitOfWork = workInProgressRoot; // 这里写成了rootFiber结果 按钮点击没有生效
}

function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1; // 没有时间 让出时间片
  }
  if (!nextUnitOfWork && workInProgressRoot) {
    console.log('render阶段完成');
    commitRoot();
  }

  requestIdleCallback(workLoop, { timeout: 500 });
}

function commitRoot() {
  deletions.forEach(commitWork);
  let currentFiber = workInProgressRoot.firstEffect;
  while (currentFiber) {
    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect;
  }
  deletions.length = 0;
  currentRoot = workInProgressRoot;
  workInProgressRoot = null;
}

function commitWork(currentFiber) {
  if (!currentFiber) {
    return;
  }
  let returnFiber = currentFiber.return;
  while (![TAG_HOST, TAG_TEXT, TAG_ROOT].includes(returnFiber.tag)) {
    returnFiber = returnFiber.return;
  }
  let domReturn = returnFiber.stateNode;
  if (currentFiber.effectTag === PLACEMENT) {
    let nextFiber = currentFiber;

    // 如果要挂载的节点不是DOM节点，比如说是类组件Fiber，直接找第一个儿子，知道找到一个真实DOM节点为止
    while (nextFiber.tag !== TAG_HOST && nextFiber.tag !== TAG_TEXT) {
      nextFiber = currentFiber.child;
    }
    domReturn.appendChild(nextFiber.stateNode);
  } else if (currentFiber.effectTag === DELETION) {
    return commitDeletion(currentFiber, domReturn);
  } else if (currentFiber.effectTag === UPDATE) {
    if (currentFiber.type === ELEMENT_TEXT) {
      if (currentFiber.alternate.props.text !== currentFiber.props.text) {
        currentFiber.stateNode.textContent = currentFiber.props.text;
      } else {
        updateDOM(
          currentFiber.stateNode,
          currentFiber.alternate.props,
          currentFiber.props
        );
      }
    }
  }

  currentFiber.effectTag = null;
}

function commitDeletion(currentFiber, domReturn) {
  if (currentFiber.tag !== TAG_HOST && currentFiber.tag !== TAG_TEXT) {
    domReturn.removeChild(currentFiber.stateNode);
  } else {
    commitDeletion(currentFiber.child, domReturn);
  }
}

// 第一次执行performUnitOfWork 会拿到currentFiber.child 这个child是在reconcileChildren里面生成的
function performUnitOfWork(currentFiber) {
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

function completeUnitOfWork(currentFiber) {
  const returnFiber = currentFiber.return;

  if (returnFiber) {
    if (!returnFiber.firstEffect) {
      returnFiber.firstEffect = currentFiber.firstEffect;
    }
    // 如果是A1 文本不会走这里 因为没有lastEffect
    if (!!currentFiber.lastEffect) {
      if (!!returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
      }
      returnFiber.lastEffect = currentFiber.lastEffect;
    }

    // 第一次执行是 PLACEMENT
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
*beginWork开始收下线的钱
completeUnitOfWork
1.创建真实DOM元素  真是DOM是指 div span p 这些 标签
*/

function beginWork(currentFiber) {
  if (currentFiber.tag === TAG_ROOT) {
    updateHostRoot(currentFiber);
  } else if (currentFiber.tag === TAG_HOST) {
    updateHost(currentFiber);
  } else if (currentFiber.tag === TAG_TEXT) {
    updateHostText(currentFiber);
  } else if (currentFiber.tag === TAG_FUNCTION_COMPONENT) {
    updateFunctionComponent(currentFiber);
  }
}

function updateHostRoot(currentFiber) {
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}

function updateFunctionComponent(currentFiber) {
  hookIndex = 0;
  workInProgressFiber = currentFiber;
  workInProgressFiber.hooks = [];
  const newChildren = [currentFiber.type(currentFiber.props)];
  reconcileChildren(currentFiber, newChildren);
}

function updateHostText(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
}

function updateHost(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}

function createDOM(currentFiber) {
  if (currentFiber.tag === TAG_HOST) {
    const stateNode = document.createElement(currentFiber.type);
    updateDOM(stateNode, {}, currentFiber.props);
    return stateNode;
  } else if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text);
  }
}

function updateDOM(stateNode, oldProps, newProps) {
  if (stateNode?.setAttribute) {
    setProps(stateNode, oldProps, newProps);
  }
}

// 将虚拟DOM转换成Fiber节点
function reconcileChildren(currentFiber, newChildren) {
  let newChildIndex = 0; // 直接点的索引
  let prevSibling; // 上一个fiber

  let oldFiber = currentFiber.alternate && currentFiber.alternate.child;
  if (oldFiber) {
    oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null;
  }
  while (newChildIndex < newChildren.length || oldFiber) {
    let newChild = newChildren[newChildIndex]; // A1
    let tag;
    if (newChild && typeof newChild.type === 'string') {
      tag = TAG_HOST; // 原生节点 div p span
    } else if (newChild && newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT;
    } else if (newChild && typeof newChild.type === 'function') {
      tag = TAG_FUNCTION_COMPONENT;
    }
    let newFiber;
    // 这里写的逻辑混乱
    let sameType = newChild && oldFiber && newChild.type === oldFiber.type;

    if (sameType) {
      if (oldFiber.alternate) {
        // 如果有上上次的fiber就拿来复用
        newFiber = oldFiber.alternate;
        newFiber.props = newChild.props;
        newFiber.alternate = oldFiber;
        newFiber.effectTag = UPDATE;
        newFiber.updateQueue = oldFiber.updateQueue || new UpdateQueue();
        newFiber.nextEffect = null;
      } else {
        newFiber = {
          tag: oldFiber.tag,
          type: oldFiber.type,
          props: newChild.props,
          return: currentFiber,
          alternate: oldFiber,
          effectTag: UPDATE,
          updateQueue: oldFiber.updateQueue || new UpdateQueue(),
          stateNode: oldFiber.stateNode,
          nextEffect: null,
        };
      }
    } else {
      if (newChild) {
        newFiber = {
          tag,
          type: newChild.type,
          props: newChild.props,
          return: currentFiber,
          effectTag: PLACEMENT,
          updateQueue: new UpdateQueue(),
          nextEffect: null,
          stateNode: null,
        };
      }
      if (oldFiber) {
        oldFiber.effectTag = DELETION;
        deletions.push(oldFiber);
      }
    }
    // 移动oldFiber指针
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (newFiber) {
      if (newChildIndex === 0) {
        currentFiber.child = newFiber;
      } else {
        prevSibling.sibling = newFiber;
      }
      prevSibling = newFiber;
    }
    newChildIndex++;
  }
}

export function useReducer(reducer, initialValue) {
  let newHook = workInProgressFiber?.alternate?.hooks?.[hookIndex];
  if (newHook) {
    newHook.state = newHook.updateQueue.forceUpdate(newHook.state);
  } else {
    newHook = {
      state: initialValue,
      updateQueue: new UpdateQueue(),
    };
  }
  const dispatch = (action) => {
    const payload = reducer ? reducer(newHook.state, action) : action;
    newHook.updateQueue.enqueueUpdate(new Update(payload));
    scheduleRoot();
  };
  workInProgressFiber.hooks[hookIndex++] = newHook;
  return [newHook.state, dispatch];
}

// 有空闲时间帮忙执行一下任务

requestIdleCallback(workLoop, { timeout: 500 });
