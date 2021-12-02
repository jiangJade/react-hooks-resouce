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
    // 第二次之后的更新
    // 第一次渲染出来的那个fiber tree 准备复用
    workInProgressRoot = currentRoot.alternate; // 第一次渲染出来的那个fiber树

    // 让这个树的替身指向当前的currentRoot
    workInProgressRoot.alternate = currentRoot;

    if (rootFiber) {
      workInProgressRoot.props = rootFiber.props;
    }
  } else if (currentRoot) {
    if (rootFiber) {
      rootFiber.alternate = currentRoot;
      workInProgressRoot = rootFiber;
    } else {
      // 如果没传 rootFiber
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

// 第一次执行performUnitOfWork 会拿到currentFiber.child 这个child是在reconcileChildren里面生成的
function performUnitOfWork(currentFiber) {
  beginWork(currentFiber); // 开始工作
  if (currentFiber.child) {
    return currentFiber.child;
  }
  while (currentFiber) {
    // 没有儿子 让自己完成
    completeUnitOfWork(currentFiber);
    // 看有没有弟弟  有弟弟返回弟弟
    if (currentFiber.sibling) {
      return currentFiber.sibling;
    }
    // 找父亲 然后让父亲完成
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
    // 先判断父亲的first有没有值
    if (!returnFiber.firstEffect) {
      // 把自己儿子的effect链挂到父亲身上
      returnFiber.firstEffect = currentFiber.firstEffect;
    }
    // 执行到C1文本节点完成后 C1文本节点 的return 指向C1 div
    // 上面儿子完成让自己完成 很重要 所以C1文本节点完成后没有儿子 C1 div 要自己完成
    // 这时候执行C1 div, C1 div 的firstEffect 和 lastEffect 都指向 C1文本节点
    // 所以将 这儿C1 div 的父亲是B1 div 将B1 div 的nextEffect 指向C1 div
    // C1 执行完了 就继续执行他的兄弟 C2
    // C2 执行完了那么 继续完成B1自己 将自己指向指向A1
    if (!!currentFiber.lastEffect) {
      if (!!returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
      }
      returnFiber.lastEffect = currentFiber.lastEffect;
    }
    //////////////////////////// 这是最开始执行的 也就是第一次开始
    const effectTag = currentFiber.effectTag; // 副作用标识 PLACEMENT UPDATE
    if (effectTag) {
      // 说明有副作用 第一次新增 肯定有副作用 A1 first last = A1(Text)

      // 执行B1时A1已经有了 lastEffect 所以将A1的lastEffect.nextEffect
      // 指向B1
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber;
      } else {
        returnFiber.firstEffect = currentFiber;
      }
      // 最开始所有的 firstEffect  和 lastEffect 都为空
      // 第一次是 A1得文本节点完成 returnFiber是DIVA1
      // 所以让div A1的firstEffect和lastEffect 指向A1的文本节点
      // returnFiber.firstEffect = currentFiber; 写的bug只渲染除了一个节点 其他都没有渲染出来
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

function updateFunctionComponent(currentFiber) {
  // 将当前Fiber 赋值给workInProgressFiber  workInProgressFiber也就是正在工作的fiber
  // 在执行函数组件之前 先将hooksIndex 改为0
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
  // 1.先处理自己 如果是一个原生节点, 创建真是DOM节点
  // 2。 创建子fiber
  const newChildren = currentFiber.props.children; // [element]
  reconcileChildren(currentFiber, newChildren);
}

// 构建fiber对象
function reconcileChildren(currentFiber, newChildren) {
  let newChildIndex = 0; // 新子节点的索
  let prevSibling;
  // 如果当前Fiber有alternate 并且有child 至少渲染过一次才会有值
  let oldFiber = currentFiber.alternate && currentFiber.alternate.child;
  if (oldFiber) {
    // 清空effect 不然指针会有问题
    oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null;
  }

  // 遍历我们的子虚拟DOM元素数组 为每个虚拟DOM元素创建Fiber
  // 一次遍历完两个Fiber
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
    // 老的Fiber和新的newChild还在 两个类型相同 比如 都为div  或者都为span
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
          updateQueue: oldFiber.updateQueue || new UpdateQueue(),
          return: currentFiber,
          alternate: oldFiber,
          effectTag: UPDATE,
          nextEffect: null, // effect list 收集副作用
        };
      }
    } else {
      // 一一对比 没有做Diff优化 比如key
      // 判断是否存在 可能为null 比如A1的文本为null 不为空才创建Fiber
      if (newChild) {
        // beginWork 创建fiber 在completeUnitOfWork 的时候收集effect
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
    returnFiber.tag !== TAG_HOST &&
    returnFiber.tag !== TAG_TEXT
  ) {
    returnFiber = returnFiber.return;
  }
  let domReturn = returnFiber.stateNode; // 看

  if (currentFiber.effectTag === PLACEMENT) {
    let nextFiber = currentFiber;
    // 如果要挂载的节点不是DOM节点，比如说是类组件fiber 或者函数组件 一直找第一个儿子 直到找到真是DOM节点为止
    while (nextFiber.tag !== TAG_HOST && nextFiber.tag !== TAG_TEXT) {
      nextFiber = currentFiber.child;
    }
    domReturn.appendChild(nextFiber.stateNode);
  } else if (currentFiber.effectTag === DELETION) {
    // domReturn.removeChild(currentFiber.stateNode);
    return commitDeletion(currentFiber, domReturn);
    // 居然写成了currentFiber.tag  找了两个小时
  } else if (currentFiber.effectTag === UPDATE) {
    if (currentFiber.type === ELEMENT_TEXT) {
      // 这儿是不等 居然写成===了
      if (currentFiber.alternate.props.text !== currentFiber.props.text) {
        currentFiber.stateNode.textContent = currentFiber.props.text;
      } else {
        // 如果不是文本节点直接更新
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

/*-------hooks--------*/
/**
    workInProgressFiber = currentFiber;
    hookIndex = 0;
    workInProgressFiber.hooks = [];
    hook也是基于链表实现的
    每个fiber都有自己的hooks 每个hooks都有自己enqueueUpdate
*/

export function useReducer(reducer, initialValue) {
  // 第一要知道在那个函数的hooks
  // 第二 第几个hooks
  let newHook =
    workInProgressFiber.alternate &&
    workInProgressFiber.alternate.hooks &&
    workInProgressFiber.alternate.hooks[hookIndex];
  // 第一次oldHook 为空
  // 第二次渲染
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
