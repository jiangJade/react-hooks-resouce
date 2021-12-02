import {
  TAG_ROOT,
  ELEMENT_TEXT,
  TAG_HOST,
  TAG_TEXT,
  PLACEMENT,
  UPDATE,
  DELETION,
  TAG_FUNCTION_COMPONENT,
} from './constants';
import { UpdateQueue, Update } from './updateQueue';
import { setProps } from './utils';

let workInProgressRoot = null; // 根应用 TAG_ROOT
let nextUnitOfWork = null; // 下一个执行单元

let currentRoot = null; //正在工作的fiber树
let deletions = []; // 收集删除
let hookIndex = 0;
let workInProgressFiber = null;

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
  if (currentRoot && currentRoot.alternate) {
    //这就是第二次之后渲染，不能每次都创建树，如起始时可以把第一个树赋给第三个
    workInProgressRoot = currentRoot.alternate;
    workInProgressRoot.alternate = currentRoot; //他的替身指向当前树
    if (rootFiber) workInProgressRoot.props = rootFiber.props; //让他的props更新成新的props
  } else if (currentRoot) {
    //第一次更新
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
    //如果是第一次渲染
    workInProgressRoot = rootFiber;
  }
  //清空指针
  workInProgressRoot.firstEffect =
    workInProgressRoot.lastEffect =
    workInProgressRoot.nextEffect =
      null;
  nextUnitOfWork = workInProgressRoot;
}

function performUnitOfWork(currentFiber) {
  beginWork(currentFiber);
  if (currentFiber.child) {
    return currentFiber.child; //有孩子返回孩子
  }
  while (currentFiber) {
    completeUnitOfWork(currentFiber);
    if (currentFiber.sibling) {
      return currentFiber.sibling; //有弟弟返回弟弟
    }
    currentFiber = currentFiber.return; //返回父亲
  }
}

function completeUnitOfWork(currentFiber) {
  let returnFiber = currentFiber.return;
  if (returnFiber) {
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
      //如果有副作用，（第一次时肯定有，新增默认PLACEMENT）
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
    /*  { tag: TAG_ROOT, // 这里写错了 写成了type 应该是tag stateNode: container,props: { children: [element] },}
    // A1 div 执行完了后 回去找child 会取出 [A1，B1，B2]  执行两次的原因是workLoop是一个每帧都会执行的函数
    // 为什么A1执行完了之后 会走 currentFiber.child逻辑
    // 因为 第一次走reconcileChildren函数逻辑时 currentFiber 就是rootFiber,
    这时在reconcileChildren里面为rootFiber添加了一个child属性
    */
    updateHostRoot(currentFiber);
    // 先走TAG_TEXT
  } else if (currentFiber.tag === TAG_HOST) {
    // A1 div
    updateHost(currentFiber);
  } else if (currentFiber.tag === TAG_TEXT) {
    // A1 文本
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

// 创建真实DOM
function updateHost(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
  const newChildren = currentFiber.props.children; // children 写成了newChildren [A1,B1,B2]
  reconcileChildren(currentFiber, newChildren);
}

function updateHostText(currentFiber) {
  if (!currentFiber.stateNode) {
    currentFiber.stateNode = createDOM(currentFiber);
  }
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

function updateDOM(stateNode, oldProps, newProps) {
  if (stateNode && stateNode?.setAttribute) {
    setProps(stateNode, oldProps, newProps);
  }
}

function updateHostRoot(currentFiber) {
  const newChildren = currentFiber.props.children; // [element]
  reconcileChildren(currentFiber, newChildren);
}

// 创建子fiber 复用旧的fibr节点
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

// 工作循环
function workLoop(deadline) {
  let shouldYield = false; // shouldYield 写错了

  // 5 shouldYeild没有取反  workLoop函数写完就声明一个根 workInProgressRoot变量
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1; // 没有时间就不执行render
  }
  if (!nextUnitOfWork && workInProgressRoot) {
    // console.log('render阶段结束');
    commitRoot();
  }
  // 检查是否有任务需要执行
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
  // 找父节点 将子节点添加进父节点
  let returnFiber = currentFiber.return;
  // 不是这几个类型
  while (
    returnFiber.tag !== TAG_ROOT &&
    returnFiber.tag !== TAG_HOST &&
    returnFiber.tag !== TAG_TEXT
  ) {
    returnFiber = returnFiber.return;
  }
  const domReturn = returnFiber.stateNode;
  if (currentFiber.effectTag === PLACEMENT) {
    let nextFiber = currentFiber;
    while (nextFiber.tag !== TAG_HOST && nextFiber.tag !== TAG_TEXT) {
      nextFiber = currentFiber.child;
    }
    domReturn.appendChild(nextFiber.stateNode);
  } else if (currentFiber.effectTag === UPDATE) {
    if (currentFiber.type === ELEMENT_TEXT) {
      if (currentFiber.alternate.props.text !== currentFiber.props.text) {
        currentFiber.stateNode.textContent = currentFiber.props.text;
      }
    } else {
      updateDOM(
        currentFiber.stateNode,
        currentFiber.alternate.props,
        currentFiber.props
      );
    }
  } else if (currentFiber.effectTag === DELETION) {
    commitDeletion(currentFiber, domReturn);
  }
  currentFiber.effectTag = null; // 清空副作用
}

function commitDeletion(currentFiber, domReturn) {
  if (currentFiber.tag !== TAG_HOST || currentFiber.tag !== TAG_TEXT) {
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

// 1这里写了之后忘记声明workInProgressRoot
// react 告诉浏览器 有时间帮我执行一下任务 浏览器每秒执行60帧 . 一帧16.66毫秒
//expirationTime 过期时间
requestIdleCallback(workLoop, { timeout: 500 });
