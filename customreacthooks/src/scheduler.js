import { setProps } from './utils';
import {
  TAG_ROOT,
  TAG_HOST,
  PLACEMENT,
  TAG_TEXT,
  ELEMENT_TEXT,
  UPDATE,
  DELETION,
  TAG_FUNCTION_COMPONENT,
} from './constants';
import { Update, UpdateQueue } from './updateQueue';

/**
 *从根节点开始调度 分为两个阶段
  render阶段也是diff阶段 将虚拟DOM转换成Fiber节点  收集副作用 新增 删除 修改标记
  render阶段可以暂停

  commit阶段将创建的DOM节点挂载到根节点 不能暂停
 *
 * @export
 * @param {*} rootFiber
 */

let nextUnitOfWork = null; // 下一个工作单元
let workInProgressRoot = null; // RootFiber应用的根 正在渲染的根ROOT fiber
let currentRoot = null;
let deletions = []; // 记录需要删除的节点
let hookIndex = 0;
let workInProgressFiber = null;

export function scheduleRoot(rootFiber) {
  if (currentRoot && currentRoot.alternate) {
    workInProgressRoot = currentRoot.alternate;
    if (rootFiber) {
      workInProgressRoot.props = rootFiber.props;
    }
    workInProgressRoot.alternate = currentRoot;
  } else if (currentRoot) {
    if (rootFiber) {
      rootFiber.alternate = currentRoot;
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
  nextUnitOfWork = workInProgressRoot;
}

// 调和 将虚拟DOM转换成Fiber节点 以及复用旧的fiber节点
function reconcileChildren(currentFiber, newChildren) {
  let newChildIndex = 0; // 子元素索引
  let prevSibling; // 上一个Fiber
  let oldFiber = currentFiber.alternate && currentFiber.alternate.child;

  if (oldFiber) {
    oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null;
  }

  while (newChildIndex < newChildren.length || oldFiber) {
    let newChild = newChildren[newChildIndex];
    let tag;

    if (newChild && typeof newChild.type === 'string') {
      // div A1
      tag = TAG_HOST;
    } else if (newChild && newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT;
    } else if (newChild && typeof newChild.type === 'function') {
      tag = TAG_FUNCTION_COMPONENT;
    }

    const sameType = oldFiber && newChild && newChild.type === oldFiber.type;

    let newFiber;

    if (sameType) {
      if (oldFiber.alternate) {
        newFiber = oldFiber.alternate;
        newFiber.props = newChild.props;
        newFiber.effectTag = UPDATE;
        newFiber.nextEffect = null;
        newFiber.alternate = oldFiber;
        newFiber.updateQueue = oldFiber.updateQueue || new UpdateQueue();
      } else {
        newFiber = {
          tag: oldFiber.tag, // 节点标识
          type: oldFiber.type, // string div ELEMENT_TEXT
          props: newChild.props,
          stateNode: oldFiber.stateNode, // 真实DOM节点
          effectTag: UPDATE, // 副作用标识 新增
          return: currentFiber,
          alternate: oldFiber,
          updateQueue: oldFiber.updateQueue || new UpdateQueue(),
          nextEffect: null,
        };
      }
    } else {
      if (newChild) {
        newFiber = {
          tag, // 节点标识
          type: newChild.type, // string div ELEMENT_TEXT
          props: newChild.props,
          stateNode: null, // 真实DOM节点
          effectTag: PLACEMENT, // 副作用标识 新增
          return: currentFiber,
          updateQueue: new UpdateQueue(),
          nextEffect: null,
        };
      }
      if (oldFiber) {
        oldFiber.effectTag = DELETION;
        deletions.push(oldFiber);
      }
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (newFiber) {
      if (newChildIndex === 0) {
        currentFiber.child = newFiber;
      } else {
        // 说明有兄弟
        prevSibling.sibling = newFiber;
      }
      prevSibling = newFiber;
    }

    newChildIndex++;
  }
}

function updateHostRoot(currentFiber) {
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}

function updateHost(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}

function updateDOM(stateNode, oldProps, newProps) {
  if (stateNode && stateNode.setAttribute) {
    setProps(stateNode, oldProps, newProps);
  }
}

function createDOM(currentFiber) {
  if (currentFiber.tag === TAG_HOST) {
    const stateNode = document.createElement(currentFiber.type); // div
    updateDOM(stateNode, {}, currentFiber.props);
    return stateNode;
  } else if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text);
  }
}

// 开始工作
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

function updateFunctionComponent(currentFiber) {
  workInProgressFiber = currentFiber;
  workInProgressFiber.hooks = [];
  hookIndex = 0;
  const newChildren = [currentFiber.type(currentFiber.props)];
  reconcileChildren(currentFiber, newChildren);
}

function updateHostText(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
}

// 完成
function completeUnitOfWork(currentFiber) {
  console.log(currentFiber, '111111');
  // 先找父节点
  let returnFiber = currentFiber.return;
  if (returnFiber) {
    if (!returnFiber.firstEffect) {
      returnFiber.firstEffect = currentFiber.firstEffect;
    }
    /*
      C2文本节点完成后C2 div也完成 这时候returnFiber为B1 div
      B1 div 的firstEffect 指向了B1文本 lastEffect指向了B1文本
    */
    if (currentFiber.lastEffect) {
      // 这一步是在处理将A1 文本和B1 div的文本B1通过nextEffect关联
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
      }
      // 最开始将B1 div 和C1文本连接连接 通过lastEffect
      // 这儿很关键 在切换lastEffect指针
      returnFiber.lastEffect = currentFiber.lastEffect;
    }
    // 有副作用的才收集
    const effectTag = currentFiber.effectTag;
    if (effectTag) {
      // 每个fiber都有firstEffect 和lastEffect两个属性
      // A1文本先完成 将A1 div 指向A1文本
      /* C1 文本完成后 因为没有儿子和兄弟 所以这时候会完成C1 currentFiber就为C1 div了
       returnFiber就为B1 div 这时候B1的firstEffect 和 lastEffect都指向了B1文本

       */
      // 最开始将B1 div 和C1 div关联 通过nextEffect
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber;
      } else {
        returnFiber.firstEffect = currentFiber;
      }
      returnFiber.lastEffect = currentFiber;
    }
  }
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
    currentFiber = currentFiber.return; // 找叔叔
  }
}

