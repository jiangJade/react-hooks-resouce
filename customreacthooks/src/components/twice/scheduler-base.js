/**
 * 从根节点开始渲染和调度
 * 两个阶段
 * 1.render阶段: 根据diff算法对比新旧的虚拟dom 进行增量 更新或者创建
 * 这个阶段比较花时间 我们可以对任务进行拆分 拆分的维度虚拟DOM 此阶段可以暂停
 * render阶段有两个任务; 1 根据虚拟DOM生成fiber树; 2 收集effect list
 * render阶段成果是effect list知道那些节点更新那些节点删除了，那些节点增加了
 *
 * 2.commit 阶段 进行DOM更新创建阶段 此阶段不能暂停 要一气呵成
 */

import {
  ELEMENT_TEXT,
  PLACEMENT,
  TAG_ROOT,
  TAG_HOST,
  TAG_TEXT,
} from './constants';
import { setProps } from './utils';

let nextUnitOfWork = null; // 下一个工作单元
let workInProgressRoot = null; // RootFiber应用的根

export function scheduleRoot(rootFiber) {
  // rootFiber {tag: TAG_ROOT, stateNode: container,props:{children:[element]}}
  workInProgressRoot = rootFiber;
  nextUnitOfWork = rootFiber;
}

function performUnitOfWork(currentFiber) {
  // 开始工作
  beginWork(currentFiber);
  if (currentFiber.child) {
    return currentFiber.child;
  }
  while (currentFiber) {
    completeUnitOfWork(currentFiber); // 没有儿子让自己完成
    // 看看有没有弟弟
    if (currentFiber.sibling) {
      return currentFiber.sibling;
    }
    currentFiber = currentFiber.return; // 没有儿子 也没有弟弟 就找叔叔
  }
}

// 在完成的时候要收集有副作用的fiber 然后组成effect list
// 每个fiber有两个属性 firstEffect 指向第一个有副作用的子fiber lastEffect指向最后一个有副作用子Fiber
// 中间的用nextEffect做成一个单链表 firstEffect=大儿子.nextEffect二儿子.nextEffect三儿子 lastEffect
function completeUnitOfWork(currentFiber) {
  // 第一个完成的A1字符串（Text)
  // 如果有父亲
  let returnFiber = currentFiber.return;
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
      // 这儿之前多写了一个else
      returnFiber.lastEffect = currentFiber.lastEffect;
    }
    /*把自己挂到父亲身上 */
    const effectTag = currentFiber.effectTag;
    if (effectTag) {
      // 自己有副作用 A1 first last=A1(Text)
      // 说明父节点已经指向了一个节点
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
  } else if (currentFiber.tag === TAG_TEXT) {
    updateHostText(currentFiber);
  } else if (currentFiber.tag === TAG_HOST) {
    //原生DOM
    updateHost(currentFiber);
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
  if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text);
  } else if (currentFiber.tag === TAG_HOST) {
    // span div
    let stateNode = document.createElement(currentFiber.type); // div
    updateDOM(stateNode, {}, currentFiber.props);
    return stateNode; // 之前忘记返回 导致returnFiber.stateNode为null
  }
}

function updateDOM(stateNode, oldProps, newProps) {
  setProps(stateNode, oldProps, newProps);
}

function updateHostText(currentFiber) {
  if (!currentFiber.stateNode) {
    // 如果此fiber没有创建DOM节点
    currentFiber.stateNode = createDOM(currentFiber);
  }
}

function updateHostRoot(currentFiber) {
  let newChildren = currentFiber.props.children; // [element = <div id="A1"];
  reconcileChildren(currentFiber, newChildren);
}

function reconcileChildren(currentFiber, newChildren) {
  //[A1]
  let newChildIndex = 0; // 新子节点的索引
  let prevSibling; // 上一个新的子fiber
  // 遍历我们的子虚拟DOM元素数组，为每个虚拟DOM元素创建子Fiber
  while (newChildIndex < newChildren.length) {
    let newChild = newChildren[newChildIndex]; // 取出虚拟DOM节点
    let tag;
    if (newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT; // 这是一个文本节点
    } else if (typeof newChild.type === 'string') {
      tag = TAG_HOST; //如果type是字符串，那么这是一个原生DOM节点
    } // beginWork创建Fiber 在completeUnitOfWork收集effect list
    let newFiber = {
      tag,
      type: newChild.type, // div
      props: newChild.props,
      stateNode: null, // div还没有创建DOM元素 原生节点
      return: currentFiber,
      effectTag: PLACEMENT, // 副作用标识 render阶段我们要收集副作用 增加 删除 更新
      nextEffect: null, // effect list 也是一个单链表
      // effect list 顺序和完成顺序是一样的，但是节点只放那些出钱的人的fiber节点，不出去钱的绕过去
    };
    if (newFiber) {
      // 如果当前索引为0 说明这是太子
      if (newChildIndex === 0) {
        currentFiber.child = newFiber;
      } else {
        // 让太子的sibling弟弟指向二皇子
        prevSibling.sibling = newFiber;
      }
      prevSibling = newFiber;
    }
    newChildIndex++;
  }
}

// 循环执行工作 nextUnitWork
function workLoop(deadline) {
  let shouldYield = false; // 是否让出时间片或者说控制权
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork); // 执行完一个任务后
    shouldYield = deadline.timeRemaining() < 1; // 没有时间的话就要让出控制权
  }
  // 如果没有时间片 到期后还有任务没有完成，就需要请求浏览器再次调度
  if (!nextUnitOfWork && workInProgressRoot) {
    console.log('render阶段结束');
    commitRoot();
  }
  // 不管有没有任务 都请求再次调度 每一帧都要执行一次workLoop
  requestIdleCallback(workLoop, { timeout: 500 });
}

function commitRoot() {
  let currentFiber = workInProgressRoot.firstEffect;
  while (currentFiber) {
    console.log('commit', currentFiber.type, currentFiber.props.id);
    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect;
  }
  workInProgressRoot = null;
}

function commitWork(currentFiber) {
  if (!currentFiber) {
    return;
  }
  let returnFiber = currentFiber.return;
  let domReturn = returnFiber.stateNode;
  if (currentFiber.effectTag === PLACEMENT) {
    domReturn.appendChild(currentFiber.stateNode);
  }
  currentFiber.effectTag = null;
}

// react告诉浏览器 我现在有任务请你在闲的时候
//有一个优先级的概念 expirationTime
requestIdleCallback(workLoop, { timeout: 500 });