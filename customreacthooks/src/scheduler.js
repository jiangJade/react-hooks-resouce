/**
 * 这里会有两个阶段
 * 1.render阶段就是diff阶段
 * render创建有两个过程一个是创建fiber 对比新旧fiber 收集effect list
 * 这个阶段可以中断
 *2.阶段是commit，将fiber生成真实DOM， 不可中断
 * @export
 * @param {*} rootFiber
 */

import {
  ELEMENT_TEXT,
  PLACEMENT,
  TAG_ROOT,
  TAG_TEXT,
  TAG_HOST,
  UPDATE,
  DELETION,
  TAG_FUNCTION_COMPONENT,
} from './constants';
import { setProps } from './utils';
import { Update, UpdateQueue } from './updateQueue';

let workInProgressRoot = null; // 根应用 TAG_ROOT
let nextUnitOfWork = null; // 下一个执行单元
let currentRoot = null; // 正在工作的fiber树
let deletions = []; // 删除的元素 因为没有放在effect list里面 所以要单独处理
let workInProgressFiber = null; //
let hookIndex = 0; // hook索引

export function scheduleRoot(rootFiber) {
  // 双缓冲 为了复用fiber对象
  // 至少更新过一次了
  if (currentRoot && currentRoot.alternate) {
    workInProgressRoot = currentRoot.alternate; // 第一次渲染出来的那个fiber树
    workInProgressRoot.alternate = currentRoot; // 让这个树的替身指向当前的currentRoot

    if (rootFiber) {
      workInProgressRoot.props = rootFiber.props;
    }
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
  // rootFiber {tag: TAG_ROOT, stateNode: container,props:{children:[element]}}
  // 每次清空指针 防止出错
  workInProgressRoot.firstEffect =
    workInProgressRoot.lastEffect =
    workInProgressRoot.nextEffect =
      null;
  nextUnitOfWork = workInProgressRoot;
}

// 循环执行工作 nextUnitOfWork
function workLoop(deadline) {
  let shouldYield = false;
  // nextUnitOfWork为undefined 跳出循环  因为这儿的时间为500毫秒 我们的任务很小 不会超过500毫秒
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && workInProgressRoot) {
    console.log('render阶段结束');
    commitRoot();
  }
  // 每一帧都去执行一次 检查有没有任务
  requestIdleCallback(workLoop, { timeout: 500 });
}

function commitRoot() {
  deletions.forEach(commitWork);
  let currentFiber = workInProgressRoot.firstEffect;
  while (currentFiber) {
    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect;
  }
  deletions.length = 0; // 清空
  currentRoot = workInProgressRoot;
  workInProgressRoot = null;
}

