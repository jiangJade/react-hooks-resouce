/**
 * 从根节点开始渲染和调度
 * 两个阶段
 * diff阶段 对比新旧的虚拟dom 进行增量 更新或者创建 render阶段
 * 这个阶段比较花时间 我们可以对任务进行拆分 拆分的维度虚拟DOM 此阶段可以暂停
 * render阶段成果是effect list知道那些节点更新那些节点删除了，那些节点增加了
 * render阶段有两个任务1 根据虚拟DOM生成fiber树 2 收集effectlist
 * commit 阶段 进行DOM更新创建阶段 此阶段不能暂停 要一气呵成
 */

import {
  ELEMENT_TEXT,
  PLACEMENT,
  DELETION,
  TAG_ROOT,
  TAG_HOST,
  TAG_TEXT,
  UPDATE,
  TAG_CLASS,
  TAG_FUNCTION_COMPONENT,
} from './constants';
import { Update, UpdateQueue } from './updateQueue';
import { setProps } from './utils';

let nextUnitOfWork = null; // 下一个工作单元
let workInProgressRoot = null; // RootFiber应用的根 正在渲染的根ROOT fiber
let currentRoot = null; // 渲染成功的树
let deletions = []; //因为删除的节点我们并不放在effect list里，所以需要单独记录处理
let workInProgressFiber = null; // 正在工作中的fiber
let hookIndex = 0; // Hooks索引

export function scheduleRoot(rootFiber) {
  // 双缓冲 为了复用fiber对象
  // 至少更新过一次了
  if (currentRoot && currentRoot.alternate) {
    workInProgressRoot = currentRoot.alternate; // 第一次渲染出来的那个fiber树
    workInProgressRoot.alternate = currentRoot; // 让这个树的替身指向当前的currentRoot
    if (rootFiber) {
      workInProgressRoot.prop = rootFiber.props; // 让它的props更新成新的props
    }
  } else if (currentRoot) {
    if (rootFiber) {
      // 如果有值说明渲染过一次 因为渲染过后虚拟dom没有了 只有fiber
      rootFiber.alternate = currentRoot;
      workInProgressRoot = rootFiber;
    } else {
      workInProgressRoot = { ...currentRoot, alternate: currentRoot };
    }
  } else {
    // 如果是第一次渲染
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
      return currentFiber.sibling; // 有弟弟返回弟弟
    }
    currentFiber = currentFiber.return; // 没有儿子 也没有弟弟 就找父亲 然后完成自己
  }
}

// 循环执行工作 nextUnitWork
function workLoop(deadline) {
  let shouldYield = false; // 是否让出时间片或者说控制权

  // 这里跳出循环是因为 nextUnitOfWork为undefined
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
    if (currentFiber.lastEffect) {
      if (returnFiber.lastEffect) {
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
    // 根fiber
    updateHostRoot(currentFiber);
  } else if (currentFiber.tag === TAG_TEXT) {
    // 文本fiber
    updateHostText(currentFiber);
  } else if (currentFiber.tag === TAG_HOST) {
    // 原生DOM节点
    //原生DOM
    updateHost(currentFiber);
  } else if (currentFiber.tag === TAG_CLASS) {
    updateClassComponent(currentFiber);
  } else if (currentFiber.tag === TAG_FUNCTION_COMPONENT) {
    updateFunctionComponent(currentFiber);
  }
}

function updateFunctionComponent(currentFiber) {
  workInProgressFiber = currentFiber;
  hookIndex = 0;
  workInProgressFiber.hooks = [];
  const newChildren = [currentFiber.type(currentFiber.props)];
  reconcileChildren(currentFiber, newChildren);
}

function updateClassComponent(currentFiber) {
  if (!currentFiber.stateNode) {
    // 类组件stateNode 组件实例
    // new ClassCounter(); 类组件实例 fiber双向指向
    currentFiber.stateNode = new currentFiber.type(currentFiber.props);
    currentFiber.stateNode.internalFiber = currentFiber;
    currentFiber.updateQueue = new UpdateQueue();
  }
  // 给组件的实例的state赋值
  currentFiber.stateNode.state = currentFiber.updateQueue.forceUpdate(
    currentFiber.stateNode.state
  );
  let newElement = currentFiber.stateNode.render();
  const newChildren = [newElement];
  reconcileChildren(currentFiber, newChildren);
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
  if (stateNode && stateNode.setAttribute) {
    setProps(stateNode, oldProps, newProps);
  }
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

// newChildren是一个虚拟DOM的数组 把虚拟DOM转成fiber节点
function reconcileChildren(currentFiber, newChildren) {
  //[A1]
  let newChildIndex = 0; // 新子节点的索引
  let prevSibling; // 上一个新的子fiber
  // 如果currentFiber有alternate并且alternate有child属性
  let oldFiber = currentFiber.alternate && currentFiber.alternate.child;
  if (oldFiber) {
    oldFiber.firstEffect = oldFiber.lastEffect = oldFiber.nextEffect = null; // 每次清空
  }
  // 遍历我们的子虚拟DOM元素数组，为每个虚拟DOM元素创建子Fiber
  while (newChildIndex < newChildren.length || oldFiber) {
    let newChild = newChildren[newChildIndex]; // 取出虚拟DOM节点
    let newFiber;
    let tag;
    const sameType = oldFiber && newChild && oldFiber.type === newChild.type;
    if (
      newChild &&
      typeof newChild.type === 'function' &&
      newChild.type.prototype.isReactComponent
    ) {
      tag = TAG_CLASS;
    }
    if (newChild && newChild.type === ELEMENT_TEXT) {
      tag = TAG_TEXT; // 这是一个文本节点
    } else if (newChild && typeof newChild.type === 'string') {
      tag = TAG_HOST; //如果type是字符串，那么这是一个原生DOM节点
    } else if (newChild && typeof newChild.type === 'function') {
      tag = TAG_FUNCTION_COMPONENT; //如果type是字符串，那么这是一个原生DOM节点
    } // beginWork创建Fiber 在completeUnitOfWork收集effect list

    if (sameType) {
      // 说明老fiber和新虚拟DOM类型一样 可以复用老的DOM节点，更新即可复用
      // 之前忘记写旧的复用了
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
          type: oldFiber.type, // div
          props: newChild.props, // {id="A1" style={style}} 要用新的props
          stateNode: oldFiber.stateNode, // 原生节点
          return: currentFiber,
          updateQueue: oldFiber.updateQueue || new UpdateQueue(),
          alternate: oldFiber, // 让新的fiber的alternate指向老的fiber节点
          effectTag: UPDATE, // 副作用标识 render阶段我们要收集副作用 增加 删除 更新
          nextEffect: null, // effect list 也是一个单链表
          // effect list 顺序和完成顺序是一样的，但是节点只放那些出钱的人的fiber节点，不出去钱的绕过去
        };
      }
    } else {
      // 看看新的虚拟DOM是不是为null
      if (newChild) {
        newFiber = {
          tag,
          type: newChild.type, // div
          props: newChild.props,
          stateNode: null, // div还没有创建DOM元素 原生节点
          return: currentFiber,
          updateQueue: new UpdateQueue(),
          effectTag: PLACEMENT, // 副作用标识 render阶段我们要收集副作用 增加 删除 更新
          nextEffect: null, // effect list 也是一个单链表
          // effect list 顺序和完成顺序是一样的，但是节点只放那些出钱的人的fiber节点，不出去钱的绕过去
        };
      }
      if (oldFiber) {
        oldFiber.effectTag = DELETION;
        deletions.push(oldFiber);
      }
    }
    if (oldFiber) {
      oldFiber = oldFiber.sibling; // oldFiber指针也向后移动一次
    }
    if (newFiber) {
      // 如果当前索引为0 说明这是太子
      if (newChildIndex === 0) {
        currentFiber.child = newFiber;
      } else {
        // 让太子的sibling弟弟指向二皇子
        prevSibling.sibling = newFiber;
      }
      // 这里会覆盖之前的sibling属性 不理解
      console.log(prevSibling, '111');
      prevSibling = newFiber;
      console.log(prevSibling, '22222222222');
    }
    newChildIndex++;
  }
}