function commitWork(currentFiber) {
  if (!currentFiber) {
    return;
  }
  let returnFiber = currentFiber.return;

  while (![TAG_ROOT, TAG_HOST, TAG_TEXT].includes(returnFiber.tag)) {
    returnFiber = returnFiber.return;
  }

  let domReturn = returnFiber.stateNode;
  if (currentFiber.effectTag === PLACEMENT) {
    let nextFiber = currentFiber;
    while (![TAG_HOST, TAG_TEXT].includes(nextFiber.tag)) {
      nextFiber = nextFiber.child;
    }
    domReturn.appendChild(nextFiber.stateNode);
  } else if (currentFiber.effectTag === UPDATE) {
    if (currentFiber.alternate.props.text !== currentFiber.props.text) {
      currentFiber.stateNode.textContent = currentFiber.props.text;
    } else {
      updateDOM(
        currentFiber.stateNode,
        currentFiber.alternate.props,
        currentFiber.props
      );
    }
  } else if (currentFiber.tag === DELETION) {
    return commitDeletion(currentFiber, domReturn);
  }
  currentFiber.effectTag = null;
}

function commitDeletion(currentFiber, domReturn) {
  if (currentFiber.tag !== TAG_HOST || currentFiber.tag !== TAG_TEXT) {
    domReturn.removeChild(currentFiber.stateNode);
  } else {
    commitDeletion(currentFiber.child, domReturn);
  }
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

// 工作循环
function workLoop(deadline) {
  let shouldYeild = false;
  while (nextUnitOfWork && !shouldYeild) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYeild = deadline.timeRemaining() < 1; // 让出时间片 或者执行权
  }
  if (!nextUnitOfWork && workInProgressRoot) {
    // console.log('render阶段执行完');
    commitRoot();
  }
  // 检查还有没有未执行的任务
  requestIdleCallback(workLoop, { timeout: 500 });
}

export function useReducer(reducer, initialValue) {
  // 先找老的hook
  let newHook =
    workInProgressFiber?.alternate &&
    workInProgressFiber.alternate.hooks &&
    workInProgressFiber.alternate.hooks[hookIndex];
  if (newHook) {
    // 第二次渲染
    newHook.state = newHook.updateQueue.forceUpdate(newHook.state);
  } else {
    newHook = {
      state: initialValue,
      updateQueue: new UpdateQueue(),
    };
  }
  const dispatch = (action) => {
    // {type: 'ADD'}
    const payload = reducer ? reducer(newHook.state, action) : action;
    newHook.updateQueue.enqueueUpdate(new Update(payload));
    scheduleRoot();
  };
  workInProgressFiber.hooks[hookIndex++] = newHook;
  return [newHook.state, dispatch];
}
requestIdleCallback(workLoop, { timeout: 500 });