function commitWork(currentFiber) {
  if (!currentFiber) {
    return;
  }
  let returnFiber = currentFiber.return; // 找父亲
  while (
    returnFiber.tag !== TAG_ROOT &&
    currentFiber.tag !== TAG_HOST &&
    currentFiber.tag !== TAG_TEXT
  ) {
    returnFiber = returnFiber.return;
  }
  let domReturn = returnFiber.sateNode;
  if (currentFiber.effectTag === PLACEMENT) {
    let nextFiber = currentFiber;
    while (![TAG_HOST, TAG_TEXT].includes(nextFiber.tag)) {
      nextFiber = currentFiber.child;
    }
    console.log(domReturn, '111111111');
    domReturn.appendChild(nextFiber.stateNode);
  } else if (currentFiber.effectTag === DELETION) {
    // domReturn.removeChild(currentFiber.stateNode);
    return commitDeletion(currentFiber, domReturn);
  } else if (currentFiber.tag === UPDATE) {
    if (currentFiber.type === ELEMENT_TEXT) {
      if (currentFiber.alternate.props.text === currentFiber.props.text) {
        currentFiber.stateNode.textContent = currentFiber.props.text;
      }
    } else {
      // 如果不是文本节点直接更新
      updateDOM(
        currentFiber.stateNode,
        currentFiber.alternate.props,
        currentFiber.props
      );
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

// 在完成的时候要收集有副作用的fiber 然后组成effect list
// 每个fiber有两个属性 firstEffect 指向第一个有副作用的子fiber lastEffect指向最后一个有副作用子Fiber
// 中间的用nextEffect做成一个单链表 firstEffect=大儿子.nextEffect二儿子.nextEffect三儿子 lastEffect
function completeUnitOfWork(currentFiber) {
  // 第一个完成的A1字符串（Text)
  // 如果有父亲
  const returnFiber = currentFiber.return;
  if (returnFiber) {
    /*----这一段是把自己儿子的effect 链挂到父亲身上--- */
    // 先判断父亲的first有没有值 （A1）
    if (!returnFiber.firstEffect) {
      returnFiber.firstEffect = currentFiber.firstEffect;
    }
    if (!!currentFiber.lastEffect) {
      if (!!returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
      }
      returnFiber.lastEffect = currentFiber.lastEffect;
    }
    const effectTag = currentFiber.effectTag; // 副作用标识 PLACEMENT UPDATE
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
  hookIndex = 0;
  workInProgressFiber = currentFiber;
  workInProgressFiber.hooks = [];
  const newChildren = [currentFiber.type(currentFiber.props)];
  reconcileChildren(currentFiber, newChildren);
}

function updateHost(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
  const newChildren = currentFiber.props.children; // [A1，B1，C1] 这里是A1的儿子
  reconcileChildren(currentFiber, newChildren);
}

function createDOM(currentFiber) {
  if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text); // A1
  } else if (currentFiber.tag === TAG_HOST) {
    let stateNode = document.createElement(currentFiber.type);
    updateDOM(stateNode, {}, currentFiber.props);
    return stateNode;
  }
}

function updateDOM(stateNode, oldProps, newProps) {
  if (stateNode && stateNode?.setAttribute) {
    setProps(stateNode, oldProps, newProps);
  }
}

function updateHostText(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
}

function updateHostRoot(currentFiber) {
  const newChildren = currentFiber.props.children; // [element]
  reconcileChildren(currentFiber, newChildren);
}

// 构建fiber对象
function reconcileChildren(currentFiber, newChildren) {
  let newChildIndex = 0;
  let prevSibling;
  let oldFiber = currentFiber.alternate && currentFiber.alternate.child;
  if (oldFiber) {
    oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null;
  }

  while (newChildIndex < newChildren.length || oldFiber) {
    const newChild = newChildren[newChildIndex];
    let newFiber;
    let tag;
    if (newChild && newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT; // 文本节点
    } else if (newChild && typeof newChild.type === 'string') {
      // 第一次id为A1 div
      tag = TAG_HOST;
    } else if (newChild && typeof newChild.type === 'function') {
      // 第一次id为A1 div
      tag = TAG_FUNCTION_COMPONENT;
    }

    const sameType = oldFiber && newChild && oldFiber.type === newChild.type; // 如果两个类型一样就服用
    if (sameType) {
      if (oldFiber.alternate) {
        // 如果有上上次的fiber就拿来用
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
          stateNode: oldFiber.stateNode, // 还未生成真实DOM 原生节点
          alternate: oldFiber,
          updateQueue: oldFiber.updateQueue || new UpdateQueue(),
          effectTag: UPDATE,
          nextEffect: null, // effect list 收集副作用
          return: currentFiber,
        };
      }
    } else {
      if (newChild) {
        newFiber = {
          tag,
          type: newChild.type,
          props: newChild.props,
          stateNode: null, // 还未生成真实DOM 原生节点
          effectTag: PLACEMENT,
          updateQueue: new UpdateQueue(),
          nextEffect: null, // effect list 收集副作用
          return: currentFiber,
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
        prevSibling.sibling = newFiber;
      }
      //let a; let b = {q:1}; a = b; a.child = {f:111};a;b
      prevSibling = newFiber; // 对象是指针的引用 所以这里改变prevSibling 也会影响到newFiber
    }
    newChildIndex++;
  }
}

export function useReducer(reducer, initialValue) {
  let newHook =
    workInProgressFiber.alternate &&
    workInProgressFiber.alternate.hooks &&
    workInProgressFiber.alternate.hooks[hookIndex];

  if (newHook) {
    newHook.state = newHook.updateQueue.forceUpdate(newHook.state);
  } else {
    newHook = {
      state: initialValue,
      updateQueue: new UpdateQueue(),
    };
  }
  const dispatch = (action) => {
    newHook.updateQueue.enqueueUpdate(
      new Update(reducer ? reducer(newHook.state, action) : action)
    );
    scheduleRoot();
  };
  workInProgressFiber.hooks[hookIndex++] = newHook;
  return [newHook.state, dispatch];
}

// expirationTime 过期时间
requestIdleCallback(workLoop, { timeout: 500 });