function commitRoot() {
  deletions.forEach(commitWork); // 执行effect list 之前先把改删除的元素删除
  let currentFiber = workInProgressRoot.firstEffect;
  while (currentFiber) {
    commitWork(currentFiber);
    currentFiber = currentFiber.nextEffect;
  }
  deletions.length = 0; // 提交之后要清空deletions 数组
  currentRoot = workInProgressRoot; // 把当前渲染成功的根fiber 赋给currentRoot 渲染之后一直都有
  workInProgressRoot = null;
}

function commitWork(currentFiber) {
  if (!currentFiber) {
    return;
  }
  let returnFiber = currentFiber.return;
  // 因为可能为类节点 class

  while (![TAG_HOST, TAG_ROOT, TAG_TEXT].includes(returnFiber.tag)) {
    returnFiber = returnFiber.return;
  }
  let domReturn = returnFiber.stateNode;
  if (currentFiber.effectTag === PLACEMENT) {
    let nextFiber = currentFiber;
    // 处理counter挂载两次 不加这个判断也可以  源码有处理
    if (nextFiber.tag === TAG_CLASS) {
      return;
    }
    // 如果要挂载的节点不是DOM节点，比如说是类组件Fiber，直接找第一个儿子，知道找到一个真实DOM节点为止
    while (nextFiber.tag !== TAG_HOST && nextFiber.tag !== TAG_TEXT) {
      nextFiber = currentFiber.child;
    }
    // 新增节点
    domReturn.appendChild(nextFiber.stateNode);
  } else if (currentFiber.effectTag === DELETION) {
    // 删除节点
    // 这儿类组件不需要更新DO节点
    return commitDeletion(currentFiber, domReturn);
  } else if (currentFiber.effectTag === UPDATE) {
    if (currentFiber.type === ELEMENT_TEXT) {
      // 上一个fiber和当前fiber对比
      if (currentFiber.alternate.props.text !== currentFiber.props.text) {
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

/**
 *workInProgressFiber = currentFiber;
  hookIndex = 0;
  workInProgressFiber.hooks = [];
 *每个fiber都有自己的hook 每个hook都有自己的updateQueue
 * @export
 * @param {*} reducer
 * @param {*} initialValue
 */
export function useReducer(reducer, initialValue) {
  // 先找老的hook
  let newHook = workInProgressFiber?.alternate?.hooks[hookIndex];
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

export function useState(initialValue) {
  return useReducer(null, initialValue);
}

// react告诉浏览器 我现在有任务请你在闲的时候
// 有一个优先级的概念 expirationTime
requestIdleCallback(workLoop, { timeout: 500 });

// 每次都是一个新的fiber对象 每次都要创建 所以性能有影响  有了一个双缓冲机制
