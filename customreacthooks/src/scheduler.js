import {
  TAG_ROOT,
  ELEMENT_TEXT,
  TAG_HOST,
  TAG_TEXT,
  PLACEMENT,
} from './constants';
import { setProps } from './utils';

let workInProgressRoot = null; // 根fiber
let nextUnitOfWork = null; // 下一个工作单元

/**
 * 从根节点开始渲染和调度
 * 两个阶段
 * diff阶段 对比新旧的虚拟dom 进行增量 更新或者创建 render阶段
 * 这个阶段比较花时间 我们可以对任务进行拆分 拆分的维度虚拟DOM 此阶段可以暂停
 * render阶段成果是effect list知道那些节点更新那些节点删除了，那些节点增加了
 * render阶段有两个任务1 根据虚拟DOM生成fiber树 2 收集effectlist
 * commit 阶段 进行DOM更新创建阶段 此阶段不能暂停 要一气呵成
 */
export function scheduleRoot(rootFiber) {
  nextUnitOfWork = rootFiber;
  workInProgressRoot = rootFiber;
}

// 工作循环
function workLoop(deadline) {
  let shouldYeild = false;

  // 5 shouldYeild没有取反  workLoop函数写完就声明一个根 workInProgressRoot变量
  while (nextUnitOfWork && !shouldYeild) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYeild = deadline.timeRemaining() < 1; // 没有时间就不执行render
  }
  if (!nextUnitOfWork && workInProgressRoot) {
    // console.log('render阶段结束');
    commitRoot();
  }
  // 检查是否有任务需要执行
  requestIdleCallback(workLoop, { timeout: 500 });
}

function commitRoot() {
  console.log(workInProgressRoot, '11');
  let currentFiber = workInProgressRoot.firstEffect;
  while (currentFiber) {
    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect;
  }
  workInProgressRoot = null;
}

function commitWork(currentFiber) {
  if (!currentFiber) {
    // 没有取反
    return;
  }
  // 找父节点 将子节点添加进父节点
  const returnFiber = currentFiber.return;
  const domReturn = returnFiber.stateNode;
  if (currentFiber.effectTag === PLACEMENT) {
    domReturn.appendChild(currentFiber.stateNode);
  }
  currentFiber.effectTag = null; // 清空副作用
}

function performUnitOfWork(currentFiber) {
  // 开始工作 一直执行beginWork 直到遍历完所有的dom
  beginWork(currentFiber);
  if (currentFiber.child) {
    return currentFiber.child;
  }

  while (currentFiber) {
    // 7没有写completeUnitOfWork
    // 完成
    completeUnitOfWork(currentFiber);
    if (currentFiber.sibling) {
      return currentFiber.sibling;
    }
    // 6 这里写错了 写成了return currentFiber.return
    currentFiber = currentFiber.return;
  }
}

function completeUnitOfWork(currentFiber) {
  // 先完成的是A1文本
  // 先找父亲
  const returnFiber = currentFiber.return;
  if (returnFiber) {
    if (!returnFiber.firstEffect) {
      returnFiber.firstEffect = currentFiber.firstEffect;
    }

    if (!!currentFiber.lastEffect) {
      if (!!returnFiber.lastEffect) {
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

/**
 *根据虚拟DOM生成对应fiber节点
 生成真实DOM节点
 *
 * @param {*} currentFiber
 */
function beginWork(currentFiber) {
  console.log(currentFiber, 'nextUnitOfWork');
  if (currentFiber.tag === TAG_ROOT) {
    /* 2这里忘记了怎么写
    //  { tag: TAG_ROOT, // 这里写错了 写成了type 应该是tag stateNode: container,props: { children: [element] },}
    // A1 div 执行完了后 回去找child 会取出 [A1，B1，B2]  执行两次的原因是workLoop是一个每帧都会执行的函数
    // 为什么A1执行完了之后 会走 currentFiber.child逻辑
    // 因为 第一次走reconcileChildren函数逻辑时 currentFiber 就是rootFiber,
    这时为rootFiber添加了一个child属性
    */
    updateHostRoot(currentFiber);
    // 先走TAG_TEXT
  } else if (currentFiber.tag === TAG_HOST) {
    // A1 div
    updateHost(currentFiber);
  } else if (currentFiber.tag === TAG_TEXT) {
    // A1 文本
    updateHostText(currentFiber);
  }
}

function updateHostText(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
}

// 8忘记updateHost怎么写的了
// 创建真实DOM
function updateHost(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
  const newChildren = currentFiber.props.newChildren; // [A1,B1,B2]
  reconcileChildren(currentFiber, newChildren);
}

function createDOM(currentFiber) {
  // 9这里又取错了 应该是tag 不是type type对应的是div ELEMENT_TEXT
  if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text);
  } else if (currentFiber.tag === TAG_HOST) {
    // div span p
    const stateNode = document.createElement(currentFiber.type);
    updateDOM(stateNode, {}, currentFiber.props);
    return stateNode;
  }
}

function updateHostRoot(currentFiber) {
  const newChildren = currentFiber.props.children; // [element]
  reconcileChildren(currentFiber, newChildren);
}

function updateDOM(stateNode, oldProps, newProps) {
  if (stateNode?.setAttribute) {
    setProps(stateNode, oldProps, newProps);
  }
}

// 创建子fiber 复用旧的fibr节点
function reconcileChildren(currentFiber, newChildren) {
  let newChildIndex = 0;
  let prevSibling; // 上一个fiber

  while (newChildIndex < newChildren.length) {
    const newChild = newChildren[newChildIndex];
    let tag;
    console.log(newChildren, newChild, 'newChild');
    // newChild 是A1
    if (newChild && typeof newChild.type === 'string') {
      // div
      tag = TAG_ROOT;
    } else if (newChild && newChild.type === ELEMENT_TEXT) {
      // A1 文本
      tag = TAG_TEXT;
    }
    let newFiber = {
      tag, // 4这里写成了TAG_ROOT
      type: newChild.type, // div span ELEMENT_TEXT
      props: newChild.props, // [A1 ，<div id="B1",...]
      stateNode: null, // 还没有创建真实DOM
      return: currentFiber, // 让新的fiber的return 属性指向当前fiber
      effectTag: PLACEMENT, // 副作用标识
      nextEffect: null,
    };
    // 5这里没有用newChildIndex === 0 做判断
    if (newChildIndex === 0) {
      // 这时后的currentFiber是root div
      currentFiber.child = newFiber; // newFiber是id为A1的div
    } else {
      prevSibling.sibling = newFiber; // newFiber是对象 对象的指针会被改变
    }
    prevSibling = newFiber;
    newChildIndex++;
  }
}

// 1这里写了之后忘记声明workInProgressRoot
// react 告诉浏览器 有时间帮我执行一下任务 浏览器每秒执行60帧 . 一帧16.66毫秒
requestIdleCallback(workLoop, { timeout: 500 });
