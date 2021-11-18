import {
  TAG_ROOT,
  ELEMENT_TEXT,
  TAG_HOST,
  TAG_TEXT,
  PLACEMENT,
} from './constants';
import { setProps } from './utils';
/*
    从根结点开始渲染和调度
    两个阶段
    diff阶段 对比新旧的虚拟DOM，进行增量 更新或者创建 render 阶段
    这个阶段可能比较花时间 可以对我们的任务进行拆分 拆分的维度虚拟DOM。此阶段可以暂停
    render 阶段成果是Effect list 知道那些节点更新 那些节点删除 那些节点增加
    render阶段有两个任务 1.根据虚拟DOM生成Fiber树 2.收集effectlist
    commit 阶段，进行DOM更新创建阶段，此阶段不能暂停，要一气呵成
*/
let nextUnitOfWork = null; // 下一个工作单元
let workInProgressRoot = null; // RootFiber 应用的根
export function scheduleRoot(rootFiber) {
  //rootFiber里面有 { tag: TAG_ROOT, stateNode: container,  props: { children: [element]}}
  workInProgressRoot = rootFiber;
  nextUnitOfWork = rootFiber;
}

function preformUnitOfWork(currentFiber) {
  beginWork(currentFiber); // 开始
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

// 完成 收集有副作用的fiber 然后组成effect list
// 每个fiber有两个属性 firstEffect指向第一个有副作用的子fiber
// lastEffect 指向最后一个有副作用的子fiber
// 中间用nextEffect 做成一个单链表 firstEffect = 大儿子.nextEffect二儿子.nextEffect三儿子
function completeUnitOfWork(currentFiber) {
  debugger;
  // returnFiber 父元素
  let returnFiber = currentFiber.return; // 第一个完成的是A1（text)
  // 判断有没有爹
  if (returnFiber) {
    //// 把自己儿子的effect链挂到父亲身上
    if (!returnFiber.firstEffect) {
      returnFiber.firstEffect = currentFiber.firstEffect;
    }
    if (!!currentFiber.lastEffect) {
      if (returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber.firstEffect;
      } else {
        returnFiber.lastEffect = currentFiber.lastEffect;
      }
    }
    //////////////////////////////////////////
    // 把自己挂到父亲上
    const effectTag = currentFiber.effectTag;
    if (effectTag) {
      // 说明有副作用 第一次新增 肯定有副作用 A1 first last = A1(Text)

      if (!!returnFiber.lastEffect) {
        returnFiber.lastEffect.nextEffect = currentFiber;
      } else {
        returnFiber.firstEffect = currentFiber;
      }
      returnFiber.firstEffect = currentFiber;
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
  } else if (currentFiber.tag === TAG_TEXT) {
    updateHostText(currentFiber);
  } else if (currentFiber.tag === TAG_HOST) {
    updateHost(currentFiber);
  }
}

function updateHost(currentFiber) {
  if (!currentFiber.stateNode) {
    // 如果此fiber没有创建DOM
    currentFiber.stateNode = createDOM(currentFiber);
  }
  const newChildren = currentFiber.props.children;
  reconcileChildren(currentFiber, newChildren);
}

// 创建DOM
function createDOM(currentFiber) {
  if (currentFiber.tag === TAG_TEXT) {
    return document.createTextNode(currentFiber.props.text);
    // 如果是真实DOM div span
  } else if (currentFiber.tag === TAG_HOST) {
    let stateNode = document.createElement(currentFiber.type);
    updateDOM(stateNode, {}, currentFiber.props);
    return stateNode;
  }
}

// 更新DOM
function updateDOM(stateNode, oldProps, newProps) {
  setProps(stateNode, oldProps, newProps);
}

// 更新文本
function updateHostText(currentFiber) {
  if (!currentFiber.stateNode) {
    // 如果没有元素DOM 创建DOM元素
    currentFiber.stateNode = createDOM(currentFiber);
  }
}

// 更新根节点
function updateHostRoot(currentFiber) {
  // 1.先处理自己 如果是一个原生节点, 创建真是DOM节点
  // 2。 创建子fiber
  let newChildren = currentFiber.props.children; // [element]
  reconcileChildren(currentFiber, newChildren);
}

//
function reconcileChildren(currentFiber, newChildren) {
  // [A1]
  let newChildIndex = 0; // 新子节点的索
  let prevSibling; // 上一个新的子fiber

  // 遍历我们的子虚拟DOM元素数组 为每个虚拟DOM元素创建Fiber
  while (newChildren && newChildIndex < newChildren.length) {
    let newChild = newChildren[newChildIndex];
    let tag;
    if (newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT; // 这是一个文本节点
    } else if (typeof newChild.type === 'string') {
      tag = TAG_HOST; // 如果type是字符串，那么这是一个原生DOM节点 'A1' div
    }
    // beginWork 创建fiber 在completeUnitOfWork 的时候收集effect
    let newFiber = {
      tag, // TAG_HOST
      type: newChild.type, // div
      props: newChild.props,
      stateNode: null, // div还没有创建DOM元素
      return: currentFiber,
      effectTag: PLACEMENT, // 副作用标识 render我们要收集副作用 新增 修改 删除
      nextEffect: null, // effect list 也是一个单链表
    };
    // 最小的儿子没有弟弟
    if (newFiber) {
      if (newChildIndex === 0) {
        // 如果当前的索引为0 说明是太子 大儿子也就是B1
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

// 循环执行工作 nextUnitOfWork
function workLoop(deadline) {
  let shouldYield = false; // 是否要让出时间片或者控制权
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = preformUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1; // 没有时间的话就要让出控制权
  }
  if (!nextUnitOfWork) {
    console.log('render阶段结束');
  }
  // 如果时间片到期还有任务没有完成，就需要请求浏览器再次调度
  // 每一帧都要执行一次workLook
  requestIdleCallback(workLoop, { timeout: 500 });
}

// React 告诉浏览器 我现在有任务请你在闲的时候执行workLoop 如果超过5秒 还没有时间 必须执行
// 这里有一个优先级的概念 expirationTime 很复杂
requestIdleCallback(workLoop, { timeout: 500 });
